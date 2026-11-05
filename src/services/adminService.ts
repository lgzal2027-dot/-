import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  AccountStatus,
  AdminAuditActionType,
  AdminAuditLog,
  AdminSettings,
  BOOTSTRAPPED_SUPER_ADMIN_EMAIL,
  ContactAccessGrant,
  DEFAULT_MARRIAGE_TYPES,
  PaymentRecord,
  StaffRole,
  UiConfigSettings,
  UserProfile,
  UserRole,
} from '../types/domain';

export const DEFAULT_ADMIN_SETTINGS: Omit<AdminSettings, 'updatedAt'> = {
  settingKey: 'general',
  platformEnabled: true,
  requireAdApproval: false,
  requirePhotoApproval: false,
  contactUnlockFee: 150,
  defaultCurrency: 'SAR',
  supportWhatsapp: '',
  updatedBy: 'system',
};

export const DEFAULT_UI_CONFIG: Omit<UiConfigSettings, 'updatedAt'> = {
  configId: 'main',
  bannerEnabled: true,
  bannerImage1Url: '',
  bannerImage2Url: '',
  bannerOrder: '1_then_2',
  bannerIntervalSeconds: 6,
  bannerSlot1Active: true,
  bannerSlot2Active: true,
  bannerImage1Link: '',
  bannerImage2Link: '',
  tickerEnabled: true,
  tickerText:
    'مرحباً بكم في منصة خطابة الزواج المسيار للدول العربية ودول الخليج العربي — جميع الإعلانات تخضع للمراجعة لضمان الجدية والخصوصية التامة',
  tickerFontSize: 'sm',
  tickerDirection: 'ltr',
  tickerTextColor: '#ffffff',
  tickerBgColor: '#1c1917',
  tickerSpeedSeconds: 28,
  appBgColor: '#fafaf9',
  appBgImageUrl: '',
  appBgImageFit: 'cover',
  appBgOverlayOpacity: 0,
  appBgOverlayColor: '#ffffff',
  cardShape: 'rounded',
  cardBgColor: '#ffffff',
  cardBgImageUrl: '',
  cardBgOpacity: 1,
  cardTextColor: '#1c1917',
  cardSecondaryTextColor: '#78716c',
  cardFontSize: 'base',
  cardFontWeight: 'bold',
  cardBorderColor: '#e7e5e4',
  cardBorderWidth: 1,
  cardBorderStyle: 'solid',
  cardRadius: 'rounded',
  cardPadding: 'normal',
  cardGap: 'normal',
  cardAccentColor: '#b45309',
  adsSortOrder: 'newest',
  marriageTypes: [...DEFAULT_MARRIAGE_TYPES],
  supportWhatsapp: '',
  supportPhone: '',
  supportTelegram: '',
  supportEmail: '',
  supportNote: 'نسعد بخدمتكم والرد على استفساراتكم عبر قنوات التواصل المعتمدة.',
  disabledCountryCodes: [],
  customRegionsJson: '{}',
  paymentPolicyScope: 'single_ad',
  paymentMethodsNote: '',
  updatedBy: 'system',
};

/**
 * Fetches general platform settings from Firestore (forces server check when verifyLive=true).
 */
export async function getGeneralAdminSettings(
  verifyLive = false
): Promise<{
  settings: Omit<AdminSettings, 'updatedAt'> | AdminSettings;
  fromFirestore: boolean;
}> {
  const path = 'admin_settings/general';
  try {
    const ref = doc(db, 'admin_settings', 'general');
    const snap = verifyLive ? await getDocFromServer(ref) : await getDoc(ref);
    if (snap.exists()) {
      return {
        settings: snap.data() as AdminSettings,
        fromFirestore: true,
      };
    }
    return {
      settings: DEFAULT_ADMIN_SETTINGS,
      fromFirestore: false,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Real-time subscription to /admin_settings/general so platform status, approval policies,
 * and fee settings reflect live across the app.
 */
export function subscribeToGeneralAdminSettings(
  onUpdate: (settings: Omit<AdminSettings, 'updatedAt'> | AdminSettings) => void
): Unsubscribe {
  const ref = doc(db, 'admin_settings', 'general');
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        onUpdate({
          ...DEFAULT_ADMIN_SETTINGS,
          ...(snap.data() as Partial<AdminSettings>),
        });
      } else {
        onUpdate(DEFAULT_ADMIN_SETTINGS);
      }
    },
    () => {
      onUpdate(DEFAULT_ADMIN_SETTINGS);
    }
  );
}

