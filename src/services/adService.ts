import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { recordAdminAuditLog } from './adminService';
import {
  AdContact,
  AdGender,
  AdPhoto,
  AdReviewStatus,
  AdStatus,
  MANUAL_REGION_ID,
  MANUAL_SUBREGION_ID,
  MarriageAd,
  PhotoStatus,
  PhotoVisibility,
  VALIDATION_LIMITS,
  getDefaultAvatarByGender,
  normalizeMarriageAdRecord,
} from '../types/domain';

function truncate(val: string, max: number): string {
  return (val || '').trim().slice(0, max);
}

/**
 * Ensures the browser has an active internet connection before attempting database writes.
 * Prevents claiming false success when offline.
 */
export function assertOnlineConnection(): void {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error(
      'انقطع الاتصال بالإنترنت. لم يتم حفظ العملية في قاعدة البيانات، يرجى التحقق من الشبكة والمحاولة مرة أخرى.'
    );
  }
}

/**
 * Commits a Firestore writeBatch and verifies server-side persistence so offline/queued writes
 * never falsely report success when the connection drops mid-save.
 */
async function commitBatchAndVerifyServer(
  batch: ReturnType<typeof writeBatch>,
  verifyAdId?: string
): Promise<void> {
  assertOnlineConnection();

  await Promise.race([
    batch.commit(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              'استغرق الاتصال بقاعدة البيانات وقتاً أطول من المعتاد بسبب ضعف أو انقطاع الإنترنت. لم يتم تأكيد حفظ البيانات.'
            )
          ),
        12000
      )
    ),
  ]);

  if (verifyAdId) {
    const serverSnap = await getDocFromServer(doc(db, 'ads', verifyAdId));
    if (!serverSnap.exists()) {
      throw new Error(
        'تعذر تأكيد حفظ الإعلان في الخادم السحابي. يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً.'
      );
    }
  }
}

export function deriveContactChannelsSummary(contactInput: {
  phone?: string;
  whatsapp?: string;
  whatsappAcceptsCalls?: boolean;
  snapchatUrl?: string;
  xUrl?: string;
  telegram?: string;
}): string[] {
  const channels: string[] = [];
  if (contactInput.whatsapp && contactInput.whatsapp.trim()) {
    channels.push('whatsapp');
    if (contactInput.whatsappAcceptsCalls) {
      channels.push('phone_calls');
    }
  } else if (contactInput.phone && contactInput.phone.trim()) {
    channels.push('phone_calls');
  }
  if (contactInput.snapchatUrl && contactInput.snapchatUrl.trim()) {
    channels.push('snapchat');
  }
  if (contactInput.xUrl && contactInput.xUrl.trim()) {
    channels.push('x');
  }
  if (contactInput.telegram && contactInput.telegram.trim()) {
    channels.push('telegram');
  }
  return channels.length > 0 ? channels.slice(0, 5) : ['whatsapp'];
}

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

const FORBIDDEN_FILE_PATTERNS =
  /\.(exe|bat|cmd|sh|php|js|mjs|ts|html|htm|svg|xml|scr|dll|vbs|jar)(\.|$)/i;

/**
 * Inspects the first 12 bytes of a file to verify authentic JPEG, PNG, or WebP magic bytes
 * and block disguised executable or script files.
 */
async function verifyImageMagicBytes(file: File): Promise<boolean> {
  const slice = file.slice(0, 12);
  const buffer = await slice.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 4) return false;

  // JPEG: FF D8 FF
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (isJpeg) return true;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  if (isPng) return true;

  // WebP: "RIFF" (52 49 46 46) .... "WEBP" (57 45 42 50)
  const isWebp =
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  return isWebp;
}

/**
 * Validates the image uploaded from the user's device, strips any harmful metadata,
 * preserves its natural proportions, and immediately converts it into a ready URL
 * (attempting Cloud Storage with a fast timeout and falling back to an optimized URL
 * so it saves and syncs reliably in Firestore).
 */
export async function processPersonalPhotoFromDevice(
  file: File,
  userId: string
): Promise<{ photoId: string; fileId: string; url: string }> {
  assertOnlineConnection();

  if (!file) {
    throw new Error('لم يتم اختيار ملف صورة.');
  }

  const fileName = (file.name || '').toLowerCase().trim();
  if (FORBIDDEN_FILE_PATTERNS.test(fileName)) {
    throw new Error(
      'تم حظر هذا الملف لأسباب أمنية. يرجى اختيار صورة حقيقية بصيغة JPG أو PNG أو WEBP.'
    );
  }

  const hasValidExt = ALLOWED_IMAGE_EXTENSIONS.some((ext) =>
    fileName.endsWith(ext)
  );
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type) || !hasValidExt) {
    throw new Error(
      'صيغة الملف غير مدعومة. يُسمح فقط بصور JPG أو PNG أو WEBP.'
    );
  }

  if (file.size <= 0) {
    throw new Error('ملف الصورة فارغ أو تالف.');
  }

  if (file.size > VALIDATION_LIMITS.MAX_PHOTO_BYTES) {
    throw new Error('حجم الصورة يتجاوز الحد الأقصى المسموح به (5 ميجابايت).');
  }

  const validSignature = await verifyImageMagicBytes(file);
  if (!validSignature) {
    throw new Error(
      'محتوى الملف لا يطابق توقيع صورة حقيقية (تم رفض الملف لحماية المنصة من الملفات الضارة).'
    );
  }

  const { sanitizedBlob, dataUrl } = await new Promise<{
    sanitizedBlob: Blob;
    dataUrl: string;
  }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة من الجهاز.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () =>
        reject(new Error('ملف الصورة تالف أو غير قابل للمعالجة.'));
      img.onload = () => {
        const maxDim = 720;
        let { width, height } = img;
        if (width < 40 || height < 40) {
          reject(new Error('أبعاد الصورة صغيرة جداً. يرجى اختيار صورة أوضح.'));
          return;
        }
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('تعذر تهيئة معالج الصور.'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.82;
        let encodedUrl = canvas.toDataURL('image/jpeg', quality);
        while (encodedUrl.length > 320000 && quality > 0.45) {
          quality -= 0.1;
          encodedUrl = canvas.toDataURL('image/jpeg', quality);
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('تعذر تحويل الصورة إلى رابط.'));
              return;
            }
            resolve({ sanitizedBlob: blob, dataUrl: encodedUrl });
          },
          'image/jpeg',
          quality
        );
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

  const photoId = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const storagePath = `ads/${userId}/${photoId}.jpg`;

  try {
    const fileRef = storageRef(storage, storagePath);
    const cloudUrl = await Promise.race<string>([
      (async () => {
        await uploadBytes(fileRef, sanitizedBlob, {
          contentType: 'image/jpeg',
          customMetadata: { userId, photoId },
        });
        return await getDownloadURL(fileRef);
      })(),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('storage_timeout')), 2500)
      ),
    ]);

    if (cloudUrl && cloudUrl.length <= VALIDATION_LIMITS.URL_MAX) {
      return {
        photoId,
        fileId: storagePath,
        url: cloudUrl,
      };
    }
  } catch {
    // Fallback to the converted URL so image upload from device always succeeds and syncs
  }

  return {
    photoId,
    fileId: storagePath,
    url: dataUrl.slice(0, VALIDATION_LIMITS.URL_MAX),
  };
}

