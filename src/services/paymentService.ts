import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  CanonicalPaymentStatus,
  ContactAccessGrant,
  EXTENSIBLE_PAYMENT_METHODS_CATALOG,
  PAYMENT_SERVICE_COMING_SOON_MESSAGE,
  PAYMENT_STATUS_LABELS_AR,
  PaymentMethodCategory,
  PaymentMethodDefinition,
  PaymentPurpose,
  PaymentRecord,
  PaymentStatus,
  PaymentUnlockScopeType,
  VALIDATION_LIMITS,
} from '../types/domain';

function truncate(val: string, max: number): string {
  return (val || '').trim().slice(0, max);
}

/**
 * In-flight idempotency lock to prevent duplicate payment registration
 * on rapid clicks or page reload.
 */
const inFlightPaymentOperations = new Map<string, Promise<unknown>>();

/**
 * Security Guard (Requirement 7):
 * Strictly prevents storing bank card numbers (PAN 12-19 digits), CVV/CVC, or secret card data
 * inside any field of the application database.
 */
export function containsForbiddenCardOrSecretData(rawInput: string): boolean {
  if (!rawInput) return false;
  const digitsCollapsed = rawInput.replace(/[\s-]/g, '');
  // Rejects 12 to 19 contiguous digits (PAN / card number pattern)
  if (/\b\d{12,19}\b/.test(digitsCollapsed)) {
    return true;
  }
  // Rejects CVV / CVC / PIN / Card Secret markers
  if (/\b(cvv|cvc|pin_code|card_number|pan_number|expiry_date)\b/i.test(rawInput)) {
    return true;
  }
  return false;
}

export function assertNoCardOrSecretData(fields: Record<string, string>): void {
  for (const [, value] of Object.entries(fields)) {
    if (containsForbiddenCardOrSecretData(value)) {
      throw new Error(
        'يُمنع منعاً باتاً إرسال أو تخزين أرقام البطاقات البنكية أو بياناتها السرية في قاعدة بيانات التطبيق.'
      );
    }
  }
}

/**
 * Normalizes any stored PaymentStatus into one of the 5 canonical Stage 8 payment states:
 * - unpaid: لم يتم الدفع
 * - processing: قيد المعالجة
 * - succeeded: ناجح
 * - failed: فاشل
 * - refunded: مسترد
 */
export function normalizeToCanonicalPaymentStatus(
  status?: PaymentStatus | null
): CanonicalPaymentStatus {
  switch (status) {
    case 'processing':
    case 'pending':
      return 'processing';
    case 'succeeded':
    case 'approved':
      return 'succeeded';
    case 'failed':
    case 'rejected':
      return 'failed';
    case 'refunded':
      return 'refunded';
    case 'unpaid':
    default:
      return 'unpaid';
  }
}

export function getPaymentStatusLabelAr(status?: PaymentStatus | null): string {
  const canonical = normalizeToCanonicalPaymentStatus(status);
  return PAYMENT_STATUS_LABELS_AR[canonical] || 'لم يتم الدفع';
}

/**
 * Deterministic Idempotent Payment ID (Requirement 3 & 10):
 * Binds the payment transaction strictly to (targetAdId + userId + unlockScope)
 * so reloading the page or repeating the request never creates duplicate payment records.
 */
export function buildIdempotentPaymentId(
  userId: string,
  targetAdId: string,
  unlockScope: PaymentUnlockScopeType = 'single_ad'
): string {
  const cleanUser = (userId || 'guest').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48);
  const cleanAd = (targetAdId || 'ad').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48);
  const prefix = unlockScope === 'timed_access' ? 'pay_pass' : 'pay_ad';
  return `${prefix}_${cleanAd}_${cleanUser}`.slice(0, VALIDATION_LIMITS.ID_MAX_LENGTH);
}

/**
 * Defines what a payment unlocks (Requirement 11):
 * - 'single_ad': فتح بيانات التواصل لإعلان معين محدد (مرتبط بمعرف الإعلان targetAdId)
 * - 'timed_access': صلاحية وصول محددة المدة (تُحدد السياسة التجارية ومدتها لاحقاً من الإدارة)
 */
export interface PaymentUnlockPolicyDescriptor {
  scope: PaymentUnlockScopeType;
  purpose: PaymentPurpose;
  titleAr: string;
  descriptionAr: string;
  commercialPolicyNoteAr: string;
}

export const PAYMENT_UNLOCK_POLICIES: Record<
  PaymentUnlockScopeType,
  PaymentUnlockPolicyDescriptor
