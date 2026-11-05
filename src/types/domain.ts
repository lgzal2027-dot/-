import { Timestamp } from 'firebase/firestore';

/**
 * Three-tier Role-Based Access Control (RBAC) roles
 * - user: مستخدم عادي (معلن / زائر مسجل)
 * - moderator: مشرف (مراجعة الإعلانات والصور والمدفوعات وتصاريح التواصل)
 * - super_admin: المدير الرئيسي (صلاحيات كاملة + إدارة المشرفين والإعدادات الإدارية)
 */
export type UserRole = 'user' | 'moderator' | 'super_admin';

export type AccountStatus = 'active' | 'suspended' | 'restricted' | 'banned';
export type UserGender = 'male' | 'female' | 'unspecified';
export type AdGender = 'male' | 'female';
export type AdStatus = 'pending' | 'approved' | 'rejected' | 'archived';
export type PhotoVisibility = 'public' | 'authorized_only' | 'private';
export type PhotoStatus = 'pending' | 'approved' | 'rejected';
export type PaymentPurpose =
  | 'unlock_contact'
  | 'timed_access'
  | 'featured_ad'
  | 'subscription';

export type CanonicalPaymentStatus =
  | 'unpaid'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded';

export type PaymentStatus =
  | CanonicalPaymentStatus
  | 'pending'
  | 'approved'
  | 'rejected';

export type ContactAccessStatus = 'active' | 'revoked';

export type PaymentMethodCategory =
  | 'bank_cards'
  | 'app_stores'
  | 'payment_gateways'
  | 'admin_custom';

export type PaymentUnlockScopeType = 'single_ad' | 'timed_access';

export const PAYMENT_SERVICE_COMING_SOON_MESSAGE = 'خدمة الدفع ستتاح لاحقاً';

export const PAYMENT_STATUS_LABELS_AR: Record<PaymentStatus, string> = {
  unpaid: 'لم يتم الدفع',
  processing: 'قيد المعالجة',
  succeeded: 'ناجح',
  failed: 'فاشل',
  refunded: 'مسترد',
  pending: 'قيد المعالجة',
  approved: 'ناجح',
  rejected: 'فاشل',
};

export const ACCOUNT_STATUS_LABELS_AR: Record<AccountStatus, string> = {
  active: 'حساب نشط',
  suspended: 'حساب موقوف',
  restricted: 'حساب مقيد مؤقتاً',
  banned: 'حساب محظور',
};

export interface PaymentMethodDefinition {
  methodId: string;
  category: PaymentMethodCategory;
  titleAr: string;
  descriptionAr: string;
  examplesAr: string;
  enabledForLiveTransactions: boolean;
}

export const EXTENSIBLE_PAYMENT_METHODS_CATALOG: PaymentMethodDefinition[] = [
  {
    methodId: 'bank_cards',
    category: 'bank_cards',
    titleAr: 'البطاقات البنكية',
    descriptionAr: 'الدفع المباشر عبر شبكات البطاقات المصرفية المعتمدة',
    examplesAr: 'مدى (Mada)، فيزا (Visa)، ماستركارد (Mastercard)',
    enabledForLiveTransactions: false,
  },
  {
    methodId: 'app_stores',
    category: 'app_stores',
    titleAr: 'متاجر التطبيقات عند اعتمادها',
    descriptionAr: 'الدفع المدمج عبر أنظمة فوترة متاجر الهواتف الرسمية',
    examplesAr: 'Apple App Store (In-App Purchase)، Google Play Billing',
    enabledForLiveTransactions: false,
  },
  {
    methodId: 'payment_gateways',
    category: 'payment_gateways',
    titleAr: 'بوابات الدفع المحلية والدولية',
    descriptionAr: 'المحافظ الرقمية وبوابات الدفع الإلكترونية الموثقة',
    examplesAr: 'Apple Pay، STC Pay، PayPal، Moyasar، Tap، Stripe',
    enabledForLiveTransactions: false,
  },
  {
    methodId: 'admin_custom',
    category: 'admin_custom',
    titleAr: 'طرق دفع أخرى يحددها المدير',
    descriptionAr: 'وسائل دفع إضافية أو تحويلات موثقة يضيفها ويعتمدها المدير الرئيسي',
    examplesAr: 'الحسابات البنكية الرسمية أو القنوات المعتمدة من الإدارة',
    enabledForLiveTransactions: false,
  },
];

export const BOOTSTRAPPED_SUPER_ADMIN_EMAIL = 'lgzal2027@gmail.com';

export const DEFAULT_MARRIAGE_TYPES: string[] = [
  'زواج مسيار',
  'زواج مسيار معلن للأهل',
  'زواج مسيار بشروط خاصة',
  'زواج شرعي عادي',
];

/**
 * Gender-appropriate default avatar SVG data URLs used when the advertiser does not upload a personal photo.
 */
export const DEFAULT_MALE_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
      <rect width="160" height="160" rx="28" fill="#F5F5F4"/>
      <circle cx="80" cy="62" r="28" fill="#D6D3D1"/>
      <path d="M52 54C52 38.536 64.536 26 80 26C95.464 26 108 38.536 108 54V60H52V54Z" fill="#78716C"/>
      <path d="M48 52H112V58C112 59.1046 111.105 60 110 60H50C48.8954 60 48 59.1046 48 58V52Z" fill="#1C1917"/>
      <path d="M32 138C32 112.595 52.5949 92 78 92H82C107.405 92 128 112.595 128 138V144H32V138Z" fill="#57534E"/>
    </svg>`
  );

export const DEFAULT_FEMALE_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
      <rect width="160" height="160" rx="28" fill="#FAF5FF"/>
      <path d="M42 66C42 43.9086 59.9086 26 82 26C104.091 26 122 43.9086 122 66V118C122 124.627 116.627 130 110 130H54C47.3726 130 42 124.627 42 118V66Z" fill="#78716C"/>
      <circle cx="82" cy="64" r="24" fill="#E7E5E4"/>
      <path d="M36 138C36 114.804 54.804 96 78 96H86C109.196 96 128 114.804 128 138V144H36V138Z" fill="#B45309"/>
    </svg>`
  );

export function getDefaultAvatarByGender(gender: AdGender): string {
  return gender === 'female' ? DEFAULT_FEMALE_AVATAR : DEFAULT_MALE_AVATAR;
}

/**
 * Validation boundaries synchronized verbatim with firebase-blueprint.json & firestore.rules
 */
export const VALIDATION_LIMITS = {
  ID_MAX_LENGTH: 128,
  ID_REGEX: /^[a-zA-Z0-9_-]+$/,
  DISPLAY_NAME_MIN: 2,
  DISPLAY_NAME_MAX: 80,
  COUNTRY_CODE_MIN: 2,
  COUNTRY_CODE_MAX: 10,
  CITY_NAME_MIN: 1,
  CITY_NAME_MAX: 160,
  REGION_LABEL_MIN: 2,
  REGION_LABEL_MAX: 60,
  REGION_NAME_MIN: 1,
  REGION_NAME_MAX: 80,
  MARRIAGE_TYPE_MIN: 2,
  MARRIAGE_TYPE_MAX: 80,
  EMAIL_MIN: 3,
  EMAIL_MAX: 150,
  PHONE_MAX: 30,
  DIAL_CODE_MAX: 10,
  SOCIAL_URL_MAX: 300,
  AD_TITLE_MIN: 2,
  AD_TITLE_MAX: 140,
  AD_AGE_MIN: 18,
  AD_AGE_MAX: 99,
  AD_DETAILS_MIN: 0,
  AD_DETAILS_MAX: 2000,
  AD_REQUIREMENTS_MIN: 0,
  AD_REQUIREMENTS_MAX: 1500,
  MODERATION_NOTE_MAX: 500,
  REASON_MAX: 500,
  URL_MAX: 350000,
  STORAGE_PATH_MAX: 300,
  MAX_PHOTO_BYTES: 5 * 1024 * 1024, // 5MB
} as const;

export interface RolePermissions {
  role: UserRole;
  labelAr: string;
  canCreateOwnAd: boolean;
  canManageOwnProfile: boolean;
  canRequestContactAccess: boolean;
  canModerateAds: boolean;
  canModeratePhotos: boolean;
  canReviewPayments: boolean;
  canGrantContactAccess: boolean;
  canSuspendRegularUsers: boolean;
  canManageModerators: boolean;
  canManageAdminSettings: boolean;
}

export function getRolePermissions(role: UserRole): RolePermissions {
  switch (role) {
    case 'super_admin':
      return {
        role: 'super_admin',
        labelAr: 'المدير الرئيسي',
        canCreateOwnAd: true,
        canManageOwnProfile: true,
        canRequestContactAccess: true,
        canModerateAds: true,
        canModeratePhotos: true,
        canReviewPayments: true,
        canGrantContactAccess: true,
        canSuspendRegularUsers: true,
        canManageModerators: true,
        canManageAdminSettings: true,
      };
    case 'moderator':
      return {
        role: 'moderator',
        labelAr: 'مشرف',
        canCreateOwnAd: true,
        canManageOwnProfile: true,
        canRequestContactAccess: true,
        canModerateAds: true,
        canModeratePhotos: true,
        canReviewPayments: true,
        canGrantContactAccess: true,
        canSuspendRegularUsers: true,
        canManageModerators: false,
        canManageAdminSettings: false,
      };
    case 'user':
    default:
      return {
        role: 'user',
        labelAr: 'مستخدم عادي',
        canCreateOwnAd: true,
        canManageOwnProfile: true,
        canRequestContactAccess: true,
        canModerateAds: false,
        canModeratePhotos: false,
        canReviewPayments: false,
        canGrantContactAccess: false,
        canSuspendRegularUsers: false,
        canManageModerators: false,
        canManageAdminSettings: false,
      };
  }
}