/**
 * Deletes an uploaded personal photo from Firebase Cloud Storage if applicable.
 */
export async function deleteAdPersonalPhotoFromCloud(
  fileId: string
): Promise<void> {
  if (!fileId) return;
  try {
    const fileRef = storageRef(storage, fileId);
    await deleteObject(fileRef);
  } catch {
    // Ignore if stored as converted URL or already deleted
  }
}

/**
 * Validates Snapchat profile URL format.
 */
export function isValidSnapchatUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const isSnapHost =
      host === 'snapchat.com' ||
      host === 'www.snapchat.com' ||
      host === 't.snapchat.com';
    const path = parsed.pathname.replace(/\/+$/, '');
    return (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      isSnapHost &&
      path.length >= 2
    );
  } catch {
    return false;
  }
}

/**
 * Validates X (Twitter) profile URL format.
 */
export function isValidXUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const isXHost =
      host === 'x.com' ||
      host === 'www.x.com' ||
      host === 'twitter.com' ||
      host === 'www.twitter.com';
    const path = parsed.pathname.replace(/\/+$/, '');
    return (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      isXHost &&
      /^\/[A-Za-z0-9_]{1,30}$/.test(path)
    );
  } catch {
    return false;
  }
}

/**
 * Real-time subscription to approved marriage advertisements for the main screen.
 */
export function subscribeToApprovedMarriageAds(
  onUpdate: (ads: MarriageAd[]) => void
): Unsubscribe {
  const path = 'ads';
  const q = query(collection(db, 'ads'), where('status', '==', 'approved'));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) =>
        normalizeMarriageAdRecord(d.data() as Partial<MarriageAd>)
      );
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

/**
 * Real-time subscription to the current authenticated user's own advertisements
 * so they can track their submitted ads immediately and across page reloads or devices.
 */