> = {
  single_ad: {
    scope: 'single_ad',
    purpose: 'unlock_contact',
    titleAr: 'فتح وسائل التواصل لإعلان معين',
    descriptionAr:
      'يرتبط بمعرف هذا الإعلان المحدد ومعرف المستخدم لفتح قنوات التواصل المتوفرة فيه.',
    commercialPolicyNoteAr:
      'سيتم اعتماد التسعيرة والسياسة التجارية النهائية عند تفعيل خدمة الدفع.',
  },
  timed_access: {
    scope: 'timed_access',
    purpose: 'timed_access',
    titleAr: 'صلاحية وصول محددة المدة',
    descriptionAr:
      'تمنح المستخدم صلاحية وصول لوسائل التواصل خلال فترة زمنية محددة وفق السياسة التجارية.',
    commercialPolicyNoteAr:
      'سيتم تحديد مدة الصلاحية والسياسة التجارية لاحقاً من قِبل الإدارة دون تغيير بنية الإعلانات.',
  },
};

export interface AdPaymentContextSnapshot {
  adId: string;
  userId: string | null;
  idempotentPaymentId: string;
  canonicalStatus: CanonicalPaymentStatus;
  statusLabelAr: string;
  existingRecord: PaymentRecord | null;
  unlockScope: PaymentUnlockScopeType;
  availableMethods: PaymentMethodDefinition[];
  serviceNoticeAr: string;
}

/**
 * Resolves the current payment status and bound context for a given (adId, userId)
 * without executing any fake payment or mutating the MarriageAd collection.
 */
export async function resolveUserAdPaymentContext(
  adId: string,
  userId: string | null | undefined,
  unlockScope: PaymentUnlockScopeType = 'single_ad'
): Promise<AdPaymentContextSnapshot> {
  const cleanAdId = (adId || '').trim();
  const cleanUid = (userId || '').trim();
  const idempotentPaymentId = buildIdempotentPaymentId(
    cleanUid || 'visitor',
    cleanAdId,
    unlockScope
  );

  if (
    !cleanUid ||
    !VALIDATION_LIMITS.ID_REGEX.test(cleanUid) ||
    !cleanAdId ||
    !VALIDATION_LIMITS.ID_REGEX.test(cleanAdId)
  ) {
    return {
      adId: cleanAdId,
      userId: null,
      idempotentPaymentId,
      canonicalStatus: 'unpaid',
      statusLabelAr: PAYMENT_STATUS_LABELS_AR.unpaid,
      existingRecord: null,
      unlockScope,
      availableMethods: EXTENSIBLE_PAYMENT_METHODS_CATALOG,
      serviceNoticeAr: PAYMENT_SERVICE_COMING_SOON_MESSAGE,
    };
  }

  try {
    const q = query(collection(db, 'payments'), where('userId', '==', cleanUid));
    const snap = await getDocs(q);
    const matchingRecords = snap.docs
      .map((d) => d.data() as PaymentRecord)
      .filter(
        (rec) =>
          rec &&
          rec.userId === cleanUid &&
          (rec.targetAdId === cleanAdId || rec.purpose === 'timed_access')
      );

    // Prioritize succeeded > processing > refunded > failed > unpaid
    const priorityOrder: Record<CanonicalPaymentStatus, number> = {
      succeeded: 5,
      processing: 4,
      refunded: 3,
      failed: 2,
      unpaid: 1,
    };

    matchingRecords.sort((a, b) => {
      const pA = priorityOrder[normalizeToCanonicalPaymentStatus(a.status)] || 0;
      const pB = priorityOrder[normalizeToCanonicalPaymentStatus(b.status)] || 0;
      return pB - pA;
    });

    const latest = matchingRecords[0] || null;
    const canonicalStatus = latest
      ? normalizeToCanonicalPaymentStatus(latest.status)
      : 'unpaid';

    return {
      adId: cleanAdId,
      userId: cleanUid,
      idempotentPaymentId: latest?.paymentId || idempotentPaymentId,
      canonicalStatus,
      statusLabelAr: PAYMENT_STATUS_LABELS_AR[canonicalStatus],
      existingRecord: latest,
      unlockScope,
      availableMethods: EXTENSIBLE_PAYMENT_METHODS_CATALOG,
      serviceNoticeAr: PAYMENT_SERVICE_COMING_SOON_MESSAGE,
    };
  } catch {
    return {
      adId: cleanAdId,
      userId: cleanUid,
      idempotentPaymentId,
      canonicalStatus: 'unpaid',
      statusLabelAr: PAYMENT_STATUS_LABELS_AR.unpaid,
      existingRecord: null,
      unlockScope,
      availableMethods: EXTENSIBLE_PAYMENT_METHODS_CATALOG,
      serviceNoticeAr: PAYMENT_SERVICE_COMING_SOON_MESSAGE,
    };
  }
}

/**
 * Submits an idempotent payment record in 'unpaid' or 'processing' state.
 * - Strictly rejects any card numbers or secret data (Requirement 7).
 * - Deduplicates repeated requests or page reloads via deterministic paymentId (Requirement 10).
 * - Never marks a payment as 'succeeded' from the client UI (Requirement 8 & 9).
 */