export interface UserProfile {
  uid: string;
  displayName: string;
  gender: UserGender;
  countryCode: string;
  cityName: string;
  role: UserRole;
  accountStatus: AccountStatus;
  restrictionReason?: string;
  restrictionUntil?: Timestamp | null;
  bannedReason?: string;
  bannedAt?: Timestamp | null;
  emailVerified?: boolean;
  email?: string;
  adsCount?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type AdminAuditActionType =
  | 'ban_user'
  | 'unban_user'
  | 'restrict_user'
  | 'unrestrict_user'
  | 'approve_ad'
  | 'reject_ad'
  | 'pause_ad'
  | 'resume_ad'
  | 'delete_ad'
  | 'delete_ad_photo'
  | 'assign_role'
  | 'revoke_role'
  | 'update_settings';

export const ADMIN_AUDIT_ACTION_LABELS_AR: Record<AdminAuditActionType, string> = {
  ban_user: 'حظر حساب مستخدم',
  unban_user: 'إلغاء حظر حساب مستخدم',
  restrict_user: 'تقييد حساب مستخدم مؤقتاً',
  unrestrict_user: 'إلغاء تقييد حساب مستخدم',
  approve_ad: 'اعتماد وقبول إعلان زواج',
  reject_ad: 'رفض إعلان زواج مع ذكر السبب',
  pause_ad: 'إيقاف إعلان زواج مؤقتاً',
  resume_ad: 'إعادة تفعيل ونشر إعلان زواج',
  delete_ad: 'حذف إعلان زواج نهائياً',
  delete_ad_photo: 'حذف الصورة الشخصية للإعلان',
  assign_role: 'تعيين صلاحية إدارية',
  revoke_role: 'إلغاء صلاحية إدارية',
  update_settings: 'تحديث إعدادات المنصة',
};

export interface AdminAuditLog {
  logId: string;
  adminUid: string;
  adminEmail: string;
  actionType: AdminAuditActionType;
  targetType: 'user' | 'ad' | 'staff' | 'settings';
  targetId: string;
  targetName: string;
  reason: string;
  durationHours: number;
  details: string;
  createdAt: Timestamp;
}

export interface UserPrivate {
  uid: string;
  email: string;
  phone: string;
  updatedAt: Timestamp;
}

export interface StaffRole {
  uid: string;
  email: string;
  role: 'moderator' | 'super_admin';
  assignedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type AdReviewStatus = 'pending' | 'approved' | 'rejected';

export interface MarriageAd {
  adId: string;
  userId: string;
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
  contactChannelsSummary: string[];
  status: AdStatus;
  reviewStatus: AdReviewStatus;
  moderationNote: string;
  viewsCount: number;
  sharesCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AdPhoto {
  photoId: string;
  adId: string;
  userId: string;
  storagePath: string;
  url: string;
  visibility: PhotoVisibility;
  status: PhotoStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AdContact {
  adId: string;
  userId: string;
  phone: string;
  whatsapp: string;
  whatsappDialCode: string;
  whatsappAcceptsCalls: boolean;
  snapchatUrl: string;
  xUrl: string;
  telegram: string;
  email: string;
  preferredContactTime: string;
  updatedAt: Timestamp;
}

export interface PaymentRecord {
  paymentId: string;
  userId: string;
  targetAdId: string;
  purpose: PaymentPurpose;
  amount: number;
  currency: string;
  method: string;
  referenceNumber: string;
  receiptUrl: string;
  status: PaymentStatus;
  reviewedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ContactAccessGrant {
  accessId: string;
  adId: string;
  userId: string;
  paymentId: string;
  status: ContactAccessStatus;
  grantedBy: string;
  createdAt: Timestamp;
}

export interface AdminSettings {
  settingKey: string;
  platformEnabled: boolean;
  requireAdApproval: boolean;
  requirePhotoApproval: boolean;
  contactUnlockFee: number;
  defaultCurrency: string;
  supportWhatsapp: string;
  updatedBy: string;
  updatedAt: Timestamp;
}

export type BannerOrder = '1_then_2' | '2_then_1';
export type TickerFontSize = 'sm' | 'base' | 'lg';
export type TickerDirection = 'ltr' | 'rtl';
export type CardShape = 'rounded' | 'soft' | 'sharp';
export type AdsSortOrder = 'newest' | 'oldest' | 'age_asc' | 'age_desc';
export type AppBgImageFit = 'cover' | 'contain' | 'repeat';
export type CardFontSize = 'sm' | 'base' | 'lg';
export type CardFontWeight = 'normal' | 'medium' | 'bold';
export type CardBorderStyle = 'solid' | 'dashed' | 'double';
export type CardRadius = 'none' | 'rounded' | 'soft' | 'pill';
export type CardPadding = 'compact' | 'normal' | 'relaxed';
export type CardGap = 'compact' | 'normal' | 'relaxed';

export interface UiConfigSettings {
  configId: string;
  bannerEnabled: boolean;
  bannerImage1Url: string;
  bannerImage2Url: string;
  bannerOrder: BannerOrder;
  bannerIntervalSeconds: number;
  bannerSlot1Active: boolean;
  bannerSlot2Active: boolean;
  bannerImage1Link: string;
  bannerImage2Link: string;
  tickerEnabled: boolean;
  tickerText: string;
  tickerFontSize: TickerFontSize;
  tickerDirection: TickerDirection;
  tickerTextColor: string;
  tickerBgColor: string;
  tickerSpeedSeconds: number;
  appBgColor: string;
  appBgImageUrl: string;
  appBgImageFit: AppBgImageFit;
  appBgOverlayOpacity: number;
  appBgOverlayColor: string;
  cardShape: CardShape;
  cardBgColor: string;
  cardBgImageUrl: string;
  cardBgOpacity: number;
  cardTextColor: string;
  cardSecondaryTextColor: string;
  cardFontSize: CardFontSize;
  cardFontWeight: CardFontWeight;
  cardBorderColor: string;
  cardBorderWidth: number;
  cardBorderStyle: CardBorderStyle;
  cardRadius: CardRadius;
  cardPadding: CardPadding;
  cardGap: CardGap;
  cardAccentColor: string;
  adsSortOrder: AdsSortOrder;
  marriageTypes: string[];
  supportWhatsapp: string;
  supportPhone: string;
  supportTelegram: string;
  supportEmail: string;
  supportNote: string;
  disabledCountryCodes: string[];
  customRegionsJson: string;
  paymentPolicyScope: PaymentUnlockScopeType;
  paymentMethodsNote: string;
  updatedBy: string;
  updatedAt?: Timestamp;
}

export interface BilingualCity {
  nameAr: string;
  nameEn: string;
}

export interface ArabSubRegion {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface ArabRegion {
  id: string;
  nameAr: string;
  nameEn: string;
  subRegions: ArabSubRegion[];
}

export interface ArabCountry {
  code: string;
  flag: string;
  dialCode: string;
  nameAr: string;
  nameEn: string;
  isGulf: boolean;
  regionLabelAr: string;
  subRegionLabelAr: string;
  regions: ArabRegion[];
  cities: BilingualCity[];
}

export const MANUAL_REGION_ID = 'MANUAL_REGION';
export const MANUAL_SUBREGION_ID = 'MANUAL_SUBREGION';

type RawArabCountry = Omit<ArabCountry, 'regions'> & {
  regions: Array<{
    nameAr: string;
    nameEn: string;
    subRegions: Array<{ nameAr: string; nameEn: string }>;
  }>;
};

function toFixedSlug(code: string, prefix: string, index: number, nameEn: string): string {
  const clean = nameEn
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
  const num = String(index + 1).padStart(2, '0');
  return `${code}_${prefix}${num}_${clean || 'LOC'}`;
}

/**
 * Complete directory of all 22 Arab League countries with flags, international dial codes,
 * authentic local administrative division terminology, and fixed deterministic IDs for every region and sub-region.
 */
const RAW_ARAB_COUNTRIES: RawArabCountry[] = [
  {
    code: 'SA',
    flag: '🇸🇦',
    dialCode: '+966',
    nameAr: 'المملكة العربية السعودية',
    nameEn: 'Saudi Arabia',
    isGulf: true,
    regionLabelAr: 'المنطقة الإدارية',
    subRegionLabelAr: 'المدينة / المحافظة',
    regions: [
      {
        nameAr: 'منطقة الرياض',
        nameEn: 'Riyadh Region',
        subRegions: [
          { nameAr: 'الرياض', nameEn: 'Riyadh' },
          { nameAr: 'الخرج', nameEn: 'Al Kharj' },
          { nameAr: 'الدرعية', nameEn: 'Diriyah' },
          { nameAr: 'المجمعة', nameEn: 'Al Majmaah' },
          { nameAr: 'الدوادمي', nameEn: 'Dawadmi' },
          { nameAr: 'الزلفي', nameEn: 'Al Zulfi' },
          { nameAr: 'وادي الدواسر', nameEn: 'Wadi Al-Dawasir' },
        ],
      },
      {
        nameAr: 'منطقة مكة المكرمة',
        nameEn: 'Makkah Region',
        subRegions: [
          { nameAr: 'جدة', nameEn: 'Jeddah' },
          { nameAr: 'مكة المكرمة', nameEn: 'Makkah' },
          { nameAr: 'الطائف', nameEn: 'Taif' },
          { nameAr: 'رابغ', nameEn: 'Rabigh' },
          { nameAr: 'القنفذة', nameEn: 'Al Qunfudhah' },
          { nameAr: 'الليث', nameEn: 'Al Lith' },
        ],
      },
      {
        nameAr: 'المنطقة الشرقية',
        nameEn: 'Eastern Province',
        subRegions: [
          { nameAr: 'الدمام', nameEn: 'Dammam' },
          { nameAr: 'الخبر', nameEn: 'Khobar' },
          { nameAr: 'الظهران', nameEn: 'Dhahran' },
          { nameAr: 'الأحساء (الهفوف)', nameEn: 'Al-Ahsa' },
          { nameAr: 'الجبيل', nameEn: 'Jubail' },
          { nameAr: 'القطيف', nameEn: 'Qatif' },
          { nameAr: 'حفر الباطن', nameEn: 'Hafar Al-Batin' },
        ],
      },
      {
        nameAr: 'منطقة المدينة المنورة',
        nameEn: 'Madinah Region',
        subRegions: [
          { nameAr: 'المدينة المنورة', nameEn: 'Madinah' },
          { nameAr: 'ينبع', nameEn: 'Yanbu' },
          { nameAr: 'العلا', nameEn: 'AlUla' },
          { nameAr: 'بدر', nameEn: 'Badr' },
        ],
      },
      {
        nameAr: 'منطقة القصيم',
        nameEn: 'Qassim Region',
        subRegions: [
          { nameAr: 'بريدة', nameEn: 'Buraidah' },
          { nameAr: 'عنيزة', nameEn: 'Unaizah' },
          { nameAr: 'الرس', nameEn: 'Ar Rass' },
          { nameAr: 'البكيرية', nameEn: 'Al Bukayriyah' },
        ],
      },
      {
        nameAr: 'منطقة عسير',
        nameEn: 'Asir Region',
        subRegions: [
          { nameAr: 'أبها', nameEn: 'Abha' },
          { nameAr: 'خميس مشيط', nameEn: 'Khamis Mushait' },
          { nameAr: 'بيشة', nameEn: 'Bisha' },
          { nameAr: 'محايل عسير', nameEn: 'Muhayil' },
        ],
      },
      {
        nameAr: 'منطقة تبوك',
        nameEn: 'Tabuk Region',
        subRegions: [
          { nameAr: 'تبوك', nameEn: 'Tabuk' },
          { nameAr: 'ضباء', nameEn: 'Duba' },
          { nameAr: 'أملج', nameEn: 'Umluj' },
          { nameAr: 'الوجه', nameEn: 'Al Wajh' },
        ],
      },
      {
        nameAr: 'منطقة حائل',
        nameEn: 'Hail Region',
        subRegions: [
          { nameAr: 'حائل', nameEn: 'Hail' },
          { nameAr: 'بقعاء', nameEn: 'Baqaa' },
        ],
      },
      {
        nameAr: 'منطقة جازان',
        nameEn: 'Jazan Region',
        subRegions: [
          { nameAr: 'جازان', nameEn: 'Jazan' },
          { nameAr: 'صبيا', nameEn: 'Sabya' },
          { nameAr: 'أبو عريش', nameEn: 'Abu Arish' },
        ],
      },
      {
        nameAr: 'منطقة نجران',
        nameEn: 'Najran Region',
        subRegions: [
          { nameAr: 'نجران', nameEn: 'Najran' },
          { nameAr: 'شرورة', nameEn: 'Sharurah' },
        ],
      },
      {
        nameAr: 'منطقة الباحة',
        nameEn: 'Al Bahah Region',
        subRegions: [
          { nameAr: 'الباحة', nameEn: 'Al Bahah' },
          { nameAr: 'بلجرشي', nameEn: 'Baljurashi' },
        ],
      },
      {
        nameAr: 'منطقة الجوف',
        nameEn: 'Al Jawf Region',
        subRegions: [
          { nameAr: 'سكاكا', nameEn: 'Sakaka' },
          { nameAr: 'القريات', nameEn: 'Al Qurayyat' },
        ],
      },
      {
        nameAr: 'منطقة الحدود الشمالية',
        nameEn: 'Northern Borders Region',
        subRegions: [
          { nameAr: 'عرعر', nameEn: 'Arar' },
          { nameAr: 'رفحاء', nameEn: 'Rafha' },
          { nameAr: 'طريف', nameEn: 'Turaif' },
        ],
      },
    ],
    cities: [
      { nameAr: 'الرياض', nameEn: 'Riyadh' },
      { nameAr: 'جدة', nameEn: 'Jeddah' },
      { nameAr: 'مكة المكرمة', nameEn: 'Makkah' },
      { nameAr: 'المدينة المنورة', nameEn: 'Madinah' },
      { nameAr: 'الدمام', nameEn: 'Dammam' },
      { nameAr: 'الخبر', nameEn: 'Khobar' },
      { nameAr: 'الطائف', nameEn: 'Taif' },
      { nameAr: 'أبها', nameEn: 'Abha' },
      { nameAr: 'تبوك', nameEn: 'Tabuk' },
      { nameAr: 'بريدة', nameEn: 'Buraidah' },
    ],
  },
  {
    code: 'AE',
    flag: '🇦🇪',
    dialCode: '+971',
    nameAr: 'الإمارات العربية المتحدة',
    nameEn: 'United Arab Emirates',
    isGulf: true,
    regionLabelAr: 'الإمارة',
    subRegionLabelAr: 'المدينة / المنطقة',
    regions: [
      {
        nameAr: 'إمارة أبوظبي',
        nameEn: 'Abu Dhabi Emirate',
        subRegions: [
          { nameAr: 'مدينة أبوظبي', nameEn: 'Abu Dhabi City' },
          { nameAr: 'العين', nameEn: 'Al Ain' },
          { nameAr: 'الظفرة', nameEn: 'Al Dhafra' },
        ],
      },
      {
        nameAr: 'إمارة دبي',
        nameEn: 'Dubai Emirate',
        subRegions: [
          { nameAr: 'مدينة دبي', nameEn: 'Dubai City' },
          { nameAr: 'جميرا', nameEn: 'Jumeirah' },
          { nameAr: 'ديرة', nameEn: 'Deira' },
          { nameAr: 'البرشاء', nameEn: 'Al Barsha' },
        ],
      },
      {
        nameAr: 'إمارة الشارقة',
        nameEn: 'Sharjah Emirate',
        subRegions: [
          { nameAr: 'مدينة الشارقة', nameEn: 'Sharjah City' },
          { nameAr: 'خورفكان', nameEn: 'Khor Fakkan' },
          { nameAr: 'كلباء', nameEn: 'Kalba' },
          { nameAr: 'الذيد', nameEn: 'Al Dhaid' },
        ],
      },
      {
        nameAr: 'إمارة عجمان',
        nameEn: 'Ajman Emirate',
        subRegions: [
          { nameAr: 'مدينة عجمان', nameEn: 'Ajman City' },
          { nameAr: 'مصفوت', nameEn: 'Masfout' },
        ],
      },
      {
        nameAr: 'إمارة أم القيوين',
        nameEn: 'Umm Al Quwain Emirate',
        subRegions: [
          { nameAr: 'مدينة أم القيوين', nameEn: 'Umm Al Quwain City' },
          { nameAr: 'فلج المعلا', nameEn: 'Falaj Al Mualla' },
        ],
      },
      {
        nameAr: 'إمارة رأس الخيمة',
        nameEn: 'Ras Al Khaimah Emirate',
        subRegions: [
          { nameAr: 'مدينة رأس الخيمة', nameEn: 'Ras Al Khaimah City' },
          { nameAr: 'الرمس', nameEn: 'Al Rams' },
        ],
      },
      {
        nameAr: 'إمارة الفجيرة',
        nameEn: 'Fujairah Emirate',
        subRegions: [
          { nameAr: 'مدينة الفجيرة', nameEn: 'Fujairah City' },
          { nameAr: 'دبا الفجيرة', nameEn: 'Dibba Al-Fujairah' },
        ],
      },
    ],
    cities: [
      { nameAr: 'أبوظبي', nameEn: 'Abu Dhabi' },
      { nameAr: 'دبي', nameEn: 'Dubai' },
      { nameAr: 'الشارقة', nameEn: 'Sharjah' },
      { nameAr: 'عجمان', nameEn: 'Ajman' },
      { nameAr: 'العين', nameEn: 'Al Ain' },
      { nameAr: 'رأس الخيمة', nameEn: 'Ras Al Khaimah' },
      { nameAr: 'الفجيرة', nameEn: 'Fujairah' },
    ],
  },
  {
    code: 'KW',
    flag: '🇰🇼',
    dialCode: '+965',
    nameAr: 'الكويت',
    nameEn: 'Kuwait',
    isGulf: true,
    regionLabelAr: 'المحافظة',
    subRegionLabelAr: 'المنطقة / الضاحية',
    regions: [
      {
        nameAr: 'محافظة العاصمة',
        nameEn: 'Capital Governorate',
        subRegions: [
          { nameAr: 'مدينة الكويت', nameEn: 'Kuwait City' },
          { nameAr: 'الشامية', nameEn: 'Shamiya' },
          { nameAr: 'الروضة', nameEn: 'Rawda' },
          { nameAr: 'قرطبة', nameEn: 'Qurtuba' },
        ],
      },
      {
        nameAr: 'محافظة حولي',
        nameEn: 'Hawalli Governorate',
        subRegions: [
          { nameAr: 'حولي', nameEn: 'Hawalli' },
          { nameAr: 'السالمية', nameEn: 'Salmiya' },
          { nameAr: 'الجابرية', nameEn: 'Jabriya' },
          { nameAr: 'بيان', nameEn: 'Bayan' },
        ],
      },
      {
        nameAr: 'محافظة الفروانية',
        nameEn: 'Farwaniya Governorate',
        subRegions: [
          { nameAr: 'الفروانية', nameEn: 'Farwaniya' },
          { nameAr: 'خيطان', nameEn: 'Khaitan' },
          { nameAr: 'الأندلس', nameEn: 'Andalous' },
          { nameAr: 'العارضية', nameEn: 'Ardiya' },
        ],
      },
      {
        nameAr: 'محافظة الأحمدي',
        nameEn: 'Ahmadi Governorate',
        subRegions: [
          { nameAr: 'الأحمدي', nameEn: 'Ahmadi' },
          { nameAr: 'الفحيحيل', nameEn: 'Fahaheel' },
          { nameAr: 'المنقف', nameEn: 'Mangaf' },
          { nameAr: 'صباح الأحمد', nameEn: 'Sabah Al Ahmad' },
        ],
      },
      {
        nameAr: 'محافظة الجهراء',
        nameEn: 'Jahra Governorate',
        subRegions: [
          { nameAr: 'الجهراء', nameEn: 'Jahra' },
          { nameAr: 'سعد العبدالله', nameEn: 'Saad Al Abdullah' },
          { nameAr: 'القصر', nameEn: 'Al Qasr' },
        ],
      },
      {
        nameAr: 'محافظة مبارك الكبير',
        nameEn: 'Mubarak Al-Kabeer Governorate',
        subRegions: [
          { nameAr: 'صباح السالم', nameEn: 'Sabah Al-Salem' },
          { nameAr: 'القرين', nameEn: 'Al Qurain' },
          { nameAr: 'العدان', nameEn: 'Al Adan' },
        ],
      },
    ],
    cities: [
      { nameAr: 'مدينة الكويت', nameEn: 'Kuwait City' },
      { nameAr: 'حولي', nameEn: 'Hawalli' },
      { nameAr: 'الفروانية', nameEn: 'Farwaniya' },
      { nameAr: 'الأحمدي', nameEn: 'Ahmadi' },
      { nameAr: 'الجهراء', nameEn: 'Jahra' },
      { nameAr: 'مبارك الكبير', nameEn: 'Mubarak Al-Kabeer' },
    ],
  },
  {
    code: 'QA',
    flag: '🇶🇦',
    dialCode: '+974',
    nameAr: 'قطر',
    nameEn: 'Qatar',
    isGulf: true,
    regionLabelAr: 'البلدية',
    subRegionLabelAr: 'المدينة / المنطقة',
    regions: [
      {
        nameAr: 'بلدية الدوحة',
        nameEn: 'Doha Municipality',
        subRegions: [
          { nameAr: 'الدوحة', nameEn: 'Doha' },
          { nameAr: 'الخليج الغربي (الدفنة)', nameEn: 'West Bay' },
          { nameAr: 'اللؤلؤة', nameEn: 'The Pearl' },
          { nameAr: 'المطار القديم', nameEn: 'Old Airport' },
        ],
      },
      {
        nameAr: 'بلدية الريان',
        nameEn: 'Al Rayyan Municipality',
        subRegions: [
          { nameAr: 'الريان', nameEn: 'Al Rayyan' },
          { nameAr: 'معيذر', nameEn: 'Muaither' },
          { nameAr: 'الغرافة', nameEn: 'Al Gharrafa' },
        ],
      },
      {
        nameAr: 'بلدية الوكرة',
        nameEn: 'Al Wakrah Municipality',
        subRegions: [
          { nameAr: 'الوكرة', nameEn: 'Al Wakrah' },
          { nameAr: 'الوكير', nameEn: 'Al Wukair' },
        ],
      },
      {
        nameAr: 'بلدية الظعاين',
        nameEn: 'Al Daayen Municipality',
        subRegions: [
          { nameAr: 'لوسيل', nameEn: 'Lusail' },
          { nameAr: 'الخيسة', nameEn: 'Al Kheesa' },
        ],
      },
      {
        nameAr: 'بلدية الخور والذخيرة',
        nameEn: 'Al Khor Municipality',
        subRegions: [
          { nameAr: 'الخور', nameEn: 'Al Khor' },
          { nameAr: 'الذخيرة', nameEn: 'Al Thakhira' },
        ],
      },
      {
        nameAr: 'بلدية أم صلال',
        nameEn: 'Umm Salal Municipality',
        subRegions: [
          { nameAr: 'أم صلال محمد', nameEn: 'Umm Salal Mohammed' },
          { nameAr: 'أم صلال علي', nameEn: 'Umm Salal Ali' },
        ],
      },
      {
        nameAr: 'بلدية الشمال',
        nameEn: 'Al Shamal Municipality',
        subRegions: [{ nameAr: 'الرويس', nameEn: 'Madinat ash Shamal' }],
      },
      {
        nameAr: 'بلدية الشيحانية',
        nameEn: 'Al-Shahaniya Municipality',
        subRegions: [{ nameAr: 'الشيحانية', nameEn: 'Al-Shahaniya' }],
      },
    ],
    cities: [
      { nameAr: 'الدوحة', nameEn: 'Doha' },
      { nameAr: 'الريان', nameEn: 'Al Rayyan' },
      { nameAr: 'الوكرة', nameEn: 'Al Wakrah' },
      { nameAr: 'الخور', nameEn: 'Al Khor' },
      { nameAr: 'لوسيل', nameEn: 'Lusail' },
    ],
  },
  {
    code: 'BH',
    flag: '🇧🇭',
    dialCode: '+973',
    nameAr: 'البحرين',
    nameEn: 'Bahrain',
    isGulf: true,
    regionLabelAr: 'المحافظة',
    subRegionLabelAr: 'المدينة / المنطقة',
    regions: [
      {
        nameAr: 'محافظة العاصمة',
        nameEn: 'Capital Governorate',
        subRegions: [
          { nameAr: 'المنامة', nameEn: 'Manama' },
          { nameAr: 'الجفير', nameEn: 'Juffair' },
          { nameAr: 'ضاحية السيف', nameEn: 'Seef' },
        ],
      },
      {
        nameAr: 'محافظة المحرق',
        nameEn: 'Muharraq Governorate',
        subRegions: [
          { nameAr: 'المحرق', nameEn: 'Muharraq' },
          { nameAr: 'البسيتين', nameEn: 'Busaiteen' },
          { nameAr: 'الحد', nameEn: 'Hidd' },
        ],
      },
      {
        nameAr: 'المحافظة الشمالية',
        nameEn: 'Northern Governorate',
        subRegions: [
          { nameAr: 'مدينة حمد', nameEn: 'Hamad Town' },
          { nameAr: 'البديع', nameEn: 'Budaiya' },
          { nameAr: 'سار', nameEn: 'Saar' },
        ],
      },
      {
        nameAr: 'المحافظة الجنوبية',
        nameEn: 'Southern Governorate',
        subRegions: [
          { nameAr: 'الرفاع', nameEn: 'Riffa' },
          { nameAr: 'مدينة عيسى', nameEn: 'Isa Town' },
          { nameAr: 'الزلاق', nameEn: 'Zallaq' },
        ],
      },
    ],
    cities: [
      { nameAr: 'المنامة', nameEn: 'Manama' },
      { nameAr: 'المحرق', nameEn: 'Muharraq' },
      { nameAr: 'الرفاع', nameEn: 'Riffa' },
      { nameAr: 'مدينة حمد', nameEn: 'Hamad Town' },
      { nameAr: 'مدينة عيسى', nameEn: 'Isa Town' },
    ],
  },
  {
    code: 'OM',
    flag: '🇴🇲',
    dialCode: '+968',
    nameAr: 'سلطنة عُمان',
    nameEn: 'Oman',
    isGulf: true,
    regionLabelAr: 'المحافظة',
    subRegionLabelAr: 'الولاية',
    regions: [
      {
        nameAr: 'محافظة مسقط',
        nameEn: 'Muscat Governorate',
        subRegions: [
          { nameAr: 'ولاية مسقط', nameEn: 'Muscat' },
          { nameAr: 'ولاية السيب', nameEn: 'Seeb' },
          { nameAr: 'ولاية بوشر', nameEn: 'Bawshar' },
          { nameAr: 'ولاية مطرح', nameEn: 'Muttrah' },
          { nameAr: 'ولاية العامرات', nameEn: 'Al Amarat' },
        ],
      },
      {
        nameAr: 'محافظة ظفار',
        nameEn: 'Dhofar Governorate',
        subRegions: [
          { nameAr: 'ولاية صلالة', nameEn: 'Salalah' },
          { nameAr: 'ولاية طاقة', nameEn: 'Taqah' },
          { nameAr: 'ولاية مرباط', nameEn: 'Mirbat' },
        ],
      },
      {
        nameAr: 'محافظة شمال الباطنة',
        nameEn: 'North Al Batinah',
        subRegions: [
          { nameAr: 'ولاية صحار', nameEn: 'Sohar' },
          { nameAr: 'ولاية السويق', nameEn: 'Suwayq' },
          { nameAr: 'ولاية صحم', nameEn: 'Saham' },
        ],
      },
      {
        nameAr: 'محافظة جنوب الباطنة',
        nameEn: 'South Al Batinah',
        subRegions: [
          { nameAr: 'ولاية الرستاق', nameEn: 'Rustaq' },
          { nameAr: 'ولاية بركاء', nameEn: 'Barka' },
        ],
      },
      {
        nameAr: 'محافظة الداخلية',
        nameEn: 'Ad Dakhiliyah',
        subRegions: [
          { nameAr: 'ولاية نزوى', nameEn: 'Nizwa' },
          { nameAr: 'ولاية بهلاء', nameEn: 'Bahla' },
          { nameAr: 'ولاية سمائل', nameEn: 'Samail' },
        ],
      },
      {
        nameAr: 'محافظة جنوب الشرقية',
        nameEn: 'South Ash Sharqiyah',
        subRegions: [
          { nameAr: 'ولاية صور', nameEn: 'Sur' },
          { nameAr: 'ولاية جعلان بني بو علي', nameEn: 'Jalan Bani Bu Ali' },
        ],
      },
      {
        nameAr: 'محافظة البريمي',
        nameEn: 'Al Buraimi',
        subRegions: [{ nameAr: 'ولاية البريمي', nameEn: 'Al Buraimi' }],
      },
    ],
    cities: [
      { nameAr: 'مسقط', nameEn: 'Muscat' },
      { nameAr: 'صلالة', nameEn: 'Salalah' },
      { nameAr: 'صحار', nameEn: 'Sohar' },
      { nameAr: 'نزوى', nameEn: 'Nizwa' },
      { nameAr: 'صور', nameEn: 'Sur' },
    ],
  },
  {
    code: 'YE',
    flag: '🇾🇪',
    dialCode: '+967',
    nameAr: 'اليمن',
    nameEn: 'Yemen',
    isGulf: false,
    regionLabelAr: 'المحافظة',
    subRegionLabelAr: 'المديرية / المدينة',
    regions: [
      {
        nameAr: 'أمانة العاصمة صنعاء',
        nameEn: 'Sanaa Capital',
        subRegions: [
          { nameAr: 'مديرية السبعين', nameEn: 'As Sabain' },
          { nameAr: 'مديرية الوحدة', nameEn: 'Al Wahdah' },
          { nameAr: 'مديرية معين', nameEn: 'Maain' },
          { nameAr: 'مديرية شعوب', nameEn: 'Shuub' },
        ],
      },
      {
        nameAr: 'محافظة عدن',
        nameEn: 'Aden Governorate',
        subRegions: [
          { nameAr: 'مديرية خور مكسر', nameEn: 'Khormaksar' },
          { nameAr: 'مديرية المنصورة', nameEn: 'Al Mansoora' },
          { nameAr: 'مديرية الشيخ عثمان', nameEn: 'Ash Sheikh Outhman' },
          { nameAr: 'مديرية صيرة (كريتر)', nameEn: 'Crater' },
        ],
      },
      {
        nameAr: 'محافظة تعز',
        nameEn: 'Taiz Governorate',
        subRegions: [
          { nameAr: 'مديرية القاهرة', nameEn: 'Al Qahirah' },
          { nameAr: 'مديرية المظفر', nameEn: 'Al Mudhaffar' },
          { nameAr: 'مديرية صالة', nameEn: 'Salah' },
        ],
      },
      {
        nameAr: 'محافظة حضرموت',
        nameEn: 'Hadhramaut Governorate',
        subRegions: [
          { nameAr: 'مديرية المكلا', nameEn: 'Al Mukalla' },
          { nameAr: 'مديرية سيئون', nameEn: 'Seiyun' },
          { nameAr: 'مديرية تريم', nameEn: 'Tarim' },
          { nameAr: 'مديرية الشحر', nameEn: 'Ash Shihr' },
        ],
      },
      {
        nameAr: 'محافظة إب',
        nameEn: 'Ibb Governorate',
        subRegions: [
          { nameAr: 'مديرية الظهار', nameEn: 'Adh Dhihar' },
          { nameAr: 'مديرية المشنة', nameEn: 'Al Mashannah' },
          { nameAr: 'مديرية يريم', nameEn: 'Yarim' },
        ],
      },
      {
        nameAr: 'محافظة الحديدة',
        nameEn: 'Al Hudaydah Governorate',
        subRegions: [
          { nameAr: 'مديرية الحوك', nameEn: 'Al Hawak' },
          { nameAr: 'مديرية الميناء', nameEn: 'Al Mina' },
          { nameAr: 'مديرية باجل', nameEn: 'Bajil' },
        ],
      },
      {
        nameAr: 'محافظة مأرب',
        nameEn: 'Marib Governorate',
        subRegions: [{ nameAr: 'مديرية مدينة مأرب', nameEn: 'Marib City' }],
      },
    ],
    cities: [
      { nameAr: 'صنعاء', nameEn: 'Sanaa' },
      { nameAr: 'عدن', nameEn: 'Aden' },
      { nameAr: 'تعز', nameEn: 'Taiz' },
      { nameAr: 'المكلا', nameEn: 'Mukalla' },
    ],
  },
  {
    code: 'EG',
    flag: '🇪🇬',
    dialCode: '+20',
    nameAr: 'مصر',
    nameEn: 'Egypt',
    isGulf: false,
    regionLabelAr: 'المحافظة',
    subRegionLabelAr: 'المدينة / المركز / الحي',
    regions: [
      {
        nameAr: 'محافظة القاهرة',
        nameEn: 'Cairo Governorate',
        subRegions: [
          { nameAr: 'مدينة نصر', nameEn: 'Nasr City' },
          { nameAr: 'مصر الجديدة', nameEn: 'Heliopolis' },
          { nameAr: 'المعادي', nameEn: 'Maadi' },
          { nameAr: 'القاهرة الجديدة (التجمع)', nameEn: 'New Cairo' },
        ],
      },
      {
        nameAr: 'محافظة الجيزة',
        nameEn: 'Giza Governorate',
        subRegions: [
          { nameAr: 'الدقي والمهندسين', nameEn: 'Dokki & Mohandessin' },
          { nameAr: 'السادس من أكتوبر', nameEn: '6th of October' },
          { nameAr: 'الشيخ زايد', nameEn: 'Sheikh Zayed' },
          { nameAr: 'الهرم', nameEn: 'Haram' },
        ],
      },
      {
        nameAr: 'محافظة الإسكندرية',
        nameEn: 'Alexandria Governorate',
        subRegions: [
          { nameAr: 'سموحة', nameEn: 'Smouha' },
          { nameAr: 'سيدي جابر', nameEn: 'Sidi Gaber' },
          { nameAr: 'المنتزه', nameEn: 'Montaza' },
        ],
      },
      {
        nameAr: 'محافظة الدقهلية',
        nameEn: 'Dakahlia Governorate',
        subRegions: [
          { nameAr: 'المنصورة', nameEn: 'Mansoura' },
          { nameAr: 'ميت غمر', nameEn: 'Mit Ghamr' },
        ],
      },
      {
        nameAr: 'محافظة الشرقية',
        nameEn: 'Sharqia Governorate',
        subRegions: [
          { nameAr: 'الزقازيق', nameEn: 'Zagazig' },
          { nameAr: 'العاشر من رمضان', nameEn: '10th of Ramadan' },
        ],
      },
      {
        nameAr: 'محافظة الغربية',
        nameEn: 'Gharbia Governorate',
        subRegions: [
          { nameAr: 'طنطا', nameEn: 'Tanta' },
          { nameAr: 'المحلة الكبرى', nameEn: 'El Mahalla El Kubra' },
        ],
      },
      {
        nameAr: 'محافظة أسيوط',
        nameEn: 'Assiut Governorate',
        subRegions: [{ nameAr: 'مدينة أسيوط', nameEn: 'Assiut City' }],
      },
    ],
    cities: [
      { nameAr: 'القاهرة', nameEn: 'Cairo' },
      { nameAr: 'الإسكندرية', nameEn: 'Alexandria' },
      { nameAr: 'الجيزة', nameEn: 'Giza' },
      { nameAr: 'المنصورة', nameEn: 'Mansoura' },
    ],
  },
  {
    code: 'JO',
    flag: '🇯🇴',
    dialCode: '+962',
    nameAr: 'الأردن',
    nameEn: 'Jordan',
    isGulf: false,
    regionLabelAr: 'المحافظة',
    subRegionLabelAr: 'اللواء / المدينة',
    regions: [
      {
        nameAr: 'محافظة العاصمة (عمّان)',
        nameEn: 'Amman Governorate',
        subRegions: [
          { nameAr: 'لواء قصبة عمّان', nameEn: 'Amman Qasabah' },
          { nameAr: 'لواء الجامعة', nameEn: 'Al Jamiah' },
          { nameAr: 'لواء وادي السير', nameEn: 'Wadi Al Seer' },
          { nameAr: 'لواء ماركا', nameEn: 'Marka' },
        ],
      },
      {
        nameAr: 'محافظة إربد',
        nameEn: 'Irbid Governorate',
        subRegions: [
          { nameAr: 'لواء قصبة إربد', nameEn: 'Irbid Qasabah' },
          { nameAr: 'لواء الرمثا', nameEn: 'Ar Ramtha' },
        ],
      },
      {
        nameAr: 'محافظة الزرقاء',
        nameEn: 'Zarqa Governorate',
        subRegions: [
          { nameAr: 'لواء قصبة الزرقاء', nameEn: 'Zarqa Qasabah' },
          { nameAr: 'لواء الرصيفة', nameEn: 'Russeifa' },
        ],
      },
      {
        nameAr: 'محافظة العقبة',
        nameEn: 'Aqaba Governorate',
        subRegions: [{ nameAr: 'لواء قصبة العقبة', nameEn: 'Aqaba Qasabah' }],
      },
      {
        nameAr: 'محافظة البلقاء',
        nameEn: 'Balqa Governorate',
        subRegions: [{ nameAr: 'السلط', nameEn: 'As-Salt' }],
      },
    ],
    cities: [
      { nameAr: 'عمّان', nameEn: 'Amman' },
      { nameAr: 'إربد', nameEn: 'Irbid' },
      { nameAr: 'الزرقاء', nameEn: 'Zarqa' },
      { nameAr: 'العقبة', nameEn: 'Aqaba' },
    ],
  },
  {
    code: 'IQ',
    flag: '🇮🇶',
    dialCode: '+964',
    nameAr: 'العراق',
    nameEn: 'Iraq',
    isGulf: false,
    regionLabelAr: 'المحافظة',
    subRegionLabelAr: 'القضاء / المدينة',
    regions: [
      {
        nameAr: 'محافظة بغداد',
        nameEn: 'Baghdad Governorate',
        subRegions: [
          { nameAr: 'الكرخ (المنصور)', nameEn: 'Karkh - Mansour' },
          { nameAr: 'الرصافة (الكرادة)', nameEn: 'Rusafa - Karrada' },
          { nameAr: 'الأعظمية', nameEn: 'Adhamiyah' },
        ],
      },
      {
        nameAr: 'محافظة البصرة',
        nameEn: 'Basra Governorate',
        subRegions: [
          { nameAr: 'قضاء البصرة', nameEn: 'Basra District' },
          { nameAr: 'قضاء الزبير', nameEn: 'Al-Zubair' },
        ],
      },
      {
        nameAr: 'محافظة أربيل',
        nameEn: 'Erbil Governorate',
        subRegions: [
          { nameAr: 'مدينة أربيل', nameEn: 'Erbil City' },
          { nameAr: 'سوران', nameEn: 'Soran' },
        ],
      },
      {
        nameAr: 'محافظة نينوى',
        nameEn: 'Nineveh Governorate',
        subRegions: [{ nameAr: 'الموصل', nameEn: 'Mosul' }],
      },
      {
        nameAr: 'محافظة النجف',
        nameEn: 'Najaf Governorate',
        subRegions: [
          { nameAr: 'النجف', nameEn: 'Najaf' },
          { nameAr: 'الكوفة', nameEn: 'Kufa' },
        ],
      },
      {
        nameAr: 'محافظة الأنبار',
        nameEn: 'Anbar Governorate',
        subRegions: [
          { nameAr: 'الرمادي', nameEn: 'Ramadi' },
          { nameAr: 'الفلوجة', nameEn: 'Fallujah' },
        ],
      },
    ],
    cities: [
      { nameAr: 'بغداد', nameEn: 'Baghdad' },
      { nameAr: 'البصرة', nameEn: 'Basra' },
      { nameAr: 'أربيل', nameEn: 'Erbil' },
      { nameAr: 'الموصل', nameEn: 'Mosul' },
    ],
  },
  {
    code: 'SY',
    flag: '🇸🇾',
    dialCode: '+963',
    nameAr: 'سوريا',
    nameEn: 'Syria',
    isGulf: false,
    regionLabelAr: 'المحافظة',
    subRegionLabelAr: 'المنطقة / المدينة',
    regions: [
      {
        nameAr: 'محافظة دمشق',
        nameEn: 'Damascus Governorate',
        subRegions: [
          { nameAr: 'دمشق', nameEn: 'Damascus' },
          { nameAr: 'المزة', nameEn: 'Mazzeh' },
          { nameAr: 'المالكي', nameEn: 'Al-Malki' },
        ],
      },
      {
        nameAr: 'محافظة ريف دمشق',
        nameEn: 'Rif Dimashq',
        subRegions: [
          { nameAr: 'دوما', nameEn: 'Douma' },
          { nameAr: 'قدسيا', nameEn: 'Qudsaya' },
          { nameAr: 'التل', nameEn: 'Al-Tall' },
        ],
      },
      {
        nameAr: 'محافظة حلب',
        nameEn: 'Aleppo Governorate',
        subRegions: [
          { nameAr: 'مدينة حلب', nameEn: 'Aleppo City' },
          { nameAr: 'إعزاز', nameEn: 'Azaz' },
        ],
      },
      {
        nameAr: 'محافظة حمص',
        nameEn: 'Homs Governorate',
        subRegions: [{ nameAr: 'مدينة حمص', nameEn: 'Homs City' }],
      },
      {
        nameAr: 'محافظة اللاذقية',
        nameEn: 'Latakia Governorate',
        subRegions: [
          { nameAr: 'اللاذقية', nameEn: 'Latakia' },
          { nameAr: 'جبلة', nameEn: 'Jableh' },
        ],
      },
    ],
    cities: [
      { nameAr: 'دمشق', nameEn: 'Damascus' },
      { nameAr: 'حلب', nameEn: 'Aleppo' },
      { nameAr: 'حمص', nameEn: 'Homs' },
    ],
  },
  {
    code: 'LB',
    flag: '🇱🇧',
    dialCode: '+961',
    nameAr: 'لبنان',
    nameEn: 'Lebanon',
    isGulf: false,
    regionLabelAr: 'المحافظة',
    subRegionLabelAr: 'القضاء / المدينة',
    regions: [
      {
        nameAr: 'محافظة بيروت',
        nameEn: 'Beirut Governorate',
        subRegions: [
          { nameAr: 'بيروت', nameEn: 'Beirut' },
          { nameAr: 'الحمرا', nameEn: 'Hamra' },
          { nameAr: 'الأشرفية', nameEn: 'Achrafieh' },
        ],
      },
      {
        nameAr: 'محافظة جبل لبنان',
        nameEn: 'Mount Lebanon',
        subRegions: [
          { nameAr: 'قضاء بعبدا', nameEn: 'Baabda' },
          { nameAr: 'قضاء المتن', nameEn: 'Matn' },
          { nameAr: 'قضاء عاليه', nameEn: 'Aley' },
          { nameAr: 'قضاء الشوف', nameEn: 'Chouf' },
        ],
      },
      {
        nameAr: 'محافظة لبنان الشمالي',
        nameEn: 'North Governorate',
        subRegions: [
          { nameAr: 'قضاء طرابلس', nameEn: 'Tripoli' },
          { nameAr: 'قضاء البترون', nameEn: 'Batroun' },
        ],
      },
      {
        nameAr: 'محافظة لبنان الجنوبي',
        nameEn: 'South Governorate',
        subRegions: [
          { nameAr: 'قضاء صيدا', nameEn: 'Sidon' },
          { nameAr: 'قضاء صور', nameEn: 'Tyre' },
        ],
      },
      {
        nameAr: 'محافظة البقاع',
        nameEn: 'Beqaa Governorate',
        subRegions: [{ nameAr: 'قضاء زحلة', nameEn: 'Zahle' }],
      },
    ],
    cities: [
      { nameAr: 'بيروت', nameEn: 'Beirut' },
      { nameAr: 'طرابلس', nameEn: 'Tripoli' },
      { nameAr: 'صيدا', nameEn: 'Sidon' },
    ],
  },
  {
    code: 'PS',
    flag: '🇵🇸',
    dialCode: '+970',
    nameAr: 'فلسطين',
    nameEn: 'Palestine',
    isGulf: false,
    regionLabelAr: 'المحافظة',
    subRegionLabelAr: 'المدينة / البلدة',
    regions: [
      {
        nameAr: 'محافظة القدس',
        nameEn: 'Jerusalem Governorate',
        subRegions: [{ nameAr: 'القدس', nameEn: 'Jerusalem' }],
      },
      {
        nameAr: 'محافظة رام الله والبيرة',
        nameEn: 'Ramallah & Al-Bireh',
        subRegions: [
          { nameAr: 'رام الله', nameEn: 'Ramallah' },
          { nameAr: 'البيرة', nameEn: 'Al-Bireh' },
        ],
      },
      {
        nameAr: 'محافظة نابلس',
        nameEn: 'Nablus Governorate',
        subRegions: [{ nameAr: 'نابلس', nameEn: 'Nablus' }],
      },
      {
        nameAr: 'محافظة الخليل',
        nameEn: 'Hebron Governorate',
        subRegions: [{ nameAr: 'الخليل', nameEn: 'Hebron' }],
      },
      {
        nameAr: 'محافظة غزة',
        nameEn: 'Gaza Governorate',
        subRegions: [{ nameAr: 'مدينة غزة', nameEn: 'Gaza City' }],
      },
    ],
    cities: [
      { nameAr: 'القدس', nameEn: 'Jerusalem' },
      { nameAr: 'رام الله', nameEn: 'Ramallah' },
      { nameAr: 'غزة', nameEn: 'Gaza' },
      { nameAr: 'نابلس', nameEn: 'Nablus' },
    ],
  },
  {
    code: 'SD',
    flag: '🇸🇩',
    dialCode: '+249',
    nameAr: 'السودان',
    nameEn: 'Sudan',
    isGulf: false,
    regionLabelAr: 'الولاية',
    subRegionLabelAr: 'المحلية / المدينة',
    regions: [
      {
        nameAr: 'ولاية الخرطوم',
        nameEn: 'Khartoum State',
        subRegions: [
          { nameAr: 'محلية الخرطوم', nameEn: 'Khartoum' },
          { nameAr: 'محلية أم درمان', nameEn: 'Omdurman' },
          { nameAr: 'محلية الخرطوم بحري', nameEn: 'Khartoum North' },
        ],
      },
      {
        nameAr: 'ولاية البحر الأحمر',
        nameEn: 'Red Sea State',
        subRegions: [{ nameAr: 'بورتسودان', nameEn: 'Port Sudan' }],
      },
      {
        nameAr: 'ولاية الجزيرة',
        nameEn: 'Gezira State',
        subRegions: [{ nameAr: 'ود مدني', nameEn: 'Wad Madani' }],
      },
      {
        nameAr: 'الولاية الشمالية',
        nameEn: 'Northern State',
        subRegions: [{ nameAr: 'دنقلا', nameEn: 'Dongola' }],
      },
    ],
    cities: [
      { nameAr: 'الخرطوم', nameEn: 'Khartoum' },
      { nameAr: 'أم درمان', nameEn: 'Omdurman' },
      { nameAr: 'بورتسودان', nameEn: 'Port Sudan' },
    ],
  },
  {
    code: 'LY',
    flag: '🇱🇾',
    dialCode: '+218',
    nameAr: 'ليبيا',
    nameEn: 'Libya',
    isGulf: false,
    regionLabelAr: 'الشعبية / المنطقة',
    subRegionLabelAr: 'البلدية / المدينة',
    regions: [
      {
        nameAr: 'طرابلس الكبرى',
        nameEn: 'Tripoli District',
        subRegions: [
          { nameAr: 'بلدية طرابلس المركز', nameEn: 'Central Tripoli' },
          { nameAr: 'بلدية تاجوراء', nameEn: 'Tajoura' },
          { nameAr: 'بلدية جنزور', nameEn: 'Janzour' },
        ],
      },
      {
        nameAr: 'بنغازي',
        nameEn: 'Benghazi District',
        subRegions: [{ nameAr: 'بلدية بنغازي', nameEn: 'Benghazi' }],
      },
      {
        nameAr: 'مصراتة',
        nameEn: 'Misrata District',
        subRegions: [{ nameAr: 'بلدية مصراتة', nameEn: 'Misrata' }],
      },
      {
        nameAr: 'سبها',
        nameEn: 'Sabha District',
        subRegions: [{ nameAr: 'بلدية سبها', nameEn: 'Sabha' }],
      },
    ],
    cities: [
      { nameAr: 'طرابلس', nameEn: 'Tripoli' },
      { nameAr: 'بنغازي', nameEn: 'Benghazi' },
      { nameAr: 'مصراتة', nameEn: 'Misrata' },
    ],
  },
  {
    code: 'TN',
    flag: '🇹🇳',
    dialCode: '+216',
    nameAr: 'تونس',
    nameEn: 'Tunisia',
    isGulf: false,
    regionLabelAr: 'الولاية',
    subRegionLabelAr: 'المعتمدية / المدينة',
    regions: [
      {
        nameAr: 'ولاية تونس',
        nameEn: 'Tunis Governorate',
        subRegions: [
          { nameAr: 'تونس العاصمة', nameEn: 'Tunis City' },
          { nameAr: 'المرسى', nameEn: 'La Marsa' },
          { nameAr: 'قرطاج', nameEn: 'Carthage' },
        ],
      },
      {
        nameAr: 'ولاية صفاقس',
        nameEn: 'Sfax Governorate',
        subRegions: [{ nameAr: 'مدينة صفاقس', nameEn: 'Sfax City' }],
      },
      {
        nameAr: 'ولاية سوسة',
        nameEn: 'Sousse Governorate',
        subRegions: [
          { nameAr: 'مدينة سوسة', nameEn: 'Sousse City' },
          { nameAr: 'حمام سوسة', nameEn: 'Hammam Sousse' },
        ],
      },
      {
        nameAr: 'ولاية أريانة',
        nameEn: 'Ariana Governorate',
        subRegions: [{ nameAr: 'أريانة', nameEn: 'Ariana' }],
      },
    ],
    cities: [
      { nameAr: 'تونس العاصمة', nameEn: 'Tunis' },
      { nameAr: 'صفاقس', nameEn: 'Sfax' },
      { nameAr: 'سوسة', nameEn: 'Sousse' },
    ],
  },
  {
    code: 'DZ',
    flag: '🇩🇿',
    dialCode: '+213',
    nameAr: 'الجزائر',
    nameEn: 'Algeria',
    isGulf: false,
    regionLabelAr: 'الولاية',
    subRegionLabelAr: 'الدائرة / البلدية',
    regions: [
      {
        nameAr: 'ولاية الجزائر',
        nameEn: 'Algiers Province',
        subRegions: [
          { nameAr: 'الجزائر الوسطى', nameEn: 'Alger Centre' },
          { nameAr: 'باب الزوار', nameEn: 'Bab Ezzouar' },
          { nameAr: 'حيدرة', nameEn: 'Hydra' },
          { nameAr: 'الشراقة', nameEn: 'Cheraga' },
        ],
      },
      {
        nameAr: 'ولاية وهران',
        nameEn: 'Oran Province',
        subRegions: [
          { nameAr: 'بلدية وهران', nameEn: 'Oran' },
          { nameAr: 'بئر الجير', nameEn: 'Bir El Djir' },
        ],
      },
      {
        nameAr: 'ولاية قسنطينة',
        nameEn: 'Constantine Province',
        subRegions: [
          { nameAr: 'بلدية قسنطينة', nameEn: 'Constantine' },
          { nameAr: 'الخروب', nameEn: 'El Khroub' },
        ],
      },
      {
        nameAr: 'ولاية سطيف',
        nameEn: 'Setif Province',
        subRegions: [
          { nameAr: 'بلدية سطيف', nameEn: 'Setif' },
          { nameAr: 'العلمة', nameEn: 'El Eulma' },
        ],
      },
      {
        nameAr: 'ولاية عنابة',
        nameEn: 'Annaba Province',
        subRegions: [{ nameAr: 'بلدية عنابة', nameEn: 'Annaba' }],
      },
    ],
    cities: [
      { nameAr: 'الجزائر العاصمة', nameEn: 'Algiers' },
      { nameAr: 'وهران', nameEn: 'Oran' },
      { nameAr: 'قسنطينة', nameEn: 'Constantine' },
    ],
  },
  {
    code: 'MA',
    flag: '🇲🇦',
    dialCode: '+212',
    nameAr: 'المغرب',
    nameEn: 'Morocco',
    isGulf: false,
    regionLabelAr: 'الجهة',
    subRegionLabelAr: 'العمالة / الإقليم / المدينة',
    regions: [
      {
        nameAr: 'جهة الدار البيضاء - سطات',
        nameEn: 'Casablanca-Settat',
        subRegions: [
          { nameAr: 'الدار البيضاء', nameEn: 'Casablanca' },
          { nameAr: 'المحمدية', nameEn: 'Mohammedia' },
          { nameAr: 'الجديدة', nameEn: 'El Jadida' },
        ],
      },
      {
        nameAr: 'جهة الرباط - سلا - القنيطرة',
        nameEn: 'Rabat-Sale-Kenitra',
        subRegions: [
          { nameAr: 'الرباط', nameEn: 'Rabat' },
          { nameAr: 'سلا', nameEn: 'Sale' },
          { nameAr: 'تمارة', nameEn: 'Temara' },
          { nameAr: 'القنيطرة', nameEn: 'Kenitra' },
        ],
      },
      {
        nameAr: 'جهة مراكش - آسفي',
        nameEn: 'Marrakesh-Safi',
        subRegions: [
          { nameAr: 'مراكش', nameEn: 'Marrakesh' },
          { nameAr: 'آسفي', nameEn: 'Safi' },
        ],
      },
      {
        nameAr: 'جهة طنجة - تطوان - الحسيمة',
        nameEn: 'Tanger-Tetouan-Al Hoceima',
        subRegions: [
          { nameAr: 'طنجة', nameEn: 'Tangier' },
          { nameAr: 'تطوان', nameEn: 'Tetouan' },
        ],
      },
      {
        nameAr: 'جهة فاس - مكناس',
        nameEn: 'Fes-Meknes',
        subRegions: [
          { nameAr: 'فاس', nameEn: 'Fes' },
          { nameAr: 'مكناس', nameEn: 'Meknes' },
        ],
      },
      {
        nameAr: 'جهة سوس - ماسة',
        nameEn: 'Souss-Massa',
        subRegions: [{ nameAr: 'أكادير', nameEn: 'Agadir' }],
      },
    ],
    cities: [
      { nameAr: 'الرباط', nameEn: 'Rabat' },
      { nameAr: 'الدار البيضاء', nameEn: 'Casablanca' },
      { nameAr: 'مراكش', nameEn: 'Marrakesh' },
      { nameAr: 'طنجة', nameEn: 'Tangier' },
    ],
  },
  {
    code: 'MR',
    flag: '🇲🇷',
    dialCode: '+222',
    nameAr: 'موريتانيا',
    nameEn: 'Mauritania',
    isGulf: false,
    regionLabelAr: 'الولاية',
    subRegionLabelAr: 'المقاطعة / المدينة',
    regions: [
      {
        nameAr: 'ولاية نواكشوط الغربية',
        nameEn: 'Nouakchott Ouest',
        subRegions: [
          { nameAr: 'مقاطعة تفرغ زينة', nameEn: 'Tevragh Zeina' },
          { nameAr: 'مقاطعة لكصر', nameEn: 'Ksar' },
        ],
      },
      {
        nameAr: 'ولاية نواكشوط الشمالية',
        nameEn: 'Nouakchott Nord',
        subRegions: [
          { nameAr: 'مقاطعة تيارت', nameEn: 'Teyarett' },
          { nameAr: 'مقاطعة دار النعيم', nameEn: 'Dar Naim' },
        ],
      },
      {
        nameAr: 'ولاية داخلت نواذيبو',
        nameEn: 'Dakhlet Nouadhibou',
        subRegions: [{ nameAr: 'نواذيبو', nameEn: 'Nouadhibou' }],
      },
    ],
    cities: [
      { nameAr: 'نواكشوط', nameEn: 'Nouakchott' },
      { nameAr: 'نواذيبو', nameEn: 'Nouadhibou' },
    ],
  },
  {
    code: 'SO',
    flag: '🇸🇴',
    dialCode: '+252',
    nameAr: 'الصومال',
    nameEn: 'Somalia',
    isGulf: false,
    regionLabelAr: 'الإقليم (المحافظة)',
    subRegionLabelAr: 'المدينة / المديرية',
    regions: [
      {
        nameAr: 'إقليم بنادر',
        nameEn: 'Banaadir',
        subRegions: [{ nameAr: 'مقديشو', nameEn: 'Mogadishu' }],
      },
      {
        nameAr: 'إقليم وقويي جالبيد',
        nameEn: 'Woqooyi Galbeed',
        subRegions: [{ nameAr: 'هرجيسا', nameEn: 'Hargeisa' }],
      },
      {
        nameAr: 'إقليم باري',
        nameEn: 'Bari',
        subRegions: [{ nameAr: 'بوصاصو', nameEn: 'Bosaso' }],
      },
    ],
    cities: [
      { nameAr: 'مقديشو', nameEn: 'Mogadishu' },
      { nameAr: 'هرجيسا', nameEn: 'Hargeisa' },
    ],
  },
  {
    code: 'DJ',
    flag: '🇩🇯',
    dialCode: '+253',
    nameAr: 'جيبوتي',
    nameEn: 'Djibouti',
    isGulf: false,
    regionLabelAr: 'الإقليم',
    subRegionLabelAr: 'المدينة / المنطقة',
    regions: [
      {
        nameAr: 'إقليم جيبوتي العاصمة',
        nameEn: 'Djibouti Region',
        subRegions: [{ nameAr: 'مدينة جيبوتي', nameEn: 'Djibouti City' }],
      },
      {
        nameAr: 'إقليم علي صبيح',
        nameEn: 'Ali Sabieh Region',
        subRegions: [{ nameAr: 'علي صبيح', nameEn: 'Ali Sabieh' }],
      },
      {
        nameAr: 'إقليم تاجورة',
        nameEn: 'Tadjourah Region',
        subRegions: [{ nameAr: 'تاجورة', nameEn: 'Tadjourah' }],
      },
    ],
    cities: [
      { nameAr: 'مدينة جيبوتي', nameEn: 'Djibouti City' },
      { nameAr: 'علي صبيح', nameEn: 'Ali Sabieh' },
    ],
  },
  {
    code: 'KM',
    flag: '🇰🇲',
    dialCode: '+269',
    nameAr: 'جزر القمر',
    nameEn: 'Comoros',
    isGulf: false,
    regionLabelAr: 'الجزيرة (المحافظة)',
    subRegionLabelAr: 'المدينة / المنطقة',
    regions: [
      {
        nameAr: 'جزيرة القمر الكبرى (نجازيدجا)',
        nameEn: 'Grande Comore',
        subRegions: [{ nameAr: 'موروني', nameEn: 'Moroni' }],
      },
      {
        nameAr: 'جزيرة أنجوان (نزواني)',
        nameEn: 'Anjouan',
        subRegions: [{ nameAr: 'موتسامودو', nameEn: 'Mutsamudu' }],
      },
      {
        nameAr: 'جزيرة موهيلي (موالي)',
        nameEn: 'Moheli',
        subRegions: [{ nameAr: 'فومبوني', nameEn: 'Fomboni' }],
      },
    ],
    cities: [
      { nameAr: 'موروني', nameEn: 'Moroni' },
      { nameAr: 'موتسامودو', nameEn: 'Mutsamudu' },
    ],
  },
];

/**
 * Enriches all 22 Arab League countries with deterministic, fixed IDs for every region and sub-region
 * so data linking uses stable identifiers (e.g., SA_R01_RIYADH_REGION / SA_R01_S01_RIYADH) rather than text names alone.
 */
export const ARAB_COUNTRIES: ArabCountry[] = RAW_ARAB_COUNTRIES.map((country) => ({
  ...country,
  regions: country.regions.map((reg, rIdx) => {
    const regionId = toFixedSlug(country.code, 'R', rIdx, reg.nameEn);
    return {
      id: regionId,
      nameAr: reg.nameAr,
      nameEn: reg.nameEn,
      subRegions: reg.subRegions.map((sub, sIdx) => ({
        id: toFixedSlug(regionId.slice(0, 12), 'S', sIdx, sub.nameEn),
        nameAr: sub.nameAr,
        nameEn: sub.nameEn,
      })),
    };
  }),
}));

export function getCountryByCode(code: string): ArabCountry | null {
  return ARAB_COUNTRIES.find((c) => c.code === code) || null;
}

export function resolveRegionByIdOrName(
  country: ArabCountry | null | undefined,
  idOrName: string
): ArabRegion | null {
  if (!country || !idOrName) return null;
  return (
    country.regions.find(
      (r) => r.id === idOrName || r.nameAr === idOrName || r.nameEn === idOrName
    ) || null
  );
}

export function resolveSubRegionByIdOrName(
  region: ArabRegion | null | undefined,
  idOrName: string
): ArabSubRegion | null {
  if (!region || !idOrName) return null;
  return (
    region.subRegions.find(
      (s) => s.id === idOrName || s.nameAr === idOrName || s.nameEn === idOrName
    ) || null
  );
}

/**
 * Normalizes any MarriageAd document fetched from Firestore so both newly created ads
 * and any earlier records conform to the full centralized MarriageAd structure.
 */
export function normalizeMarriageAdRecord(raw: Partial<MarriageAd> & Record<string, any>): MarriageAd {
  const country = getCountryByCode(raw.countryCode || 'SA');
  const matchedRegion = resolveRegionByIdOrName(
    country,
    raw.regionId || raw.regionNameAr || ''
  );
  const matchedSubRegion = resolveSubRegionByIdOrName(
    matchedRegion,
    raw.subRegionId || raw.subRegionNameAr || ''
  );

  const status: AdStatus =
    raw.status === 'pending' ||
    raw.status === 'approved' ||
    raw.status === 'rejected' ||
    raw.status === 'archived'
      ? raw.status
      : 'approved';

  const reviewStatus: AdReviewStatus =
    raw.reviewStatus === 'pending' ||
    raw.reviewStatus === 'approved' ||
    raw.reviewStatus === 'rejected'
      ? raw.reviewStatus
      : status === 'rejected'
      ? 'rejected'
      : status === 'pending'
      ? 'pending'
      : 'approved';

  const summary =
    Array.isArray(raw.contactChannelsSummary) && raw.contactChannelsSummary.length > 0
      ? raw.contactChannelsSummary.filter((x: unknown) => typeof x === 'string')
      : ['whatsapp'];

  return {
    adId: String(raw.adId || ''),
    userId: String(raw.userId || ''),
    advertiserName: String(raw.advertiserName || raw.title || 'معلن'),
    title: String(raw.title || raw.advertiserName || 'إعلان زواج'),
    gender: raw.gender === 'female' ? 'female' : 'male',
    age: typeof raw.age === 'number' && !Number.isNaN(raw.age) ? raw.age : 28,
    maritalStatus: String(raw.maritalStatus || raw.marriageType || 'زواج مسيار'),
    marriageType: String(raw.marriageType || raw.maritalStatus || 'زواج مسيار'),
    countryCode: String(raw.countryCode || country?.code || 'SA'),
    countryNameAr: String(raw.countryNameAr || country?.nameAr || 'المملكة العربية السعودية'),
    countryNameEn: String(raw.countryNameEn || country?.nameEn || 'Saudi Arabia'),
    regionId: String(raw.regionId || matchedRegion?.id || MANUAL_REGION_ID),
    regionLabelAr: String(raw.regionLabelAr || country?.regionLabelAr || 'المنطقة'),
    regionNameAr: String(raw.regionNameAr || matchedRegion?.nameAr || raw.cityNameAr || ''),
    subRegionId: String(raw.subRegionId || matchedSubRegion?.id || MANUAL_SUBREGION_ID),
    subRegionLabelAr: String(raw.subRegionLabelAr || country?.subRegionLabelAr || 'المدينة'),
    subRegionNameAr: String(raw.subRegionNameAr || matchedSubRegion?.nameAr || ''),
    cityNameAr: String(raw.cityNameAr || ''),
    cityNameEn: String(raw.cityNameEn || ''),
    details: String(raw.details || ''),
    partnerRequirements: String(raw.partnerRequirements || ''),
    hasPhotos: Boolean(raw.hasPhotos),
    primaryPhotoUrl: String(
      raw.primaryPhotoUrl || getDefaultAvatarByGender(raw.gender === 'female' ? 'female' : 'male')
    ),
    photoFileId: String(raw.photoFileId || ''),
    contactChannelsSummary: summary.length > 0 ? summary : ['whatsapp'],
    status,
    reviewStatus,
    moderationNote: String(raw.moderationNote || ''),
    viewsCount: typeof raw.viewsCount === 'number' && raw.viewsCount >= 0 ? raw.viewsCount : 0,
    sharesCount: typeof raw.sharesCount === 'number' && raw.sharesCount >= 0 ? raw.sharesCount : 0,
    createdAt: raw.createdAt as Timestamp,
    updatedAt: raw.updatedAt as Timestamp,
  };
}

export interface CustomRegionConfigItem {
  id: string;
  nameAr: string;
  nameEn: string;
  subRegions: Array<{
    id: string;
    nameAr: string;
    nameEn: string;
  }>;
}

export type CustomCountryRegionsMap = Record<string, CustomRegionConfigItem[]>;

export function parseCustomRegionsJson(
  rawJson: string | undefined | null
): CustomCountryRegionsMap {
  if (!rawJson || !rawJson.trim()) return {};
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as CustomCountryRegionsMap;
  } catch {
    return {};
  }
}

/**
 * Merges the base ARAB_COUNTRIES catalog with Admin-configured disabled countries
 * and custom regions/cities stored in Firestore (/ui_settings/main).
 */
export function getEffectiveCountriesForUiConfig(
  uiConfig?: Pick<
    UiConfigSettings,
    'disabledCountryCodes' | 'customRegionsJson'
  > | null
): ArabCountry[] {
  const disabledSet = new Set(
    Array.isArray(uiConfig?.disabledCountryCodes)
      ? uiConfig!.disabledCountryCodes.map((c) => String(c || '').toUpperCase())
      : []
  );
  const customMap = parseCustomRegionsJson(uiConfig?.customRegionsJson);

  const merged = ARAB_COUNTRIES.map((country) => {
    const extraRegions = Array.isArray(customMap[country.code])
      ? customMap[country.code]
      : [];
    if (extraRegions.length === 0) {
      return country;
    }

    const existingRegionIds = new Set(country.regions.map((r) => r.id));
    const additionalArabRegions: ArabRegion[] = extraRegions
      .filter((r) => r && r.id && r.nameAr && !existingRegionIds.has(r.id))
      .map((r) => ({
        id: r.id,
        nameAr: r.nameAr,
        nameEn: r.nameEn || r.nameAr,
        subRegions: Array.isArray(r.subRegions)
          ? r.subRegions.map((s) => ({
              id: s.id,
              nameAr: s.nameAr,
              nameEn: s.nameEn || s.nameAr,
            }))
          : [],
      }));

    const additionalCities: BilingualCity[] = additionalArabRegions.map((r) => ({
      nameAr: r.nameAr,
      nameEn: r.nameEn,
    }));

    return {
      ...country,
      regions: [...country.regions, ...additionalArabRegions],
      cities: [...country.cities, ...additionalCities],
    };
  });

  const enabledList = merged.filter((c) => !disabledSet.has(c.code));
  return enabledList.length > 0 ? enabledList : merged;
}

// =========================================================
// نظام خدمة العملاء وتذاكر الدعم الفني
// =========================================================

export type SupportTicketType =
  | 'inquiry'
  | 'complaint'
  | 'report_ad'
  | 'report_user'
  | 'auth_issue'
  | 'payment_issue';

export const SUPPORT_TICKET_TYPE_LABELS_AR: Record<SupportTicketType, string> = {
  inquiry: 'استفسار عام',
  complaint: 'شكوى واقتراح',
  report_ad: 'الإبلاغ عن إعلان',
  report_user: 'الإبلاغ عن حساب',
  auth_issue: 'مشكلة في تسجيل الدخول',
  payment_issue: 'مشكلة في الدفع',
};

export type SupportTicketStatus = 'new' | 'in_progress' | 'resolved' | 'closed';

export const SUPPORT_TICKET_STATUS_LABELS_AR: Record<SupportTicketStatus, string> = {
  new: 'رسالة جديدة',
  in_progress: 'قيد المعالجة',
  resolved: 'تمت المعالجة',
  closed: 'مغلق',
};

export interface SupportTicketReply {
  replyId: string;
  senderUid: string;
  senderName: string;
  senderRole: 'user' | 'moderator' | 'super_admin';
  message: string;
  createdAt: Timestamp | { seconds: number; nanoseconds: number } | string | Date;
}

export interface SupportTicket {
  ticketId: string;
  userId: string;
  userDisplayName: string;
  userEmail: string;
  userPhone?: string;
  type: SupportTicketType;
  subject: string;
  details: string;
  attachmentUrl?: string;
  status: SupportTicketStatus;
  adminNote?: string;
  replies: SupportTicketReply[];
  createdAt: Timestamp | { seconds: number; nanoseconds: number } | string | Date;
  updatedAt: Timestamp | { seconds: number; nanoseconds: number } | string | Date;
  closedAt?: Timestamp | { seconds: number; nanoseconds: number } | string | Date;
}


