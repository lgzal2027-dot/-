import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Save,
  Upload,
  Trash2,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Link2,
  RefreshCw,
  Edit3,
  ImageOff,
  Eye,
  Share2,
  Image as ImageIcon,
  Megaphone,
  Palette,
  LayoutGrid,
  FileText,
  Users,
  Globe,
  HeartHandshake,
  CreditCard,
  BarChart3,
  Headphones,
  Settings,
  Search,
  ArrowUp,
  ArrowDown,
  Plus,
  Check,
  Ban,
  ShieldCheck,
  ExternalLink,
  RotateCcw,
  Sliders,
  Layers,
  Type,
  Clock,
  History,
  UserCheck,
  UserX,
  AlertTriangle,
  Play,
  Pause,
  UserPlus,
  Coins,
  TrendingUp,
  PauseCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  ACCOUNT_STATUS_LABELS_AR,
  ADMIN_AUDIT_ACTION_LABELS_AR,
  ARAB_COUNTRIES,
  AdminAuditActionType,
  AdminAuditLog,
  AdsSortOrder,
  AppBgImageFit,
  BannerOrder,
  CardBorderStyle,
  CardFontSize,
  CardFontWeight,
  CardGap,
  CardPadding,
  CardRadius,
  CardShape,
  ContactAccessGrant,
  CustomCountryRegionsMap,
  DEFAULT_MARRIAGE_TYPES,
  MarriageAd,
  PAYMENT_STATUS_LABELS_AR,
  PaymentRecord,
  PaymentStatus,
  PaymentUnlockScopeType,
  StaffRole,
  TickerDirection,
  TickerFontSize,
  UiConfigSettings,
  UserGender,
  UserProfile,
  getDefaultAvatarByGender,
  parseCustomRegionsJson,
} from '../types/domain';
import { updateOwnUserPrivate, updateOwnUserProfile } from '../services/userService';
import {
  DEFAULT_ADMIN_SETTINGS,
  banUserAccountByAdmin,
  getGeneralAdminSettings,
  listAdminAuditLogs,
  listAllContactGrantsForAdmin,
  listAllPaymentsForAdmin,
  listAllStaffRolesForAdmin,
  listAllUsersForAdmin,
  processBannerImageUpload,
  processUiBackgroundImageUpload,
  restrictUserAccountByAdmin,
  saveGeneralAdminSettings,
  saveUiConfigSettings,
  unbanOrUnrestrictUserAccountByAdmin,
  updateUserAccountStatusByAdmin,
  updateUserRoleBySuperAdmin,
} from '../services/adminService';
import {
  deleteMarriageAdCascade,
  fetchUserMarriageAdsFromServer,
  listAllAdsForStaff,
  moderateMarriageAd,
  removeMarriageAdPhotoOnly,
} from '../services/adService';
import {
  listAllSupportTicketsForStaff,
  updateSupportTicketStatus,
  addReplyToSupportTicket,
} from '../services/supportService';

interface AccountAndAdminDrawerProps {
  mode: 'account' | 'admin' | null;
  onClose: () => void;
  uiConfig: UiConfigSettings;
  ownAds?: MarriageAd[];
  onEditAd?: (ad: MarriageAd) => void;
}

type AdminSectionId =
  | 'banner'
  | 'ticker'
  | 'background'
  | 'cards'
  | 'ads'
  | 'users'
  | 'countries'
  | 'marriage_types'
  | 'payments'
  | 'stats'
  | 'support'
  | 'settings';

interface AdminSectionMeta {
  id: AdminSectionId;
  number: number;
  titleAr: string;
  shortTitleAr: string;
  descriptionAr: string;
  superAdminOnly: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

const ADMIN_SECTIONS: AdminSectionMeta[] = [
  {
    id: 'banner',
    number: 1,
    titleAr: 'إدارة المساحة الإعلانية العلوية',
    shortTitleAr: '1. المساحة الإعلانية',
    descriptionAr: 'التحكم في البنر العلوي، رفع صورة أو صورتين، ترتيب العرض ومدته',
    superAdminOnly: true,
    icon: ImageIcon,
  },
  {
    id: 'ticker',
    number: 2,
    titleAr: 'إدارة الشريط الإخباري',
    shortTitleAr: '2. الشريط الإخباري',
    descriptionAr: 'تعديل نص الشريط المتحرك، حجم الخط، الألوان، وسرعة التمرير',
    superAdminOnly: true,
    icon: Megaphone,
  },
  {
    id: 'background',
    number: 3,
    titleAr: 'إدارة خلفية التطبيق',
    shortTitleAr: '3. خلفية التطبيق',
    descriptionAr: 'تخصيص لون الخلفية العامة للواجهة الرئيسية للتطبيق',
    superAdminOnly: true,
    icon: Palette,
  },
  {
    id: 'cards',
    number: 4,
    titleAr: 'إدارة تصميم بطاقات الإعلانات',
    shortTitleAr: '4. تصميم البطاقات',
    descriptionAr: 'تخصيص شكل حواف البطاقات، ألوانها، وترتيب ظهور الإعلانات',
    superAdminOnly: true,
    icon: LayoutGrid,
  },
  {
    id: 'ads',
    number: 5,
    titleAr: 'إدارة الإعلانات',
    shortTitleAr: '5. الإعلانات',
    descriptionAr: 'مراجعة الإعلانات، اعتمادها، إيقافها، رفضها، أو حذفها نهائياً',
    superAdminOnly: false,
    icon: FileText,
  },
  {
    id: 'users',
    number: 6,
    titleAr: 'إدارة المستخدمين',
    shortTitleAr: '6. المستخدمون',
    descriptionAr: 'استعراض الحسابات المسجلة، تفعيل أو إيقاف الحسابات، وإدارة المشرفين',
    superAdminOnly: true,
    icon: Users,
  },
  {
    id: 'countries',
    number: 7,
    titleAr: 'إدارة الدول والمناطق',
    shortTitleAr: '7. الدول والمناطق',
    descriptionAr: 'تفعيل أو إخفاء الدول وإضافة مناطق أو مدن مخصصة لكل دولة',
    superAdminOnly: true,
    icon: Globe,
  },
  {
    id: 'marriage_types',
    number: 8,
    titleAr: 'إدارة أنواع الزواج',
    shortTitleAr: '8. أنواع الزواج',
    descriptionAr: 'إضافة، تعديل، ترتيب، أو حذف أنواع الزواج المتاحة للمعلنين',
    superAdminOnly: true,
    icon: HeartHandshake,
  },
  {
    id: 'payments',
    number: 9,
    titleAr: 'إدارة المدفوعات',
    shortTitleAr: '9. المدفوعات',
    descriptionAr: 'إعداد رسوم فتح التواصل، سياسة الدفع، ومراجعة سجلات المدفوعات',
    superAdminOnly: true,
    icon: CreditCard,
  },
  {
    id: 'stats',
    number: 10,
    titleAr: 'الإحصائيات',
    shortTitleAr: '10. الإحصائيات',
    descriptionAr: 'مؤشرات حية للإعلانات، المشاهدات، المستخدمين، والدول الأكثر نشاطاً',
    superAdminOnly: false,
    icon: BarChart3,
  },
  {
    id: 'support',
    number: 11,
    titleAr: 'خدمة العملاء',
    shortTitleAr: '11. خدمة العملاء',
    descriptionAr: 'إدارة أرقام وحسابات التواصل المباشر مع خدمة العملاء أسفل التطبيق',
    superAdminOnly: true,
    icon: Headphones,
  },
  {
    id: 'settings',
    number: 12,
    titleAr: 'إعدادات التطبيق',
    shortTitleAr: '12. إعدادات التطبيق',
    descriptionAr: 'التحكم في حالة تشغيل المنصة وسياسات المراجعة والأمان',
    superAdminOnly: true,
    icon: Settings,
  },
];

const APP_BG_PRESETS: { labelAr: string; hex: string }[] = [
  { labelAr: 'حجري فاتح (الافتراضي)', hex: '#fafaf9' },
  { labelAr: 'أبيض نقي', hex: '#ffffff' },
  { labelAr: 'رملي دافئ', hex: '#f5f5f4' },
  { labelAr: 'كريمي ذهبي هادئ', hex: '#fffbeb' },
  { labelAr: 'أخضر زمردي هادئ', hex: '#f0fdf4' },
  { labelAr: 'أزرق سماوي هادئ', hex: '#f8fafc' },
];

export function AccountAndAdminDrawer({
  mode,
  onClose,
  uiConfig,
  ownAds = [],
  onEditAd,
}: AccountAndAdminDrawerProps) {
  const {
    firebaseUser,
    isEmailVerified,
    linkedProviders,
    profile,
    privateInfo,
    permissions,
    authError,
    authNotice,
    linkGoogleToCurrentAccount,
    linkPasswordToCurrentAccount,
    verifyServerAdminAccess,
    refreshUserProfile,
  } = useAuth();

  // Server-backed Admin Verification State
  const [isCheckingServerAdmin, setIsCheckingServerAdmin] = useState(false);
  const [serverAdminAllowed, setServerAdminAllowed] = useState(false);
  const [serverAdminDenyReason, setServerAdminDenyReason] = useState<string | null>(
    null
  );

  // Active Admin Section Tab
  const [activeSection, setActiveSection] = useState<AdminSectionId>('banner');

  // Account Profile State
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState<UserGender>('unspecified');
  const [countryCode, setCountryCode] = useState('SA');
  const [cityName, setCityName] = useState('الرياض');
  const [phone, setPhone] = useState('');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Account Credential Linking State
  const [newLinkPassword, setNewLinkPassword] = useState('');
  const [newLinkConfirmPassword, setNewLinkConfirmPassword] = useState('');
  const [isLinkingPassword, setIsLinkingPassword] = useState(false);

  // General Admin Settings State (/admin_settings/general)
  const [platformEnabled, setPlatformEnabled] = useState(
    DEFAULT_ADMIN_SETTINGS.platformEnabled
  );
  const [requireAdApproval, setRequireAdApproval] = useState(
    DEFAULT_ADMIN_SETTINGS.requireAdApproval
  );
  const [requirePhotoApproval, setRequirePhotoApproval] = useState(
    DEFAULT_ADMIN_SETTINGS.requirePhotoApproval
  );
  const [contactUnlockFee, setContactUnlockFee] = useState(
    DEFAULT_ADMIN_SETTINGS.contactUnlockFee
  );
  const [defaultCurrency, setDefaultCurrency] = useState(
    DEFAULT_ADMIN_SETTINGS.defaultCurrency
  );

  // UI Config Controls State (/ui_settings/main)
  const [bannerEnabled, setBannerEnabled] = useState(uiConfig.bannerEnabled);
  const [bannerImage1Url, setBannerImage1Url] = useState(uiConfig.bannerImage1Url);
  const [bannerImage2Url, setBannerImage2Url] = useState(uiConfig.bannerImage2Url);
  const [bannerOrder, setBannerOrder] = useState<BannerOrder>(uiConfig.bannerOrder);
  const [bannerIntervalSeconds, setBannerIntervalSeconds] = useState(
    uiConfig.bannerIntervalSeconds
  );
  const [bannerSlot1Active, setBannerSlot1Active] = useState<boolean>(
    uiConfig.bannerSlot1Active !== false
  );
  const [bannerSlot2Active, setBannerSlot2Active] = useState<boolean>(
    uiConfig.bannerSlot2Active !== false
  );
  const [bannerImage1Link, setBannerImage1Link] = useState<string>(
    uiConfig.bannerImage1Link || ''
  );
  const [bannerImage2Link, setBannerImage2Link] = useState<string>(
    uiConfig.bannerImage2Link || ''
  );

  const [tickerEnabled, setTickerEnabled] = useState(uiConfig.tickerEnabled);
  const [tickerText, setTickerText] = useState(uiConfig.tickerText);
  const [tickerFontSize, setTickerFontSize] = useState<TickerFontSize>(
    uiConfig.tickerFontSize
  );
  const [tickerDirection, setTickerDirection] = useState<TickerDirection>(
    uiConfig.tickerDirection === 'rtl' ? 'rtl' : 'ltr'
  );
  const [tickerTextColor, setTickerTextColor] = useState(uiConfig.tickerTextColor);
  const [tickerBgColor, setTickerBgColor] = useState(uiConfig.tickerBgColor);
  const [tickerSpeedSeconds, setTickerSpeedSeconds] = useState(
    uiConfig.tickerSpeedSeconds
  );

  // Section 3: App Background Customization State
  const [appBgColor, setAppBgColor] = useState(uiConfig.appBgColor || '#fafaf9');
  const [appBgImageUrl, setAppBgImageUrl] = useState(uiConfig.appBgImageUrl || '');
  const [appBgImageFit, setAppBgImageFit] = useState<AppBgImageFit>(
    uiConfig.appBgImageFit || 'cover'
  );
  const [appBgOverlayOpacity, setAppBgOverlayOpacity] = useState<number>(
    uiConfig.appBgOverlayOpacity ?? 0
  );
  const [appBgOverlayColor, setAppBgOverlayColor] = useState(
    uiConfig.appBgOverlayColor || '#ffffff'
  );
  const [isUploadingAppBg, setIsUploadingAppBg] = useState(false);

  // Section 4: Ad Cards Visual Styling State
  const [cardShape, setCardShape] = useState<CardShape>(uiConfig.cardShape);
  const [cardBgColor, setCardBgColor] = useState(uiConfig.cardBgColor);
  const [cardBgImageUrl, setCardBgImageUrl] = useState(
    uiConfig.cardBgImageUrl || ''
  );
  const [cardBgOpacity, setCardBgOpacity] = useState<number>(
    uiConfig.cardBgOpacity ?? 1
  );
  const [cardTextColor, setCardTextColor] = useState(uiConfig.cardTextColor);
  const [cardSecondaryTextColor, setCardSecondaryTextColor] = useState(
    uiConfig.cardSecondaryTextColor || '#78716c'
  );
  const [cardFontSize, setCardFontSize] = useState<CardFontSize>(
    uiConfig.cardFontSize || 'base'
  );
  const [cardFontWeight, setCardFontWeight] = useState<CardFontWeight>(
    uiConfig.cardFontWeight || 'bold'
  );
  const [cardBorderColor, setCardBorderColor] = useState(
    uiConfig.cardBorderColor
  );
  const [cardBorderWidth, setCardBorderWidth] = useState<number>(
    uiConfig.cardBorderWidth ?? 1
  );
  const [cardBorderStyle, setCardBorderStyle] = useState<CardBorderStyle>(
    uiConfig.cardBorderStyle || 'solid'
  );
  const [cardRadius, setCardRadius] = useState<CardRadius>(
    uiConfig.cardRadius || 'rounded'
  );
  const [cardPadding, setCardPadding] = useState<CardPadding>(
    uiConfig.cardPadding || 'normal'
  );
  const [cardGap, setCardGap] = useState<CardGap>(uiConfig.cardGap || 'normal');
  const [cardAccentColor, setCardAccentColor] = useState(
    uiConfig.cardAccentColor
  );
  const [isUploadingCardBg, setIsUploadingCardBg] = useState(false);
  const [adsSortOrder, setAdsSortOrder] = useState<AdsSortOrder>(
    uiConfig.adsSortOrder
  );

  const [marriageTypes, setMarriageTypes] = useState<string[]>(
    uiConfig.marriageTypes || DEFAULT_MARRIAGE_TYPES
  );
  const [newMarriageTypeInput, setNewMarriageTypeInput] = useState('');

  const [disabledCountryCodes, setDisabledCountryCodes] = useState<string[]>(
    uiConfig.disabledCountryCodes || []
  );
  const [customRegionsMap, setCustomRegionsMap] = useState<CustomCountryRegionsMap>(
    () => parseCustomRegionsJson(uiConfig.customRegionsJson)
  );
  const [managedCountryCode, setManagedCountryCode] = useState<string>('SA');
  const [newRegionNameAr, setNewRegionNameAr] = useState('');
  const [newSubRegionsCsv, setNewSubRegionsCsv] = useState('');

  const [paymentPolicyScope, setPaymentPolicyScope] =
    useState<PaymentUnlockScopeType>(
      uiConfig.paymentPolicyScope || 'single_ad'
    );
  const [paymentMethodsNote, setPaymentMethodsNote] = useState<string>(
    uiConfig.paymentMethodsNote || ''
  );

  const [supportWhatsapp, setSupportWhatsapp] = useState(uiConfig.supportWhatsapp);
  const [supportPhone, setSupportPhone] = useState(uiConfig.supportPhone);
  const [supportTelegram, setSupportTelegram] = useState(uiConfig.supportTelegram);
  const [supportEmail, setSupportEmail] = useState(uiConfig.supportEmail);
  const [supportNote, setSupportNote] = useState(uiConfig.supportNote);

  const [isUploadingSlot, setIsUploadingSlot] = useState<1 | 2 | null>(null);
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const [adminMsg, setAdminMsg] = useState<string | null>(null);
  const [adminErr, setAdminErr] = useState<string | null>(null);

  // Section 5: Ads Management State
  const [staffAds, setStaffAds] = useState<MarriageAd[]>([]);
  const [loadingStaffAds, setLoadingStaffAds] = useState(false);
  const [adSearchQuery, setAdSearchQuery] = useState('');
  const [adStatusFilter, setAdStatusFilter] = useState<string>('all');
  const [adGenderFilter, setAdGenderFilter] = useState<string>('all');
  const [adCountryFilter, setAdCountryFilter] = useState<string>('all');
  const [adRegionFilter, setAdRegionFilter] = useState<string>('');
  const [adMarriageTypeFilter, setAdMarriageTypeFilter] = useState<string>('all');
  const [adAgeMin, setAdAgeMin] = useState<number>(18);
  const [adAgeMax, setAdAgeMax] = useState<number>(99);
  const [busyAdId, setBusyAdId] = useState<string | null>(null);

  // Modals for Ads Management
  const [selectedReviewAd, setSelectedReviewAd] = useState<MarriageAd | null>(null);
  const [rejectModalAd, setRejectModalAd] = useState<MarriageAd | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState<string>('');
  const [deleteConfirmAd, setDeleteConfirmAd] = useState<MarriageAd | null>(null);
  const [deleteReasonInput, setDeleteReasonInput] = useState<string>('');

  // Section 6: Users Management State
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [staffRolesMap, setStaffRolesMap] = useState<Record<string, StaffRole>>(
    {}
  );
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  // Modals for User Management
  const [restrictModalUser, setRestrictModalUser] = useState<UserProfile | null>(null);
  const [restrictReasonInput, setRestrictReasonInput] = useState<string>('');
  const [restrictDurationHours, setRestrictDurationHours] = useState<number>(24);
  const [banModalUser, setBanModalUser] = useState<UserProfile | null>(null);
  const [banReasonInput, setBanReasonInput] = useState<string>('');
  const [unbanConfirmUser, setUnbanConfirmUser] = useState<UserProfile | null>(null);

  // Administrative Audit Logs
  const [showAuditLogsModal, setShowAuditLogsModal] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState<boolean>(false);

  // Section 9: Payments & Grants State
  const [allPayments, setAllPayments] = useState<PaymentRecord[]>([]);
  const [allGrants, setAllGrants] = useState<ContactAccessGrant[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');

  // Section 10: Real Statistics Time Filter
  const [statsTimeFilter, setStatsTimeFilter] = useState<'today' | '7d' | '30d' | 'all'>('all');
  const [isRefreshingStats, setIsRefreshingStats] = useState<boolean>(false);

  // User's Own Saved Ads (Account Drawer)
  const [serverSyncedOwnAds, setServerSyncedOwnAds] = useState<MarriageAd[] | null>(
    null
  );
  const [isSyncingOwnAds, setIsSyncingOwnAds] = useState(false);
  const [ownAdActionMsg, setOwnAdActionMsg] = useState<string | null>(null);
  const [busyOwnAdId, setBusyOwnAdId] = useState<string | null>(null);

  useEffect(() => {
    setServerSyncedOwnAds(null);
    setOwnAdActionMsg(null);
    setAdminMsg(null);
    setAdminErr(null);
  }, [ownAds, mode]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setGender(profile.gender);
      setCountryCode(profile.countryCode || 'SA');
      setCityName(profile.cityName || 'الرياض');
    }
    if (privateInfo) {
      setPhone(privateInfo.phone || '');
    }
  }, [profile, privateInfo]);

  useEffect(() => {
    setBannerEnabled(uiConfig.bannerEnabled);
    setBannerImage1Url(uiConfig.bannerImage1Url);
    setBannerImage2Url(uiConfig.bannerImage2Url);
    setBannerOrder(uiConfig.bannerOrder);
    setBannerIntervalSeconds(uiConfig.bannerIntervalSeconds);
    setBannerSlot1Active(uiConfig.bannerSlot1Active !== false);
    setBannerSlot2Active(uiConfig.bannerSlot2Active !== false);
    setBannerImage1Link(uiConfig.bannerImage1Link || '');
    setBannerImage2Link(uiConfig.bannerImage2Link || '');
    setTickerEnabled(uiConfig.tickerEnabled);
    setTickerText(uiConfig.tickerText);
    setTickerFontSize(uiConfig.tickerFontSize);
    setTickerDirection(uiConfig.tickerDirection === 'rtl' ? 'rtl' : 'ltr');
    setTickerTextColor(uiConfig.tickerTextColor);
    setTickerBgColor(uiConfig.tickerBgColor);
    setTickerSpeedSeconds(uiConfig.tickerSpeedSeconds);
    setAppBgColor(uiConfig.appBgColor || '#fafaf9');
    setAppBgImageUrl(uiConfig.appBgImageUrl || '');
    setAppBgImageFit(uiConfig.appBgImageFit || 'cover');
    setAppBgOverlayOpacity(uiConfig.appBgOverlayOpacity ?? 0);
    setAppBgOverlayColor(uiConfig.appBgOverlayColor || '#ffffff');
    setCardShape(uiConfig.cardShape);
    setCardBgColor(uiConfig.cardBgColor);
    setCardBgImageUrl(uiConfig.cardBgImageUrl || '');
    setCardBgOpacity(uiConfig.cardBgOpacity ?? 1);
    setCardTextColor(uiConfig.cardTextColor);
    setCardSecondaryTextColor(uiConfig.cardSecondaryTextColor || '#78716c');
    setCardFontSize(uiConfig.cardFontSize || 'base');
    setCardFontWeight(uiConfig.cardFontWeight || 'bold');
    setCardBorderColor(uiConfig.cardBorderColor);
    setCardBorderWidth(uiConfig.cardBorderWidth ?? 1);
    setCardBorderStyle(uiConfig.cardBorderStyle || 'solid');
    setCardRadius(uiConfig.cardRadius || 'rounded');
    setCardPadding(uiConfig.cardPadding || 'normal');
    setCardGap(uiConfig.cardGap || 'normal');
    setCardAccentColor(uiConfig.cardAccentColor);
    setAdsSortOrder(uiConfig.adsSortOrder);
    setMarriageTypes(uiConfig.marriageTypes || DEFAULT_MARRIAGE_TYPES);
    setDisabledCountryCodes(uiConfig.disabledCountryCodes || []);
    setCustomRegionsMap(parseCustomRegionsJson(uiConfig.customRegionsJson));
    setPaymentPolicyScope(uiConfig.paymentPolicyScope || 'single_ad');
    setPaymentMethodsNote(uiConfig.paymentMethodsNote || '');
    setSupportWhatsapp(uiConfig.supportWhatsapp);
    setSupportPhone(uiConfig.supportPhone);
    setSupportTelegram(uiConfig.supportTelegram);
    setSupportEmail(uiConfig.supportEmail);
    setSupportNote(uiConfig.supportNote);
  }, [uiConfig]);