export async function submitPaymentRecord(input: {
  paymentId?: string;
  userId: string;
  targetAdId: string;
  purpose: PaymentPurpose;
  amount: number;
  currency: string;
  method: PaymentMethodCategory | string;
  referenceNumber: string;
  receiptUrl?: string;
  initialStatus?: 'unpaid' | 'processing' | 'pending';
}): Promise<PaymentRecord | null> {
  assertNoCardOrSecretData({
    method: input.method,
    referenceNumber: input.referenceNumber,
    receiptUrl: input.receiptUrl || '',
  });

  const unlockScope: PaymentUnlockScopeType =
    input.purpose === 'timed_access' ? 'timed_access' : 'single_ad';
  const deterministicId =
    input.paymentId && VALIDATION_LIMITS.ID_REGEX.test(input.paymentId)
      ? input.paymentId
      : buildIdempotentPaymentId(input.userId, input.targetAdId, unlockScope);

  // Prevent concurrent duplicate submissions
  if (inFlightPaymentOperations.has(deterministicId)) {
    await inFlightPaymentOperations.get(deterministicId);
    return null;
  }

  const path = `payments/${deterministicId}`;
  const operationPromise = (async () => {
    try {
      // Check if an existing payment record for this idempotent key already exists
      const existingQ = query(
        collection(db, 'payments'),
        where('userId', '==', input.userId)
      );
      const existingSnap = await getDocs(existingQ);
      const alreadyExists = existingSnap.docs.find(
        (d) => d.id === deterministicId
      );
      if (alreadyExists) {
        // Do not duplicate on reload or repeated request
        return alreadyExists.data() as PaymentRecord;
      }

      const safeStatus =
        input.initialStatus === 'unpaid' || input.initialStatus === 'processing'
          ? input.initialStatus
          : 'pending';

      await setDoc(doc(db, 'payments', deterministicId), {
        paymentId: deterministicId,
        userId: input.userId,
        targetAdId: input.targetAdId,
        purpose: input.purpose,
        amount: Math.max(0, Math.min(100000, input.amount)),
        currency: truncate(input.currency || 'SAR', 10),
        method: truncate(input.method, 50),
        referenceNumber: truncate(input.referenceNumber || deterministicId, 120),
        receiptUrl: truncate(input.receiptUrl || '', 500),
        status: safeStatus,
        reviewedBy: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  })();

  inFlightPaymentOperations.set(deterministicId, operationPromise);
  try {
    return (await operationPromise) as PaymentRecord | null;
  } finally {
    inFlightPaymentOperations.delete(deterministicId);
  }
}

/**
 * Lists payment records belonging to a specific user.
 */
export async function listUserPayments(userId: string): Promise<PaymentRecord[]> {
  const path = 'payments';
  try {
    const q = query(collection(db, 'payments'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as PaymentRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Trusted Server / Moderator Verification Action (Requirement 8, 9, 11):
 * - Contact details are NEVER unlocked based on a client UI message alone.
 * - Only after verified confirmation from the trusted payment provider / reviewer
 *   is the payment status updated and the server-enforced ContactAccessGrant created
 *   (either for a single ad `${adId}_${userId}` or a timed access pass `PASS_${userId}`).
 */
export async function reviewPaymentRecord(input: {
  paymentId: string;
  reviewerUid: string;
  newStatus: PaymentStatus;
  unlockScope?: PaymentUnlockScopeType;
  grantContactAccess?: {
    adId: string;
    userId: string;
  };
}): Promise<void> {
  const paymentPath = `payments/${input.paymentId}`;
  try {
    await updateDoc(doc(db, 'payments', input.paymentId), {
      status: input.newStatus,
      reviewedBy: input.reviewerUid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, paymentPath);
  }

  const isSuccess =
    input.newStatus === 'succeeded' || input.newStatus === 'approved';

  if (isSuccess && input.grantContactAccess) {
    const scope = input.unlockScope || 'single_ad';
    const accessId =
      scope === 'timed_access'
        ? `PASS_${input.grantContactAccess.userId}`
        : `${input.grantContactAccess.adId}_${input.grantContactAccess.userId}`;
    const accessPath = `contact_access/${accessId}`;
    try {
      await setDoc(doc(db, 'contact_access', accessId), {
        accessId,
        adId: input.grantContactAccess.adId,
        userId: input.grantContactAccess.userId,
        paymentId: input.paymentId,
        status: 'active',
        grantedBy: input.reviewerUid,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, accessPath);
    }
  }
}

/**
 * Checks whether a user has an active contact access grant for a specific ad.
 */
export async function getContactAccessGrant(
  adId: string,
  userId: string
): Promise<ContactAccessGrant | null> {
  const accessId = `${adId}_${userId}`;
  const path = `contact_access/${accessId}`;
  try {
    const snap = await getDoc(doc(db, 'contact_access', accessId));
    return snap.exists() ? (snap.data() as ContactAccessGrant) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