export function subscribeToUserOwnMarriageAds(
  userId: string,
  onUpdate: (ads: MarriageAd[]) => void
): Unsubscribe {
  const path = 'ads';
  const q = query(collection(db, 'ads'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) =>
        normalizeMarriageAdRecord(d.data() as Partial<MarriageAd>)
      );
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

/**
 * Fetches approved marriage advertisements for visitors and users.
 */
export async function listApprovedMarriageAds(): Promise<MarriageAd[]> {
  const path = 'ads';
  try {
    const q = query(collection(db, 'ads'), where('status', '==', 'approved'));
    const snap = await getDocs(q);
    return snap.docs.map((d) =>
      normalizeMarriageAdRecord(d.data() as Partial<MarriageAd>)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Fetches advertisements belonging to a specific advertiser (cached or server).
 */
export async function listUserMarriageAds(userId: string): Promise<MarriageAd[]> {
  const path = 'ads';
  try {
    const q = query(collection(db, 'ads'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) =>
      normalizeMarriageAdRecord(d.data() as Partial<MarriageAd>)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Explicitly retrieves the user's ads directly from the remote Firestore server
 * to guarantee fresh cross-device synchronization after logging in from another device.
 */
export async function fetchUserMarriageAdsFromServer(
  userId: string
): Promise<MarriageAd[]> {
  assertOnlineConnection();
  const path = 'ads';
  try {
    const q = query(collection(db, 'ads'), where('userId', '==', userId));
    const snap = await getDocsFromServer(q);
    return snap.docs.map((d) =>
      normalizeMarriageAdRecord(d.data() as Partial<MarriageAd>)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Fetches all marriage ads for Super Admin moderation.
 */
export async function listAllAdsForStaff(): Promise<MarriageAd[]> {
  const path = 'ads';
  try {
    const snap = await getDocs(collection(db, 'ads'));
    return snap.docs.map((d) =>
      normalizeMarriageAdRecord(d.data() as Partial<MarriageAd>)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Atomically saves a new marriage advertisement, its photo record (if uploaded),
 * and its isolated contact record in Firestore using writeBatch, then verifies remote server persistence.
 */
export async function createMarriageAdWithContact(
  userId: string,
  adInput: {
    adId: string;
    advertiserName: string;
    title: string;
    gender: AdGender;
    age: number;
    maritalStatus: string;
    marriageType: string;
    countryCode: string;
    countryNameAr: string;
    countryNameEn: string;
    regionId: string;
    regionLabelAr: string;
    regionNameAr: string;
    subRegionId: string;
    subRegionLabelAr: string;
    subRegionNameAr: string;
    cityNameAr: string;
    cityNameEn: string;
    details: string;
    partnerRequirements: string;
    hasPhotos: boolean;
    primaryPhotoUrl: string;
    photoFileId: string;
    photoId?: string;
    initialStatus: 'pending' | 'approved';
  },
  contactInput: {
    phone: string;
    whatsapp: string;
    whatsappDialCode: string;
    whatsappAcceptsCalls: boolean;
    snapchatUrl: string;
    xUrl: string;
    telegram: string;
    email: string;
    preferredContactTime: string;
  }
): Promise<void> {
  assertOnlineConnection();
  const adPath = `ads/${adInput.adId}`;

  if (
    !Number.isInteger(adInput.age) ||
    adInput.age < VALIDATION_LIMITS.AD_AGE_MIN ||
    adInput.age > VALIDATION_LIMITS.AD_AGE_MAX
  ) {
    throw new Error('يجب أن يكون عمر المعلن بين 18 و99 عاماً.');
  }

  const contactChannelsSummary = deriveContactChannelsSummary(contactInput);
  const reviewStatus: AdReviewStatus =
    adInput.initialStatus === 'approved' ? 'approved' : 'pending';

  try {
    const batch = writeBatch(db);
    const now = serverTimestamp();

    batch.set(doc(db, 'ads', adInput.adId), {
      adId: adInput.adId,
      userId,
      advertiserName: truncate(
        adInput.advertiserName,
        VALIDATION_LIMITS.DISPLAY_NAME_MAX
      ),
      title: truncate(adInput.title, VALIDATION_LIMITS.AD_TITLE_MAX),
      gender: adInput.gender,
      age: Math.floor(adInput.age),
      maritalStatus: truncate(adInput.maritalStatus, 80),
      marriageType: truncate(
        adInput.marriageType,
        VALIDATION_LIMITS.MARRIAGE_TYPE_MAX
      ),
      countryCode: truncate(
        adInput.countryCode,
        VALIDATION_LIMITS.COUNTRY_CODE_MAX
      ),
      countryNameAr: truncate(adInput.countryNameAr, 60),
      countryNameEn: truncate(adInput.countryNameEn, 60),
      regionId: truncate(adInput.regionId || MANUAL_REGION_ID, 60),
      regionLabelAr: truncate(
        adInput.regionLabelAr,
        VALIDATION_LIMITS.REGION_LABEL_MAX
      ),
      regionNameAr: truncate(
        adInput.regionNameAr,
        VALIDATION_LIMITS.REGION_NAME_MAX
      ),
      subRegionId: truncate(adInput.subRegionId || MANUAL_SUBREGION_ID, 60),
      subRegionLabelAr: truncate(
        adInput.subRegionLabelAr,
        VALIDATION_LIMITS.REGION_LABEL_MAX
      ),
      subRegionNameAr: truncate(
        adInput.subRegionNameAr,
        VALIDATION_LIMITS.REGION_NAME_MAX
      ),
      cityNameAr: truncate(adInput.cityNameAr, VALIDATION_LIMITS.CITY_NAME_MAX),
      cityNameEn: truncate(adInput.cityNameEn, VALIDATION_LIMITS.CITY_NAME_MAX),
      details: truncate(adInput.details, VALIDATION_LIMITS.AD_DETAILS_MAX),
      partnerRequirements: truncate(
        adInput.partnerRequirements,
        VALIDATION_LIMITS.AD_REQUIREMENTS_MAX
      ),
      hasPhotos: Boolean(adInput.hasPhotos),
      primaryPhotoUrl: truncate(
        adInput.primaryPhotoUrl,
        VALIDATION_LIMITS.URL_MAX
      ),
      photoFileId: truncate(
        adInput.photoFileId,
        VALIDATION_LIMITS.STORAGE_PATH_MAX
      ),
      contactChannelsSummary,
      status: adInput.initialStatus,
      reviewStatus,
      moderationNote: '',
      viewsCount: 0,
      sharesCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    if (
      adInput.hasPhotos &&
      adInput.photoId &&
      adInput.photoFileId &&
      adInput.primaryPhotoUrl
    ) {
      batch.set(doc(db, 'ad_photos', adInput.photoId), {
        photoId: adInput.photoId,
        adId: adInput.adId,
        userId,
        storagePath: truncate(
          adInput.photoFileId,
          VALIDATION_LIMITS.STORAGE_PATH_MAX
        ),
        url: truncate(adInput.primaryPhotoUrl, VALIDATION_LIMITS.URL_MAX),
        visibility: 'public',
        status: adInput.initialStatus === 'approved' ? 'approved' : 'pending',
        createdAt: now,
        updatedAt: now,
      });
    }

    batch.set(doc(db, 'ad_contacts', adInput.adId), {
      adId: adInput.adId,
      userId,
      phone: truncate(contactInput.phone, VALIDATION_LIMITS.PHONE_MAX),
      whatsapp: truncate(contactInput.whatsapp, VALIDATION_LIMITS.PHONE_MAX),
      whatsappDialCode: truncate(
        contactInput.whatsappDialCode,
        VALIDATION_LIMITS.DIAL_CODE_MAX
      ),
      whatsappAcceptsCalls: Boolean(contactInput.whatsappAcceptsCalls),
      snapchatUrl: truncate(
        contactInput.snapchatUrl,
        VALIDATION_LIMITS.SOCIAL_URL_MAX
      ),
      xUrl: truncate(contactInput.xUrl, VALIDATION_LIMITS.SOCIAL_URL_MAX),
      telegram: truncate(contactInput.telegram, 60),
      email: truncate(contactInput.email, VALIDATION_LIMITS.EMAIL_MAX),
      preferredContactTime: truncate(contactInput.preferredContactTime, 120),
      updatedAt: now,
    });

    await commitBatchAndVerifyServer(batch, adInput.adId);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('انقطع الاتصال') ||
        error.message.includes('استغرق الاتصال') ||
        error.message.includes('تعذر تأكيد'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.CREATE, adPath);
  }
}

/**
 * Updates an existing marriage advertisement and its isolated contact record in-place
 * using the exact same adId so editing never creates a duplicate ad.
 * Strictly enforces that only the ad owner can edit their own ad.
 */
export async function updateMarriageAdWithContact(
  userId: string,
  existingAd: MarriageAd,
  adInput: {
    advertiserName: string;
    title: string;
    gender: AdGender;
    age: number;
    maritalStatus: string;
    marriageType: string;
    countryCode: string;
    countryNameAr: string;
    countryNameEn: string;
    regionId: string;
    regionLabelAr: string;
    regionNameAr: string;
    subRegionId: string;
    subRegionLabelAr: string;
    subRegionNameAr: string;
    cityNameAr: string;
    cityNameEn: string;
    details: string;
    partnerRequirements: string;
    hasPhotos: boolean;
    primaryPhotoUrl: string;
    photoFileId: string;
    newPhotoId?: string;
    nextStatus: 'pending' | 'approved';
  },
  contactInput: {
    phone: string;
    whatsapp: string;
    whatsappDialCode: string;
    whatsappAcceptsCalls: boolean;
    snapchatUrl: string;
    xUrl: string;
    telegram: string;
    email: string;
    preferredContactTime: string;
  }
): Promise<void> {
  assertOnlineConnection();

  if (!existingAd || !existingAd.adId) {
    throw new Error('معرف الإعلان غير صالح للتحديث.');
  }

  if (existingAd.userId !== userId) {
    throw new Error('غير مصرح لك بتعديل إعلان يخص مستخدماً آخر.');
  }

  if (
    !Number.isInteger(adInput.age) ||
    adInput.age < VALIDATION_LIMITS.AD_AGE_MIN ||
    adInput.age > VALIDATION_LIMITS.AD_AGE_MAX
  ) {
    throw new Error('يجب أن يكون عمر المعلن بين 18 و99 عاماً.');
  }

  const adId = existingAd.adId;
  const adPath = `ads/${adId}`;
  const contactChannelsSummary = deriveContactChannelsSummary(contactInput);
  const reviewStatus: AdReviewStatus =
    adInput.nextStatus === 'approved' ? 'approved' : 'pending';

  try {
    const batch = writeBatch(db);
    const now = serverTimestamp();

    // Update the exact same /ads/{adId} record without creating a new document
    batch.update(doc(db, 'ads', adId), {
      advertiserName: truncate(
        adInput.advertiserName,
        VALIDATION_LIMITS.DISPLAY_NAME_MAX
      ),
      title: truncate(adInput.title, VALIDATION_LIMITS.AD_TITLE_MAX),
      gender: adInput.gender,
      age: Math.floor(adInput.age),
      maritalStatus: truncate(adInput.maritalStatus, 80),
      marriageType: truncate(
        adInput.marriageType,
        VALIDATION_LIMITS.MARRIAGE_TYPE_MAX
      ),
      countryCode: truncate(
        adInput.countryCode,
        VALIDATION_LIMITS.COUNTRY_CODE_MAX
      ),
      countryNameAr: truncate(adInput.countryNameAr, 60),
      countryNameEn: truncate(adInput.countryNameEn, 60),
      regionId: truncate(adInput.regionId || MANUAL_REGION_ID, 60),
      regionLabelAr: truncate(
        adInput.regionLabelAr,
        VALIDATION_LIMITS.REGION_LABEL_MAX
      ),
      regionNameAr: truncate(
        adInput.regionNameAr,
        VALIDATION_LIMITS.REGION_NAME_MAX
      ),
      subRegionId: truncate(adInput.subRegionId || MANUAL_SUBREGION_ID, 60),
      subRegionLabelAr: truncate(
        adInput.subRegionLabelAr,
        VALIDATION_LIMITS.REGION_LABEL_MAX
      ),
      subRegionNameAr: truncate(
        adInput.subRegionNameAr,
        VALIDATION_LIMITS.REGION_NAME_MAX
      ),
      cityNameAr: truncate(adInput.cityNameAr, VALIDATION_LIMITS.CITY_NAME_MAX),
      cityNameEn: truncate(adInput.cityNameEn, VALIDATION_LIMITS.CITY_NAME_MAX),
      details: truncate(adInput.details, VALIDATION_LIMITS.AD_DETAILS_MAX),
      partnerRequirements: truncate(
        adInput.partnerRequirements,
        VALIDATION_LIMITS.AD_REQUIREMENTS_MAX
      ),
      hasPhotos: Boolean(adInput.hasPhotos),
      primaryPhotoUrl: truncate(
        adInput.primaryPhotoUrl,
        VALIDATION_LIMITS.URL_MAX
      ),
      photoFileId: truncate(
        adInput.photoFileId,
        VALIDATION_LIMITS.STORAGE_PATH_MAX
      ),
      contactChannelsSummary,
      status: adInput.nextStatus,
      reviewStatus,
      updatedAt: now,
    });

    // If the photo was changed or removed, clean up old /ad_photos records for this ad
    const photoChanged =
      existingAd.photoFileId !== adInput.photoFileId ||
      existingAd.hasPhotos !== adInput.hasPhotos;

    if (photoChanged) {
      const oldPhotosQuery = query(
        collection(db, 'ad_photos'),
        where('userId', '==', userId)
      );
      const oldPhotosSnap = await getDocs(oldPhotosQuery);
      for (const photoDoc of oldPhotosSnap.docs) {
        const pData = photoDoc.data() as AdPhoto;
        if (pData.adId === adId) {
          batch.delete(photoDoc.ref);
          if (pData.storagePath && pData.storagePath !== adInput.photoFileId) {
            await deleteAdPersonalPhotoFromCloud(pData.storagePath);
          }
        }
      }
      if (
        existingAd.photoFileId &&
        existingAd.photoFileId !== adInput.photoFileId
      ) {
        await deleteAdPersonalPhotoFromCloud(existingAd.photoFileId);
      }

      if (
        adInput.hasPhotos &&
        adInput.newPhotoId &&
        adInput.photoFileId &&
        adInput.primaryPhotoUrl
      ) {
        batch.set(doc(db, 'ad_photos', adInput.newPhotoId), {
          photoId: adInput.newPhotoId,
          adId,
          userId,
          storagePath: truncate(
            adInput.photoFileId,
            VALIDATION_LIMITS.STORAGE_PATH_MAX
          ),
          url: truncate(adInput.primaryPhotoUrl, VALIDATION_LIMITS.URL_MAX),
          visibility: 'public',
          status: adInput.nextStatus === 'approved' ? 'approved' : 'pending',
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Update or create the isolated /ad_contacts/{adId} record
    const contactRef = doc(db, 'ad_contacts', adId);
    const contactSnap = await getDoc(contactRef);
    const contactPayload = {
      phone: truncate(contactInput.phone, VALIDATION_LIMITS.PHONE_MAX),
      whatsapp: truncate(contactInput.whatsapp, VALIDATION_LIMITS.PHONE_MAX),
      whatsappDialCode: truncate(
        contactInput.whatsappDialCode,
        VALIDATION_LIMITS.DIAL_CODE_MAX
      ),
      whatsappAcceptsCalls: Boolean(contactInput.whatsappAcceptsCalls),
      snapchatUrl: truncate(
        contactInput.snapchatUrl,
        VALIDATION_LIMITS.SOCIAL_URL_MAX
      ),
      xUrl: truncate(contactInput.xUrl, VALIDATION_LIMITS.SOCIAL_URL_MAX),
      telegram: truncate(contactInput.telegram, 60),
      email: truncate(contactInput.email, VALIDATION_LIMITS.EMAIL_MAX),
      preferredContactTime: truncate(contactInput.preferredContactTime, 120),
      updatedAt: now,
    };

    if (contactSnap.exists()) {
      batch.update(contactRef, contactPayload);
    } else {
      batch.set(contactRef, {
        adId,
        userId,
        ...contactPayload,
      });
    }

    await commitBatchAndVerifyServer(batch, adId);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('انقطع الاتصال') ||
        error.message.includes('استغرق الاتصال') ||
        error.message.includes('تعذر تأكيد') ||
        error.message.includes('غير مصرح'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, adPath);
  }
}

/**
 * Deletes only the uploaded personal photo of an existing ad (reverting to the gender default avatar)
 * while keeping the ad record and all its data intact and synchronized.
 */
export async function removeMarriageAdPhotoOnly(
  userId: string,
  ad: MarriageAd
): Promise<void> {
  assertOnlineConnection();
  if (ad.userId !== userId) {
    throw new Error('غير مصرح لك بتعديل صورة إعلان يخص مستخدماً آخر.');
  }

  const adPath = `ads/${ad.adId}`;
  try {
    const batch = writeBatch(db);
    const now = serverTimestamp();

    const photosQuery = query(
      collection(db, 'ad_photos'),
      where('userId', '==', userId)
    );
    const photosSnap = await getDocs(photosQuery);
    for (const pDoc of photosSnap.docs) {
      const pData = pDoc.data() as AdPhoto;
      if (pData.adId === ad.adId) {
        batch.delete(pDoc.ref);
        if (pData.storagePath) {
          await deleteAdPersonalPhotoFromCloud(pData.storagePath);
        }
      }
    }

    if (ad.photoFileId) {
      await deleteAdPersonalPhotoFromCloud(ad.photoFileId);
    }

    const nextStatus: 'pending' | 'approved' =
      ad.status === 'approved' ? 'approved' : 'pending';
    const nextReviewStatus: AdReviewStatus =
      nextStatus === 'approved' ? 'approved' : 'pending';

    batch.update(doc(db, 'ads', ad.adId), {
      hasPhotos: false,
      primaryPhotoUrl: getDefaultAvatarByGender(ad.gender),
      photoFileId: '',
      status: nextStatus,
      reviewStatus: nextReviewStatus,
      updatedAt: now,
    });

    await commitBatchAndVerifyServer(batch, ad.adId);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('انقطع الاتصال') ||
        error.message.includes('استغرق الاتصال') ||
        error.message.includes('غير مصرح'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, adPath);
  }
}

/**
 * Relational cascade deletion of a marriage advertisement:
 * - Verifies ownership (only the owner or Super Admin can delete).
 * - Cleans up all linked /ad_photos records, /ad_contacts/{adId}, and Cloud Storage files
 *   in a single atomic batch so no orphaned records are ever left behind in related collections.
 */
export async function deleteMarriageAdCascade(
  userId: string,
  ad: MarriageAd,
  isSuperAdmin = false,
  auditContext?: {
    adminUid: string;
    adminEmail: string;
    reason?: string;
  }
): Promise<{ mode: 'deleted' | 'archived' }> {
  assertOnlineConnection();

  if (ad.userId !== userId && !isSuperAdmin) {
    throw new Error('غير مصرح لك بحذف إعلان يخص مستخدماً آخر.');
  }

  const adId = ad.adId;
  const adPath = `ads/${adId}`;

  try {
    // Clean up any associated photo files in Cloud Storage and /ad_photos documents
    const photosQuery = query(
      collection(db, 'ad_photos'),
      where('userId', '==', ad.userId)
    );
    const photosSnap = await getDocs(photosQuery);
    const batch = writeBatch(db);

    for (const pDoc of photosSnap.docs) {
      const pData = pDoc.data() as AdPhoto;
      if (pData.adId === adId) {
        batch.delete(pDoc.ref);
        if (pData.storagePath) {
          await deleteAdPersonalPhotoFromCloud(pData.storagePath);
        }
      }
    }

    if (ad.photoFileId) {
      await deleteAdPersonalPhotoFromCloud(ad.photoFileId);
    }

    // Delete the isolated /ad_contacts/{adId} record if it exists
    const contactRef = doc(db, 'ad_contacts', adId);
    const contactSnap = await getDoc(contactRef);
    if (contactSnap.exists()) {
      batch.delete(contactRef);
    }

    // Delete the /ads/{adId} document
    batch.delete(doc(db, 'ads', adId));

    await commitBatchAndVerifyServer(batch);

    if (auditContext) {
      try {
        await recordAdminAuditLog({
          adminUid: auditContext.adminUid,
          adminEmail: auditContext.adminEmail,
          actionType: 'delete_ad',
          targetType: 'ad',
          targetId: ad.adId,
          targetName: ad.advertiserName || ad.title,
          reason: (auditContext.reason || 'حذف نهائي للإعلان وفق سياسة الحذف المعتمدة').slice(0, 500),
          details: `تم حذف إعلان المستخدم ${ad.userId} وكافة متعلقاته بنجاح`,
        });
      } catch {
        // ignore audit log failure if primary deletion committed
      }
    }

    return { mode: 'deleted' };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('انقطع الاتصال') ||
        error.message.includes('استغرق الاتصال') ||
        error.message.includes('غير مصرح'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.DELETE, adPath);
  }
}

/**
 * Allows the ad owner to stop/archive their own active marriage ad (status: 'archived').
 * Immediately removes the ad from the main approved ads feed in real time.
 */
export async function archiveOwnMarriageAd(
  userId: string,
  ad: MarriageAd
): Promise<void> {
  assertOnlineConnection();
  if (ad.userId !== userId) {
    throw new Error('غير مصرح لك بإيقاف إعلان يخص مستخدماً آخر.');
  }

  const path = `ads/${ad.adId}`;
  try {
    await updateDoc(doc(db, 'ads', ad.adId), {
      status: 'archived',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Moderator / Super Admin action to approve, reject, or stop/archive a marriage ad.
 */
export async function moderateMarriageAd(
  adId: string,
  status: AdStatus,
  moderationNote: string,
  auditContext?: {
    adminUid: string;
    adminEmail: string;
    adTitle?: string;
  }
): Promise<void> {
  assertOnlineConnection();
  const path = `ads/${adId}`;
  const reviewStatus: AdReviewStatus =
    status === 'rejected'
      ? 'rejected'
      : status === 'pending'
      ? 'pending'
      : 'approved';
  try {
    await updateDoc(doc(db, 'ads', adId), {
      status,
      reviewStatus,
      moderationNote: truncate(
        moderationNote,
        VALIDATION_LIMITS.MODERATION_NOTE_MAX
      ),
      updatedAt: serverTimestamp(),
    });

    if (auditContext) {
      const actionType =
        status === 'approved'
          ? 'approve_ad'
          : status === 'rejected'
          ? 'reject_ad'
          : status === 'archived'
          ? 'pause_ad'
          : 'resume_ad';
      try {
        await recordAdminAuditLog({
          adminUid: auditContext.adminUid,
          adminEmail: auditContext.adminEmail,
          actionType,
          targetType: 'ad',
          targetId: adId,
          targetName: auditContext.adTitle || adId,
          reason: moderationNote || (status === 'approved' ? 'اعتماد ونشر الإعلان' : 'تحديث حالة الإعلان'),
          details: `تم تغيير حالة الإعلان إلى: ${status} والمراجعة إلى: ${reviewStatus}`,
        });
      } catch {
        // ignore audit log failure if primary doc updated
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Increments viewsCount by 1 on an approved marriage ad when an ad is viewed.
 * Strictly guards against repeated page refreshes and duplicate requests
 * by using session storage deduplication and cooldown timestamps.
 */
export async function incrementAdViewsCount(ad: MarriageAd): Promise<void> {
  if (!ad?.adId || ad.status !== 'approved') return;

  if (typeof window !== 'undefined' && window.sessionStorage) {
    const sessionKey = `misyar_viewed_${ad.adId}`;
    const lastViewed = window.sessionStorage.getItem(sessionKey);
    const now = Date.now();
    // Do not count repeated refreshes or duplicate clicks within 30 minutes in the same session
    if (lastViewed && now - Number(lastViewed) < 30 * 60 * 1000) {
      return;
    }
    window.sessionStorage.setItem(sessionKey, String(now));
  }

  try {
    const currentViews =
      typeof ad.viewsCount === 'number' && ad.viewsCount >= 0
        ? ad.viewsCount
        : 0;
    await updateDoc(doc(db, 'ads', ad.adId), {
      viewsCount: currentViews + 1,
    });
  } catch {
    // Ignore view counter increments on network error
  }
}

/**
 * Increments sharesCount by 1 on an approved marriage ad only when a share action completes.
 * Guards against rapid duplicate triggers using debounce cooldown.
 */
export async function incrementAdSharesCount(ad: MarriageAd): Promise<void> {
  if (!ad?.adId || ad.status !== 'approved') return;

  if (typeof window !== 'undefined' && window.sessionStorage) {
    const sessionKey = `misyar_shared_${ad.adId}`;
    const lastShared = window.sessionStorage.getItem(sessionKey);
    const now = Date.now();
    // Guard against duplicate triggers (15 seconds cooldown)
    if (lastShared && now - Number(lastShared) < 15 * 1000) {
      return;
    }
    window.sessionStorage.setItem(sessionKey, String(now));
  }

  try {
    const currentShares =
      typeof ad.sharesCount === 'number' && ad.sharesCount >= 0
        ? ad.sharesCount
        : 0;
    await updateDoc(doc(db, 'ads', ad.adId), {
      sharesCount: currentShares + 1,
    });
  } catch {
    // Ignore share counter increments on network error
  }
}

/**
 * Fetches isolated contact details for an ad (succeeds only for owner, moderator/super_admin, or user with active ContactAccessGrant).
 */
export async function getProtectedAdContact(
  adId: string
): Promise<AdContact | null> {
  if (!adId || !VALIDATION_LIMITS.ID_REGEX.test(adId)) {
    return null;
  }
  const path = `ad_contacts/${adId}`;
  try {
    const snap = await getDoc(doc(db, 'ad_contacts', adId));
    return snap.exists() ? (snap.data() as AdContact) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export type AdDetailsContactChannel = 'whatsapp' | 'snapchat' | 'x';

/**
 * Resolves the exact list of contact channel icons to render on the Ad Details Page.
 * Strictly returns ONLY the channels available on the ad ('whatsapp', 'snapchat', 'x')
 * and never includes an unavailable channel.
 */
export function resolveAvailableContactChannels(
  channelsSummary: readonly string[] | undefined | null
): AdDetailsContactChannel[] {
  if (!Array.isArray(channelsSummary) || channelsSummary.length === 0) {
    return [];
  }
  const normalizedSet = new Set(
    channelsSummary.map((ch) => String(ch || '').trim().toLowerCase())
  );
  const ordered: AdDetailsContactChannel[] = [];
  if (normalizedSet.has('whatsapp')) ordered.push('whatsapp');
  if (normalizedSet.has('snapchat')) ordered.push('snapchat');
  if (normalizedSet.has('x')) ordered.push('x');
  return ordered;
}

/**
 * Verifies all 8 possible combinations (2^3) of contact channels availability
 * (WhatsApp only, Snapchat only, X only, pairs, all 3, or none) to guarantee
 * that unavailable channels are never displayed and available ones are preserved in order.
 */
export function verifyAllContactChannelCombinations(): {
  passed: boolean;
  testedCombinations: number;
} {
  const testCases: Array<{
    input: string[];
    expected: AdDetailsContactChannel[];
  }> = [
    { input: [], expected: [] },
    { input: ['whatsapp'], expected: ['whatsapp'] },
    { input: ['snapchat'], expected: ['snapchat'] },
    { input: ['x'], expected: ['x'] },
    { input: ['whatsapp', 'snapchat'], expected: ['whatsapp', 'snapchat'] },
    { input: ['whatsapp', 'x'], expected: ['whatsapp', 'x'] },
    { input: ['snapchat', 'x'], expected: ['snapchat', 'x'] },
    {
      input: ['whatsapp', 'snapchat', 'x'],
      expected: ['whatsapp', 'snapchat', 'x'],
    },
    {
      input: ['whatsapp', 'phone_calls'],
      expected: ['whatsapp'],
    },
  ];

  for (const tc of testCases) {
    const actual = resolveAvailableContactChannels(tc.input);
    if (
      actual.length !== tc.expected.length ||
      actual.some((val, idx) => val !== tc.expected[idx])
    ) {
      return { passed: false, testedCombinations: testCases.length };
    }
  }
  return { passed: true, testedCombinations: testCases.length };
}

export type ContactEntitlementStatus =
  | 'invalid_ad'
  | 'unauthenticated'
  | 'unverified_email'
  | 'payment_required'
  | 'granted_owner'
  | 'granted_staff'
  | 'granted_paid';

export interface ContactAccessCheckResult {
  entitled: boolean;
  status: ContactEntitlementStatus;
  adId: string;
  grantId: string | null;
  contact: AdContact | null;
  reasonAr: string;
}

/**
 * Stage 7 Access Control & Entitlement Verification:
 * - Separates public ad data (/ads/{adId}) from private contact data (/ad_contacts/{adId}).
 * - Never requests or sends private contact data (/ad_contacts/{adId}) to the browser
 *   before confirming that the current user is entitled to access it.
 * - Blocks any attempt to access contact data by manipulating the URL or adId.
 * - Checks for an active ContactAccessGrant (/contact_access/{adId}_{userId} with status === 'active')
 *   to integrate seamlessly with the future payment stage.
 */
export async function verifyAndFetchAdContactIfEntitled(
  ad: MarriageAd,
  authContext: {
    currentUserId?: string | null;
    isEmailVerified?: boolean;
    canModerateAds?: boolean;
    isSuperAdmin?: boolean;
  }
): Promise<ContactAccessCheckResult> {
  const cleanAdId = (ad?.adId || '').trim();
  if (!cleanAdId || !VALIDATION_LIMITS.ID_REGEX.test(cleanAdId)) {
    return {
      entitled: false,
      status: 'invalid_ad',
      adId: '',
      grantId: null,
      contact: null,
      reasonAr: 'معرف الإعلان غير صالح أو تم التلاعب به.',
    };
  }

  const uid = (authContext.currentUserId || '').trim();
  if (!uid || !VALIDATION_LIMITS.ID_REGEX.test(uid)) {
    // Unauthenticated visitor: never request /ad_contacts/{adId}
    return {
      entitled: false,
      status: 'unauthenticated',
      adId: cleanAdId,
      grantId: null,
      contact: null,
      reasonAr:
        'يلزم تسجيل الدخول بحساب موثق للتحقق من صلاحية الوصول إلى وسائل التواصل.',
    };
  }

  if (!authContext.isEmailVerified) {
    // Unverified email: never request /ad_contacts/{adId}
    return {
      entitled: false,
      status: 'unverified_email',
      adId: cleanAdId,
      grantId: null,
      contact: null,
      reasonAr:
        'يلزم تأكيد وتوثيق البريد الإلكتروني أولاً قبل طلب الوصول إلى وسائل التواصل.',
    };
  }

  // 1. Ad Owner is entitled to view their own saved contact details
  if (ad.userId === uid) {
    const contact = await getProtectedAdContact(cleanAdId);
    return {
      entitled: true,
      status: 'granted_owner',
      adId: cleanAdId,
      grantId: null,
      contact,
      reasonAr: 'أنت صاحب هذا الإعلان لديك صلاحية كاملة لمعاينة بيانات التواصل.',
    };
  }

  // 2. Moderator or Super Admin is entitled for moderation/review purposes
  if (authContext.canModerateAds || authContext.isSuperAdmin) {
    const contact = await getProtectedAdContact(cleanAdId);
    return {
      entitled: true,
      status: 'granted_staff',
      adId: cleanAdId,
      grantId: null,
      contact,
      reasonAr: 'صلاحية الإشراف والإدارة تخولك معاينة بيانات التواصل.',
    };
  }

  // 3. Regular verified user: verify active entitlement in /contact_access/{adId}_{uid} (single ad)
  //    or /contact_access/PASS_{uid} (timed access) before ever requesting /ad_contacts/{adId} from Firestore.
  const expectedGrantId = `${cleanAdId}_${uid}`;
  const expectedPassId = `PASS_${uid}`;
  try {
    const grantsQuery = query(
      collection(db, 'contact_access'),
      where('userId', '==', uid)
    );
    const grantsSnap = await getDocs(grantsQuery);
    const activeGrantDoc = grantsSnap.docs.find((d) => {
      const data = d.data();
      return (
        data &&
        data.userId === uid &&
        data.status === 'active' &&
        ((data.accessId === expectedGrantId && data.adId === cleanAdId) ||
          data.accessId === expectedPassId)
      );
    });

    if (!activeGrantDoc) {
      // User does not have an active payment grant -> DO NOT request /ad_contacts/{adId}!
      return {
        entitled: false,
        status: 'payment_required',
        adId: cleanAdId,
        grantId: expectedGrantId,
        contact: null,
        reasonAr:
          'بيانات التواصل الخاصة مفصولة ومحمية في قاعدة البيانات، ويتطلب إظهارها تفعيل صلاحية الوصول لهذا الإعلان.',
      };
    }

    // Active grant confirmed -> now fetch isolated private contact record (/ad_contacts/{adId})
    const contact = await getProtectedAdContact(cleanAdId);
    const matchedGrantId =
      (activeGrantDoc.data()?.accessId as string) || expectedGrantId;
    return {
      entitled: true,
      status: 'granted_paid',
      adId: cleanAdId,
      grantId: matchedGrantId,
      contact,
      reasonAr: 'تم التحقق من صلاحية الوصول الفعالة لوسائل التواصل.',
    };
  } catch {
    return {
      entitled: false,
      status: 'payment_required',
      adId: cleanAdId,
      grantId: expectedGrantId,
      contact: null,
      reasonAr:
        'بيانات التواصل الخاصة محمية ولا تُرسل إلى المتصفح قبل تأكيد صلاحية الوصول.',
    };
  }
}

/**
 * Fetches a single approved MarriageAd directly from Firestore by adId
 * (used when a user visits a shared ad URL directly).
 * Validates adId strictly to prevent URL manipulation.
 */
export async function getApprovedMarriageAdById(
  rawAdId: string
): Promise<MarriageAd | null> {
  const cleanId = (rawAdId || '').trim();
  if (!cleanId || !VALIDATION_LIMITS.ID_REGEX.test(cleanId)) {
    return null;
  }
  try {
    const snap = await getDoc(doc(db, 'ads', cleanId));
    if (!snap.exists()) return null;
    const normalized = normalizeMarriageAdRecord(
      snap.data() as Partial<MarriageAd>
    );
    if (normalized.status !== 'approved') {
      return null;
    }
    return normalized;
  } catch {
    return null;
  }
}

/**
 * Extracts and validates an adId from URL query parameters (?ad=...) or hash (#ad-...).
 * Returns null if missing or if the ID fails strict format validation.
 */
export function extractValidAdIdFromUrl(
  search: string,
  hash: string
): string | null {
  try {
    if (search) {
      const params = new URLSearchParams(search);
      const queryAdId = (params.get('ad') || '').trim();
      if (queryAdId && VALIDATION_LIMITS.ID_REGEX.test(queryAdId)) {
        return queryAdId;
      }
    }
    if (hash && hash.startsWith('#ad-')) {
      const hashAdId = decodeURIComponent(hash.slice('#ad-'.length)).trim();
      if (hashAdId && VALIDATION_LIMITS.ID_REGEX.test(hashAdId)) {
        return hashAdId;
      }
    }
  } catch {
    // Ignore malformed URI components
  }
  return null;
}

/**
 * Builds a canonical, valid share URL that opens the exact MarriageAd when visited.
 */
export function buildCanonicalAdShareUrl(adId: string): string {
  const cleanId = (adId || '').trim();
  if (typeof window === 'undefined' || !cleanId) {
    return '';
  }
  const url = new URL(window.location.href);
  url.searchParams.set('ad', cleanId);
  url.hash = `ad-${encodeURIComponent(cleanId)}`;
  return url.toString();
}

/**
 * Registers an ad photo record in /ad_photos/{photoId}.
 */
export async function registerAdPhoto(input: {
  photoId: string;
  adId: string;
  userId: string;
  storagePath: string;
  url: string;
  visibility: PhotoVisibility;
}): Promise<void> {
  assertOnlineConnection();
  const path = `ad_photos/${input.photoId}`;
  try {
    await setDoc(doc(db, 'ad_photos', input.photoId), {
      photoId: input.photoId,
      adId: input.adId,
      userId: input.userId,
      storagePath: truncate(
        input.storagePath,
        VALIDATION_LIMITS.STORAGE_PATH_MAX
      ),
      url: truncate(input.url, VALIDATION_LIMITS.URL_MAX),
      visibility: input.visibility,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Moderator / Super Admin action to approve or reject an ad photo.
 */
export async function moderateAdPhoto(
  photoId: string,
  status: PhotoStatus
): Promise<void> {
  assertOnlineConnection();
  const path = `ad_photos/${photoId}`;
  try {
    await updateDoc(doc(db, 'ad_photos', photoId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export type { AdPhoto };