  const loadAdminDataCollections = async (isSuperAdmin: boolean) => {
    setLoadingStaffAds(true);
    listAllAdsForStaff()
      .then((items) => setStaffAds(items))
      .catch(() => {})
      .finally(() => setLoadingStaffAds(false));

    if (isSuperAdmin) {
      setLoadingUsers(true);
      Promise.all([listAllUsersForAdmin(), listAllStaffRolesForAdmin()])
        .then(([usersList, rolesList]) => {
          setAllUsers(usersList);
          const map: Record<string, StaffRole> = {};
          for (const r of rolesList) {
            map[r.uid] = r;
          }
          setStaffRolesMap(map);
        })
        .catch(() => {})
        .finally(() => setLoadingUsers(false));

      setLoadingPayments(true);
      Promise.all([listAllPaymentsForAdmin(), listAllContactGrantsForAdmin()])
        .then(([paymentsList, grantsList]) => {
          setAllPayments(paymentsList);
          setAllGrants(grantsList);
        })
        .catch(() => {})
        .finally(() => setLoadingPayments(false));
    }
  };

  // Perform mandatory live server & database permission check whenever admin mode is requested
  useEffect(() => {
    let active = true;
    if (mode === 'admin') {
      setIsCheckingServerAdmin(true);
      setServerAdminAllowed(false);
      setServerAdminDenyReason(null);

      verifyServerAdminAccess()
        .then((res) => {
          if (!active) return;
          setServerAdminAllowed(res.allowed);
          setServerAdminDenyReason(res.reason);

          if (res.allowed) {
            const isSuper = permissions.canManageAdminSettings;
            setActiveSection(isSuper ? 'banner' : 'ads');

            getGeneralAdminSettings(true)
              .then(({ settings }) => {
                if (!active) return;
                setPlatformEnabled(settings.platformEnabled);
                setRequireAdApproval(settings.requireAdApproval);
                setRequirePhotoApproval(settings.requirePhotoApproval);
                setContactUnlockFee(settings.contactUnlockFee);
                setDefaultCurrency(settings.defaultCurrency);
              })
              .catch(() => {});

            loadAdminDataCollections(isSuper);
          }
        })
        .catch(() => {
          if (active) {
            setServerAdminAllowed(false);
            setServerAdminDenyReason(
              'تعذر التحقق من صلاحيات الإدارة من الخادم.'
            );
          }
        })
        .finally(() => {
          if (active) setIsCheckingServerAdmin(false);
        });
    }
    return () => {
      active = false;
    };
  }, [mode]);

  const selectedCountry = useMemo(
    () =>
      ARAB_COUNTRIES.find((c) => c.code === countryCode) || ARAB_COUNTRIES[0],
    [countryCode]
  );

  const visibleAdminSections = useMemo(() => {
    if (permissions.canManageAdminSettings) {
      return ADMIN_SECTIONS;
    }
    return ADMIN_SECTIONS.filter((s) => !s.superAdminOnly);
  }, [permissions.canManageAdminSettings]);

  const currentSectionMeta = useMemo(
    () =>
      visibleAdminSections.find((s) => s.id === activeSection) ||
      visibleAdminSections[0],
    [visibleAdminSections, activeSection]
  );

  // Real-time Ad counts per User ID
  const userAdsCountMap = useMemo(() => {
    const map: Record<
      string,
      {
        total: number;
        approved: number;
        pending: number;
        archived: number;
        rejected: number;
      }
    > = {};
    for (const ad of staffAds) {
      if (!ad.userId) continue;
      if (!map[ad.userId]) {
        map[ad.userId] = {
          total: 0,
          approved: 0,
          pending: 0,
          archived: 0,
          rejected: 0,
        };
      }
      map[ad.userId].total += 1;
      if (ad.status === 'approved') map[ad.userId].approved += 1;
      else if (ad.status === 'pending') map[ad.userId].pending += 1;
      else if (ad.status === 'archived') map[ad.userId].archived += 1;
      else if (ad.status === 'rejected') map[ad.userId].rejected += 1;
    }
    return map;
  }, [staffAds]);