/**
 * Super Admin only: Initializes or updates general platform settings in /admin_settings/general.
 */
export async function saveGeneralAdminSettings(
  superAdminUid: string,
  input: {
    platformEnabled: boolean;
    requireAdApproval: boolean;
    requirePhotoApproval: boolean;
    contactUnlockFee: number;
    defaultCurrency: string;
    supportWhatsapp: string;
  }
): Promise<void> {
  const path = 'admin_settings/general';
  const ref = doc(db, 'admin_settings', 'general');

  try {
    const existing = await getDoc(ref);
    const payload = {
      settingKey: 'general',
      platformEnabled: Boolean(input.platformEnabled),
      requireAdApproval: Boolean(input.requireAdApproval),
      requirePhotoApproval: Boolean(input.requirePhotoApproval),
      contactUnlockFee: Math.max(
        0,
        Math.min(100000, Number(input.contactUnlockFee) || 0)
      ),
      defaultCurrency: (input.defaultCurrency || 'SAR').trim().slice(0, 10),
      supportWhatsapp: (input.supportWhatsapp || '').trim().slice(0, 30),
      updatedBy: superAdminUid,
      updatedAt: serverTimestamp(),
    };

    if (!existing.exists()) {
      await setDoc(ref, payload);
    } else {
      await updateDoc(ref, {
        platformEnabled: payload.platformEnabled,
        requireAdApproval: payload.requireAdApproval,
        requirePhotoApproval: payload.requirePhotoApproval,
        contactUnlockFee: payload.contactUnlockFee,
        defaultCurrency: payload.defaultCurrency,
        supportWhatsapp: payload.supportWhatsapp,
        updatedBy: payload.updatedBy,
        updatedAt: payload.updatedAt,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Real-time subscription to /ui_settings/main for top banner, news ticker, app background,
 * ad card styles, countries/regions, marriage types, payment policy, and customer service channels.
 */
export function subscribeToUiConfig(
  onUpdate: (config: UiConfigSettings) => void
): Unsubscribe {
  const path = 'ui_settings/main';
  const ref = doc(db, 'ui_settings', 'main');
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Partial<UiConfigSettings>;
        const sanitizedMarriageTypes =
          Array.isArray(data.marriageTypes) && data.marriageTypes.length > 0
            ? data.marriageTypes
                .map((item) => String(item || '').trim())
                .filter((item) => item.length >= 2 && item.length <= 80)
                .slice(0, 25)
            : [...DEFAULT_MARRIAGE_TYPES];

        const sanitizedDisabledCountries = Array.isArray(
          data.disabledCountryCodes
        )
          ? data.disabledCountryCodes
              .map((c) => String(c || '').trim().toUpperCase())
              .filter((c) => c.length >= 2 && c.length <= 10)
              .slice(0, 25)
          : [];

        onUpdate({
          ...DEFAULT_UI_CONFIG,
          ...data,
          bannerSlot1Active: data.bannerSlot1Active !== false,
          bannerSlot2Active: data.bannerSlot2Active !== false,
          bannerImage1Link: String(data.bannerImage1Link || '').slice(0, 500),
          bannerImage2Link: String(data.bannerImage2Link || '').slice(0, 500),
          tickerDirection: data.tickerDirection === 'rtl' ? 'rtl' : 'ltr',
          appBgColor:
            data.appBgColor && data.appBgColor.trim().length >= 4
              ? data.appBgColor.trim()
              : DEFAULT_UI_CONFIG.appBgColor,
          appBgImageUrl: String(data.appBgImageUrl || '').slice(0, 250000),
          appBgImageFit: ['cover', 'contain', 'repeat'].includes(
            data.appBgImageFit as any
          )
            ? (data.appBgImageFit as any)
            : 'cover',
          appBgOverlayOpacity:
            typeof data.appBgOverlayOpacity === 'number' &&
            !Number.isNaN(data.appBgOverlayOpacity)
              ? Math.max(0, Math.min(1, data.appBgOverlayOpacity))
              : 0,
          appBgOverlayColor: String(data.appBgOverlayColor || '#ffffff').slice(
            0,
            20
          ),
          cardShape: ['rounded', 'soft', 'sharp'].includes(data.cardShape as any)
            ? (data.cardShape as any)
            : 'rounded',
          cardBgColor: String(data.cardBgColor || '#ffffff').slice(0, 20),
          cardBgImageUrl: String(data.cardBgImageUrl || '').slice(0, 250000),
          cardBgOpacity:
            typeof data.cardBgOpacity === 'number' &&
            !Number.isNaN(data.cardBgOpacity)
              ? Math.max(0, Math.min(1, data.cardBgOpacity))
              : 1,
          cardTextColor: String(data.cardTextColor || '#1c1917').slice(0, 20),
          cardSecondaryTextColor: String(
            data.cardSecondaryTextColor || '#78716c'
          ).slice(0, 20),
          cardFontSize: ['sm', 'base', 'lg'].includes(data.cardFontSize as any)
            ? (data.cardFontSize as any)
            : 'base',
          cardFontWeight: ['normal', 'medium', 'bold'].includes(
            data.cardFontWeight as any
          )
            ? (data.cardFontWeight as any)
            : 'bold',
          cardBorderColor: String(data.cardBorderColor || '#e7e5e4').slice(
            0,
            20
          ),
          cardBorderWidth:
            typeof data.cardBorderWidth === 'number' &&
            !Number.isNaN(data.cardBorderWidth)
              ? Math.max(0, Math.min(12, data.cardBorderWidth))
              : 1,
          cardBorderStyle: ['solid', 'dashed', 'double'].includes(
            data.cardBorderStyle as any
          )
            ? (data.cardBorderStyle as any)
            : 'solid',
          cardRadius: ['none', 'rounded', 'soft', 'pill'].includes(
            data.cardRadius as any
          )
            ? (data.cardRadius as any)
            : data.cardShape === 'sharp'
            ? 'none'
            : data.cardShape === 'soft'
            ? 'soft'
            : 'rounded',
          cardPadding: ['compact', 'normal', 'relaxed'].includes(
            data.cardPadding as any
          )
            ? (data.cardPadding as any)
            : 'normal',
          cardGap: ['compact', 'normal', 'relaxed'].includes(
            data.cardGap as any
          )
            ? (data.cardGap as any)
            : 'normal',
          cardAccentColor: String(data.cardAccentColor || '#b45309').slice(
            0,
            20
          ),
          disabledCountryCodes: sanitizedDisabledCountries,
          customRegionsJson:
            typeof data.customRegionsJson === 'string' &&
            data.customRegionsJson.trim().length > 0
              ? data.customRegionsJson
              : '{}',
          paymentPolicyScope:
            data.paymentPolicyScope === 'timed_access'
              ? 'timed_access'
              : 'single_ad',
          paymentMethodsNote: String(data.paymentMethodsNote || '').slice(
            0,
            500
          ),
          marriageTypes:
            sanitizedMarriageTypes.length > 0
              ? sanitizedMarriageTypes
              : [...DEFAULT_MARRIAGE_TYPES],
        });
      } else {
        onUpdate(DEFAULT_UI_CONFIG);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

/**
 * Super Admin only: Saves dynamic UI configuration to /ui_settings/main in Firestore.
 */
export async function saveUiConfigSettings(
  superAdminUid: string,
  input: Omit<UiConfigSettings, 'configId' | 'updatedBy' | 'updatedAt'>
): Promise<void> {
  const path = 'ui_settings/main';
  const ref = doc(db, 'ui_settings', 'main');

  try {
    const existing = await getDoc(ref);
    const safeTickerText =
      (input.tickerText || DEFAULT_UI_CONFIG.tickerText).trim().slice(0, 2000) ||
      DEFAULT_UI_CONFIG.tickerText;

    const cleanMarriageTypes = Array.isArray(input.marriageTypes)
      ? Array.from(
          new Set(
            input.marriageTypes
              .map((t) => String(t || '').trim().slice(0, 80))
              .filter((t) => t.length >= 2)
          )
        ).slice(0, 25)
      : [];

    const finalMarriageTypes =
      cleanMarriageTypes.length > 0
        ? cleanMarriageTypes
        : [...DEFAULT_MARRIAGE_TYPES];

    const cleanDisabledCountryCodes = Array.isArray(input.disabledCountryCodes)
      ? Array.from(
          new Set(
            input.disabledCountryCodes
              .map((c) => String(c || '').trim().toUpperCase().slice(0, 10))
              .filter((c) => c.length >= 2)
          )
        ).slice(0, 25)
      : [];

    const payload = {
      configId: 'main',
      bannerEnabled: Boolean(input.bannerEnabled),
      bannerImage1Url: (input.bannerImage1Url || '').trim().slice(0, 250000),
      bannerImage2Url: (input.bannerImage2Url || '').trim().slice(0, 250000),
      bannerOrder: input.bannerOrder === '2_then_1' ? '2_then_1' : '1_then_2',
      bannerIntervalSeconds: Math.max(
        2,
        Math.min(120, Number(input.bannerIntervalSeconds) || 6)
      ),
      bannerSlot1Active: Boolean(input.bannerSlot1Active),
      bannerSlot2Active: Boolean(input.bannerSlot2Active),
      bannerImage1Link: (input.bannerImage1Link || '').trim().slice(0, 500),
      bannerImage2Link: (input.bannerImage2Link || '').trim().slice(0, 500),
      tickerEnabled: Boolean(input.tickerEnabled),
      tickerText: safeTickerText,
      tickerFontSize: ['sm', 'base', 'lg'].includes(input.tickerFontSize)
        ? input.tickerFontSize
        : 'sm',
      tickerDirection: input.tickerDirection === 'rtl' ? 'rtl' : 'ltr',
      tickerTextColor: (input.tickerTextColor || '#ffffff').trim().slice(0, 20),
      tickerBgColor: (input.tickerBgColor || '#1c1917').trim().slice(0, 20),
      tickerSpeedSeconds: Math.max(
        5,
        Math.min(180, Number(input.tickerSpeedSeconds) || 28)
      ),
      appBgColor: (input.appBgColor || '#fafaf9').trim().slice(0, 20),
      appBgImageUrl: (input.appBgImageUrl || '').trim().slice(0, 250000),
      appBgImageFit: ['cover', 'contain', 'repeat'].includes(
        input.appBgImageFit
      )
        ? input.appBgImageFit
        : 'cover',
      appBgOverlayOpacity: Math.max(
        0,
        Math.min(1, Number(input.appBgOverlayOpacity) || 0)
      ),
      appBgOverlayColor: (input.appBgOverlayColor || '#ffffff')
        .trim()
        .slice(0, 20),
      cardShape: ['rounded', 'soft', 'sharp'].includes(input.cardShape)
        ? input.cardShape
        : 'rounded',
      cardBgColor: (input.cardBgColor || '#ffffff').trim().slice(0, 20),
      cardBgImageUrl: (input.cardBgImageUrl || '').trim().slice(0, 250000),
      cardBgOpacity: Math.max(
        0,
        Math.min(
          1,
          typeof input.cardBgOpacity === 'number' ? input.cardBgOpacity : 1
        )
      ),
      cardTextColor: (input.cardTextColor || '#1c1917').trim().slice(0, 20),
      cardSecondaryTextColor: (
        input.cardSecondaryTextColor || '#78716c'
      )
        .trim()
        .slice(0, 20),
      cardFontSize: ['sm', 'base', 'lg'].includes(input.cardFontSize)
        ? input.cardFontSize
        : 'base',
      cardFontWeight: ['normal', 'medium', 'bold'].includes(input.cardFontWeight)
        ? input.cardFontWeight
        : 'bold',
      cardBorderColor: (input.cardBorderColor || '#e7e5e4').trim().slice(0, 20),
      cardBorderWidth: Math.max(
        0,
        Math.min(12, Number(input.cardBorderWidth) || 1)
      ),
      cardBorderStyle: ['solid', 'dashed', 'double'].includes(
        input.cardBorderStyle
      )
        ? input.cardBorderStyle
        : 'solid',
      cardRadius: ['none', 'rounded', 'soft', 'pill'].includes(input.cardRadius)
        ? input.cardRadius
        : input.cardShape === 'sharp'
        ? 'none'
        : input.cardShape === 'soft'
        ? 'soft'
        : 'rounded',
      cardPadding: ['compact', 'normal', 'relaxed'].includes(input.cardPadding)
        ? input.cardPadding
        : 'normal',
      cardGap: ['compact', 'normal', 'relaxed'].includes(input.cardGap)
        ? input.cardGap
        : 'normal',
      cardAccentColor: (input.cardAccentColor || '#b45309').trim().slice(0, 20),
      adsSortOrder: ['newest', 'oldest', 'age_asc', 'age_desc'].includes(
        input.adsSortOrder
      )
        ? input.adsSortOrder
        : 'newest',
      marriageTypes: finalMarriageTypes,
      supportWhatsapp: (input.supportWhatsapp || '').trim().slice(0, 40),
      supportPhone: (input.supportPhone || '').trim().slice(0, 40),
      supportTelegram: (input.supportTelegram || '').trim().slice(0, 80),
      supportEmail: (input.supportEmail || '').trim().slice(0, 150),
      supportNote: (input.supportNote || '').trim().slice(0, 300),
      disabledCountryCodes: cleanDisabledCountryCodes,
      customRegionsJson: (input.customRegionsJson || '{}')
        .trim()
        .slice(0, 50000),
      paymentPolicyScope:
        input.paymentPolicyScope === 'timed_access'
          ? 'timed_access'
          : 'single_ad',
      paymentMethodsNote: (input.paymentMethodsNote || '').trim().slice(0, 500),
      updatedBy: superAdminUid,
      updatedAt: serverTimestamp(),
    };

    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Processes an uploaded banner image file:
 * Compresses it via HTML5 Canvas to prevent oversized payloads or distortion,
 * attempts Firebase Storage upload first, and falls back to optimized Data URL.
 */
export async function processBannerImageUpload(
  file: File,
  slot: 1 | 2
): Promise<string> {
  const { compressedDataUrl, blob } = await new Promise<{
    compressedDataUrl: string;
    blob: Blob | null;
  }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ملف الصورة غير صالح.'));
      img.onload = () => {
        const maxWidth = 1200;
        const maxHeight = 600;
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('تعذر معالجة الصورة.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        canvas.toBlob(
          (b) => {
            resolve({ compressedDataUrl: dataUrl, blob: b });
          },
          'image/jpeg',
          0.82
        );
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

  if (blob) {
    try {
      const path = `banners/banner_slot_${slot}_${Date.now()}.jpg`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, blob, {
        contentType: 'image/jpeg',
      });
      const downloadUrl = await getDownloadURL(fileRef);
      if (downloadUrl && downloadUrl.length <= 250000) {
        return downloadUrl;
      }
    } catch {
      // Fallback to optimized compressed data URL if Storage bucket rules restrict direct client upload
    }
  }

  return compressedDataUrl.slice(0, 250000);
}

/**
 * Processes an uploaded background image file for the app or ad cards:
 * Compresses via HTML5 Canvas for fast mobile loading without layout distortion,
 * attempts Firebase Storage upload first, and falls back to optimized Data URL.
 */
export async function processUiBackgroundImageUpload(
  file: File,
  target: 'app_bg' | 'card_bg'
): Promise<string> {
  const { compressedDataUrl, blob } = await new Promise<{
    compressedDataUrl: string;
    blob: Blob | null;
  }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ملف الصورة غير صالح.'));
      img.onload = () => {
        const maxWidth = target === 'app_bg' ? 1440 : 800;
        const maxHeight = target === 'app_bg' ? 1440 : 800;
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('تعذر معالجة الصورة.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        canvas.toBlob(
          (b) => {
            resolve({ compressedDataUrl: dataUrl, blob: b });
          },
          'image/jpeg',
          0.82
        );
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

  if (blob) {
    try {
      const path = `backgrounds/${target}_${Date.now()}.jpg`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, blob, {
        contentType: 'image/jpeg',
      });
      const downloadUrl = await getDownloadURL(fileRef);
      if (downloadUrl && downloadUrl.length <= 250000) {
        return downloadUrl;
      }
    } catch {
      // Fallback to optimized compressed data URL if Storage bucket rules restrict direct client upload
    }
  }

  return compressedDataUrl.slice(0, 250000);
}

/**
 * Super Admin only: Assigns or updates a staff role ('moderator' | 'super_admin') in /staff_roles/{targetUid}.
 */
export async function assignStaffRole(
  superAdminUid: string,
  target: {
    uid: string;
    email: string;
    role: 'moderator' | 'super_admin';
  }
): Promise<void> {
  const path = `staff_roles/${target.uid}`;
  const ref = doc(db, 'staff_roles', target.uid);

  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      await setDoc(ref, {
        uid: target.uid.trim().slice(0, 128),
        email: target.email.trim().slice(0, 150),
        role: target.role,
        assignedBy: superAdminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        email: target.email.trim().slice(0, 150),
        role: target.role,
        assignedBy: superAdminUid,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Super Admin only: Revokes a staff role by deleting /staff_roles/{targetUid}.
 */
export async function revokeStaffRole(targetUid: string): Promise<void> {
  const path = `staff_roles/${targetUid}`;
  try {
    await deleteDoc(doc(db, 'staff_roles', targetUid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Lists all registered users from /users for the Admin Dashboard (Section 6 & 10).
 */
export async function listAllUsersForAdmin(): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => d.data() as UserProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Lists all staff roles from /staff_roles for the Admin Dashboard (Section 6).
 */
export async function listAllStaffRolesForAdmin(): Promise<StaffRole[]> {
  const path = 'staff_roles';
  try {
    const snap = await getDocs(collection(db, 'staff_roles'));
    return snap.docs.map((d) => d.data() as StaffRole);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Records an immutable administrative action log in /admin_audit_logs/{logId}.
 */
export async function recordAdminAuditLog(input: {
  adminUid: string;
  adminEmail: string;
  actionType: AdminAuditActionType;
  targetType: 'user' | 'ad' | 'staff' | 'settings';
  targetId: string;
  targetName: string;
  reason: string;
  durationHours?: number;
  details?: string;
}): Promise<void> {
  const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const path = `admin_audit_logs/${logId}`;
  try {
    await setDoc(doc(db, 'admin_audit_logs', logId), {
      logId,
      adminUid: input.adminUid.trim().slice(0, 128),
      adminEmail: input.adminEmail.trim().slice(0, 150),
      actionType: input.actionType,
      targetType: input.targetType,
      targetId: input.targetId.trim().slice(0, 128),
      targetName: input.targetName.trim().slice(0, 120),
      reason: (input.reason || '').trim().slice(0, 500),
      durationHours: input.durationHours ?? 0,
      details: (input.details || '').trim().slice(0, 1000),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Lists the most recent administrative audit logs from /admin_audit_logs.
 */
export async function listAdminAuditLogs(limitCount = 60): Promise<AdminAuditLog[]> {
  const path = 'admin_audit_logs';
  try {
    const snap = await getDocs(collection(db, 'admin_audit_logs'));
    const list = snap.docs.map((d) => d.data() as AdminAuditLog);
    list.sort((a, b) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return tb - ta;
    });
    return list.slice(0, limitCount);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Temporarily restricts a user account with a mandatory reason, duration, and audit trail record.
 */
export async function restrictUserAccountByAdmin(input: {
  adminUid: string;
  adminEmail: string;
  targetUser: UserProfile;
  reason: string;
  durationHours: number;
}): Promise<void> {
  if (
    input.targetUser.email?.toLowerCase() ===
    BOOTSTRAPPED_SUPER_ADMIN_EMAIL.toLowerCase()
  ) {
    throw new Error('لا يمكن تقييد حساب المدير الرئيسي للنظام.');
  }
  if (input.targetUser.uid === input.adminUid) {
    throw new Error('لا يمكن تقييد حسابك الشخصي.');
  }
  const cleanReason = (input.reason || '').trim().slice(0, 500);
  if (!cleanReason) {
    throw new Error('يلزم توضيح سبب تقييد الحساب.');
  }

  const path = `users/${input.targetUser.uid}`;
  const nowMs = Date.now();
  const restrictionUntilDate =
    input.durationHours > 0
      ? Timestamp.fromMillis(nowMs + input.durationHours * 3600 * 1000)
      : null;

  try {
    await updateDoc(doc(db, 'users', input.targetUser.uid), {
      accountStatus: 'restricted',
      restrictionReason: cleanReason,
      ...(restrictionUntilDate
        ? { restrictionUntil: restrictionUntilDate }
        : {}),
      updatedAt: serverTimestamp(),
    });

    await recordAdminAuditLog({
      adminUid: input.adminUid,
      adminEmail: input.adminEmail,
      actionType: 'restrict_user',
      targetType: 'user',
      targetId: input.targetUser.uid,
      targetName: input.targetUser.displayName,
      reason: cleanReason,
      durationHours: input.durationHours,
      details: `تم تقييد الحساب لمدة ${
        input.durationHours > 0 ? `${input.durationHours} ساعة` : 'غير محددة'
      }`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Bans a user account with a mandatory reason and audit trail record.
 * Does not delete the account data so history and logs are preserved.
 */
export async function banUserAccountByAdmin(input: {
  adminUid: string;
  adminEmail: string;
  targetUser: UserProfile;
  reason: string;
}): Promise<void> {
  if (
    input.targetUser.email?.toLowerCase() ===
    BOOTSTRAPPED_SUPER_ADMIN_EMAIL.toLowerCase()
  ) {
    throw new Error('لا يمكن حظر حساب المدير الرئيسي للنظام.');
  }
  if (input.targetUser.uid === input.adminUid) {
    throw new Error('لا يمكن حظر حسابك الشخصي.');
  }
  const cleanReason = (input.reason || '').trim().slice(0, 500);
  if (!cleanReason) {
    throw new Error('يلزم توضيح سبب حظر الحساب.');
  }

  const path = `users/${input.targetUser.uid}`;
  try {
    await updateDoc(doc(db, 'users', input.targetUser.uid), {
      accountStatus: 'banned',
      bannedReason: cleanReason,
      bannedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await recordAdminAuditLog({
      adminUid: input.adminUid,
      adminEmail: input.adminEmail,
      actionType: 'ban_user',
      targetType: 'user',
      targetId: input.targetUser.uid,
      targetName: input.targetUser.displayName,
      reason: cleanReason,
      details: 'تم حظر الحساب بشكل كامل من نشر الإعلانات واستخدام المنصة',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Unbans or un-restricts a user account, restoring it to 'active'.
 */
export async function unbanOrUnrestrictUserAccountByAdmin(input: {
  adminUid: string;
  adminEmail: string;
  targetUser: UserProfile;
  reason?: string;
}): Promise<void> {
  const path = `users/${input.targetUser.uid}`;
  const previousStatus = input.targetUser.accountStatus;
  const actionType: AdminAuditActionType =
    previousStatus === 'banned' ? 'unban_user' : 'unrestrict_user';

  try {
    await updateDoc(doc(db, 'users', input.targetUser.uid), {
      accountStatus: 'active',
      restrictionReason: '',
      bannedReason: '',
      updatedAt: serverTimestamp(),
    });

    await recordAdminAuditLog({
      adminUid: input.adminUid,
      adminEmail: input.adminEmail,
      actionType,
      targetType: 'user',
      targetId: input.targetUser.uid,
      targetName: input.targetUser.displayName,
      reason: (input.reason || 'إعادة تفعيل الحساب بعد المراجعة').trim().slice(0, 500),
      details: `تم إلغاء ${
        previousStatus === 'banned' ? 'الحظر' : 'التقييد'
      } وإعادة الحساب إلى الحالة النشطة`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Updates a user's account status in /users/{targetUid}.
 */
export async function updateUserAccountStatusByAdmin(
  targetUid: string,
  accountStatus: AccountStatus
): Promise<void> {
  const path = `users/${targetUid}`;
  try {
    await updateDoc(doc(db, 'users', targetUid), {
      accountStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Super Admin only: Updates a user's role ('user' | 'moderator') in /users/{targetUid}
 * and synchronizes /staff_roles/{targetUid}.
 */
export async function updateUserRoleBySuperAdmin(
  superAdminUid: string,
  targetUid: string,
  targetEmail: string,
  newRole: UserRole
): Promise<void> {
  const userPath = `users/${targetUid}`;
  try {
    await updateDoc(doc(db, 'users', targetUid), {
      role: newRole,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }

  if (newRole === 'moderator' || newRole === 'super_admin') {
    await assignStaffRole(superAdminUid, {
      uid: targetUid,
      email: targetEmail || 'staff@platform.local',
      role: newRole,
    });
  } else {
    try {
      await revokeStaffRole(targetUid);
    } catch {
      // Ignore if no staff_roles doc existed
    }
  }
}

/**
 * Lists all payment records from /payments for the Admin Dashboard (Section 9 & 10).
 */
export async function listAllPaymentsForAdmin(): Promise<PaymentRecord[]> {
  const path = 'payments';
  try {
    const snap = await getDocs(collection(db, 'payments'));
    return snap.docs.map((d) => d.data() as PaymentRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Lists all contact access grants from /contact_access for the Admin Dashboard (Section 9 & 10).
 */
export async function listAllContactGrantsForAdmin(): Promise<
  ContactAccessGrant[]
> {
  const path = 'contact_access';
  try {
    const snap = await getDocs(collection(db, 'contact_access'));
    return snap.docs.map((d) => d.data() as ContactAccessGrant);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export type { StaffRole };