  const fetchAuditLogs = async () => {
    setLoadingAuditLogs(true);
    try {
      const logs = await listAdminAuditLogs(60);
      setAuditLogs(logs || []);
    } catch {
      // ignore
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  // Filtered Ads for Section 5 (Search by name, country, region, gender, age, marriage type, status)
  const filteredStaffAds = useMemo(() => {
    const q = adSearchQuery.trim().toLowerCase();
    const regQ = adRegionFilter.trim().toLowerCase();
    return staffAds.filter((ad) => {
      // Status filter
      if (adStatusFilter !== 'all' && ad.status !== adStatusFilter) {
        return false;
      }
      // Gender filter
      if (adGenderFilter !== 'all' && ad.gender !== adGenderFilter) {
        return false;
      }
      // Country filter
      if (adCountryFilter !== 'all' && ad.countryCode !== adCountryFilter) {
        return false;
      }
      // Marriage type filter
      if (adMarriageTypeFilter !== 'all') {
        const m = (ad.marriageType || ad.maritalStatus || '').trim();
        if (m !== adMarriageTypeFilter) return false;
      }
      // Age range filter
      if (
        typeof ad.age === 'number' &&
        (ad.age < adAgeMin || ad.age > adAgeMax)
      ) {
        return false;
      }
      // Region/City filter
      if (regQ) {
        const rName = (ad.regionNameAr || '').toLowerCase();
        const sName = (ad.subRegionNameAr || '').toLowerCase();
        const cName = (ad.cityNameAr || '').toLowerCase();
        if (
          !rName.includes(regQ) &&
          !sName.includes(regQ) &&
          !cName.includes(regQ)
        ) {
          return false;
        }
      }
      // Text search: name, title, or ID
      if (!q) return true;
      return (
        (ad.advertiserName || '').toLowerCase().includes(q) ||
        (ad.title || '').toLowerCase().includes(q) ||
        (ad.adId || '').toLowerCase().includes(q)
      );
    });
  }, [
    staffAds,
    adSearchQuery,
    adStatusFilter,
    adGenderFilter,
    adCountryFilter,
    adRegionFilter,
    adMarriageTypeFilter,
    adAgeMin,
    adAgeMax,
  ]);

  // Filtered Users for Section 6 (Search by name, email, or UID; filter by status and role)
  const filteredUsers = useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase();
    return allUsers.filter((u) => {
      // Status filter
      if (userStatusFilter !== 'all') {
        if (userStatusFilter === 'active' && u.accountStatus !== 'active') {
          return false;
        }
        if (
          userStatusFilter === 'restricted' &&
          u.accountStatus !== 'restricted' &&
          u.accountStatus !== 'suspended'
        ) {
          return false;
        }
        if (userStatusFilter === 'banned' && u.accountStatus !== 'banned') {
          return false;
        }
      }
      // Role filter
      if (userRoleFilter !== 'all') {
        const staffDoc = staffRolesMap[u.uid];
        const effectiveRole =
          u.role === 'super_admin' || staffDoc?.role === 'super_admin'
            ? 'super_admin'
            : u.role === 'moderator' || staffDoc?.role === 'moderator'
            ? 'moderator'
            : 'user';
        if (effectiveRole !== userRoleFilter) return false;
      }
      if (!q) return true;
      return (
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.uid || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.cityName || '').toLowerCase().includes(q) ||
        (u.countryCode || '').toLowerCase().includes(q)
      );
    });
  }, [
    allUsers,
    userSearchQuery,
    userStatusFilter,
    userRoleFilter,
    staffRolesMap,
  ]);

  // Filtered Payments for Section 9
  const filteredPayments = useMemo(() => {
    if (paymentStatusFilter === 'all') return allPayments;
    return allPayments.filter((p) => p.status === paymentStatusFilter);
  }, [allPayments, paymentStatusFilter]);

  // Helper to test if a document's timestamp falls within the selected statistics time filter
  const isItemInTimeRange = (
    timestamp: any,
    filter: 'today' | '7d' | '30d' | 'all'
  ): boolean => {
    if (filter === 'all' || !timestamp) return true;
    const timeMs =
      typeof timestamp?.toMillis === 'function'
        ? timestamp.toMillis()
        : typeof timestamp?.toDate === 'function'
        ? timestamp.toDate().getTime()
        : timestamp instanceof Date
        ? timestamp.getTime()
        : typeof timestamp === 'number'
        ? timestamp
        : new Date(timestamp).getTime();

    if (!timeMs || isNaN(timeMs)) return true;
    const diff = Date.now() - timeMs;
    if (filter === 'today') return diff <= 24 * 60 * 60 * 1000;
    if (filter === '7d') return diff <= 7 * 24 * 60 * 60 * 1000;
    if (filter === '30d') return diff <= 30 * 24 * 60 * 60 * 1000;
    return true;
  };

  // Live Statistics for Section 10 strictly based on actual persisted data
  const dashboardStats = useMemo(() => {
    // 1. Time-filtered collections
    const filteredAds = staffAds.filter((a) =>
      isItemInTimeRange(a.createdAt, statsTimeFilter)
    );
    const filteredUsers = allUsers.filter((u) =>
      isItemInTimeRange(u.createdAt, statsTimeFilter)
    );
    const filteredPaymentsList = allPayments.filter((p) =>
      isItemInTimeRange(p.createdAt, statsTimeFilter)
    );

    // Indicator 1: Total accounts in the database (persistent real accounts)
    const totalAccountsCount = allUsers.length;

    // Indicator 2: New accounts created in selected time period (or last 7d if 'all' chosen)
    const newAccountsCount = allUsers.filter((u) =>
      statsTimeFilter === 'all'
        ? isItemInTimeRange(u.createdAt, '7d')
        : isItemInTimeRange(u.createdAt, statsTimeFilter)
    ).length;

    // Indicator 3: Approved published ads
    const approvedAdsCount = filteredAds.filter((a) => a.status === 'approved').length;

    // Indicator 4: Pending ads under review
    const pendingAdsCount = filteredAds.filter((a) => a.status === 'pending').length;

    // Indicator 5: Paused / archived ads
    const archivedAdsCount = filteredAds.filter((a) => a.status === 'archived').length;

    // Rejected ads
    const rejectedAdsCount = filteredAds.filter((a) => a.status === 'rejected').length;

    // Indicator 6: Total ad views (incremented with session deduplication)
    const totalViews = filteredAds.reduce((acc, a) => acc + (a.viewsCount || 0), 0);

    // Indicator 7: Total verified shares (incremented only upon verified share action)
    const totalShares = filteredAds.reduce((acc, a) => acc + (a.sharesCount || 0), 0);

    // Indicator 8: Successful payments confirmed by provider
    const succeededPayments = filteredPaymentsList.filter((p) => p.status === 'succeeded');
    const succeededPaymentsCount = succeededPayments.length;

    // Indicator 9: Failed payments
    const failedPaymentsCount = filteredPaymentsList.filter((p) => p.status === 'failed').length;

    // Indicator 10: Actual revenue confirmed from payment records
    const actualRevenue = succeededPayments.reduce(
      (acc, p) => acc + (Number(p.amount) || 0),
      0
    );

    // Breakdown: By Country
    const countryCountsMap = new Map<
      string,
      { code: string; nameAr: string; flag: string; count: number; percent: number }
    >();
    for (const ad of filteredAds) {
      const code = ad.countryCode || 'SA';
      const foundCountry = ARAB_COUNTRIES.find((c) => c.code === code);
      const existing = countryCountsMap.get(code);
      if (existing) {
        existing.count += 1;
      } else {
        countryCountsMap.set(code, {
          code,
          nameAr: ad.countryNameAr || foundCountry?.nameAr || code,
          flag: foundCountry?.flag || '🏳️',
          count: 1,
          percent: 0,
        });
      }
    }
    const totalFilteredAds = filteredAds.length;
    const topCountries = Array.from(countryCountsMap.values())
      .map((item) => ({
        ...item,
        percent: totalFilteredAds > 0 ? Math.round((item.count / totalFilteredAds) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Breakdown: By Gender
    const maleAdsCount = filteredAds.filter((a) => a.gender === 'male').length;
    const femaleAdsCount = filteredAds.filter((a) => a.gender === 'female').length;
    const totalGender = maleAdsCount + femaleAdsCount;
    const malePercent = totalGender > 0 ? Math.round((maleAdsCount / totalGender) * 100) : 0;
    const femalePercent = totalGender > 0 ? Math.round((femaleAdsCount / totalGender) * 100) : 0;

    // Breakdown: By Marriage Type
    const marriageTypeCountsMap = new Map<string, number>();
    for (const ad of filteredAds) {
      const mType = (ad.marriageType || ad.maritalStatus || 'زواج مسيار').trim();
      marriageTypeCountsMap.set(mType, (marriageTypeCountsMap.get(mType) || 0) + 1);
    }
    const marriageTypesList = Array.from(marriageTypeCountsMap.entries())
      .map(([type, count]) => ({
        type,
        count,
        percent: totalFilteredAds > 0 ? Math.round((count / totalFilteredAds) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Top Viewed Ads (ranked by viewsCount)
    const topViewedAds = [...filteredAds]
      .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))
      .slice(0, 6);

    // Top Shared Ads (ranked by sharesCount)
    const topSharedAds = [...filteredAds]
      .sort((a, b) => (b.sharesCount || 0) - (a.sharesCount || 0))
      .slice(0, 6);

    return {
      totalAccountsCount,
      newAccountsCount,
      totalAds: filteredAds.length,
      approvedAdsCount,
      pendingAdsCount,
      archivedAdsCount,
      rejectedAdsCount,
      totalViews,
      totalShares,
      succeededPaymentsCount,
      failedPaymentsCount,
      actualRevenue,
      topCountries,
      maleAdsCount,
      femaleAdsCount,
      malePercent,
      femalePercent,
      marriageTypesList,
      topViewedAds,
      topSharedAds,
      filteredAdsCount: filteredAds.length,
      filteredUsersCount: filteredUsers.length,
    };
  }, [staffAds, allUsers, allPayments, statsTimeFilter]);

  const handleRefreshStats = async () => {
    setIsRefreshingStats(true);
    setAdminMsg(null);
    setAdminErr(null);
    try {
      await loadAdminDataCollections(permissions.canManageAdminSettings);
      setAdminMsg('تم تحديث جميع بيانات ومؤشرات الإحصائيات من قاعدة البيانات بنجاح.');
    } catch {
      setAdminErr('تعذر تحديث الإحصائيات.');
    } finally {
      setIsRefreshingStats(false);
    }
  };

  if (!mode || !firebaseUser) {
    return null;
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailVerified) {
      setProfileMsg('لا يمكن تعديل الملف الشخصي قبل تأكيد البريد الإلكتروني.');
      return;
    }
    if (!privateInfo) return;
    setIsSavingProfile(true);
    setProfileMsg(null);
    try {
      await updateOwnUserProfile(firebaseUser.uid, {
        displayName,
        gender,
        countryCode,
        cityName,
      });
      await updateOwnUserPrivate(firebaseUser.uid, {
        email: privateInfo.email || firebaseUser.email || '',
        phone,
      });
      await refreshUserProfile();
      setProfileMsg('تم حفظ بيانات الحساب بنجاح.');
    } catch (err) {
      setProfileMsg(
        err instanceof Error ? err.message : 'تعذر حفظ بيانات الحساب.'
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLinkPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLinkingPassword(true);
    const pwd = newLinkPassword;
    const confirmPwd = newLinkConfirmPassword;
    setNewLinkPassword('');
    setNewLinkConfirmPassword('');
    try {
      await linkPasswordToCurrentAccount(pwd, confirmPwd);
    } finally {
      setIsLinkingPassword(false);
    }
  };

  const handleBannerFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    slot: 1 | 2
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingSlot(slot);
    setAdminMsg(null);
    setAdminErr(null);
    try {
      const processedUrl = await processBannerImageUpload(file, slot);
      if (slot === 1) {
        setBannerImage1Url(processedUrl);
      } else {
        setBannerImage2Url(processedUrl);
      }
      setAdminMsg(
        `تم تجهيز الصورة (${slot}) بنجاح. اضغط "حفظ التعديلات في قاعدة البيانات" لاعتمادها فوراً.`
      );
    } catch (err) {
      setAdminErr(err instanceof Error ? err.message : 'تعذر رفع الصورة.');
    } finally {
      setIsUploadingSlot(null);
      e.target.value = '';
    }
  };

  const handleAppBgFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAppBg(true);
    setAdminMsg(null);
    setAdminErr(null);
    try {
      const processedUrl = await processUiBackgroundImageUpload(file, 'app_bg');
      setAppBgImageUrl(processedUrl);
      setAdminMsg(
        'تم تجهيز وضغط صورة خلفية التطبيق بنجاح. اضغط "حفظ إعدادات خلفية التطبيق" لاعتمادها في قاعدة البيانات.'
      );
    } catch (err) {
      setAdminErr(
        err instanceof Error ? err.message : 'تعذر رفع صورة خلفية التطبيق.'
      );
    } finally {
      setIsUploadingAppBg(false);
      e.target.value = '';
    }
  };

  const handleCardBgFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCardBg(true);
    setAdminMsg(null);
    setAdminErr(null);
    try {
      const processedUrl = await processUiBackgroundImageUpload(
        file,
        'card_bg'
      );
      setCardBgImageUrl(processedUrl);
      setAdminMsg(
        'تم تجهيز وضغط تصميم خلفية البطاقات بنجاح. اضغط "حفظ تصميم البطاقات" لاعتماده في قاعدة البيانات.'
      );
    } catch (err) {
      setAdminErr(
        err instanceof Error ? err.message : 'تعذر رفع تصميم خلفية البطاقة.'
      );
    } finally {
      setIsUploadingCardBg(false);
      e.target.value = '';
    }
  };

  /**
   * Central server-verified persistence handler for all Admin UI & General settings.
   * Ensures every change is saved in Firestore (/ui_settings/main and /admin_settings/general)
   * and reflected immediately across all connected clients.
   */
  const persistAdminConfiguration = async (customSuccessMessage?: string) => {
    setIsSavingAdmin(true);
    setAdminMsg(null);
    setAdminErr(null);
    try {
      const check = await verifyServerAdminAccess();
      if (!check.allowed || !permissions.canManageAdminSettings) {
        setAdminErr(
          check.reason || 'غير مصرح لك بتعديل الإعدادات الإدارية.'
        );
        return;
      }

      const cleanedMarriageTypes = marriageTypes
        .map((t) => t.trim())
        .filter((t) => t.length >= 2);
      const finalMarriageTypes =
        cleanedMarriageTypes.length > 0
          ? cleanedMarriageTypes
          : DEFAULT_MARRIAGE_TYPES;

      const serializedCustomRegions = JSON.stringify(customRegionsMap);

      await saveUiConfigSettings(firebaseUser.uid, {
        bannerEnabled,
        bannerImage1Url,
        bannerImage2Url,
        bannerOrder,
        bannerIntervalSeconds,
        bannerSlot1Active,
        bannerSlot2Active,
        bannerImage1Link,
        bannerImage2Link,
        tickerEnabled,
        tickerText,
        tickerFontSize,
        tickerDirection,
        tickerTextColor,
        tickerBgColor,
        tickerSpeedSeconds,
        appBgColor,
        appBgImageUrl,
        appBgImageFit,
        appBgOverlayOpacity,
        appBgOverlayColor,
        cardShape,
        cardBgColor,
        cardBgImageUrl,
        cardBgOpacity,
        cardTextColor,
        cardSecondaryTextColor,
        cardFontSize,
        cardFontWeight,
        cardBorderColor,
        cardBorderWidth,
        cardBorderStyle,
        cardRadius,
        cardPadding,
        cardGap,
        cardAccentColor,
        adsSortOrder,
        marriageTypes: finalMarriageTypes,
        disabledCountryCodes,
        customRegionsJson: serializedCustomRegions,
        paymentPolicyScope,
        paymentMethodsNote,
        supportWhatsapp,
        supportPhone,
        supportTelegram,
        supportEmail,
        supportNote,
      });

      await saveGeneralAdminSettings(firebaseUser.uid, {
        platformEnabled,
        requireAdApproval,
        requirePhotoApproval,
        contactUnlockFee,
        defaultCurrency,
        supportWhatsapp,
      });

      setMarriageTypes(finalMarriageTypes);
      setAdminMsg(
        customSuccessMessage ||
          'تم حفظ التعديلات في قاعدة البيانات بنجاح وانعكست مباشرة على واجهة التطبيق.'
      );
    } catch (err) {
      setAdminErr(
        err instanceof Error ? err.message : 'تعذر حفظ الإعدادات الإدارية.'
      );
    } finally {
      setIsSavingAdmin(false);
    }
  };

  const handleApproveAd = async (ad: MarriageAd) => {
    setBusyAdId(ad.adId);
    setAdminMsg(null);
    setAdminErr(null);
    try {
      const check = await verifyServerAdminAccess();
      if (!check.allowed) {
        setAdminErr(check.reason || 'غير مصرح لك بمراجعة الإعلانات.');
        return;
      }
      await moderateMarriageAd(ad.adId, 'approved', 'تم اعتماد وقبول الإعلان ونشره', {
        adminUid: firebaseUser.uid,
        adminEmail: firebaseUser.email || '',
        adTitle: ad.advertiserName || ad.title,
      });
      const updated = await listAllAdsForStaff();
      setStaffAds(updated);
      if (selectedReviewAd && selectedReviewAd.adId === ad.adId) {
        setSelectedReviewAd({ ...selectedReviewAd, status: 'approved', reviewStatus: 'approved' });
      }
      setAdminMsg(`تم قبول واعتماد إعلان (${ad.advertiserName || ad.title}) ونشره بنجاح.`);
    } catch (err) {
      setAdminErr(err instanceof Error ? err.message : 'تعذر اعتماد الإعلان.');
    } finally {
      setBusyAdId(null);
    }
  };

  const handlePauseAd = async (ad: MarriageAd) => {
    setBusyAdId(ad.adId);
    setAdminMsg(null);
    setAdminErr(null);
    try {
      const check = await verifyServerAdminAccess();
      if (!check.allowed) {
        setAdminErr(check.reason || 'غير مصرح لك بإيقاف الإعلانات.');
        return;
      }
      await moderateMarriageAd(ad.adId, 'archived', 'تم إيقاف الإعلان مؤقتاً بواسطة الإدارة', {
        adminUid: firebaseUser.uid,
        adminEmail: firebaseUser.email || '',
        adTitle: ad.advertiserName || ad.title,
      });
      const updated = await listAllAdsForStaff();
      setStaffAds(updated);
      if (selectedReviewAd && selectedReviewAd.adId === ad.adId) {
        setSelectedReviewAd({ ...selectedReviewAd, status: 'archived' });
      }
      setAdminMsg(`تم إيقاف عرض إعلان (${ad.advertiserName || ad.title}) مؤقتاً.`);
    } catch (err) {
      setAdminErr(err instanceof Error ? err.message : 'تعذر إيقاف الإعلان.');
    } finally {
      setBusyAdId(null);
    }
  };

  const handleResumeAd = async (ad: MarriageAd) => {
    setBusyAdId(ad.adId);
    setAdminMsg(null);
    setAdminErr(null);
    try {
      const check = await verifyServerAdminAccess();
      if (!check.allowed) {
        setAdminErr(check.reason || 'غير مصرح لك بإعادة تفعيل الإعلانات.');
        return;
      }
      await moderateMarriageAd(ad.adId, 'approved', 'إعادة تفعيل ونشر الإعلان', {
        adminUid: firebaseUser.uid,
        adminEmail: firebaseUser.email || '',
        adTitle: ad.advertiserName || ad.title,
      });
      const updated = await listAllAdsForStaff();
      setStaffAds(updated);
      if (selectedReviewAd && selectedReviewAd.adId === ad.adId) {
        setSelectedReviewAd({ ...selectedReviewAd, status: 'approved', reviewStatus: 'approved' });
      }
      setAdminMsg(`تمت إعادة تفعيل ونشر إعلان (${ad.advertiserName || ad.title}) في الواجهة الرئيسية.`);
    } catch (err) {
      setAdminErr(err instanceof Error ? err.message : 'تعذر تفعيل الإعلان.');
    } finally {
      setBusyAdId(null);
    }
  };

  const handleOpenRejectModal = (ad: MarriageAd) => {
    setRejectModalAd(ad);
    setRejectReasonInput('مخالفة الشروط الشرعية وضوابط المنصة');
  };

  const handleConfirmRejectAd = async () => {
    if (!rejectModalAd) return;
    const cleanReason = rejectReasonInput.trim();
    if (!cleanReason) {
      setAdminErr('يرجى كتابة سبب رفض الإعلان قبل التأكيد.');
      return;
    }
    setBusyAdId(rejectModalAd.adId);
    setAdminMsg(null);
    setAdminErr(null);
    try {
      const check = await verifyServerAdminAccess();
      if (!check.allowed) {
        setAdminErr(check.reason || 'غير مصرح لك برفض الإعلانات.');
        return;
      }
      await moderateMarriageAd(rejectModalAd.adId, 'rejected', cleanReason, {
        adminUid: firebaseUser.uid,
        adminEmail: firebaseUser.email || '',
        adTitle: rejectModalAd.advertiserName || rejectModalAd.title,
      });
      const updated = await listAllAdsForStaff();
      setStaffAds(updated);
      if (selectedReviewAd && selectedReviewAd.adId === rejectModalAd.adId) {
        setSelectedReviewAd({ ...selectedReviewAd, status: 'rejected', reviewStatus: 'rejected', moderationNote: cleanReason });
      }
      setAdminMsg(`تم رفض إعلان (${rejectModalAd.advertiserName || rejectModalAd.title}) وتسجيل السبب في قاعدة البيانات.`);
      setRejectModalAd(null);
      setRejectReasonInput('');
    } catch (err) {
      setAdminErr(err instanceof Error ? err.message : 'تعذر رفض الإعلان.');
    } finally {
      setBusyAdId(null);
    }
  };

  const handleOpenDeleteAdModal = (ad: MarriageAd) => {
    setDeleteConfirmAd(ad);
    setDeleteReasonInput('حذف الإعلان وفق سياسة الحذف المعتمدة');
  };

  const handleConfirmDeleteAd = async () => {
    if (!deleteConfirmAd) return;
    const check = await verifyServerAdminAccess();
    if (!check.allowed) {
      setAdminErr(check.reason || 'غير مصرح لك بحذف الإعلانات.');
      return;
    }
    setBusyAdId(deleteConfirmAd.adId);
    setAdminMsg(null);
    setAdminErr(null);
    try {
      const check = await verifyServerAdminAccess();
      if (!check.allowed) {
        setAdminErr(check.reason || 'غير مصرح لك بحذف الإعلانات.');
        return;
      }
      await deleteMarriageAdCascade(firebaseUser.uid, deleteConfirmAd, true, {
        adminUid: firebaseUser.uid,
        adminEmail: firebaseUser.email || '',
        reason: deleteReasonInput.trim() || 'حذف نهائي للإعلان وملحقاته',
      });
      const updated = await listAllAdsForStaff();
      setStaffAds(updated);
      if (selectedReviewAd && selectedReviewAd.adId === deleteConfirmAd.adId) {
        setSelectedReviewAd(null);
      }
      setAdminMsg(`تم حذف إعلان (${deleteConfirmAd.advertiserName || deleteConfirmAd.title}) وجميع بياناته المتسلسلة نهائياً.`);
      setDeleteConfirmAd(null);
      setDeleteReasonInput('');
    } catch (err) {
      setAdminErr(err instanceof Error ? err.message : 'تعذر حذف الإعلان.');
    } finally {
      setBusyAdId(null);
    }
  };

  const handleAdminRemoveAdPhoto = async (ad: MarriageAd) => {
    setBusyAdId(ad.adId);
    setAdminMsg(null);
    setAdminErr(null);
    try {
      const check = await verifyServerAdminAccess();
      if (!check.allowed) {
        setAdminErr(check.reason || 'غير مصرح لك بإدارة صور الإعلانات.');
        return;
      }
      await removeMarriageAdPhotoOnly(firebaseUser.uid, ad);
      const updated = await listAllAdsForStaff();
      setStaffAds(updated);
      if (selectedReviewAd && selectedReviewAd.adId === ad.adId) {
        setSelectedReviewAd({ ...selectedReviewAd, hasPhotos: false, primaryPhotoUrl: getDefaultAvatarByGender(ad.gender), photoFileId: '' });
      }
      setAdminMsg('تم حذف الصورة الشخصية من الإعلان واستبدالها بالصورة الافتراضية.');
    } catch (err) {
      setAdminErr(err instanceof Error ? err.message : 'تعذر حذف صورة الإعلان.');
    } finally {
      setBusyAdId(null);
    }
  };

  const handleOpenRestrictUserModal = (user: UserProfile) => {
    setRestrictModalUser(user);
    setRestrictReasonInput('مخالفة معايير التواصل أو شروط الاستخدام');
    setRestrictDurationHours(24);
  };

  const handleConfirmRestrictUser = async () => {
    if (!restrictModalUser) return;
    const check = await verifyServerAdminAccess();
    if (!check.allowed) {
      setAdminErr(check.reason || 'غير مصرح لك بتقييد الحسابات.');
      return;
    }
    const cleanReason = restrictReasonInput.trim();
    if (!cleanReason) {
      setAdminErr('يرجى توضيح سبب تقييد الحساب.');
      return;
    }
    setBusyUserId(restrictModalUser.uid);
    setAdminMsg(null);
    setAdminErr(null);
    try {
      await restrictUserAccountByAdmin({
        adminUid: firebaseUser.uid,
        adminEmail: firebaseUser.email || '',
        targetUser: restrictModalUser,
        reason: cleanReason,
        durationHours: restrictDurationHours,
      });
      const refreshedUsers = await listAllUsersForAdmin();
      setAllUsers(refreshedUsers);
      setAdminMsg(`تم تقييد حساب (${restrictModalUser.displayName}) لمدة ${restrictDurationHours > 0 ? `${restrictDurationHours} ساعة` : 'غير محددة'} بنجاح.`);
      setRestrictModalUser(null);
      setRestrictReasonInput('');
    } catch (err) {
      setAdminErr(err instanceof Error ? err.message : 'تعذر تقييد حساب المستخدم.');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleOpenBanUserModal = (user: UserProfile) => {
    setBanModalUser(user);
    setBanReasonInput('مخالفة صريحة للشروط الشرعية أو انتحال شخصية');
  };

  const handleConfirmBanUser = async () => {
    if (!banModalUser) return;
    const check = await verifyServerAdminAccess();
    if (!check.allowed) {
      setAdminErr(check.reason || 'غير مصرح لك بحظر الحسابات.');
      return;
    }
    const cleanReason = banReasonInput.trim();
    if (!cleanReason) {
      setAdminErr('يرجى توضيح سبب حظر الحساب.');
      return;
    }
    setBusyUserId(banModalUser.uid);
    setAdminMsg(null);
    setAdminErr(null);
    try {
      await banUserAccountByAdmin({
        adminUid: firebaseUser.uid,
        adminEmail: firebaseUser.email || '',
        targetUser: banModalUser,
        reason: cleanReason,
      });
      const refreshedUsers = await listAllUsersForAdmin();
      setAllUsers(refreshedUsers);
      setAdminMsg(`تم حظر حساب (${banModalUser.displayName}) وتسجيل العملية في سجل الرقابة الإدارية.`);
      setBanModalUser(null);
      setBanReasonInput('');
    } catch (err) {
      setAdminErr(err instanceof Error ? err.message : 'تعذر حظر حساب المستخدم.');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleOpenUnbanUserModal = (user: UserProfile) => {
    setUnbanConfirmUser(user);
  };

  const handleConfirmUnbanUser = async () => {
    if (!unbanConfirmUser) return;
    setBusyUserId(unbanConfirmUser.uid);
    setAdminMsg(null);
    setAdminErr(null);
    try {
      await unbanOrUnrestrictUserAccountByAdmin({
        adminUid: firebaseUser.uid,
        adminEmail: firebaseUser.email || '',
        targetUser: unbanConfirmUser,
        reason: 'إعادة تفعيل الحساب بعد مراجعة الإدارة وتأكيد الالتزام بالضوابط',
      });
      const refreshedUsers = await listAllUsersForAdmin();
      setAllUsers(refreshedUsers);
      setAdminMsg(`تمت استعادة تفعيل حساب (${unbanConfirmUser.displayName}) وإلغاء القيود بنجاح.`);
      setUnbanConfirmUser(null);
    } catch (err) {
      setAdminErr(err instanceof Error ? err.message : 'تعذر إلغاء حظر/تقييد الحساب.');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleToggleModeratorRole = async (targetUser: UserProfile) => {
    setBusyUserId(targetUser.uid);
    setAdminMsg(null);
    setAdminErr(null);
    try {
      const check = await verifyServerAdminAccess();
      if (!check.allowed || !permissions.canManageAdminSettings) {
        setAdminErr('غير مصرح لك بتعديل صلاحيات المشرفين.');
        return;
      }
      const existingStaff = staffRolesMap[targetUser.uid];
      const isCurrentlyModerator =
        (existingStaff && existingStaff.role === 'moderator') ||
        targetUser.role === 'moderator';
      const nextRole = isCurrentlyModerator ? 'user' : 'moderator';

      await updateUserRoleBySuperAdmin(
        firebaseUser.uid,
        targetUser.uid,
        `${targetUser.uid}@staff.local`,
        nextRole
      );
      const [usersList, rolesList] = await Promise.all([
        listAllUsersForAdmin(),
        listAllStaffRolesForAdmin(),
      ]);
      setAllUsers(usersList);
      const map: Record<string, StaffRole> = {};
      for (const r of rolesList) {
        map[r.uid] = r;
      }
      setStaffRolesMap(map);
      setAdminMsg(
        nextRole === 'moderator'
          ? `تم منح صلاحية مشرف مراجعة الإعلانات للحساب (${targetUser.displayName}).`
          : `تم إلغاء صلاحية الإشراف وإعادة الحساب (${targetUser.displayName}) إلى مستخدم عادي.`
      );
    } catch (err) {
      setAdminErr(
        err instanceof Error ? err.message : 'تعذر تحديث صلاحية المستخدم.'
      );
    } finally {
      setBusyUserId(null);
    }
  };

  const handleToggleCountryEnabled = (code: string) => {
    setDisabledCountryCodes((prev) => {
      if (prev.includes(code)) {
        return prev.filter((c) => c !== code);
      }
      // Prevent disabling all countries
      if (prev.length >= ARAB_COUNTRIES.length - 1) {
        setAdminErr('يجب الإبقاء على دولة واحدة مفعلة على الأقل.');
        return prev;
      }
      return [...prev, code];
    });
  };

  const handleAddCustomRegionForCountry = () => {
    const cleanRegionName = newRegionNameAr.trim();
    if (cleanRegionName.length < 2) {
      setAdminErr('يرجى كتابة اسم المنطقة أو المحافظة (حرفين على الأقل).');
      return;
    }

    const parsedSubs = newSubRegionsCsv
      .split(/[،,]/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 2);

    const finalSubs =
      parsedSubs.length > 0 ? parsedSubs : [`مركز ${cleanRegionName}`];

    const regionId = `${managedCountryCode.toLowerCase()}_custom_${Date.now()
      .toString(36)
      .slice(-5)}`;

    setCustomRegionsMap((prev) => {
      const currentList = prev[managedCountryCode] || [];
      return {
        ...prev,
        [managedCountryCode]: [
          ...currentList,
          {
            id: regionId,
            nameAr: cleanRegionName,
            nameEn: cleanRegionName,
            subRegions: finalSubs.map((subName, idx) => ({
              id: `${regionId}_sub_${idx + 1}`,
              nameAr: subName,
              nameEn: subName,
            })),
          },
        ],
      };
    });

    setNewRegionNameAr('');
    setNewSubRegionsCsv('');
    setAdminErr(null);
    setAdminMsg(
      'تمت إضافة المنطقة المخصصة إلى القائمة. اضغط "حفظ إعدادات الدول والمناطق" لاعتمادها في قاعدة البيانات.'
    );
  };

  const handleRemoveCustomRegion = (countryCodeKey: string, regionId: string) => {
    setCustomRegionsMap((prev) => {
      const currentList = prev[countryCodeKey] || [];
      return {
        ...prev,
        [countryCodeKey]: currentList.filter((r) => r.id !== regionId),
      };
    });
  };

  const hasGoogleLinked = linkedProviders.includes('google.com');
  const hasPasswordLinked = linkedProviders.includes('password');
  const managedCountryObj =
    ARAB_COUNTRIES.find((c) => c.code === managedCountryCode) ||
    ARAB_COUNTRIES[0];
  const customRegionsForManagedCountry =
    customRegionsMap[managedCountryCode] || [];

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full ${
          mode === 'admin' ? 'max-w-5xl' : 'max-w-2xl'
        } bg-white rounded-2xl border border-stone-200 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]`}
      >
        {/* شريط العنوان العلوي */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-stone-200 bg-stone-900 text-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold truncate">
                {mode === 'account'
                  ? 'إدارة الحساب وإعلاناتي المحفوظة'
                  : 'لوحة التحكم الإدارية المتكاملة — خطابة الزواج المسيار'}
              </h2>
              {mode === 'admin' && serverAdminAllowed && (
                <p className="text-[11px] text-stone-300 truncate">
                  متصل بصلاحية معتمدة من الخادم: {permissions.labelAr} (
                  {firebaseUser.email})
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[36px] min-w-[36px] rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 inline-flex items-center justify-center transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* محتوى النافذة */}
        {mode === 'account' ? (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-6">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="text-xs text-stone-600 flex flex-wrap items-center justify-between gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200">
                <div>
                  <span>البريد الإلكتروني: </span>
                  <span dir="ltr" className="font-semibold text-stone-900">
                    {firebaseUser.email}
                  </span>
                  <span className="mr-2 text-emerald-700 font-semibold">
                    ({isEmailVerified ? 'موثق' : 'غير موثق'})
                  </span>
                </div>
                <div>
                  <span>الصلاحية: </span>
                  <span className="font-bold text-stone-900">
                    {permissions.labelAr}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  الاسم التعريفي أو الكنية
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={80}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    الجنس
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as UserGender)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs sm:text-sm bg-white"
                  >
                    <option value="unspecified">غير محدد</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    رقم الهاتف (معزول في السجل الخاص)
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    maxLength={30}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs sm:text-sm text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    الدولة
                  </label>
                  <select
                    value={countryCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      setCountryCode(code);
                      const found = ARAB_COUNTRIES.find((c) => c.code === code);
                      if (found && found.cities.length > 0) {
                        setCityName(found.cities[0].nameAr);
                      }
                    }}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs sm:text-sm bg-white"
                  >
                    <optgroup label="دول الخليج العربي">
                      {ARAB_COUNTRIES.filter((c) => c.isGulf).map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.nameAr} ({c.nameEn})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="الدول العربية">
                      {ARAB_COUNTRIES.filter((c) => !c.isGulf).map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.nameAr} ({c.nameEn})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    المدينة
                  </label>
                  <select
                    value={cityName}
                    onChange={(e) => setCityName(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs sm:text-sm bg-white"
                  >
                    {selectedCountry.cities.map((ct) => (
                      <option key={ct.nameEn} value={ct.nameAr}>
                        {ct.nameAr} ({ct.nameEn})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {profileMsg && (
                <div className="p-3 rounded-lg bg-stone-100 text-xs text-stone-800">
                  {profileMsg}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="min-h-[40px] px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {isSavingProfile ? 'جاري الحفظ...' : 'حفظ بيانات الحساب'}
                  </span>
                </button>
              </div>
            </form>

            {/* قسم ربط طرق الدخول بنفس الحساب لمنع تكرار الحسابات */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-amber-700" />
                <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                  طرق الدخول المرتبطة بنفس الحساب
                </h3>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                يمكنك ربط البريد وكلمة المرور مع حساب Google بنفس الحساب الموحد لعدم إنشاء حسابات مكررة:
              </p>

              {(authError || authNotice) && (
                <div
                  className={`p-2.5 rounded-lg text-xs ${
                    authError
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {authError || authNotice}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-white border border-stone-200 text-xs">
                <span>الدخول عبر حساب Google:</span>
                {hasGoogleLinked ? (
                  <span className="font-semibold text-emerald-700">
                    مرتبط بالحساب
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={linkGoogleToCurrentAccount}
                    className="px-3 py-1.5 rounded-lg bg-stone-900 text-white font-semibold hover:bg-stone-800"
                  >
                    ربط حساب Google الآن
                  </button>
                )}
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-stone-200 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span>الدخول بالبريد وكلمة المرور:</span>
                  {hasPasswordLinked && (
                    <span className="font-semibold text-emerald-700">
                      مرتبط بالحساب
                    </span>
                  )}
                </div>

                {!hasPasswordLinked && (
                  <form
                    onSubmit={handleLinkPasswordSubmit}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1"
                  >
                    <input
                      type="password"
                      required
                      minLength={6}
                      dir="ltr"
                      placeholder="كلمة مرور جديدة (6+)"
                      value={newLinkPassword}
                      onChange={(e) => setNewLinkPassword(e.target.value)}
                      className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs text-right"
                    />
                    <input
                      type="password"
                      required
                      minLength={6}
                      dir="ltr"
                      placeholder="تأكيد كلمة المرور"
                      value={newLinkConfirmPassword}
                      onChange={(e) => setNewLinkConfirmPassword(e.target.value)}
                      className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs text-right"
                    />
                    <button
                      type="submit"
                      disabled={isLinkingPassword}
                      className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold"
                    >
                      {isLinkingPassword
                        ? 'جاري الربط...'
                        : 'إضافة كلمة مرور للحساب'}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* قسم إعلاناتي المحفوظة واسترجاعها عبر الأجهزة */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                    إعلاناتي المحفوظة ({(serverSyncedOwnAds ?? ownAds).length})
                  </h3>
                  <p className="text-[11px] text-stone-600 mt-0.5">
                    مرتبطة بحسابك في قاعدة البيانات السحابية وتظهر تلقائياً عند الدخول من أي جهاز
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isSyncingOwnAds}
                  onClick={async () => {
                    setIsSyncingOwnAds(true);
                    setOwnAdActionMsg(null);
                    try {
                      const fresh = await fetchUserMarriageAdsFromServer(
                        firebaseUser.uid
                      );
                      setServerSyncedOwnAds(fresh);
                      setOwnAdActionMsg(
                        `تم استرجاع ومزامنة ${fresh.length} إعلان من الخادم السحابي بنجاح.`
                      );
                    } catch (err) {
                      setOwnAdActionMsg(
                        err instanceof Error
                          ? err.message
                          : 'تعذر الاتصال بالخادم لاسترجاع الإعلانات.'
                      );
                    } finally {
                      setIsSyncingOwnAds(false);
                    }
                  }}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-amber-700 ${
                      isSyncingOwnAds ? 'animate-spin' : ''
                    }`}
                  />
                  <span>
                    {isSyncingOwnAds
                      ? 'جاري الاسترجاع...'
                      : 'استرجاع ومزامنة من الخادم'}
                  </span>
                </button>
              </div>

              {ownAdActionMsg && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  {ownAdActionMsg}
                </div>
              )}

              {(serverSyncedOwnAds ?? ownAds).length === 0 ? (
                <p className="text-xs text-stone-500 py-3 text-center bg-white rounded-lg border border-stone-200">
                  لا توجد إعلانات محفوظة تحت حسابك حالياً.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {(serverSyncedOwnAds ?? ownAds).map((ad) => {
                    const isBusy = busyOwnAdId === ad.adId;
                    const thumbSrc =
                      ad.primaryPhotoUrl || getDefaultAvatarByGender(ad.gender);

                    return (
                      <div
                        key={ad.adId}
                        className="p-3 rounded-xl bg-white border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={thumbSrc}
                            alt={ad.advertiserName || ad.title}
                            className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0 bg-stone-100"
                          />
                          <div className="min-w-0 space-y-0.5">
                            <p className="font-bold text-stone-900 truncate">
                              {ad.advertiserName || ad.title} ({ad.age} سنة)
                            </p>
                            <p className="text-[11px] text-stone-600 truncate">
                              {ad.marriageType || ad.maritalStatus} ·{' '}
                              {ad.countryNameAr} ({ad.regionNameAr || ad.cityNameAr})
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-500">
                              <span
                                className={`font-bold ${
                                  ad.status === 'approved'
                                    ? 'text-emerald-700'
                                    : ad.status === 'pending'
                                    ? 'text-amber-700'
                                    : 'text-red-700'
                                }`}
                              >
                                {ad.status === 'approved'
                                  ? 'معتمد ومنشور'
                                  : ad.status === 'pending'
                                  ? 'بانتظار المراجعة'
                                  : ad.status === 'rejected'
                                  ? 'مرفوض'
                                  : 'مؤرشف'}
                              </span>
                              <span>·</span>
                              <span className="inline-flex items-center gap-0.5">
                                <Eye className="w-3 h-3" />
                                {ad.viewsCount || 0}
                              </span>
                              <span className="inline-flex items-center gap-0.5">
                                <Share2 className="w-3 h-3" />
                                {ad.sharesCount || 0}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                          {onEditAd && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                onClose();
                                onEditAd(ad);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              <Edit3 className="w-3 h-3 text-amber-400" />
                              <span>تعديل</span>
                            </button>
                          )}

                          {ad.hasPhotos && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={async () => {
                                setBusyOwnAdId(ad.adId);
                                setOwnAdActionMsg(null);
                                try {
                                  await removeMarriageAdPhotoOnly(
                                    firebaseUser.uid,
                                    ad
                                  );
                                  setOwnAdActionMsg(
                                    'تم حذف الصورة الشخصية من الإعلان والعودة للصورة الافتراضية.'
                                  );
                                } catch (err) {
                                  setOwnAdActionMsg(
                                    err instanceof Error
                                      ? err.message
                                      : 'تعذر حذف الصورة.'
                                  );
                                } finally {
                                  setBusyOwnAdId(null);
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              <ImageOff className="w-3 h-3 text-red-600" />
                              <span>حذف الصورة</span>
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={async () => {
                              setBusyOwnAdId(ad.adId);
                              setOwnAdActionMsg(null);
                              try {
                                await deleteMarriageAdCascade(
                                  firebaseUser.uid,
                                  ad,
                                  false
                                );
                                setOwnAdActionMsg(
                                  'تم حذف الإعلان وجميع بياناته المرتبطة نهائياً.'
                                );
                              } catch (err) {
                                setOwnAdActionMsg(
                                  err instanceof Error
                                    ? err.message
                                    : 'تعذر حذف الإعلان.'
                                );
                              } finally {
                                setBusyOwnAdId(null);
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{isBusy ? 'جاري...' : 'حذف الإعلان'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : isCheckingServerAdmin ? (
          <div className="py-16 text-center text-xs sm:text-sm text-stone-600">
            جاري فحص الصلاحيات الإدارية من الخادم وقاعدة البيانات...
          </div>
        ) : !serverAdminAllowed ? (
          <div className="p-8 m-4 rounded-xl bg-red-50 border border-red-200 text-center space-y-2">
            <ShieldAlert className="w-9 h-9 text-red-700 mx-auto" />
            <h3 className="text-sm sm:text-base font-bold text-red-900">
              وصول مرفوض من الخادم
            </h3>
            <p className="text-xs text-red-800 leading-relaxed max-w-md mx-auto">
              {serverAdminDenyReason ||
                'لا تظهر لوحة الإدارة ولا يُسمح بالدخول إليها إلا للحسابات التي تملك صلاحية إدارية معتمدة من الخادم.'}
            </p>
          </div>
        ) : (
          /* ========================================================= */
          /* لوحة الإدارة المنظمة في 12 قسماً واضحاً ومستقلاً */
          /* ========================================================= */
          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
            {/* القائمة الجانبية / العلوية لأقسام لوحة الإدارة الـ 12 */}
            <aside
              aria-label="أقسام لوحة الإدارة"
              className="w-full md:w-64 bg-stone-50 border-b md:border-b-0 md:border-l border-stone-200 shrink-0 overflow-x-auto md:overflow-y-auto p-2.5 sm:p-3"
            >
              <div className="flex md:flex-col gap-1.5 min-w-max md:min-w-0">
                {visibleAdminSections.map((sec) => {
                  const IconComp = sec.icon;
                  const isActive = currentSectionMeta?.id === sec.id;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => {
                        setActiveSection(sec.id);
                        setAdminMsg(null);
                        setAdminErr(null);
                      }}
                      className={`px-3 py-2.5 rounded-xl text-right text-xs font-bold flex items-center gap-2.5 transition-all shrink-0 ${
                        isActive
                          ? 'bg-stone-900 text-white shadow-xs'
                          : 'bg-white md:bg-transparent text-stone-700 hover:bg-stone-200/70 border border-stone-200 md:border-transparent'
                      }`}
                    >
                      <IconComp
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-amber-400' : 'text-stone-500'
                        }`}
                      />
                      <span className="truncate">{sec.shortTitleAr}</span>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* مساحة عرض القسم النشط فقط (منع الازدحام في صفحة واحدة) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* رأس القسم النشط */}
              {currentSectionMeta && (
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-200">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-stone-900">
                      القسم {currentSectionMeta.number}:{' '}
                      {currentSectionMeta.titleAr}
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {currentSectionMeta.descriptionAr}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      loadAdminDataCollections(permissions.canManageAdminSettings)
                    }
                    className="min-h-[34px] px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                    <span>تحديث البيانات</span>
                  </button>
                </div>
              )}

              {/* رسائل النجاح أو الخطأ */}
              {adminMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{adminMsg}</span>
                </div>
              )}

              {adminErr && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-semibold flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{adminErr}</span>
                </div>
              )}

              {/* ========================================================= */}
              {/* القسم 1: إدارة المساحة الإعلانية العلوية */}
              {/* ========================================================= */}
              {currentSectionMeta?.id === 'banner' && (
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs sm:text-sm font-bold text-stone-900 cursor-pointer">
                    <div>
                      <p>إظهار المساحة الإعلانية العلوية في الواجهة الرئيسية</p>
                      <p className="text-[11px] font-normal text-stone-500 mt-0.5">
                        تعادل ~30% من ارتفاع شاشة الهاتف وتظهر في أعلى الصفحة لجميع الزوار
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={bannerEnabled}
                      onChange={(e) => setBannerEnabled(e.target.checked)}
                      className="w-4 h-4 accent-amber-700"
                    />
                  </label>

                  {/* ملخص حالة تفعيل الصور */}
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-stone-800">
                    <p className="font-bold text-amber-950 mb-0.5">
                      حالة تفعيل الصور الإعلانية:
                    </p>
                    <p className="text-[11px] text-stone-600">
                      {bannerSlot1Active && bannerSlot2Active && bannerImage1Url && bannerImage2Url
                        ? `الصورتان مفعلتان معاً — سيتم التناوب بينهما تلقائياً كل (${bannerIntervalSeconds}) ثوانٍ.`
                        : bannerSlot1Active && bannerImage1Url
                        ? 'الصورة الأولى (1) مفعلة فقط — ستظهر بشكل ثابت ومستمر دون تناوب.'
                        : bannerSlot2Active && bannerImage2Url
                        ? 'الصورة الثانية (2) مفعلة فقط — ستظهر بشكل ثابت ومستمر دون تناوب.'
                        : 'لا توجد صورة إعلانية مفعلة حالياً.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* بطاقة الصورة 1 */}
                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-stone-900">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold">
                          <input
                            type="checkbox"
                            checked={bannerSlot1Active}
                            onChange={(e) => setBannerSlot1Active(e.target.checked)}
                            className="w-3.5 h-3.5 accent-amber-700"
                          />
                          <span>تفعيل الصورة (1)</span>
                        </label>
                        {bannerImage1Url && (
                          <button
                            type="button"
                            onClick={() => setBannerImage1Url('')}
                            className="text-red-600 hover:underline inline-flex items-center gap-1 text-[11px]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف الصورة 1</span>
                          </button>
                        )}
                      </div>

                      {bannerImage1Url ? (
                        <div className="w-full h-32 rounded-xl overflow-hidden border border-stone-300 bg-white relative">
                          <img
                            src={bannerImage1Url}
                            alt="معاينة البنر 1"
                            className="w-full h-full object-cover"
                          />
                          {!bannerSlot1Active && (
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center text-white text-xs font-bold">
                              معطلة حالياً
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-32 rounded-xl border border-dashed border-stone-300 bg-white flex items-center justify-center text-xs text-stone-400">
                          لا توجد صورة مرفوعة في الخانة (1)
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer">
                          <Upload className="w-3.5 h-3.5 text-amber-400" />
                          <span>
                            {isUploadingSlot === 1
                              ? 'جاري حفظ الصورة في السحابة...'
                              : bannerImage1Url
                              ? 'استبدال الصورة (1) من الجهاز'
                              : 'رفع صورة (1) من الجهاز'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleBannerFileChange(e, 1)}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-stone-700 mb-1">
                          أو رابط مباشر للصورة (1):
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          placeholder="https://example.com/banner1.jpg"
                          value={
                            bannerImage1Url.startsWith('data:')
                              ? '[صورة مرفوعة جاهزة ومحفوظة]'
                              : bannerImage1Url
                          }
                          onChange={(e) => {
                            if (!e.target.value.startsWith('[صورة')) {
                              setBannerImage1Url(e.target.value);
                            }
                          }}
                          className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs text-left"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-stone-700 mb-1 flex items-center gap-1">
                          <ExternalLink className="w-3 h-3 text-amber-700" />
                          <span>رابط عند الضغط على الصورة (1) (اختياري):</span>
                        </label>
                        <input
                          type="url"
                          dir="ltr"
                          placeholder="https://... أو رابط واتساب/موقع"
                          value={bannerImage1Link}
                          onChange={(e) => setBannerImage1Link(e.target.value)}
                          className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs text-left"
                        />
                      </div>
                    </div>

                    {/* بطاقة الصورة 2 */}
                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-stone-900">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold">
                          <input
                            type="checkbox"
                            checked={bannerSlot2Active}
                            onChange={(e) => setBannerSlot2Active(e.target.checked)}
                            className="w-3.5 h-3.5 accent-amber-700"
                          />
                          <span>تفعيل الصورة (2)</span>
                        </label>
                        {bannerImage2Url && (
                          <button
                            type="button"
                            onClick={() => setBannerImage2Url('')}
                            className="text-red-600 hover:underline inline-flex items-center gap-1 text-[11px]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف الصورة 2</span>
                          </button>
                        )}
                      </div>

                      {bannerImage2Url ? (
                        <div className="w-full h-32 rounded-xl overflow-hidden border border-stone-300 bg-white relative">
                          <img
                            src={bannerImage2Url}
                            alt="معاينة البنر 2"
                            className="w-full h-full object-cover"
                          />
                          {!bannerSlot2Active && (
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center text-white text-xs font-bold">
                              معطلة حالياً
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-32 rounded-xl border border-dashed border-stone-300 bg-white flex items-center justify-center text-xs text-stone-400">
                          لا توجد صورة مرفوعة في الخانة (2)
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer">
                          <Upload className="w-3.5 h-3.5 text-amber-400" />
                          <span>
                            {isUploadingSlot === 2
                              ? 'جاري حفظ الصورة في السحابة...'
                              : bannerImage2Url
                              ? 'استبدال الصورة (2) من الجهاز'
                              : 'رفع صورة (2) من الجهاز'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleBannerFileChange(e, 2)}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-stone-700 mb-1">
                          أو رابط مباشر للصورة (2):
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          placeholder="https://example.com/banner2.jpg"
                          value={
                            bannerImage2Url.startsWith('data:')
                              ? '[صورة مرفوعة جاهزة ومحفوظة]'
                              : bannerImage2Url
                          }
                          onChange={(e) => {
                            if (!e.target.value.startsWith('[صورة')) {
                              setBannerImage2Url(e.target.value);
                            }
                          }}
                          className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs text-left"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-stone-700 mb-1 flex items-center gap-1">
                          <ExternalLink className="w-3 h-3 text-amber-700" />
                          <span>رابط عند الضغط على الصورة (2) (اختياري):</span>
                        </label>
                        <input
                          type="url"
                          dir="ltr"
                          placeholder="https://... أو رابط واتساب/موقع"
                          value={bannerImage2Link}
                          onChange={(e) => setBannerImage2Link(e.target.value)}
                          className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs text-left"
                        />
                      </div>
                    </div>
                  </div>

                  {/* إعدادات الترتيب ومدة العرض */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        ترتيب ظهور الصور (عند تفعيل الصورتين معاً)
                      </label>
                      <select
                        value={bannerOrder}
                        onChange={(e) =>
                          setBannerOrder(e.target.value as BannerOrder)
                        }
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs bg-white"
                      >
                        <option value="1_then_2">الصورة 1 أولاً ثم الصورة 2</option>
                        <option value="2_then_1">الصورة 2 أولاً ثم الصورة 1</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        مدة عرض كل صورة بالثواني (2 إلى 120 ثانية)
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={120}
                        value={bannerIntervalSeconds}
                        onChange={(e) =>
                          setBannerIntervalSeconds(Number(e.target.value))
                        }
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSavingAdmin}
                    onClick={() =>
                      persistAdminConfiguration(
                        'تم حفظ إعدادات المساحة الإعلانية العلوية وروابطها في قاعدة البيانات بنجاح وانعكست في الصفحة الرئيسية.'
                      )
                    }
                    className="w-full min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {isSavingAdmin
                        ? 'جاري حفظ الإعدادات في قاعدة البيانات...'
                        : 'حفظ إعدادات المساحة الإعلانية في قاعدة البيانات'}
                    </span>
                  </button>
                </div>
              )}

              {/* ========================================================= */}
              {/* القسم 2: إدارة الشريط الإخباري */}
              {/* ========================================================= */}
              {currentSectionMeta?.id === 'ticker' && (
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs sm:text-sm font-bold text-stone-900 cursor-pointer">
                    <div>
                      <p>إظهار وتفعيل الشريط الإخباري تحت المساحة الإعلانية</p>
                      <p className="text-[11px] font-normal text-stone-500 mt-0.5">
                        يعرض تنبيهات مستمرة دون فراغات ودون توقف أثناء التمرير
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={tickerEnabled}
                      onChange={(e) => setTickerEnabled(e.target.checked)}
                      className="w-4 h-4 accent-amber-700"
                    />
                  </label>

                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1.5">
                      نص الشريط الإخباري (يدعم النصوص العربية الطويلة)
                    </label>
                    <textarea
                      rows={3}
                      maxLength={2000}
                      value={tickerText}
                      onChange={(e) => setTickerText(e.target.value)}
                      placeholder="اكتب نص الشريط الإخباري أو التنبيهات العامة..."
                      className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        اتجاه حركة النص
                      </label>
                      <select
                        value={tickerDirection}
                        onChange={(e) =>
                          setTickerDirection(e.target.value as TickerDirection)
                        }
                        className="w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs bg-white font-medium"
                      >
                        <option value="ltr">من اليسار إلى اليمين (الافتراضي المستمر)</option>
                        <option value="rtl">من اليمين إلى اليسار</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        حجم الخط
                      </label>
                      <select
                        value={tickerFontSize}
                        onChange={(e) =>
                          setTickerFontSize(e.target.value as TickerFontSize)
                        }
                        className="w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs bg-white font-medium"
                      >
                        <option value="sm">صغير (12px / sm)</option>
                        <option value="base">متوسط (14px / base)</option>
                        <option value="lg">كبير (16px / lg)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        سرعة التمرير (بالثواني)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={180}
                        value={tickerSpeedSeconds}
                        onChange={(e) =>
                          setTickerSpeedSeconds(Number(e.target.value))
                        }
                        className="w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs bg-white"
                        title="عدد الثواني لإكمال الدورة (رقم أقل يعني سرعة أعلى)"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        لون النص
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={tickerTextColor}
                          onChange={(e) => setTickerTextColor(e.target.value)}
                          className="w-9 h-8 rounded border border-stone-300 cursor-pointer bg-white p-0.5"
                        />
                        <span dir="ltr" className="text-[11px] font-mono text-stone-600">
                          {tickerTextColor}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        لون الخلفية
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={tickerBgColor}
                          onChange={(e) => setTickerBgColor(e.target.value)}
                          className="w-9 h-8 rounded border border-stone-300 cursor-pointer bg-white p-0.5"
                        />
                        <span dir="ltr" className="text-[11px] font-mono text-stone-600">
                          {tickerBgColor}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* معاينة حية للشريط الإخباري بالاتجاه والسرعة والحجم المختارين */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-stone-700 font-bold">
                      <span>معاينة حية ومستمرة للشريط الإخباري:</span>
                      <span className="text-[11px] text-stone-500 font-normal">
                        الاتجاه: {tickerDirection === 'ltr' ? 'من اليسار لليمين' : 'من اليمين لليسار'} · الدورة: {tickerSpeedSeconds} ثانية
                      </span>
                    </div>

                    <div
                      style={{
                        backgroundColor: tickerBgColor,
                        color: tickerTextColor,
                      }}
                      className="w-full rounded-xl px-2 py-2.5 border border-stone-300 overflow-hidden select-none min-h-[38px] max-h-[50px] flex items-center"
                    >
                      <div dir="ltr" className="w-full overflow-hidden flex items-center">
                        <div
                          className={`${
                            tickerDirection === 'rtl'
                              ? 'ticker-track-rtl'
                              : 'ticker-track-ltr'
                          } font-medium ${
                            tickerFontSize === 'lg'
                              ? 'text-base sm:text-lg'
                              : tickerFontSize === 'base'
                              ? 'text-sm sm:text-base'
                              : 'text-xs sm:text-sm'
                          }`}
                          style={{
                            animationDuration: `${Math.max(5, Number(tickerSpeedSeconds) || 28)}s`,
                          }}
                        >
                          <span
                            dir="rtl"
                            className="inline-block whitespace-nowrap px-4 shrink-0"
                          >
                            {tickerText || 'لا يوجد نص حالياً'}   •   {tickerText || ''}   •   
                          </span>
                          <span
                            dir="rtl"
                            aria-hidden="true"
                            className="inline-block whitespace-nowrap px-4 shrink-0"
                          >
                            {tickerText || 'لا يوجد نص حالياً'}   •   {tickerText || ''}   •   
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSavingAdmin}
                    onClick={() =>
                      persistAdminConfiguration(
                        'تم حفظ إعدادات الشريط الإخباري (النص، الاتجاه، السرعة، والألوان) في قاعدة البيانات بنجاح وانعكست في الصفحة الرئيسية.'
                      )
                    }
                    className="w-full min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {isSavingAdmin
                        ? 'جاري حفظ الإعدادات في قاعدة البيانات...'
                        : 'حفظ إعدادات الشريط الإخباري في قاعدة البيانات'}
                    </span>
                  </button>
                </div>
              )}

              {/* ========================================================= */}
              {/* القسم 3: إدارة خلفية التطبيق */}
              {/* ========================================================= */}
              {currentSectionMeta?.id === 'background' && (
                <div className="space-y-4">
                  {/* أ) رفع صورة خلفية من جهاز المدير */}
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-amber-700" />
                        <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                          صورة خلفية مخصصة للشاشة الرئيسية
                        </h3>
                      </div>
                      {appBgImageUrl && (
                        <button
                          type="button"
                          onClick={() => setAppBgImageUrl('')}
                          className="text-red-600 hover:text-red-700 inline-flex items-center gap-1 text-[11px] font-semibold"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف صورة الخلفية</span>
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-stone-600 leading-relaxed">
                      ارفع صورة أو نقشاً من جهازك لتظهر كخلفية عامة في الواجهة الرئيسية. يتم ضغط الصورة تلقائياً لسرعة التحميل على الهواتف.
                    </p>

                    {appBgImageUrl ? (
                      <div className="w-full h-36 rounded-xl overflow-hidden border border-stone-300 relative bg-stone-200">
                        <div
                          style={{
                            backgroundImage: `url("${appBgImageUrl}")`,
                            backgroundSize:
                              appBgImageFit === 'repeat' ? 'auto' : appBgImageFit,
                            backgroundRepeat:
                              appBgImageFit === 'repeat' ? 'repeat' : 'no-repeat',
                            backgroundPosition: 'center',
                          }}
                          className="w-full h-full"
                        />
                        {appBgOverlayOpacity > 0 && (
                          <div
                            style={{
                              backgroundColor: appBgOverlayColor,
                              opacity: appBgOverlayOpacity,
                            }}
                            className="absolute inset-0 pointer-events-none"
                          />
                        )}
                        <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/70 text-white text-[10px] font-mono">
                          {appBgImageFit} · تعتيم {Math.round(appBgOverlayOpacity * 100)}%
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-24 rounded-xl border border-dashed border-stone-300 bg-white flex flex-col items-center justify-center gap-1 text-xs text-stone-500">
                        <span>لا توجد صورة خلفية مخصصة حالياً</span>
                        <span className="text-[10px] text-stone-400">
                          يتم استخدام اللون الافتراضي للتطبيق
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer">
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {isUploadingAppBg
                            ? 'جاري ضغط ومعالجة الصورة...'
                            : appBgImageUrl
                            ? 'استبدال صورة الخلفية من الجهاز'
                            : 'رفع صورة خلفية من الجهاز'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAppBgFileChange}
                          className="hidden"
                        />
                      </label>

                      {appBgImageUrl && (
                        <button
                          type="button"
                          onClick={() => setAppBgImageUrl('')}
                          className="min-h-[38px] px-3 py-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold"
                        >
                          إلغاء الصورة
                        </button>
                      )}
                    </div>

                    {/* خيارات ضبط العرض لمنع التشويه وحماية النصوص */}
                    {appBgImageUrl && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-stone-200">
                        <div>
                          <label className="block text-[11px] font-bold text-stone-800 mb-1">
                            طريقة التعبئة (لمنع التشوّه)
                          </label>
                          <select
                            value={appBgImageFit}
                            onChange={(e) =>
                              setAppBgImageFit(e.target.value as AppBgImageFit)
                            }
                            className="w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs bg-white font-medium"
                          >
                            <option value="cover">تعبئة الشاشة كاملة (cover)</option>
                            <option value="contain">احتواء كامل دون قص (contain)</option>
                            <option value="repeat">تكرار نقش نمطي (repeat)</option>
                          </select>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-[11px] font-bold text-stone-800 mb-1">
                            <span>حماية النصوص (تعتيم الخلفية)</span>
                            <span className="font-mono text-amber-800">
                              {Math.round(appBgOverlayOpacity * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={0.9}
                            step={0.05}
                            value={appBgOverlayOpacity}
                            onChange={(e) =>
                              setAppBgOverlayOpacity(Number(e.target.value))
                            }
                            className="w-full accent-amber-700 cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-stone-800 mb-1">
                            لون طبقة الحماية
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={appBgOverlayColor}
                              onChange={(e) =>
                                setAppBgOverlayColor(e.target.value)
                              }
                              className="w-8 h-8 rounded border border-stone-300 cursor-pointer bg-white p-0.5"
                            />
                            <span dir="ltr" className="text-[11px] font-mono text-stone-600">
                              {appBgOverlayColor}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ب) خيارات الألوان الأساسية وثيمات الخلفية */}
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                    <label className="block text-xs sm:text-sm font-bold text-stone-900">
                      اختر ثيم لون الخلفية العامة للتطبيق:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {APP_BG_PRESETS.map((preset) => {
                        const isSelected =
                          appBgColor.toLowerCase() === preset.hex.toLowerCase();
                        return (
                          <button
                            key={preset.hex}
                            type="button"
                            onClick={() => setAppBgColor(preset.hex)}
                            className={`p-3 rounded-xl border text-right text-xs font-bold flex items-center justify-between transition-all ${
                              isSelected
                                ? 'border-amber-700 ring-1 ring-amber-700 bg-amber-50/40 text-stone-900'
                                : 'border-stone-300 bg-white text-stone-700 hover:border-stone-400'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span
                                style={{ backgroundColor: preset.hex }}
                                className="w-5 h-5 rounded-md border border-stone-300 shrink-0"
                              />
                              <span>{preset.labelAr}</span>
                            </span>
                            {isSelected && (
                              <Check className="w-4 h-4 text-amber-700 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-stone-800">
                          أو اختر درجة لون مخصصة:
                        </label>
                        <input
                          type="color"
                          value={appBgColor}
                          onChange={(e) => setAppBgColor(e.target.value)}
                          className="w-14 h-8 rounded-lg border border-stone-300 cursor-pointer bg-white p-0.5"
                        />
                        <span
                          dir="ltr"
                          className="text-xs font-mono text-stone-600 bg-white px-2.5 py-1 rounded border border-stone-200"
                        >
                          {appBgColor}
                        </span>
                      </div>

                      {/* زر إعادة الخلفية الافتراضية */}
                      <button
                        type="button"
                        onClick={() => {
                          setAppBgColor('#fafaf9');
                          setAppBgImageUrl('');
                          setAppBgImageFit('cover');
                          setAppBgOverlayOpacity(0);
                          setAppBgOverlayColor('#ffffff');
                        }}
                        className="min-h-[32px] px-3 py-1 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-xs font-medium inline-flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                        <span>إعادة الخلفية الافتراضية</span>
                      </button>
                    </div>
                  </div>

                  {/* ج) معاينة حية وتفاعلية لخلفية التطبيق تماثل الواقع */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-stone-700">
                      معاينة حية ومباشرة لخلفية الشاشة الرئيسية:
                    </span>
                    <div
                      style={{
                        backgroundColor: appBgColor,
                        backgroundImage: appBgImageUrl
                          ? `url("${appBgImageUrl}")`
                          : undefined,
                        backgroundSize:
                          appBgImageFit === 'repeat' ? 'auto' : appBgImageFit,
                        backgroundRepeat:
                          appBgImageFit === 'repeat' ? 'repeat' : 'no-repeat',
                        backgroundPosition: 'center',
                      }}
                      className="p-5 rounded-xl border border-stone-300 relative overflow-hidden min-h-[140px] flex flex-col justify-between"
                    >
                      {appBgImageUrl && appBgOverlayOpacity > 0 && (
                        <div
                          style={{
                            backgroundColor: appBgOverlayColor,
                            opacity: appBgOverlayOpacity,
                          }}
                          className="absolute inset-0 pointer-events-none"
                        />
                      )}
                      <div className="relative z-10 flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-900 bg-white/85 px-2.5 py-1 rounded-lg backdrop-blur-2xs shadow-2xs">
                          الشاشة الرئيسية للتطبيق
                        </span>
                        <span className="text-[11px] text-stone-700 bg-white/80 px-2 py-0.5 rounded">
                          تظهر العناصر فوق هذه الخلفية
                        </span>
                      </div>

                      <div className="relative z-10 max-w-[210px] p-2.5 rounded-xl bg-white/95 border border-stone-200 shadow-xs text-xs space-y-1">
                        <p className="font-bold text-stone-900">عينة بطاقة إعلان</p>
                        <p className="text-[11px] text-stone-600">
                          تأكد من سهولة ووضوح قراءة النصوص.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSavingAdmin}
                    onClick={() =>
                      persistAdminConfiguration(
                        'تم حفظ إعدادات خلفية التطبيق (الصورة، الأبعاد، واللون) في قاعدة البيانات وانعكست فوراً على الواجهة الرئيسية.'
                      )
                    }
                    className="w-full min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {isSavingAdmin
                        ? 'جاري حفظ الإعدادات في قاعدة البيانات...'
                        : 'حفظ إعدادات خلفية التطبيق في قاعدة البيانات'}
                    </span>
                  </button>
                </div>
              )}

              {/* ========================================================= */}
              {/* القسم 4: إدارة تصميم بطاقات الإعلانات */}
              {/* ========================================================= */}
              {currentSectionMeta?.id === 'cards' && (
                <div className="space-y-4">
                  {/* أ) رفع صورة أو تصميم خلفية للبطاقات */}
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-amber-700" />
                        <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                          صورة أو نقش خلفية لبطاقات الإعلانات
                        </h3>
                      </div>
                      {cardBgImageUrl && (
                        <button
                          type="button"
                          onClick={() => setCardBgImageUrl('')}
                          className="text-red-600 hover:text-red-700 inline-flex items-center gap-1 text-[11px] font-semibold"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>إلغاء نقش البطاقة</span>
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-stone-600 leading-relaxed">
                      ارفع نقشاً أو تصميماً زخرفياً يتم تطبيقه على جميع بطاقات إعلانات الزواج في الواجهة الرئيسية.
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer">
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {isUploadingCardBg
                            ? 'جاري ضغط ومعالجة تصميم البطاقة...'
                            : cardBgImageUrl
                            ? 'استبدال نقش خلفية البطاقات'
                            : 'رفع نقش أو صورة للبطاقات من الجهاز'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCardBgFileChange}
                          className="hidden"
                        />
                      </label>
                      {cardBgImageUrl && (
                        <button
                          type="button"
                          onClick={() => setCardBgImageUrl('')}
                          className="min-h-[38px] px-3 py-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold"
                        >
                          حذف الصورة
                        </button>
                      )}
                    </div>

                    {/* شفافية خلفية البطاقات */}
                    <div className="pt-2 border-t border-stone-200">
                      <div className="flex items-center justify-between text-xs font-bold text-stone-800 mb-1">
                        <span>شفافية خلفية البطاقات (تأثير زجاجي شفاف)</span>
                        <span className="font-mono text-amber-800">
                          {Math.round(cardBgOpacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.4}
                        max={1}
                        step={0.05}
                        value={cardBgOpacity}
                        onChange={(e) => setCardBgOpacity(Number(e.target.value))}
                        className="w-full accent-amber-700 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* ب) التحكم في الألوان */}
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-amber-700" />
                      <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                        التحكم في ألوان البطاقات والنصوص
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">
                          لون خلفية البطاقة
                        </label>
                        <input
                          type="color"
                          value={cardBgColor}
                          onChange={(e) => setCardBgColor(e.target.value)}
                          className="w-full h-9 rounded-lg border border-stone-300 cursor-pointer bg-white p-0.5"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">
                          لون النص الأساسي (الاسم)
                        </label>
                        <input
                          type="color"
                          value={cardTextColor}
                          onChange={(e) => setCardTextColor(e.target.value)}
                          className="w-full h-9 rounded-lg border border-stone-300 cursor-pointer bg-white p-0.5"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">
                          لون النص الثانوي
                        </label>
                        <input
                          type="color"
                          value={cardSecondaryTextColor}
                          onChange={(e) => setCardSecondaryTextColor(e.target.value)}
                          className="w-full h-9 rounded-lg border border-stone-300 cursor-pointer bg-white p-0.5"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">
                          لون إطار البطاقة
                        </label>
                        <input
                          type="color"
                          value={cardBorderColor}
                          onChange={(e) => setCardBorderColor(e.target.value)}
                          className="w-full h-9 rounded-lg border border-stone-300 cursor-pointer bg-white p-0.5"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">
                          اللون المميز والشارات
                        </label>
                        <input
                          type="color"
                          value={cardAccentColor}
                          onChange={(e) => setCardAccentColor(e.target.value)}
                          className="w-full h-9 rounded-lg border border-stone-300 cursor-pointer bg-white p-0.5"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ج) التحكم في الخطوط والطباعة */}
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <Type className="w-4 h-4 text-amber-700" />
                      <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                        التحكم في الخطوط والطباعة
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-1">
                          حجم خط بطاقة الإعلان
                        </label>
                        <select
                          value={cardFontSize}
                          onChange={(e) =>
                            setCardFontSize(e.target.value as CardFontSize)
                          }
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs bg-white font-medium"
                        >
                          <option value="sm">صغير (12px / sm) - مدمج</option>
                          <option value="base">متوسط (14px / base) - متوازن (الافتراضي)</option>
                          <option value="lg">كبير (16px / lg) - بارز وقوي</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-1">
                          سُمك / وزن خط العناوين
                        </label>
                        <select
                          value={cardFontWeight}
                          onChange={(e) =>
                            setCardFontWeight(e.target.value as CardFontWeight)
                          }
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs bg-white font-medium"
                        >
                          <option value="normal">عادي (Normal / 400)</option>
                          <option value="medium">متوسط (Medium / 500)</option>
                          <option value="bold">عريض واضح (Bold / 700 - الافتراضي)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* د) التحكم في حدود البطاقات وزواياها */}
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-700" />
                      <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                        التحكم في حدود البطاقات وزواياها
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-1">
                          استدارة الزوايا (Corner Radius)
                        </label>
                        <select
                          value={cardRadius}
                          onChange={(e) =>
                            setCardRadius(e.target.value as CardRadius)
                          }
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs bg-white font-medium"
                        >
                          <option value="none">زوايا حادة كلاسيكية (0px)</option>
                          <option value="rounded">متوسطة الاستدارة (12px - الافتراضي)</option>
                          <option value="soft">ناعمة الاستدارة (20px)</option>
                          <option value="pill">كبسولية دائرية (28px)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-1">
                          سُمك إطار البطاقة
                        </label>
                        <select
                          value={cardBorderWidth}
                          onChange={(e) =>
                            setCardBorderWidth(Number(e.target.value))
                          }
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs bg-white font-medium"
                        >
                          <option value={0}>بدون إطار (0px)</option>
                          <option value={1}>إطار نحيف (1px - الافتراضي)</option>
                          <option value={2}>إطار متوسط (2px)</option>
                          <option value={3}>إطار سميك (3px)</option>
                          <option value={4}>إطار بارز جداً (4px)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-1">
                          نمط الإطار (Border Style)
                        </label>
                        <select
                          value={cardBorderStyle}
                          onChange={(e) =>
                            setCardBorderStyle(e.target.value as CardBorderStyle)
                          }
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs bg-white font-medium"
                        >
                          <option value="solid">متصل صلب (Solid - الافتراضي)</option>
                          <option value="dashed">متقطع أنيق (Dashed)</option>
                          <option value="double">مزدوج فاخر (Double)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* هـ) التحكم في المسافات الداخلية والخارجية وترتيب الإعلانات */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        المسافات الداخلية (Padding)
                      </label>
                      <select
                        value={cardPadding}
                        onChange={(e) =>
                          setCardPadding(e.target.value as CardPadding)
                        }
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs bg-white font-medium"
                      >
                        <option value="compact">مدمجة صغيرة (8px)</option>
                        <option value="normal">متوازنة قياسية (12px - الافتراضي)</option>
                        <option value="relaxed">مريحة واسعة (16px)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        المسافات بين البطاقات (Gap)
                      </label>
                      <select
                        value={cardGap}
                        onChange={(e) => setCardGap(e.target.value as CardGap)}
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs bg-white font-medium"
                      >
                        <option value="compact">متقاربة (8px)</option>
                        <option value="normal">متوازنة قياسية (12px - الافتراضي)</option>
                        <option value="relaxed">متباعدة واسعة (16px)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        ترتيب عرض البطاقات
                      </label>
                      <select
                        value={adsSortOrder}
                        onChange={(e) =>
                          setAdsSortOrder(e.target.value as AdsSortOrder)
                        }
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs bg-white font-medium"
                      >
                        <option value="newest">الأحدث أولاً</option>
                        <option value="oldest">الأقدم أولاً</option>
                        <option value="age_asc">العمر: من الأصغر للأكبر</option>
                        <option value="age_desc">العمر: من الأكبر للأصغر</option>
                      </select>
                    </div>
                  </div>

                  {/* و) معاينة شكل البطاقة قبل النشر (Live Card Preview) */}
                  <div className="p-4 rounded-xl bg-stone-100/70 border border-stone-300 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-amber-700" />
                        <span>معاينة حية ومباشرة لشكل بطاقة الإعلان قبل النشر:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCardBgColor('#ffffff');
                          setCardBgImageUrl('');
                          setCardBgOpacity(1);
                          setCardTextColor('#1c1917');
                          setCardSecondaryTextColor('#78716c');
                          setCardFontSize('base');
                          setCardFontWeight('bold');
                          setCardBorderColor('#e7e5e4');
                          setCardBorderWidth(1);
                          setCardBorderStyle('solid');
                          setCardRadius('rounded');
                          setCardPadding('normal');
                          setCardGap('normal');
                          setCardAccentColor('#b45309');
                        }}
                        className="text-[11px] text-stone-600 hover:text-stone-900 inline-flex items-center gap-1 font-medium"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>إعادة ضبط التصميم الافتراضي للبطاقات</span>
                      </button>
                    </div>

                    <div className="flex justify-center p-4 bg-stone-200/50 rounded-xl">
                      <div
                        style={{
                          backgroundColor: cardBgColor,
                          color: cardTextColor,
                          borderColor: cardBorderColor,
                          borderWidth: `${cardBorderWidth}px`,
                          borderStyle: cardBorderStyle,
                          backgroundImage: cardBgImageUrl
                            ? `url("${cardBgImageUrl}")`
                            : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          opacity: cardBgOpacity,
                        }}
                        className={`w-full max-w-[240px] overflow-hidden flex flex-col justify-between shadow-xs transition-all ${
                          cardRadius === 'none'
                            ? 'rounded-none'
                            : cardRadius === 'soft'
                            ? 'rounded-2xl'
                            : cardRadius === 'pill'
                            ? 'rounded-3xl'
                            : 'rounded-xl'
                        }`}
                      >
                        {/* صورة شخصية للمعاينة */}
                        <div className="w-full h-36 bg-stone-100 border-b border-stone-200/70 overflow-hidden relative shrink-0">
                          <img
                            src={getDefaultAvatarByGender('male')}
                            alt="معاينة"
                            className="w-full h-full object-cover"
                          />
                          <div
                            style={{ backgroundColor: cardAccentColor }}
                            className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-xs"
                          >
                            زواج مسيار
                          </div>
                        </div>

                        {/* محتوى البطاقة في المعاينة بالمسافات والخطوط المختارة */}
                        <div
                          className={`${
                            cardPadding === 'compact'
                              ? 'p-2'
                              : cardPadding === 'relaxed'
                              ? 'p-4'
                              : 'p-3'
                          } flex-1 flex flex-col justify-between gap-1.5`}
                        >
                          <div className="space-y-1">
                            <h4
                              style={{ color: cardTextColor }}
                              className={`${
                                cardFontSize === 'sm'
                                  ? 'text-xs'
                                  : cardFontSize === 'lg'
                                  ? 'text-base'
                                  : 'text-sm'
                              } ${
                                cardFontWeight === 'normal'
                                  ? 'font-normal'
                                  : cardFontWeight === 'medium'
                                  ? 'font-medium'
                                  : 'font-bold'
                              } leading-snug truncate`}
                            >
                              أبو فهد الهذلي
                            </h4>

                            <p
                              style={{ color: cardAccentColor }}
                              className="text-[11px] font-bold truncate tabular-nums"
                            >
                              <span>ذكر</span>
                              <span className="mx-1">·</span>
                              <span>34 سنة</span>
                            </p>

                            <p
                              style={{ color: cardSecondaryTextColor }}
                              className="text-[11px] font-medium truncate"
                            >
                              <span>🇸🇦 المملكة العربية السعودية</span>
                            </p>

                            <p
                              style={{ color: cardSecondaryTextColor }}
                              className="text-[11px] opacity-90 truncate"
                            >
                              منطقة الرياض — شمال الرياض
                            </p>
                          </div>

                          <div className="pt-1.5 border-t border-stone-200/60">
                            <div
                              style={{
                                borderColor: cardAccentColor,
                                color: cardAccentColor,
                              }}
                              className="w-full min-h-[30px] px-2 py-1 rounded-lg border bg-amber-50/50 text-[11px] font-bold inline-flex items-center justify-center gap-1.5"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>الدفع لفتح التواصل</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* زر حفظ التعديلات */}
                  <button
                    type="button"
                    disabled={isSavingAdmin}
                    onClick={() =>
                      persistAdminConfiguration(
                        'تم حفظ تصميم بطاقات الإعلانات (الألوان، الخطوط، الحواف، النقش، والمسافات) في قاعدة البيانات بنجاح وانعكس فوراً على جميع الإعلانات.'
                      )
                    }
                    className="w-full min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {isSavingAdmin
                        ? 'جاري حفظ التعديلات في قاعدة البيانات...'
                        : 'حفظ تصميم بطاقات الإعلانات في قاعدة البيانات'}
                    </span>
                  </button>
                </div>
              )}

              {/* ========================================================= */}
              {/* القسم 5: إدارة الإعلانات */}
              {/* ========================================================= */}
              {currentSectionMeta?.id === 'ads' && (
                <div className="space-y-4">
                  {/* شريط البحث والفلترة المتقدم متعدد المعايير للإعلانات */}
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/70 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-amber-700" />
                        <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                          البحث والفرز الدقيق في إعلانات الزواج
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-amber-900 bg-amber-100/70 px-2.5 py-1 rounded-full border border-amber-200">
                          {filteredStaffAds.length} من أصل {staffAds.length} إعلان
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setAdSearchQuery('');
                            setAdStatusFilter('all');
                            setAdGenderFilter('all');
                            setAdCountryFilter('all');
                            setAdRegionFilter('');
                            setAdMarriageTypeFilter('all');
                            setAdAgeMin(18);
                            setAdAgeMax(90);
                          }}
                          className="text-[11px] font-medium text-stone-600 hover:text-stone-900 inline-flex items-center gap-1 hover:underline"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>إعادة ضبط الفلاتر</span>
                        </button>
                      </div>
                    </div>

                    {/* الصف الأول: البحث بالاسم/المعرف والدولة والمنطقة */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="relative flex items-center">
                        <Search className="w-4 h-4 text-stone-400 absolute right-3 pointer-events-none" />
                        <input
                          type="text"
                          value={adSearchQuery}
                          onChange={(e) => setAdSearchQuery(e.target.value)}
                          placeholder="ابحث بالاسم، المعرف (ID)، أو العنوان..."
                          className="w-full rounded-lg border border-stone-300 bg-white pr-9 pl-3 py-1.5 text-xs text-stone-800"
                        />
                      </div>

                      <div>
                        <select
                          value={adCountryFilter}
                          onChange={(e) => setAdCountryFilter(e.target.value)}
                          className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs text-stone-800"
                        >
                          <option value="all">جميع الدول العربية (الكل)</option>
                          {ARAB_COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.nameAr}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <input
                          type="text"
                          value={adRegionFilter}
                          onChange={(e) => setAdRegionFilter(e.target.value)}
                          placeholder="تصفية حسب المنطقة أو المدينة..."
                          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-800"
                        />
                      </div>
                    </div>

                    {/* الصف الثاني: الجنس، نوع الزواج، الحالة، ونطاق العمر */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 border-t border-stone-200/60">
                      <div>
                        <label className="block text-[10px] font-bold text-stone-600 mb-1">
                          الجنس:
                        </label>
                        <select
                          value={adGenderFilter}
                          onChange={(e) => setAdGenderFilter(e.target.value)}
                          className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
                        >
                          <option value="all">الكل (ذكور وإناث)</option>
                          <option value="male">ذكور فقط</option>
                          <option value="female">إناث فقط</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-stone-600 mb-1">
                          نوع الزواج:
                        </label>
                        <select
                          value={adMarriageTypeFilter}
                          onChange={(e) => setAdMarriageTypeFilter(e.target.value)}
                          className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
                        >
                          <option value="all">جميع الأنواع</option>
                          {marriageTypes.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-stone-600 mb-1">
                          حالة الإعلان:
                        </label>
                        <select
                          value={adStatusFilter}
                          onChange={(e) => setAdStatusFilter(e.target.value)}
                          className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
                        >
                          <option value="all">جميع الحالات</option>
                          <option value="approved">معتمد ومنشور</option>
                          <option value="pending">بانتظار المراجعة</option>
                          <option value="archived">موقوف مؤقتاً / مؤرشف</option>
                          <option value="rejected">مرفوض</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-stone-600 mb-1">
                          نطاق العمر ({adAgeMin} - {adAgeMax} سنة):
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={18}
                            max={adAgeMax}
                            value={adAgeMin}
                            onChange={(e) => setAdAgeMin(Math.max(18, Number(e.target.value)))}
                            className="w-1/2 rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-center"
                            title="العمر الأدنى"
                          />
                          <span className="text-stone-400 text-xs">-</span>
                          <input
                            type="number"
                            min={adAgeMin}
                            max={90}
                            value={adAgeMax}
                            onChange={(e) => setAdAgeMax(Math.min(90, Number(e.target.value)))}
                            className="w-1/2 rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-center"
                            title="العمر الأقصى"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {loadingStaffAds ? (
                    <div className="p-8 text-center bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                      <RefreshCw className="w-5 h-5 text-amber-700 animate-spin mx-auto" />
                      <p className="text-xs text-stone-600">
                        جاري تحميل سجلات الإعلانات من قاعدة البيانات...
                      </p>
                    </div>
                  ) : filteredStaffAds.length === 0 ? (
                    <div className="p-8 text-center bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                      <Megaphone className="w-8 h-8 text-stone-300 mx-auto" />
                      <p className="text-xs font-bold text-stone-700">
                        لا توجد إعلانات مطابقة لمعايير البحث الحالية
                      </p>
                      <p className="text-[11px] text-stone-500">
                        جرّب تعديل الكلمات المدخلة أو إعادة ضبط الفلاتر لاستعراض جميع الإعلانات.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredStaffAds.map((ad) => {
                        const isBusy = busyAdId === ad.adId;
                        const thumbSrc =
                          ad.primaryPhotoUrl || getDefaultAvatarByGender(ad.gender);
                        const countryObj = ARAB_COUNTRIES.find(
                          (c) => c.code === ad.countryCode
                        );

                        // Safe date formatting
                        const createdStr = ad.createdAt
                          ? typeof (ad.createdAt as any).toDate === 'function'
                            ? (ad.createdAt as any).toDate().toLocaleDateString('ar-SA')
                            : new Date(ad.createdAt as any).toLocaleDateString('ar-SA')
                          : '—';
                        const updatedStr = ad.updatedAt
                          ? typeof (ad.updatedAt as any).toDate === 'function'
                            ? (ad.updatedAt as any).toDate().toLocaleDateString('ar-SA')
                            : new Date(ad.updatedAt as any).toLocaleDateString('ar-SA')
                          : '—';

                        return (
                          <div
                            key={ad.adId}
                            className="p-4 rounded-xl bg-white border border-stone-200 space-y-3 text-xs shadow-2xs hover:border-amber-300 transition-colors"
                          >
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                              <div className="flex items-start sm:items-center gap-3 min-w-0">
                                <img
                                  src={thumbSrc}
                                  alt={ad.advertiserName || ad.title}
                                  className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0 bg-stone-100 shadow-2xs"
                                />
                                <div className="min-w-0 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="font-bold text-stone-900 text-sm">
                                      {ad.advertiserName || ad.title}
                                    </h4>
                                    <span className="text-stone-300">·</span>
                                    <span className="font-semibold text-stone-700">
                                      {ad.gender === 'female' ? 'أنثى' : 'ذكر'} ({ad.age} سنة)
                                    </span>
                                    <span className="text-stone-300">·</span>
                                    <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                      {ad.marriageType || ad.maritalStatus || 'زواج مسيار'}
                                    </span>
                                  </div>

                                  <p className="text-[11px] text-stone-600">
                                    <span>{countryObj?.flag}</span>{' '}
                                    <span className="font-medium">{ad.countryNameAr || countryObj?.nameAr}</span>
                                    {' — '}
                                    <span>{ad.regionNameAr || ad.cityNameAr}</span>
                                    {ad.subRegionNameAr && <span> ({ad.subRegionNameAr})</span>}
                                  </p>

                                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-500 pt-0.5">
                                    <span
                                      className={`px-2 py-0.5 rounded-full font-bold border ${
                                        ad.status === 'approved'
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                          : ad.status === 'pending'
                                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                                          : ad.status === 'rejected'
                                          ? 'bg-red-50 text-red-800 border-red-200'
                                          : 'bg-stone-100 text-stone-700 border-stone-200'
                                      }`}
                                    >
                                      {ad.status === 'approved'
                                        ? 'معتمد ومنشور'
                                        : ad.status === 'pending'
                                        ? 'بانتظار المراجعة'
                                        : ad.status === 'rejected'
                                        ? 'مرفوض'
                                        : 'موقوف مؤقتاً'}
                                    </span>
                                    <span>·</span>
                                    <span>إنشاء: {createdStr}</span>
                                    <span>·</span>
                                    <span>تحديث: {updatedStr}</span>
                                    <span>·</span>
                                    <span>مشاهدات: {ad.viewsCount || 0}</span>
                                    <span>·</span>
                                    <span>مشاركات: {ad.sharesCount || 0}</span>
                                    <span>·</span>
                                    <span dir="ltr" className="font-mono text-stone-400">
                                      ID: {ad.adId.slice(0, 10)}...
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* أزرار التحكم الإداري في الإعلان */}
                              <div className="flex flex-wrap items-center gap-1.5 shrink-0 w-full md:w-auto justify-end border-t md:border-t-0 pt-2 md:pt-0 border-stone-100">
                                {/* زر مراجعة وفحص كامل الإعلان */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedReviewAd(ad)}
                                  className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs"
                                >
                                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                                  <span>مراجعة وفحص</span>
                                </button>

                                {/* زر اعتماد وقبول */}
                                {ad.status !== 'approved' && (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleApproveAd(ad)}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>اعتماد ونشر</span>
                                  </button>
                                )}

                                {/* زر إيقاف مؤقت */}
                                {ad.status === 'approved' && (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handlePauseAd(ad)}
                                    className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <Pause className="w-3.5 h-3.5" />
                                    <span>إيقاف مؤقت</span>
                                  </button>
                                )}

                                {/* زر إعادة تفعيل */}
                                {ad.status === 'archived' && (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleResumeAd(ad)}
                                    className="px-2.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <Play className="w-3.5 h-3.5" />
                                    <span>إعادة تفعيل</span>
                                  </button>
                                )}

                                {/* زر رفض مع توضيح السبب */}
                                {ad.status !== 'rejected' && (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleOpenRejectModal(ad)}
                                    className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>رفض بمسوّغ</span>
                                  </button>
                                )}

                                {/* زر حذف الصورة فقط */}
                                {ad.hasPhotos && (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleAdminRemoveAdPhoto(ad)}
                                    className="px-2 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                                    title="حذف الصورة المخالفة مع إبقاء الإعلان"
                                  >
                                    <ImageOff className="w-3.5 h-3.5 text-stone-500" />
                                    <span>حذف الصورة</span>
                                  </button>
                                )}

                                {/* زر حذف نهائي متسلسل */}
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleOpenDeleteAdModal(ad)}
                                  className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>حذف نهائي</span>
                                </button>
                              </div>
                            </div>

                            {/* ملاحظة المراجعة السابقة إن وجدت */}
                            {ad.moderationNote && (
                              <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold">ملاحظة الرقابة الإدارية: </span>
                                  <span>{ad.moderationNote}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* القسم 6: إدارة المستخدمين والرقابة الإدارية */}
              {/* ========================================================= */}
              {currentSectionMeta?.id === 'users' && (
                <div className="space-y-4">
                  {/* شريط البحث والفرز وأزرار السجل والتحديث */}
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/70 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-amber-700" />
                        <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                          إدارة الحسابات المسجلة والرقابة الإدارية
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            fetchAuditLogs();
                            setShowAuditLogsModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-[11px] font-bold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>عرض سجل الرقابة الإدارية الموثق</span>
                        </button>
                        <button
                          type="button"
                          disabled={loadingUsers}
                          onClick={() => loadAdminDataCollections(permissions.canManageAdminSettings)}
                          className="p-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-xs"
                          title="تحديث قائمة المستخدمين"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* حقول البحث والفلترة */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-1 relative flex items-center">
                        <Search className="w-4 h-4 text-stone-400 absolute right-3 pointer-events-none" />
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          placeholder="ابحث بالاسم، البريد، أو المعرف (UID)..."
                          className="w-full rounded-lg border border-stone-300 bg-white pr-9 pl-3 py-1.5 text-xs text-stone-800"
                        />
                      </div>

                      <div>
                        <select
                          value={userStatusFilter}
                          onChange={(e) => setUserStatusFilter(e.target.value)}
                          className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs text-stone-800"
                        >
                          <option value="all">جميع حالات الحساب ({allUsers.length})</option>
                          <option value="active">الحسابات النشطة فقط</option>
                          <option value="restricted">الحسابات المقيدة مؤقتاً</option>
                          <option value="banned">الحسابات المحظورة نهائياً</option>
                        </select>
                      </div>

                      <div>
                        <select
                          value={userRoleFilter}
                          onChange={(e) => setUserRoleFilter(e.target.value)}
                          className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs text-stone-800"
                        >
                          <option value="all">جميع الصلاحيات والأدوار</option>
                          <option value="super_admin">المدير الرئيسي (Super Admin)</option>
                          <option value="moderator">مشرفو مراجعة الإعلانات (Moderators)</option>
                          <option value="user">المستخدمون المسجلون العاديون</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {loadingUsers ? (
                    <div className="p-8 text-center bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                      <RefreshCw className="w-5 h-5 text-amber-700 animate-spin mx-auto" />
                      <p className="text-xs text-stone-600">
                        جاري تحميل سجلات المستخدمين والصلاحيات من قاعدة البيانات...
                      </p>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-8 text-center bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                      <Users className="w-8 h-8 text-stone-300 mx-auto" />
                      <p className="text-xs font-bold text-stone-700">
                        لا توجد حسابات مطابقة لخيارات البحث المحددة
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredUsers.map((u) => {
                        const isSelf = u.uid === firebaseUser.uid;
                        const staffDoc = staffRolesMap[u.uid];
                        const isSuper =
                          u.role === 'super_admin' ||
                          staffDoc?.role === 'super_admin' ||
                          u.email === 'lgzal2027@gmail.com';
                        const isMod =
                          !isSuper &&
                          (u.role === 'moderator' || staffDoc?.role === 'moderator');
                        const isBusy = busyUserId === u.uid;

                        // Ad statistics for this specific user
                        const adsStats = userAdsCountMap[u.uid] || {
                          total: 0,
                          approved: 0,
                          pending: 0,
                          archived: 0,
                          rejected: 0,
                        };

                        const isEmailVer = Boolean(
                          u.emailVerified || (isSelf && isEmailVerified)
                        );

                        const isRestricted =
                          u.accountStatus === 'restricted' ||
                          u.accountStatus === 'suspended';
                        const isBanned = u.accountStatus === 'banned';

                        return (
                          <div
                            key={u.uid}
                            className="p-4 rounded-xl bg-white border border-stone-200 space-y-3 text-xs shadow-2xs hover:border-amber-300 transition-colors"
                          >
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                              <div className="space-y-1.5 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-bold text-stone-900 text-sm">
                                    {u.displayName || 'مستخدم بدون اسم'}
                                  </h4>

                                  {/* شارة الدور */}
                                  <span
                                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                                      isSuper
                                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                                        : isMod
                                        ? 'bg-blue-100 text-blue-900 border-blue-300'
                                        : 'bg-stone-100 text-stone-700 border-stone-200'
                                    }`}
                                  >
                                    {isSuper
                                      ? 'المدير الرئيسي'
                                      : isMod
                                      ? 'مشرف مراجعة'
                                      : 'مستخدم مسجل'}
                                  </span>

                                  {/* شارة حالة الحساب */}
                                  <span
                                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                                      isBanned
                                        ? 'bg-red-100 text-red-900 border-red-300'
                                        : isRestricted
                                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                                        : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                    }`}
                                  >
                                    {isBanned
                                      ? 'محظور نهائياً'
                                      : isRestricted
                                      ? 'حساب مقيد مؤقتاً'
                                      : 'حساب نشط'}
                                  </span>

                                  {/* شارة توثيق البريد الإلكتروني */}
                                  <span
                                    className={`px-2 py-0.5 rounded-full font-medium text-[10px] inline-flex items-center gap-1 border ${
                                      isEmailVer
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : 'bg-stone-100 text-stone-600 border-stone-200'
                                    }`}
                                  >
                                    {isEmailVer ? (
                                      <>
                                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                        <span>البريد موثق</span>
                                      </>
                                    ) : (
                                      <>
                                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                                        <span>البريد غير موثق</span>
                                      </>
                                    )}
                                  </span>
                                </div>

                                <p className="text-[11px] text-stone-600">
                                  {u.email && (
                                    <span className="font-mono text-stone-700 ml-2">
                                      {u.email}
                                    </span>
                                  )}
                                  <span>الدولة: {u.countryCode}</span>
                                  {u.cityName && <span> ({u.cityName})</span>}
                                  {' · '}
                                  <span>
                                    الجنس:{' '}
                                    {u.gender === 'male'
                                      ? 'ذكر'
                                      : u.gender === 'female'
                                      ? 'أنثى'
                                      : 'غير محدد'}
                                  </span>
                                  {' · '}
                                  <span dir="ltr" className="font-mono text-stone-400">
                                    UID: {u.uid.slice(0, 12)}...
                                  </span>
                                </p>

                                {/* إحصائيات إعلانات المستخدم */}
                                <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-500 pt-0.5">
                                  <span className="font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded">
                                    إجمالي الإعلانات: {adsStats.total}
                                  </span>
                                  <span>·</span>
                                  <span className="text-emerald-700 font-semibold">
                                    {adsStats.approved} معتمد
                                  </span>
                                  <span>·</span>
                                  <span className="text-amber-700 font-semibold">
                                    {adsStats.pending} بانتظار المراجعة
                                  </span>
                                  {adsStats.archived > 0 && (
                                    <>
                                      <span>·</span>
                                      <span className="text-stone-600">
                                        {adsStats.archived} موقوف
                                      </span>
                                    </>
                                  )}
                                  {adsStats.rejected > 0 && (
                                    <>
                                      <span>·</span>
                                      <span className="text-red-700">
                                        {adsStats.rejected} مرفوض
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* أزرار الإجراءات على الحساب */}
                              <div className="flex flex-wrap items-center gap-1.5 shrink-0 w-full md:w-auto justify-end border-t md:border-t-0 pt-2 md:pt-0 border-stone-100">
                                {isSuper ? (
                                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                                    حساب المدير الرئيسي محمي
                                  </span>
                                ) : isSelf ? (
                                  <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-3 py-1.5 rounded-lg">
                                    (حسابك الحالي)
                                  </span>
                                ) : (
                                  <>
                                    {/* زر ترقية/إلغاء صلاحية المشرف */}
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => handleToggleModeratorRole(u)}
                                      className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-semibold disabled:opacity-50"
                                    >
                                      {isMod ? 'إلغاء صفة المشرف' : 'ترقية لمشرف'}
                                    </button>

                                    {/* إذا كان مقيداً أو محظوراً: زر فك الحظر والتقييد */}
                                    {isBanned || isRestricted ? (
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => handleOpenUnbanUserModal(u)}
                                        className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-50 shadow-2xs"
                                      >
                                        <UserCheck className="w-3.5 h-3.5" />
                                        <span>إلغاء التقييد/الحظر</span>
                                      </button>
                                    ) : (
                                      <>
                                        {/* زر التقييد المؤقت */}
                                        <button
                                          type="button"
                                          disabled={isBusy}
                                          onClick={() => handleOpenRestrictUserModal(u)}
                                          className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                                        >
                                          <Clock className="w-3.5 h-3.5" />
                                          <span>تقييد مؤقت</span>
                                        </button>

                                        {/* زر الحظر النهائي */}
                                        <button
                                          type="button"
                                          disabled={isBusy}
                                          onClick={() => handleOpenBanUserModal(u)}
                                          className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                                        >
                                          <UserX className="w-3.5 h-3.5" />
                                          <span>حظر الحساب</span>
                                        </button>
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {/* تفاصيل التقييد أو الحظر إن وجدت */}
                            {isRestricted && (
                              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-0.5">
                                <div className="font-bold flex items-center gap-1 text-amber-800">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>بيانات التقييد المؤقت:</span>
                                </div>
                                <p>السبب: {u.restrictionReason || 'مخالفة معايير الاستخدام'}</p>
                                {u.restrictionUntil && (
                                  <p className="text-[10px] text-amber-800">
                                    ينتهي التقييد تلقائياً في:{' '}
                                    {typeof (u.restrictionUntil as any).toDate === 'function'
                                      ? (u.restrictionUntil as any).toDate().toLocaleString('ar-SA')
                                      : new Date(u.restrictionUntil as any).toLocaleString('ar-SA')}
                                  </p>
                                )}
                              </div>
                            )}

                            {isBanned && (
                              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-900 space-y-0.5">
                                <div className="font-bold flex items-center gap-1 text-red-800">
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>بيانات الحظر النهائي:</span>
                                </div>
                                <p>السبب المسجل: {u.bannedReason || 'مخالفة صريحة للشروط الشرعية والضوابط'}</p>
                                {u.bannedAt && (
                                  <p className="text-[10px] text-red-700">
                                    تاريخ الحظر:{' '}
                                    {typeof (u.bannedAt as any).toDate === 'function'
                                      ? (u.bannedAt as any).toDate().toLocaleString('ar-SA')
                                      : new Date(u.bannedAt as any).toLocaleString('ar-SA')}
                                  </p>
                                )}
                                <p className="text-[10px] text-stone-500 italic">
                                  * ملاحظة: تم تجميد حساب المستخدم ومنعه من النشر، وسجل حسابه وتاريخه الرقابي محفوظ وفق السياسة المعتمدة دون حذف.
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* القسم 7: إدارة الدول والمناطق */}
              {/* ========================================================= */}
              {currentSectionMeta?.id === 'countries' && (
                <div className="space-y-5">
                  {/* أ. تفعيل أو إخفاء الدول العربية */}
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs sm:text-sm font-bold text-stone-900">
                        أ. الدول المتاحة في نموذج إضافة الإعلان (
                        {ARAB_COUNTRIES.length - disabledCountryCodes.length} دولة
                        مفعلة)
                      </h4>
                      {disabledCountryCodes.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setDisabledCountryCodes([])}
                          className="text-xs text-amber-800 font-semibold hover:underline"
                        >
                          تفعيل جميع الدول
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {ARAB_COUNTRIES.map((c) => {
                        const isEnabled = !disabledCountryCodes.includes(c.code);
                        return (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => handleToggleCountryEnabled(c.code)}
                            className={`p-2.5 rounded-xl border text-right text-xs font-semibold flex items-center justify-between transition-all ${
                              isEnabled
                                ? 'bg-white border-stone-300 text-stone-900'
                                : 'bg-stone-100 border-stone-200 text-stone-400 line-through'
                            }`}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <span>{c.flag}</span>
                              <span className="truncate">{c.nameAr}</span>
                            </span>
                            <span
                              className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                                isEnabled
                                  ? 'bg-emerald-700 text-white'
                                  : 'bg-stone-300 text-transparent'
                              }`}
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ب. إدارة المناطق والمدن المخصصة لكل دولة */}
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3.5">
                    <h4 className="text-xs sm:text-sm font-bold text-stone-900">
                      ب. استعراض وإضافة مناطق أو مدن مخصصة لكل دولة
                    </h4>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        اختر الدولة لإدارة مناطقها ومدنها:
                      </label>
                      <select
                        value={managedCountryCode}
                        onChange={(e) => setManagedCountryCode(e.target.value)}
                        className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs sm:text-sm bg-white font-bold"
                      >
                        {ARAB_COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.nameAr} ({c.regions.length} مناطق أساسية +{' '}
                            {(customRegionsMap[c.code] || []).length} مخصصة)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-stone-200 space-y-2">
                      <p className="text-xs font-bold text-stone-800">
                        المناطق الأساسية المعتمدة في {managedCountryObj.flag}{' '}
                        {managedCountryObj.nameAr} ({managedCountryObj.regions.length}
                        ):
                      </p>
                      <p className="text-[11px] text-stone-600 leading-relaxed">
                        {managedCountryObj.regions
                          .map((r) => r.nameAr)
                          .join(' · ')}
                      </p>
                    </div>

                    {/* المناطق المخصصة المضافة لهذه الدولة */}
                    {customRegionsForManagedCountry.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-amber-900">
                          المناطق المخصصة المضافة من الإدارة لـ{' '}
                          {managedCountryObj.nameAr}:
                        </p>
                        {customRegionsForManagedCountry.map((cr) => (
                          <div
                            key={cr.id}
                            className="p-2.5 rounded-xl bg-white border border-amber-200 flex items-center justify-between gap-2 text-xs"
                          >
                            <div>
                              <p className="font-bold text-stone-900">
                                {cr.nameAr}
                              </p>
                              <p className="text-[11px] text-stone-500">
                                المدن / المحافظات التابعة:{' '}
                                {cr.subRegions.map((s) => s.nameAr).join('، ')}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveCustomRegion(
                                  managedCountryCode,
                                  cr.id
                                )
                              }
                              className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-semibold inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* نموذج إضافة منطقة مخصصة جديدة */}
                    <div className="p-3 rounded-xl bg-white border border-stone-200 space-y-2.5">
                      <p className="text-xs font-bold text-stone-900">
                        إضافة {managedCountryObj.regionLabelAr} جديدة في{' '}
                        {managedCountryObj.nameAr}:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          maxLength={80}
                          placeholder={`اسم ${managedCountryObj.regionLabelAr} الجديدة...`}
                          value={newRegionNameAr}
                          onChange={(e) => setNewRegionNameAr(e.target.value)}
                          className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs"
                        />
                        <input
                          type="text"
                          maxLength={200}
                          placeholder={`أسماء ${managedCountryObj.subRegionLabelAr} مفصولة بفاصلة (مثال: مدينة 1، مدينة 2)`}
                          value={newSubRegionsCsv}
                          onChange={(e) => setNewSubRegionsCsv(e.target.value)}
                          className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCustomRegionForCountry}
                        className="px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-400" />
                        <span>إضافة المنطقة إلى {managedCountryObj.nameAr}</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSavingAdmin}
                    onClick={() =>
                      persistAdminConfiguration(
                        'تم حفظ إعدادات الدول والمناطق المخصصة في قاعدة البيانات وانعكست في نموذج الإعلان.'
                      )
                    }
                    className="w-full min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {isSavingAdmin
                        ? 'جاري الحفظ...'
                        : 'حفظ إعدادات الدول والمناطق في قاعدة البيانات'}
                    </span>
                  </button>
                </div>
              )}

              {/* ========================================================= */}
              {/* القسم 8: إدارة أنواع الزواج */}
              {/* ========================================================= */}
              {currentSectionMeta?.id === 'marriage_types' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-stone-900">
                        خيارات حقل (نوع الزواج) المعتمدة ({marriageTypes.length})
                      </h4>
                      <button
                        type="button"
                        onClick={() => setMarriageTypes(DEFAULT_MARRIAGE_TYPES)}
                        className="text-xs text-amber-800 font-semibold hover:underline"
                      >
                        استعادة الأنواع الافتراضية
                      </button>
                    </div>

                    <div className="space-y-2">
                      {marriageTypes.map((typeItem, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-400 w-5 text-center tabular-nums">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            maxLength={80}
                            value={typeItem}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMarriageTypes((prev) =>
                                prev.map((it, i) => (i === idx ? val : it))
                              );
                            }}
                            className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-xs sm:text-sm bg-white"
                          />

                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() =>
                              setMarriageTypes((prev) => {
                                if (idx === 0) return prev;
                                const copy = [...prev];
                                const temp = copy[idx - 1];
                                copy[idx - 1] = copy[idx];
                                copy[idx] = temp;
                                return copy;
                              })
                            }
                            className="p-1.5 rounded-lg bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 disabled:opacity-40"
                            title="تحريك لأعلى"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={idx === marriageTypes.length - 1}
                            onClick={() =>
                              setMarriageTypes((prev) => {
                                if (idx >= prev.length - 1) return prev;
                                const copy = [...prev];
                                const temp = copy[idx + 1];
                                copy[idx + 1] = copy[idx];
                                copy[idx] = temp;
                                return copy;
                              })
                            }
                            className="p-1.5 rounded-lg bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 disabled:opacity-40"
                            title="تحريك لأسفل"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          {marriageTypes.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setMarriageTypes((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                )
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-stone-200">
                      <input
                        type="text"
                        maxLength={80}
                        placeholder="أضف نوع زواج جديد (مثال: زواج مسيار معلن للأهل)..."
                        value={newMarriageTypeInput}
                        onChange={(e) => setNewMarriageTypeInput(e.target.value)}
                        className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-xs sm:text-sm bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = newMarriageTypeInput.trim();
                          if (
                            trimmed.length >= 2 &&
                            !marriageTypes.includes(trimmed) &&
                            marriageTypes.length < 25
                          ) {
                            setMarriageTypes((prev) => [...prev, trimmed]);
                            setNewMarriageTypeInput('');
                          }
                        }}
                        className="px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4 text-amber-400" />
                        <span>إضافة نوع</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSavingAdmin}
                    onClick={() =>
                      persistAdminConfiguration(
                        'تم حفظ قائمة أنواع الزواج في قاعدة البيانات بنجاح وانعكست في نموذج الإعلان.'
                      )
                    }
                    className="w-full min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {isSavingAdmin
                        ? 'جاري الحفظ...'
                        : 'حفظ أنواع الزواج في قاعدة البيانات'}
                    </span>
                  </button>
                </div>
              )}

              {/* ========================================================= */}
              {/* القسم 9: إدارة المدفوعات */}
              {/* ========================================================= */}
              {currentSectionMeta?.id === 'payments' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3.5">
                    <h4 className="text-xs sm:text-sm font-bold text-stone-900">
                      إعدادات رسوم وسياسة فتح بيانات التواصل
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          رسوم فتح التواصل
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={10000}
                          value={contactUnlockFee}
                          onChange={(e) =>
                            setContactUnlockFee(Number(e.target.value))
                          }
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          العملة المعتمدة
                        </label>
                        <select
                          value={defaultCurrency}
                          onChange={(e) => setDefaultCurrency(e.target.value)}
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs bg-white"
                        >
                          <option value="SAR">ريال سعودي (SAR)</option>
                          <option value="AED">درهم إماراتي (AED)</option>
                          <option value="KWD">دينار كويتي (KWD)</option>
                          <option value="QAR">ريال قطري (QAR)</option>
                          <option value="BHD">دينار بحريني (BHD)</option>
                          <option value="OMR">ريال عماني (OMR)</option>
                          <option value="USD">دولار أمريكي (USD)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          نطاق صلاحية الدفع المستقبلي
                        </label>
                        <select
                          value={paymentPolicyScope}
                          onChange={(e) =>
                            setPaymentPolicyScope(
                              e.target.value as PaymentUnlockScopeType
                            )
                          }
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs bg-white"
                        >
                          <option value="single_ad">
                            فتح إعلان واحد محدد لكل عملية دفع
                          </option>
                          <option value="timed_access">
                            صلاحية فتح لعدد أو مدة زمنية محددة
                          </option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        ملاحظة بوابات وطرق الدفع المعتمدة مستقبلاً
                      </label>
                      <input
                        type="text"
                        maxLength={500}
                        value={paymentMethodsNote}
                        onChange={(e) => setPaymentMethodsNote(e.target.value)}
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs bg-white"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={isSavingAdmin}
                      onClick={() =>
                        persistAdminConfiguration(
                          'تم حفظ إعدادات رسوم وسياسة المدفوعات في قاعدة البيانات بنجاح.'
                        )
                      }
                      className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>حفظ إعدادات المدفوعات في قاعدة البيانات</span>
                    </button>
                  </div>

                  {/* سجل عمليات الدفع المسجلة في /payments */}
                  <div className="p-4 rounded-xl bg-white border border-stone-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-stone-900">
                        سجلات عمليات الدفع ({allPayments.length}) وصلاحيات الفتح (
                        {allGrants.length})
                      </h4>

                      <select
                        value={paymentStatusFilter}
                        onChange={(e) => setPaymentStatusFilter(e.target.value)}
                        className="rounded-lg border border-stone-300 bg-stone-50 px-2.5 py-1 text-xs"
                      >
                        <option value="all">جميع حالات الدفع</option>
                        <option value="unpaid">لم يتم الدفع</option>
                        <option value="processing">قيد المعالجة</option>
                        <option value="succeeded">ناجح</option>
                        <option value="failed">فاشل</option>
                        <option value="refunded">مسترد</option>
                      </select>
                    </div>

                    {loadingPayments ? (
                      <p className="text-xs text-stone-500 py-4 text-center">
                        جاري تحميل سجلات المدفوعات...
                      </p>
                    ) : filteredPayments.length === 0 ? (
                      <p className="text-xs text-stone-500 py-4 text-center bg-stone-50 rounded-lg border border-stone-200">
                        لا توجد عمليات دفع مسجلة بهذه الحالة حالياً (العمليات المالية الحقيقية غير مفعلة حالياً).
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {filteredPayments.map((p) => (
                          <div
                            key={p.paymentId}
                            className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-between gap-2 text-xs"
                          >
                            <div>
                              <p className="font-bold text-stone-900">
                                الإعلان: {p.targetAdId} · المبلغ: {p.amount}{' '}
                                {p.currency}
                              </p>
                              <p className="text-[11px] text-stone-500">
                                المستخدم: {p.userId} · الطريقة: {p.method}
                              </p>
                            </div>
                            <span className="font-bold text-amber-800">
                              {PAYMENT_STATUS_LABELS_AR[
                                p.status as PaymentStatus
                              ] || p.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* القسم 10: الإحصائيات الحقيقية المعتمدة */}
              {/* ========================================================= */}
              {currentSectionMeta?.id === 'stats' && (
                <div className="space-y-5">
                  {/* شريط التحكم: التصفية الزمنية وتحديث البيانات */}
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/70 pb-2.5">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-amber-700" />
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                            لوحة المؤشرات والإحصائيات الفعلية للمنصة
                          </h3>
                          <p className="text-[11px] text-stone-500">
                            جميع الأرقام مستخرجة من قاعدة البيانات الحقيقية وتُحدث فورياً
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isRefreshingStats}
                        onClick={handleRefreshStats}
                        className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
                        title="إعادة جلب أحدث البيانات من قاعدة البيانات"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 text-amber-400 ${
                            isRefreshingStats ? 'animate-spin' : ''
                          }`}
                        />
                        <span>
                          {isRefreshingStats ? 'جاري التحديث...' : 'تحديث البيانات'}
                        </span>
                      </button>
                    </div>

                    {/* التصفية الزمنية */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-stone-500" />
                        <span className="text-xs font-bold text-stone-700">
                          الفترة الزمنية للإحصائيات:
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: 'today', label: 'اليوم (24 ساعة)' },
                          { id: '7d', label: 'آخر 7 أيام' },
                          { id: '30d', label: 'آخر 30 يوماً' },
                          { id: 'all', label: 'جميع الفترات' },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setStatsTimeFilter(tab.id as any)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                              statsTimeFilter === tab.id
                                ? 'bg-amber-700 text-white shadow-xs'
                                : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-300'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* المؤشرات الـ 10 الأساسية المطلوبة */}
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-stone-900 mb-2.5 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-amber-700" />
                      <span>المؤشرات العشرة الرئيسية (بيانات فعلية من قاعدة البيانات):</span>
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                      {/* 1. إجمالي الحسابات */}
                      <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between text-stone-500">
                          <span className="text-[11px] font-bold">1. إجمالي الحسابات</span>
                          <Users className="w-4 h-4 text-stone-600" />
                        </div>
                        <p className="text-lg font-bold text-stone-900 tabular-nums">
                          {dashboardStats.totalAccountsCount}
                        </p>
                        <p className="text-[10px] text-stone-500">مسجلة في قاعدة البيانات</p>
                      </div>

                      {/* 2. الحسابات الجديدة */}
                      <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between text-stone-500">
                          <span className="text-[11px] font-bold">2. حسابات جديدة</span>
                          <UserPlus className="w-4 h-4 text-emerald-600" />
                        </div>
                        <p className="text-lg font-bold text-emerald-700 tabular-nums">
                          {dashboardStats.newAccountsCount}
                        </p>
                        <p className="text-[10px] text-emerald-800">
                          {statsTimeFilter === 'all'
                            ? 'مسجلة في آخر 7 أيام'
                            : 'خلال الفترة المحددة'}
                        </p>
                      </div>

                      {/* 3. الإعلانات المنشورة */}
                      <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between text-stone-500">
                          <span className="text-[11px] font-bold">3. إعلانات معتمدة</span>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <p className="text-lg font-bold text-emerald-700 tabular-nums">
                          {dashboardStats.approvedAdsCount}
                        </p>
                        <p className="text-[10px] text-stone-500">منشورة بالواجهة الرئيسية</p>
                      </div>

                      {/* 4. الإعلانات قيد المراجعة */}
                      <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between text-stone-500">
                          <span className="text-[11px] font-bold">4. قيد المراجعة</span>
                          <Clock className="w-4 h-4 text-amber-600" />
                        </div>
                        <p className="text-lg font-bold text-amber-700 tabular-nums">
                          {dashboardStats.pendingAdsCount}
                        </p>
                        <p className="text-[10px] text-amber-800">بانتظار تدقيق الإدارة</p>
                      </div>

                      {/* 5. الإعلانات الموقوفة */}
                      <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between text-stone-500">
                          <span className="text-[11px] font-bold">5. إعلانات موقوفة</span>
                          <PauseCircle className="w-4 h-4 text-stone-500" />
                        </div>
                        <p className="text-lg font-bold text-stone-700 tabular-nums">
                          {dashboardStats.archivedAdsCount}
                        </p>
                        <p className="text-[10px] text-stone-500">موقوفة ومؤرشفة مؤقتاً</p>
                      </div>

                      {/* 6. إجمالي المشاهدات */}
                      <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between text-stone-500">
                          <span className="text-[11px] font-bold">6. مشاهدات الإعلانات</span>
                          <Eye className="w-4 h-4 text-blue-600" />
                        </div>
                        <p className="text-lg font-bold text-blue-700 tabular-nums">
                          {dashboardStats.totalViews}
                        </p>
                        <p className="text-[10px] text-stone-500">لا تحتسب التحديث المتكرر</p>
                      </div>

                      {/* 7. عدد المشاركات */}
                      <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between text-stone-500">
                          <span className="text-[11px] font-bold">7. عدد المشاركات</span>
                          <Share2 className="w-4 h-4 text-purple-600" />
                        </div>
                        <p className="text-lg font-bold text-purple-700 tabular-nums">
                          {dashboardStats.totalShares}
                        </p>
                        <p className="text-[10px] text-stone-500">وفق حدث مشاركة فعلي</p>
                      </div>

                      {/* 8. عمليات الدفع الناجحة */}
                      <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between text-stone-500">
                          <span className="text-[11px] font-bold">8. الدفع الناجح</span>
                          <CreditCard className="w-4 h-4 text-emerald-600" />
                        </div>
                        <p className="text-lg font-bold text-emerald-700 tabular-nums">
                          {dashboardStats.succeededPaymentsCount}
                        </p>
                        <p className="text-[10px] text-emerald-800">مؤكدة من مزود الدفع</p>
                      </div>

                      {/* 9. عمليات الدفع الفاشلة */}
                      <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between text-stone-500">
                          <span className="text-[11px] font-bold">9. الدفع الفاشل</span>
                          <XCircle className="w-4 h-4 text-red-600" />
                        </div>
                        <p className="text-lg font-bold text-red-700 tabular-nums">
                          {dashboardStats.failedPaymentsCount}
                        </p>
                        <p className="text-[10px] text-stone-500">عمليات ملغاة أو مرفوضة</p>
                      </div>

                      {/* 10. إجمالي الإيرادات الفعلية */}
                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
                        <div className="flex items-center justify-between text-amber-800">
                          <span className="text-[11px] font-bold">10. الإيرادات الفعلية</span>
                          <Coins className="w-4 h-4 text-amber-700" />
                        </div>
                        <p className="text-base sm:text-lg font-bold text-amber-900 tabular-nums">
                          {dashboardStats.actualRevenue.toFixed(2)}{' '}
                          <span className="text-xs">{defaultCurrency}</span>
                        </p>
                        <p className="text-[10px] text-amber-800">
                          {dashboardStats.actualRevenue > 0
                            ? 'مسجلة من مزود الدفع'
                            : 'لا توجد مدفوعات مفعلة حالياً'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* توزيع الإعلانات حسب الجنس ونوع الزواج */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* توزيع الجنس */}
                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                      <h4 className="text-xs sm:text-sm font-bold text-stone-900 flex items-center justify-between">
                        <span>إحصائيات حسب الجنس</span>
                        <span className="text-[11px] text-stone-500">
                          إجمالي الإعلانات: {dashboardStats.totalAds}
                        </span>
                      </h4>

                      <div className="space-y-2">
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-semibold text-stone-800">
                              ذكور: {dashboardStats.maleAdsCount} إعلان
                            </span>
                            <span className="font-bold text-blue-700">
                              {dashboardStats.malePercent}%
                            </span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-stone-200 overflow-hidden">
                            <div
                              style={{ width: `${dashboardStats.malePercent}%` }}
                              className="h-full bg-blue-600 rounded-full transition-all duration-300"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-semibold text-stone-800">
                              إناث: {dashboardStats.femaleAdsCount} إعلان
                            </span>
                            <span className="font-bold text-pink-700">
                              {dashboardStats.femalePercent}%
                            </span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-stone-200 overflow-hidden">
                            <div
                              style={{ width: `${dashboardStats.femalePercent}%` }}
                              className="h-full bg-pink-500 rounded-full transition-all duration-300"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* توزيع نوع الزواج */}
                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                      <h4 className="text-xs sm:text-sm font-bold text-stone-900 flex items-center justify-between">
                        <span>إحصائيات حسب نوع الزواج</span>
                        <span className="text-[11px] text-stone-500">
                          {dashboardStats.marriageTypesList.length} أنواع مسجلة
                        </span>
                      </h4>

                      {dashboardStats.marriageTypesList.length === 0 ? (
                        <p className="text-xs text-stone-500 py-3 text-center">
                          لا توجد إعلانات مسجلة في هذه الفترة.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {dashboardStats.marriageTypesList.map((mt) => (
                            <div key={mt.type} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-stone-800">
                                  {mt.type} ({mt.count})
                                </span>
                                <span className="font-bold text-amber-800">
                                  {mt.percent}%
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-stone-200 overflow-hidden">
                                <div
                                  style={{ width: `${mt.percent}%` }}
                                  className="h-full bg-amber-700 rounded-full transition-all duration-300"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* توزيع الإعلانات حسب الدولة */}
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs sm:text-sm font-bold text-stone-900 flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-amber-700" />
                        <span>إحصائيات وتوزيع الإعلانات حسب الدولة العربية</span>
                      </h4>
                      <span className="text-[11px] text-stone-500">
                        {dashboardStats.topCountries.length} دول مسجلة
                      </span>
                    </div>

                    {dashboardStats.topCountries.length === 0 ? (
                      <p className="text-xs text-stone-500 py-4 text-center">
                        لا توجد إعلانات مسجلة في هذه الفترة.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {dashboardStats.topCountries.map((item) => (
                          <div
                            key={item.code}
                            className="p-3 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5 font-bold text-stone-900">
                                <span>{item.flag}</span>
                                <span>{item.nameAr}</span>
                              </span>
                              <span className="font-bold text-amber-800 tabular-nums">
                                {item.count} إعلان
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-stone-100 overflow-hidden">
                              <div
                                style={{ width: `${item.percent}%` }}
                                className="h-full bg-amber-600 rounded-full"
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-stone-500">
                              <span>رمز: {item.code}</span>
                              <span>{item.percent}% من إجمالي الإعلانات</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* الإعلانات الأكثر مشاهدة والأكثر مشاركة */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* الأكثر مشاهدة */}
                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-stone-200/70 pb-2">
                        <h4 className="text-xs sm:text-sm font-bold text-stone-900 flex items-center gap-1.5">
                          <Eye className="w-4 h-4 text-blue-700" />
                          <span>الإعلانات الأكثر مشاهدة</span>
                        </h4>
                        <span className="text-[10px] text-stone-500">مرتبة تنازلياً</span>
                      </div>

                      {dashboardStats.topViewedAds.length === 0 ? (
                        <p className="text-xs text-stone-500 py-4 text-center">
                          لا توجد إعلانات مسجلة بعد.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {dashboardStats.topViewedAds.map((ad, idx) => {
                            const cObj = ARAB_COUNTRIES.find((c) => c.code === ad.countryCode);
                            return (
                              <div
                                key={ad.adId}
                                className="p-2.5 rounded-xl bg-white border border-stone-200 flex items-center justify-between gap-2 text-xs hover:border-amber-300 transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                                    {idx + 1}
                                  </span>
                                  <img
                                    src={
                                      ad.primaryPhotoUrl ||
                                      getDefaultAvatarByGender(ad.gender)
                                    }
                                    alt={ad.advertiserName}
                                    className="w-8 h-8 rounded-lg object-cover border border-stone-200 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <p className="font-bold text-stone-900 truncate">
                                      {ad.advertiserName || ad.title}
                                    </p>
                                    <p className="text-[10px] text-stone-500 truncate">
                                      {cObj?.flag} {ad.countryNameAr} · {ad.marriageType}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-bold text-[11px] border border-blue-200">
                                    {ad.viewsCount || 0} مشاهدة
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedReviewAd(ad)}
                                    className="p-1 rounded-md hover:bg-stone-100 text-stone-600 hover:text-stone-900"
                                    title="معاينة وفحص الإعلان"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* الأكثر مشاركة */}
                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-stone-200/70 pb-2">
                        <h4 className="text-xs sm:text-sm font-bold text-stone-900 flex items-center gap-1.5">
                          <Share2 className="w-4 h-4 text-purple-700" />
                          <span>الإعلانات الأكثر مشاركة</span>
                        </h4>
                        <span className="text-[10px] text-stone-500">مرتبة تنازلياً</span>
                      </div>

                      {dashboardStats.topSharedAds.length === 0 ? (
                        <p className="text-xs text-stone-500 py-4 text-center">
                          لا توجد إعلانات مسجلة بعد.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {dashboardStats.topSharedAds.map((ad, idx) => {
                            const cObj = ARAB_COUNTRIES.find((c) => c.code === ad.countryCode);
                            return (
                              <div
                                key={ad.adId}
                                className="p-2.5 rounded-xl bg-white border border-stone-200 flex items-center justify-between gap-2 text-xs hover:border-amber-300 transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                                    {idx + 1}
                                  </span>
                                  <img
                                    src={
                                      ad.primaryPhotoUrl ||
                                      getDefaultAvatarByGender(ad.gender)
                                    }
                                    alt={ad.advertiserName}
                                    className="w-8 h-8 rounded-lg object-cover border border-stone-200 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <p className="font-bold text-stone-900 truncate">
                                      {ad.advertiserName || ad.title}
                                    </p>
                                    <p className="text-[10px] text-stone-500 truncate">
                                      {cObj?.flag} {ad.countryNameAr} · {ad.marriageType}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 font-bold text-[11px] border border-purple-200">
                                    {ad.sharesCount || 0} مشاركة
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedReviewAd(ad)}
                                    className="p-1 rounded-md hover:bg-stone-100 text-stone-600 hover:text-stone-900"
                                    title="معاينة وفحص الإعلان"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* إشعار نزاهة وقواعد احتساب المؤشرات */}
                  <div className="p-3.5 rounded-xl bg-stone-100 border border-stone-200 text-xs text-stone-700 space-y-1">
                    <p className="font-bold text-stone-900 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      <span>قواعد ومعايير نزاهة احتساب المؤشرات المعتمدة:</span>
                    </p>
                    <ul className="space-y-0.5 text-[11px] list-disc list-inside text-stone-600">
                      <li>تحديث الصفحة المتكرر في نفس الجلسة لا يحتسب كمشاهدات جديدة دون انقضاء المهلة المحددة (30 دقيقة).</li>
                      <li>النقر على زر الدفع أو محاولات التجربة لا تُحتسب كدفع ناجح إطلاقاً؛ يُشترط تأكيد العملية رسمياً من مزود الدفع.</li>
                      <li>المشاركات تحتسب فقط عند استكمال حدث المشاركة الفعلي في الجهاز أو نسخ الرابط المباشر.</li>
                      <li>الحسابات يتم جلبها فورياً ومطابقتها من جدول الحسابات الموثق في Firestore.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* القسم 11: خدمة العملاء */}
              {/* ========================================================= */}
              {currentSectionMeta?.id === 'support' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-1">
                          رقم واتساب خدمة العملاء
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          maxLength={40}
                          placeholder="+966500000000"
                          value={supportWhatsapp}
                          onChange={(e) => setSupportWhatsapp(e.target.value)}
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs bg-white text-right"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-1">
                          رقم هاتف خدمة العملاء
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          maxLength={40}
                          placeholder="+966500000000"
                          value={supportPhone}
                          onChange={(e) => setSupportPhone(e.target.value)}
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs bg-white text-right"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-1">
                          حساب تليجرام للدعم
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          maxLength={80}
                          placeholder="@misyar_support"
                          value={supportTelegram}
                          onChange={(e) => setSupportTelegram(e.target.value)}
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs bg-white text-right"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-1">
                          البريد الإلكتروني لخدمة العملاء
                        </label>
                        <input
                          type="email"
                          dir="ltr"
                          maxLength={150}
                          placeholder="support@example.com"
                          value={supportEmail}
                          onChange={(e) => setSupportEmail(e.target.value)}
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs bg-white text-right"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        رسالة التوضيح في شريط خدمة العملاء أسفل الواجهة
                      </label>
                      <textarea
                        rows={2}
                        maxLength={500}
                        value={supportNote}
                        onChange={(e) => setSupportNote(e.target.value)}
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSavingAdmin}
                    onClick={() =>
                      persistAdminConfiguration(
                        'تم حفظ بيانات وقنوات خدمة العملاء في قاعدة البيانات بنجاح وانعكست أسفل التطبيق.'
                      )
                    }
                    className="w-full min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {isSavingAdmin
                        ? 'جاري الحفظ...'
                        : 'حفظ بيانات خدمة العملاء في قاعدة البيانات'}
                    </span>
                  </button>
                </div>
              )}

              {/* ========================================================= */}
              {/* القسم 12: إعدادات التطبيق */}
              {/* ========================================================= */}
              {currentSectionMeta?.id === 'settings' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                    <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm font-bold text-stone-900 cursor-pointer">
                      <div>
                        <p>تفعيل المنصة لاستقبال الإعلانات الجديدة</p>
                        <p className="text-[11px] font-normal text-stone-500 mt-0.5">
                          عند إلغاء التفعيل، يدخل التطبيق في وضع الصيانة المؤقتة للزوار العاديين
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={platformEnabled}
                        onChange={(e) => setPlatformEnabled(e.target.checked)}
                        className="w-4 h-4 accent-amber-700"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm font-bold text-stone-900 cursor-pointer">
                      <div>
                        <p>اشتراط مراجعة الإعلانات الجديدة قبل نشرها للعامة</p>
                        <p className="text-[11px] font-normal text-stone-500 mt-0.5">
                          عند التفعيل، تُحفظ الإعلانات الجديدة بحالة (بانتظار المراجعة) حتى يعتمدها المدير أو المشرف
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={requireAdApproval}
                        onChange={(e) => setRequireAdApproval(e.target.checked)}
                        className="w-4 h-4 accent-amber-700"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm font-bold text-stone-900 cursor-pointer">
                      <div>
                        <p>اشتراط مراجعة الصور الشخصية المرفوعة</p>
                        <p className="text-[11px] font-normal text-stone-500 mt-0.5">
                          يسمح للمدير والمشرف بمراجعة الصور أو حذف أي صورة مخالفة مع الإبقاء على الإعلان
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={requirePhotoApproval}
                        onChange={(e) =>
                          setRequirePhotoApproval(e.target.checked)
                        }
                        className="w-4 h-4 accent-amber-700"
                      />
                    </label>
                  </div>

                  <div className="p-4 rounded-xl bg-stone-100 border border-stone-200 text-xs text-stone-700 space-y-1">
                    <p className="font-bold text-stone-900">
                      حالة الأمان والتحقق من الصلاحيات:
                    </p>
                    <p>
                      • جميع الصلاحيات الإدارية يتم التحقق منها من جهة الخادم وقاعدة البيانات (Firestore Security Rules).
                    </p>
                    <p>
                      • لا يمكن لأي مستخدم عادي تحويل حسابه إلى مدير أو تعديل إعدادات المنصة من المتصفح.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isSavingAdmin}
                    onClick={() =>
                      persistAdminConfiguration(
                        'تم حفظ إعدادات التطبيق وسياسات المراجعة في قاعدة البيانات بنجاح.'
                      )
                    }
                    className="w-full min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {isSavingAdmin
                        ? 'جاري الحفظ...'
                        : 'حفظ إعدادات التطبيق في قاعدة البيانات'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* نافذة 1: فحص ومراجعة الإعلان التفصيلية (Inspection Review Modal) */}
        {/* ========================================================= */}
        {selectedReviewAd && (
          <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
              {/* ترويسة نافذة الفحص */}
              <div className="p-4 bg-stone-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="font-bold text-sm sm:text-base">
                      فحص ومراجعة إعلان الزواج بدقة
                    </h3>
                    <p className="text-[11px] text-stone-300">
                      معاينة جميع البيانات والضوابط الشرعية قبل اتخاذ القرار الإداري
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReviewAd(null)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-stone-300 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* جسم نافذة الفحص */}
              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                {/* معلومات الصورة والملف الشخصي */}
                <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start p-4 rounded-xl bg-stone-50 border border-stone-200">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-stone-300 bg-stone-200 shrink-0 shadow-xs relative">
                    <img
                      src={
                        selectedReviewAd.primaryPhotoUrl ||
                        getDefaultAvatarByGender(selectedReviewAd.gender)
                      }
                      alt={selectedReviewAd.advertiserName}
                      className="w-full h-full object-cover"
                    />
                    {selectedReviewAd.hasPhotos && (
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-bold">
                        صورة خاصة
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1 text-center sm:text-right">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h4 className="font-bold text-stone-900 text-base">
                        {selectedReviewAd.advertiserName || selectedReviewAd.title}
                      </h4>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                          selectedReviewAd.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : selectedReviewAd.status === 'pending'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : selectedReviewAd.status === 'rejected'
                            ? 'bg-red-100 text-red-900 border-red-300'
                            : 'bg-stone-200 text-stone-800 border-stone-300'
                        }`}
                      >
                        {selectedReviewAd.status === 'approved'
                          ? 'معتمد ومنشور'
                          : selectedReviewAd.status === 'pending'
                          ? 'بانتظار المراجعة'
                          : selectedReviewAd.status === 'rejected'
                          ? 'مرفوض'
                          : 'موقوف مؤقتاً'}
                      </span>
                    </div>

                    <p className="text-stone-700 font-medium">
                      الجنس: {selectedReviewAd.gender === 'female' ? 'أنثى' : 'ذكر'} ·{' '}
                      العمر: {selectedReviewAd.age} سنة · نوع الزواج:{' '}
                      <span className="font-bold text-amber-800">
                        {selectedReviewAd.marriageType || selectedReviewAd.maritalStatus || 'زواج مسيار'}
                      </span>
                    </p>

                    <p className="text-stone-600">
                      الدولة: {selectedReviewAd.countryNameAr} ({selectedReviewAd.countryCode}) —{' '}
                      المنطقة: {selectedReviewAd.regionNameAr || selectedReviewAd.cityNameAr}
                      {selectedReviewAd.subRegionNameAr && ` (${selectedReviewAd.subRegionNameAr})`}
                    </p>

                    <p className="text-[11px] font-mono text-stone-400" dir="ltr">
                      UID: {selectedReviewAd.userId} · AdID: {selectedReviewAd.adId}
                    </p>
                  </div>
                </div>

                {/* تفاصيل إضافية عن صاحب الإعلان */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <h5 className="font-bold text-stone-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-700" />
                    <span>نبذة عن صاحب الإعلان والمواصفات:</span>
                  </h5>
                  <p className="text-stone-800 leading-relaxed whitespace-pre-wrap bg-white p-3 rounded-lg border border-stone-200">
                    {selectedReviewAd.details || 'لم يتم إدخال تفاصيل إضافية.'}
                  </p>
                </div>

                {/* الشروط والمواصفات المطلوبة في الطرف الآخر */}
                {selectedReviewAd.partnerRequirements && (
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                    <h5 className="font-bold text-stone-900 flex items-center gap-1.5">
                      <HeartHandshake className="w-4 h-4 text-amber-700" />
                      <span>المواصفات والشروط المطلوبة في شريك الحياة:</span>
                    </h5>
                    <p className="text-stone-800 leading-relaxed whitespace-pre-wrap bg-white p-3 rounded-lg border border-stone-200">
                      {selectedReviewAd.partnerRequirements}
                    </p>
                  </div>
                )}

                {/* قنوات التواصل المرفقة (ملخص القنوات المتاحة للمشرفين) */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <h5 className="font-bold text-stone-900">
                    قنوات ووسائل التواصل المرفقة بالإعلان:
                  </h5>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedReviewAd.contactChannelsSummary && selectedReviewAd.contactChannelsSummary.length > 0 ? (
                      selectedReviewAd.contactChannelsSummary.map((ch, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-lg bg-white border border-stone-200 font-bold text-stone-800"
                        >
                          {ch === 'whatsapp' ? 'واتساب' : ch === 'snapchat' ? 'سناب شات' : ch === 'twitter' || ch === 'x' ? 'منصة إكس' : ch}
                        </span>
                      ))
                    ) : (
                      <span className="text-stone-500">لا توجد قنوات تواصل مسجلة</span>
                    )}
                  </div>
                </div>

                {/* تواريخ وإحصائيات الإعلان */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-stone-600">
                  <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-center">
                    <span className="block text-[10px] text-stone-500">المشاهدات</span>
                    <span className="font-bold text-stone-900 text-sm">
                      {selectedReviewAd.viewsCount || 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-center">
                    <span className="block text-[10px] text-stone-500">المشاركات</span>
                    <span className="font-bold text-stone-900 text-sm">
                      {selectedReviewAd.sharesCount || 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-center">
                    <span className="block text-[10px] text-stone-500">تاريخ الإنشاء</span>
                    <span className="font-bold text-stone-900 text-xs">
                      {selectedReviewAd.createdAt
                        ? typeof (selectedReviewAd.createdAt as any).toDate === 'function'
                          ? (selectedReviewAd.createdAt as any).toDate().toLocaleDateString('ar-SA')
                          : new Date(selectedReviewAd.createdAt as any).toLocaleDateString('ar-SA')
                        : '—'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-center">
                    <span className="block text-[10px] text-stone-500">آخر تحديث</span>
                    <span className="font-bold text-stone-900 text-xs">
                      {selectedReviewAd.updatedAt
                        ? typeof (selectedReviewAd.updatedAt as any).toDate === 'function'
                          ? (selectedReviewAd.updatedAt as any).toDate().toLocaleDateString('ar-SA')
                          : new Date(selectedReviewAd.updatedAt as any).toLocaleDateString('ar-SA')
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* ملاحظة المراجعة المسجلة */}
                {selectedReviewAd.moderationNote && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                    <span className="font-bold">ملاحظة الرقابة السابقة: </span>
                    <span>{selectedReviewAd.moderationNote}</span>
                  </div>
                )}
              </div>

              {/* أزرار اتخاذ القرار الإداري */}
              <div className="p-4 bg-stone-100 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {selectedReviewAd.status !== 'approved' && (
                    <button
                      type="button"
                      disabled={busyAdId === selectedReviewAd.adId}
                      onClick={() => handleApproveAd(selectedReviewAd)}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>اعتماد وقبول الإعلان</span>
                    </button>
                  )}

                  {selectedReviewAd.status === 'approved' && (
                    <button
                      type="button"
                      disabled={busyAdId === selectedReviewAd.adId}
                      onClick={() => handlePauseAd(selectedReviewAd)}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      <Pause className="w-4 h-4" />
                      <span>إيقاف مؤقت</span>
                    </button>
                  )}

                  {selectedReviewAd.status === 'archived' && (
                    <button
                      type="button"
                      disabled={busyAdId === selectedReviewAd.adId}
                      onClick={() => handleResumeAd(selectedReviewAd)}
                      className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      <Play className="w-4 h-4" />
                      <span>إعادة تفعيل الإعلان</span>
                    </button>
                  )}

                  {selectedReviewAd.status !== 'rejected' && (
                    <button
                      type="button"
                      disabled={busyAdId === selectedReviewAd.adId}
                      onClick={() => handleOpenRejectModal(selectedReviewAd)}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>رفض مع ذكر السبب</span>
                    </button>
                  )}

                  {selectedReviewAd.hasPhotos && (
                    <button
                      type="button"
                      disabled={busyAdId === selectedReviewAd.adId}
                      onClick={() => handleAdminRemoveAdPhoto(selectedReviewAd)}
                      className="px-3 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <ImageOff className="w-4 h-4 text-red-600" />
                      <span>حذف الصورة المخالفة</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={busyAdId === selectedReviewAd.adId}
                    onClick={() => handleOpenDeleteAdModal(selectedReviewAd)}
                    className="px-3 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 font-semibold text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>حذف نهائي</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedReviewAd(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs"
                >
                  إغلاق النافذة
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* نافذة 2: رفض الإعلان مع توضيح السبب (Ad Reject Modal) */}
        {/* ========================================================= */}
        {rejectModalAd && (
          <div className="fixed inset-0 z-70 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="w-5 h-5" />
                  <h3 className="font-bold text-sm sm:text-base text-stone-900">
                    رفض إعلان زواج مع توضيح السبب
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectModalAd(null)}
                  className="text-stone-400 hover:text-stone-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                <p className="font-bold text-stone-900">
                  الإعلان المستهدف: {rejectModalAd.advertiserName || rejectModalAd.title}
                </p>
                <p className="text-stone-500 text-[11px]">
                  صاحب الحساب (UID): {rejectModalAd.userId}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1.5">
                  أسباب سريعة شائعة (اضغط للتطبيق الفوري):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'مخالفة الشروط الشرعية وضوابط المنصة',
                    'بيانات غير مكتملة أو غير دقيقة',
                    'صورة شخصية غير ملائمة أو مخالفة',
                    'بيانات تواصل غير صحيحة أو غير متاحة',
                    'إعلان مكرر أو اشتباه في حساب وهمي',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectReasonInput(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                        rejectReasonInput === preset
                          ? 'bg-red-50 text-red-800 border-red-300'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  نص سبب الرفض المفصل (إلزامي):
                </label>
                <textarea
                  rows={3}
                  maxLength={300}
                  value={rejectReasonInput}
                  onChange={(e) => setRejectReasonInput(e.target.value)}
                  placeholder="اكتب سبب الرفض بوضوح ليتم تسجيله في سجل الرقابة..."
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-800 focus:border-red-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setRejectModalAd(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={busyAdId === rejectModalAd.adId || !rejectReasonInput.trim()}
                  onClick={handleConfirmRejectAd}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs inline-flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  <XCircle className="w-4 h-4" />
                  <span>تأكيد الرفض وتسجيل السبب</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* نافذة 3: حذف الإعلان المتسلسل نهائياً (Ad Delete Modal) */}
        {/* ========================================================= */}
        {deleteConfirmAd && (
          <div className="fixed inset-0 z-70 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div className="flex items-center gap-2 text-red-700">
                  <Trash2 className="w-5 h-5" />
                  <h3 className="font-bold text-sm sm:text-base text-stone-900">
                    تأكيد حذف الإعلان وملحقاته نهائياً
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmAd(null)}
                  className="text-stone-400 hover:text-stone-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
                <p className="font-bold">
                  تحذير: سيتم حذف إعلان ({deleteConfirmAd.advertiserName || deleteConfirmAd.title}) نهائياً
                </p>
                <p className="text-[11px] leading-relaxed">
                  وفق سياسة الحذف المعتمدة، سيتم حذف وثيقة الإعلان وبيانات وسائل التواصل الخاصة والصور المرفوعة من التخزين السحابي وقاعدة البيانات بشكل متسلسل ولا يمكن استعادتها.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  سبب أو مسوّغ الحذف الإداري:
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={deleteReasonInput}
                  onChange={(e) => setDeleteReasonInput(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmAd(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-xs"
                >
                  إلغاء التراجع
                </button>
                <button
                  type="button"
                  disabled={busyAdId === deleteConfirmAd.adId}
                  onClick={handleConfirmDeleteAd}
                  className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-xs inline-flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>تأكيد الحذف النهائي الشامل</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* نافذة 4: تقييد حساب مستخدم مؤقتاً (User Restrict Modal) */}
        {/* ========================================================= */}
        {restrictModalUser && (
          <div className="fixed inset-0 z-70 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div className="flex items-center gap-2 text-amber-700">
                  <Clock className="w-5 h-5" />
                  <h3 className="font-bold text-sm sm:text-base text-stone-900">
                    تقييد حساب مستخدم مؤقتاً
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRestrictModalUser(null)}
                  className="text-stone-400 hover:text-stone-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-0.5">
                <p className="font-bold text-stone-900">
                  المستخدم: {restrictModalUser.displayName} ({restrictModalUser.email || 'بدون بريد معلن'})
                </p>
                <p className="text-stone-500 text-[11px]" dir="ltr">
                  UID: {restrictModalUser.uid}
                </p>
              </div>

              {/* تحديد مدة التقييد */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1.5">
                  مدة التقييد المؤقت:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: '24 ساعة (يوم)', hours: 24 },
                    { label: '72 ساعة (3 أيام)', hours: 72 },
                    { label: 'أسبوع (7 أيام)', hours: 168 },
                    { label: 'شهر (30 يوماً)', hours: 720 },
                  ].map((opt) => (
                    <button
                      key={opt.hours}
                      type="button"
                      onClick={() => setRestrictDurationHours(opt.hours)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-colors ${
                        restrictDurationHours === opt.hours
                          ? 'bg-amber-700 text-white border-amber-700'
                          : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* أسباب شائعة */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1.5">
                  أسباب التقييد المقترحة:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'مخالفة معايير التواصل أو شروط الاستخدام',
                    'إرسال بيانات غير ملائمة للمستخدمين',
                    'تكرار نشر إعلانات غير مطابقة للضوابط',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRestrictReasonInput(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                        restrictReasonInput === preset
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  سبب التقييد بالتفصيل:
                </label>
                <textarea
                  rows={2}
                  maxLength={300}
                  value={restrictReasonInput}
                  onChange={(e) => setRestrictReasonInput(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-800"
                />
              </div>

              <p className="text-[11px] text-stone-500 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200">
                * ملاحظة: يمنع التقييد المؤقت المستخدم من إنشاء إعلانات جديدة، ويبقى سجله محفوظاً دون حذف أي بيانات سابقة.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setRestrictModalUser(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={busyUserId === restrictModalUser.uid || !restrictReasonInput.trim()}
                  onClick={handleConfirmRestrictUser}
                  className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs inline-flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  <Clock className="w-4 h-4" />
                  <span>تأكيد تقييد الحساب</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* نافذة 5: حظر حساب مستخدم نهائياً (User Ban Modal) */}
        {/* ========================================================= */}
        {banModalUser && (
          <div className="fixed inset-0 z-70 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div className="flex items-center gap-2 text-red-700">
                  <UserX className="w-5 h-5" />
                  <h3 className="font-bold text-sm sm:text-base text-stone-900">
                    حظر حساب مستخدم نهائياً
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setBanModalUser(null)}
                  className="text-stone-400 hover:text-stone-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
                <p className="font-bold">
                  الحساب المستهدف بالحظر: {banModalUser.displayName} ({banModalUser.email || 'بدون بريد معلن'})
                </p>
                <p className="text-[11px] leading-relaxed">
                  وفق السياسة المعتمدة، لا يتم حذف سجل الحساب أو الإعلانات السابقة عند الحظر، بل يُحفظ الحساب بحالة محظور ويُمنع منعاً باتاً من إضافة أو تعديل الإعلانات، ويُوثّق الإجراء في سجل الرقابة الإدارية.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1.5">
                  أسباب الحظر المعتمدة:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'مخالفة صريحة للشروط الشرعية أو انتحال شخصية',
                    'استخدام المنصة لأغراض احتيالية أو غير مشروعة',
                    'تكرار المخالفات رغم التنبيه والتقييد السابق',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setBanReasonInput(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                        banReasonInput === preset
                          ? 'bg-red-50 text-red-900 border-red-300'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  سبب الحظر المسجل في قاعدة البيانات:
                </label>
                <textarea
                  rows={2}
                  maxLength={300}
                  value={banReasonInput}
                  onChange={(e) => setBanReasonInput(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setBanModalUser(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-xs"
                >
                  إلغاء التراجع
                </button>
                <button
                  type="button"
                  disabled={busyUserId === banModalUser.uid || !banReasonInput.trim()}
                  onClick={handleConfirmBanUser}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs inline-flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  <UserX className="w-4 h-4" />
                  <span>تأكيد حظر الحساب وتسجيل السبب</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* نافذة 6: فك الحظر وإلغاء القيود (User Unban Modal) */}
        {/* ========================================================= */}
        {unbanConfirmUser && (
          <div className="fixed inset-0 z-70 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div className="flex items-center gap-2 text-emerald-700">
                  <UserCheck className="w-5 h-5" />
                  <h3 className="font-bold text-sm sm:text-base text-stone-900">
                    فك الحظر وإلغاء القيود عن الحساب
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setUnbanConfirmUser(null)}
                  className="text-stone-400 hover:text-stone-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <p className="font-bold">
                  هل أنت متأكد من فك الحظر/التقييد عن ({unbanConfirmUser.displayName})؟
                </p>
                <p className="text-[11px] leading-relaxed">
                  ستتم إعادة حالة الحساب إلى (نشط) والسماح للمستخدم بنشر وتعديل الإعلانات، مع توثيق قرار فك الحظر في سجل الرقابة الإدارية.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setUnbanConfirmUser(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={busyUserId === unbanConfirmUser.uid}
                  onClick={handleConfirmUnbanUser}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs inline-flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>تأكيد فك الحظر وتفعيل الحساب</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* نافذة 7: سجل الرقابة الإدارية الموثق (Audit Logs Modal) */}
        {/* ========================================================= */}
        {showAuditLogsModal && (
          <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[88vh]">
              {/* ترويسة سجل الرقابة */}
              <div className="p-4 bg-stone-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="font-bold text-sm sm:text-base">
                      سجل الرقابة الإدارية الموثق (Audit Logs)
                    </h3>
                    <p className="text-[11px] text-stone-300">
                      سجل غير قابل للتعديل يوثق جميع قرارات المشرفين والمديرين
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={loadingAuditLogs}
                    onClick={fetchAuditLogs}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white text-xs inline-flex items-center gap-1"
                    title="تحديث السجل"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingAuditLogs ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAuditLogsModal(false)}
                    className="p-1.5 rounded-xl hover:bg-white/10 text-stone-300 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* قائمة السجلات */}
              <div className="p-4 overflow-y-auto space-y-2.5 text-xs">
                {loadingAuditLogs ? (
                  <div className="p-10 text-center space-y-2">
                    <RefreshCw className="w-6 h-6 text-amber-700 animate-spin mx-auto" />
                    <p className="text-stone-600 text-xs">جاري جلب سجلات الرقابة الإدارية من Firestore...</p>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="p-10 text-center bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                    <History className="w-8 h-8 text-stone-300 mx-auto" />
                    <p className="font-bold text-stone-700">لا توجد عمليات رقابية مسجلة بعد</p>
                    <p className="text-[11px] text-stone-500">
                      جميع عمليات اعتماد ورفض الإعلانات وتقييد وحظر الحسابات ستظهر هنا تلقائياً.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.map((log) => {
                      // Formatting timestamp
                      const dateStr = log.createdAt
                        ? typeof (log.createdAt as any).toDate === 'function'
                          ? (log.createdAt as any).toDate().toLocaleString('ar-SA')
                          : new Date(log.createdAt as any).toLocaleString('ar-SA')
                        : '—';

                      const actionLabel =
                        ADMIN_AUDIT_ACTION_LABELS_AR[log.actionType] || log.actionType;

                      return (
                        <div
                          key={log.logId}
                          className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5 hover:bg-stone-100/70 transition-colors"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                                  log.actionType === 'approve_ad'
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                    : log.actionType === 'reject_ad'
                                    ? 'bg-red-100 text-red-900 border-red-300'
                                    : log.actionType === 'pause_ad'
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : log.actionType === 'resume_ad'
                                    ? 'bg-blue-100 text-blue-900 border-blue-300'
                                    : log.actionType === 'delete_ad'
                                    ? 'bg-purple-100 text-purple-900 border-purple-300'
                                    : log.actionType === 'restrict_user'
                                    ? 'bg-orange-100 text-orange-900 border-orange-300'
                                    : log.actionType === 'ban_user'
                                    ? 'bg-red-100 text-red-900 border-red-300'
                                    : 'bg-teal-100 text-teal-900 border-teal-300'
                                }`}
                              >
                                {actionLabel}
                              </span>
                              <span className="font-bold text-stone-900">
                                الهدف: {log.targetName || log.targetId}
                              </span>
                            </div>

                            <span className="text-[10px] text-stone-500 font-mono">
                              {dateStr}
                            </span>
                          </div>

                          {log.reason && (
                            <p className="text-[11px] text-stone-700 bg-white p-2 rounded-lg border border-stone-200">
                              <span className="font-semibold text-stone-900">المسوّغ / السبب: </span>
                              <span>{log.reason}</span>
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-500 pt-0.5">
                            <span>المنفّذ: {log.adminEmail || log.adminUid}</span>
                            {log.durationHours && log.durationHours > 0 && (
                              <>
                                <span>·</span>
                                <span className="font-bold text-amber-800">
                                  المدة: {log.durationHours} ساعة
                                </span>
                              </>
                            )}
                            <span>·</span>
                            <span dir="ltr" className="font-mono text-stone-400">
                              ID: {log.logId.slice(0, 10)}...
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* تذييل السجل */}
              <div className="p-3.5 bg-stone-100 border-t border-stone-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAuditLogsModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs"
                >
                  إغلاق السجل
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
