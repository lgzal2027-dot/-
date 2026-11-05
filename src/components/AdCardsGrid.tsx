import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Share2,
  Edit3,
  Trash2,
  Check,
  ImageOff,
  PauseCircle,
  ChevronDown,
  Lock,
  ShieldCheck,
  Copy,
  ExternalLink,
  LogIn,
  ArrowRight,
  CreditCard,
  Clock,
  Info,
} from 'lucide-react';
import {
  ARAB_COUNTRIES,
  AdGender,
  CanonicalPaymentStatus,
  EXTENSIBLE_PAYMENT_METHODS_CATALOG,
  MarriageAd,
  PAYMENT_SERVICE_COMING_SOON_MESSAGE,
  PAYMENT_STATUS_LABELS_AR,
  PaymentUnlockScopeType,
  UiConfigSettings,
  getDefaultAvatarByGender,
} from '../types/domain';
import {
  AdDetailsContactChannel,
  ContactAccessCheckResult,
  archiveOwnMarriageAd,
  buildCanonicalAdShareUrl,
  deleteMarriageAdCascade,
  extractValidAdIdFromUrl,
  getApprovedMarriageAdById,
  incrementAdSharesCount,
  incrementAdViewsCount,
  removeMarriageAdPhotoOnly,
  resolveAvailableContactChannels,
  verifyAllContactChannelCombinations,
  verifyAndFetchAdContactIfEntitled,
} from '../services/adService';
import {
  AdPaymentContextSnapshot,
  PAYMENT_UNLOCK_POLICIES,
  resolveUserAdPaymentContext,
} from '../services/paymentService';

interface AdCardsGridProps {
  ads: MarriageAd[];
  uiConfig: UiConfigSettings;
  isLoading: boolean;
  currentUserId?: string | null;
  isEmailVerified?: boolean;
  canModerateAds?: boolean;
  isSuperAdmin?: boolean;
  onRequireAuth?: (reason: string) => void;
  onEditAd?: (ad: MarriageAd) => void;
}

const PAGE_SIZE = 6;

/**
 * أيقونات وسائل التواصل الرسمية الواضحة (واتساب، سناب شات، منصة إكس)
 */
function WhatsAppSvgIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.758.459 3.473 1.331 4.988L2 22l5.189-1.361a9.927 9.927 0 0 0 4.842 1.258h.004c5.515 0 9.965-4.453 9.965-9.969 0-2.663-1.037-5.168-2.92-7.051A9.907 9.907 0 0 0 12.031 2zm5.821 14.273c-.246.693-1.43 1.326-1.988 1.409-.508.076-1.151.108-1.857-.116-.428-.136-.978-.318-1.682-.622-2.961-1.278-4.894-4.26-5.042-4.457-.148-.197-1.204-1.601-1.204-3.054 0-1.453.761-2.167 1.031-2.463.271-.296.591-.37.788-.37.197 0 .394.002.566.01.182.009.426-.069.666.508.246.591.837 2.045.911 2.193.074.148.123.32.025.517-.098.197-.148.32-.296.493-.148.172-.311.385-.443.517-.148.148-.302.309-.13.604.172.296.766 1.264 1.645 2.047 1.131 1.008 2.084 1.321 2.38 1.469.295.148.468.123.64-.074.172-.197.739-.862.936-1.158.197-.295.394-.246.665-.148.271.098 1.724.813 2.02.961.295.148.492.222.566.345.074.123.074.714-.172 1.407z" />
    </svg>
  );
}

function SnapchatSvgIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.166 2.002c3.214.051 5.367 2.275 5.479 5.568.033.966-.07 1.93-.157 2.893-.025.276.091.434.349.527.386.14.803.213 1.178.382.371.167.575.479.512.874-.061.384-.369.622-.741.751-.486.168-.988.292-1.462.491-.296.124-.401.351-.279.647.495 1.201 1.361 2.067 2.574 2.548.322.128.579.312.608.693.029.373-.206.625-.543.766-.757.317-1.564.458-2.383.542-.241.025-.387.143-.439.377-.082.369-.182.735-.32 1.087-.145.369-.441.529-.835.483-.614-.072-1.222-.219-1.842-.245-.863-.036-1.662.212-2.422.6-.699.357-1.422.646-2.257.523-.547-.08-1.055-.295-1.58-.456-.716-.22-1.444-.299-2.186-.14-.422.09-.851.147-1.281.186-.351.032-.606-.142-.729-.472-.137-.368-.232-.752-.337-1.131-.055-.199-.188-.301-.391-.322-.845-.088-1.676-.232-2.455-.575-.314-.138-.529-.378-.506-.742.022-.354.254-.544.568-.669 1.219-.485 2.088-1.351 2.587-2.559.119-.288.017-.515-.274-.638-.49-.207-1.007-.333-1.503-.522-.376-.143-.659-.396-.69-.817-.029-.398.198-.696.578-.855.383-.161.8-.232 1.19-.378.234-.088.348-.243.326-.499-.086-.982-.19-1.964-.153-2.953.122-3.249 2.31-5.468 5.569-5.562.096-.003.193-.001.29-.001z" />
    </svg>
  );
}

function XPlatformSvgIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/**
 * مكون تحميل الصور التدريجي الآمن:
 * - لا يحمّل الصورة إلا عند اقتراب البطاقة من مجال الرؤية (IntersectionObserver)
 * - يستخدم الصورة الشخصية المرفوعة أو الصورة الافتراضية المناسبة للجنس
 * - يمنع ظهور أي صورة مكسورة عند فشل التحميل عبر التحول الفوري للصورة الافتراضية
 */
function ProgressiveAdImage({
  photoUrl,
  hasPhotos,
  gender,
  alt,
  className,
  eager = false,
}: {
  photoUrl: string;
  hasPhotos: boolean;
  gender: AdGender;
  alt: string;
  className: string;
  eager?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isInView, setIsInView] = useState(eager);
  const [hasError, setHasError] = useState(false);

  const defaultAvatar = useMemo(
    () => getDefaultAvatarByGender(gender === 'female' ? 'female' : 'male'),
    [gender]
  );

  useEffect(() => {
    setHasError(false);
  }, [photoUrl, hasPhotos, gender]);

  useEffect(() => {
    if (eager) {
      setIsInView(true);
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '180px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [eager]);

  const targetSrc =
    !hasError && hasPhotos && photoUrl && photoUrl.trim().length > 0
      ? photoUrl
      : defaultAvatar;

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-stone-100 flex items-center justify-center overflow-hidden"
    >
      {isInView ? (
        <img
          src={targetSrc}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className={className}
        />
      ) : (
        <img
          src={defaultAvatar}
          alt={alt}
          decoding="async"
          className={className}
        />
      )}
    </div>
  );
}

/**
 * نظام عرض بطاقات إعلانات الزواج في الواجهة الرئيسية وصفحة تفاصيل الإعلان الكاملة (المرحلة 7).
 */
export function AdCardsGrid({
  ads,
  uiConfig,
  isLoading,
  currentUserId,
  isEmailVerified = false,
  canModerateAds = false,
  isSuperAdmin = false,
  onRequireAuth,
  onEditAd,
}: AdCardsGridProps) {
  // Store ONLY the adId reference so details view always reads from the single live source of truth
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  const [directFetchedAd, setDirectFetchedAd] = useState<MarriageAd | null>(
    null
  );
  const [isLoadingDirectAd, setIsLoadingDirectAd] = useState(false);
  const [invalidSharedAdNotice, setInvalidSharedAdNotice] = useState<
    string | null
  >(null);

  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  // Entitlement & isolated contact state (never populated unless verifyAndFetchAdContactIfEntitled succeeds)
  const [contactAccessResult, setContactAccessResult] =
    useState<ContactAccessCheckResult | null>(null);
  const [isCheckingEntitlement, setIsCheckingEntitlement] = useState(false);
  const [selectedContactChannel, setSelectedContactChannel] =
    useState<AdDetailsContactChannel | null>(null);
  const [copiedContactValue, setCopiedContactValue] = useState<string | null>(
    null
  );

  // Share & owner actions state
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [generatedShareUrl, setGeneratedShareUrl] = useState<string | null>(
    null
  );
  const [ownerActionError, setOwnerActionError] = useState<string | null>(null);
  const [ownerActionBusy, setOwnerActionBusy] = useState(false);
  const [confirmDeleteAd, setConfirmDeleteAd] = useState(false);

  // Stage 8: Payment Architecture State (bound to adId & userId, no fake transactions)
  const [paymentModalAd, setPaymentModalAd] = useState<MarriageAd | null>(null);
  const [paymentUnlockScope, setPaymentUnlockScope] =
    useState<PaymentUnlockScopeType>('single_ad');
  const [paymentContext, setPaymentContext] =
    useState<AdPaymentContextSnapshot | null>(null);
  const [isLoadingPaymentContext, setIsLoadingPaymentContext] = useState(false);
  const [paymentButtonNotice, setPaymentButtonNotice] = useState<string | null>(
    null
  );

  // Run the self-check for all 8 combinations of WhatsApp / Snapchat / X availability once
  useMemo(() => {
    verifyAllContactChannelCombinations();
  }, []);

  // Filter strictly for active & approved ads, deduplicated by adId, and sorted by newest first (or admin sort order)
  const sortedApprovedAds = useMemo(() => {
    const uniqueByAdId = new Map<string, MarriageAd>();
    for (const item of ads) {
      if (item && item.adId && item.status === 'approved') {
        uniqueByAdId.set(item.adId, item);
      }
    }

    const list = Array.from(uniqueByAdId.values());
    const order = uiConfig.adsSortOrder || 'newest';

    list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() ?? 0;
      const timeB = b.createdAt?.toMillis?.() ?? 0;
      if (order === 'oldest') return timeA - timeB;
      if (order === 'age_asc') return (a.age || 0) - (b.age || 0);
      if (order === 'age_desc') return (b.age || 0) - (a.age || 0);
      // Default: newest first
      if (timeB !== timeA) return timeB - timeA;
      return b.adId.localeCompare(a.adId);
    });

    return list;
  }, [ads, uiConfig.adsSortOrder]);

  // Slice for progressive pagination
  const paginatedAds = useMemo(
    () => sortedApprovedAds.slice(0, visibleCount),
    [sortedApprovedAds, visibleCount]
  );

  const hasMoreAds = visibleCount < sortedApprovedAds.length;

  // Automatic infinite-scroll loading when user reaches the end of the list
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || !hasMoreAds) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((prev) =>
            Math.min(prev + PAGE_SIZE, sortedApprovedAds.length)
          );
        }
      },
      { rootMargin: '140px 0px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreAds, sortedApprovedAds.length]);

  // Deep-link listener: when visiting a shared URL (?ad=ad_... or #ad-ad_...), open that exact ad from Firestore
  useEffect(() => {
    const syncAdFromUrl = () => {
      if (typeof window === 'undefined') return;
      const hasRawAdParam =
        window.location.search.includes('ad=') ||
        window.location.hash.startsWith('#ad-');
      const extractedId = extractValidAdIdFromUrl(
        window.location.search,
        window.location.hash
      );
      if (extractedId) {
        setInvalidSharedAdNotice(null);
        setSelectedAdId(extractedId);
      } else if (hasRawAdParam) {
        setSelectedAdId(null);
        setInvalidSharedAdNotice(
          'رابط الإعلان غير صالح أو تم التلاعب بمعرف الإعلان.'
        );
      }
    };

    syncAdFromUrl();
    window.addEventListener('hashchange', syncAdFromUrl);
    window.addEventListener('popstate', syncAdFromUrl);
    return () => {
      window.removeEventListener('hashchange', syncAdFromUrl);
      window.removeEventListener('popstate', syncAdFromUrl);
    };
  }, []);

  // Resolve the selected ad directly from the live approved ads array by adId, or fallback to direct Firestore fetch
  const selectedAdFromList = useMemo(
    () =>
      selectedAdId
        ? sortedApprovedAds.find((item) => item.adId === selectedAdId) || null
        : null,
    [sortedApprovedAds, selectedAdId]
  );

  useEffect(() => {
    if (!selectedAdId) {
      setDirectFetchedAd(null);
      setIsLoadingDirectAd(false);
      return;
    }

    if (selectedAdFromList) {
      setDirectFetchedAd(null);
      setIsLoadingDirectAd(false);
      setInvalidSharedAdNotice(null);
      return;
    }

    let cancelled = false;
    setIsLoadingDirectAd(true);
    getApprovedMarriageAdById(selectedAdId)
      .then((fetched) => {
        if (cancelled) return;
        if (fetched) {
          setDirectFetchedAd(fetched);
          setInvalidSharedAdNotice(null);
        } else if (!isLoading) {
          setDirectFetchedAd(null);
          setInvalidSharedAdNotice(
            'الإعلان المطلوب غير موجود أو لم يعد متاحاً للعرض.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDirectAd(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedAdId, selectedAdFromList, isLoading]);

  const selectedAd = selectedAdFromList || directFetchedAd;

  // Strictly compute ONLY the available contact channels ('whatsapp', 'snapchat', 'x') for this ad
  const availableContactChannels = useMemo(
    () =>
      selectedAd
        ? resolveAvailableContactChannels(selectedAd.contactChannelsSummary)
        : [],
    [selectedAd]
  );

  const openAdDetailsById = (adId: string) => {
    setInvalidSharedAdNotice(null);
    setSelectedAdId(adId);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('ad', adId);
      url.hash = `ad-${encodeURIComponent(adId)}`;
      window.history.replaceState(null, '', url.toString());
    } catch {
      // Ignore history replace errors inside restricted iframes
    }
  };

  const closeAdDetails = () => {
    setSelectedAdId(null);
    setDirectFetchedAd(null);
    setSelectedContactChannel(null);
    setContactAccessResult(null);
    setGeneratedShareUrl(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('ad');
      if (url.hash.startsWith('#ad-')) {
        url.hash = '';
      }
      window.history.replaceState(
        null,
        '',
        url.pathname + url.search + url.hash
      );
    } catch {
      // Ignore history replace errors
    }
  };

  // When an ad is opened, increment viewsCount and verify contact access entitlement
  // (Never fetches /ad_contacts/{adId} unless the user is verified as entitled!)
  useEffect(() => {
    setShareFeedback(null);
    setGeneratedShareUrl(null);
    setOwnerActionError(null);
    setConfirmDeleteAd(false);
    setSelectedContactChannel(null);
    setCopiedContactValue(null);
    setContactAccessResult(null);

    if (!selectedAd) return;

    incrementAdViewsCount(selectedAd);

    let active = true;
    setIsCheckingEntitlement(true);
    verifyAndFetchAdContactIfEntitled(selectedAd, {
      currentUserId,
      isEmailVerified,
      canModerateAds,
      isSuperAdmin,
    })
      .then((res) => {
        if (active) {
          setContactAccessResult(res);
        }
      })
      .finally(() => {
        if (active) {
          setIsCheckingEntitlement(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    selectedAd?.adId,
    currentUserId,
    isEmailVerified,
    canModerateAds,
    isSuperAdmin,
  ]);

  // Resolve bound payment context whenever paymentModalAd or unlockScope changes
  useEffect(() => {
    if (!paymentModalAd) {
      setPaymentContext(null);
      setIsLoadingPaymentContext(false);
      return;
    }

    let active = true;
    setIsLoadingPaymentContext(true);
    resolveUserAdPaymentContext(
      paymentModalAd.adId,
      currentUserId,
      paymentUnlockScope
    )
      .then((ctx) => {
        if (active) {
          setPaymentContext(ctx);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingPaymentContext(false);
        }
      });

    return () => {
      active = false;
    };
  }, [paymentModalAd?.adId, currentUserId, paymentUnlockScope]);

  const handleOpenPaymentModal = (
    ad: MarriageAd,
    e?: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (e) {
      e.stopPropagation();
    }
    setPaymentModalAd(ad);
    setPaymentButtonNotice(PAYMENT_SERVICE_COMING_SOON_MESSAGE);
  };

  const handleTriggerPaymentNotice = (methodTitleAr?: string) => {
    setPaymentButtonNotice(
      methodTitleAr
        ? `${PAYMENT_SERVICE_COMING_SOON_MESSAGE} (${methodTitleAr})`
        : PAYMENT_SERVICE_COMING_SOON_MESSAGE
    );
  };

  const resolvedRadiusClass = useMemo(() => {
    const rad =
      uiConfig.cardRadius ||
      (uiConfig.cardShape === 'sharp'
        ? 'none'
        : uiConfig.cardShape === 'soft'
        ? 'soft'
        : 'rounded');
    switch (rad) {
      case 'none':
        return 'rounded-none';
      case 'soft':
        return 'rounded-2xl sm:rounded-3xl';
      case 'pill':
        return 'rounded-3xl sm:rounded-4xl';
      case 'rounded':
      default:
        return 'rounded-xl sm:rounded-2xl';
    }
  }, [uiConfig.cardRadius, uiConfig.cardShape]);

  const resolvedPaddingClass = useMemo(() => {
    switch (uiConfig.cardPadding) {
      case 'compact':
        return 'p-2 sm:p-2.5';
      case 'relaxed':
        return 'p-3.5 sm:p-5';
      case 'normal':
      default:
        return 'p-2.5 sm:p-3.5';
    }
  }, [uiConfig.cardPadding]);

  const resolvedGapClass = useMemo(() => {
    switch (uiConfig.cardGap) {
      case 'compact':
        return 'gap-2 sm:gap-2.5';
      case 'relaxed':
        return 'gap-3.5 sm:gap-5';
      case 'normal':
      default:
        return 'gap-2.5 sm:gap-4';
    }
  }, [uiConfig.cardGap]);

  const titleFontClass = useMemo(() => {
    const weightClass =
      uiConfig.cardFontWeight === 'normal'
        ? 'font-normal'
        : uiConfig.cardFontWeight === 'medium'
        ? 'font-medium'
        : 'font-bold';
    switch (uiConfig.cardFontSize) {
      case 'sm':
        return `text-[11px] sm:text-xs ${weightClass}`;
      case 'lg':
        return `text-sm sm:text-base ${weightClass}`;
      case 'base':
      default:
        return `text-xs sm:text-sm ${weightClass}`;
    }
  }, [uiConfig.cardFontSize, uiConfig.cardFontWeight]);

  const cardBorderWidth =
    typeof uiConfig.cardBorderWidth === 'number'
      ? uiConfig.cardBorderWidth
      : 1;
  const cardBorderStyle = uiConfig.cardBorderStyle || 'solid';
  const cardBorderColor = uiConfig.cardBorderColor || '#e7e5e4';
  const cardBgOpacity =
    typeof uiConfig.cardBgOpacity === 'number' ? uiConfig.cardBgOpacity : 1;
  const cardBg = uiConfig.cardBgColor || '#ffffff';
  const cardText = uiConfig.cardTextColor || '#1c1917';
  const cardSecondaryText = uiConfig.cardSecondaryTextColor || '#78716c';
  const cardAccent = uiConfig.cardAccentColor || '#b45309';

  const cardArticleStyle: React.CSSProperties = {
    backgroundColor: cardBg,
    color: cardText,
    borderColor: cardBorderColor,
    borderWidth: `${cardBorderWidth}px`,
    borderStyle: cardBorderStyle,
    backgroundImage: uiConfig.cardBgImageUrl
      ? `url("${uiConfig.cardBgImageUrl}")`
      : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: cardBgOpacity,
  };

  const getCountryFlag = (code: string) =>
    ARAB_COUNTRIES.find((c) => c.code === code)?.flag || '🌍';

  const formatRegionOrCityLine = (ad: MarriageAd): string => {
    const r = (ad.regionNameAr || '').trim();
    const s = (ad.subRegionNameAr || '').trim();
    if (r && s && r !== s) {
      return `${r} — ${s}`;
    }
    if (r) return r;
    if (s) return s;
    return (ad.cityNameAr || '').trim() || 'غير محدد';
  };

  const handleShareAd = async (ad: MarriageAd) => {
    const shareUrl = buildCanonicalAdShareUrl(ad.adId);
    setGeneratedShareUrl(shareUrl);

    const shareTitle = `إعلان زواج (${ad.marriageType || ad.maritalStatus}) — ${
      ad.advertiserName || ad.title
    }`;
    const shareText = `${shareTitle} | ${
      ad.gender === 'female' ? 'أنثى' : 'ذكر'
    } (${ad.age} سنة) - ${ad.countryNameAr} (${formatRegionOrCityLine(ad)})`;

    let shareSuccess = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.share && shareUrl) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        shareSuccess = true;
        setShareFeedback('تمت مشاركة رابط الإعلان المباشر بنجاح.');
      }
    } catch {
      // Fallback to clipboard copy if user cancels native share sheet or inside iframe
    }

    if (!shareSuccess) {
      try {
        if (navigator.clipboard?.writeText && shareUrl) {
          await navigator.clipboard.writeText(shareUrl);
          shareSuccess = true;
          setShareFeedback(
            'تم نسخ رابط الإعلان المباشر إلى الحافظة؛ عند زيارته سيفتح هذا الإعلان مباشرة.'
          );
        } else {
          setShareFeedback('تم تجهيز رابط المشاركة المباشر للإعلان أدناه.');
        }
      } catch {
        setShareFeedback('تم تجهيز رابط المشاركة المباشر للإعلان أدناه.');
      }
    }

    // Only count as actual share if the share action or clipboard copy succeeded
    if (shareSuccess) {
      await incrementAdSharesCount(ad);
    }
  };

  const handleCopyValue = async (value: string, label: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        setCopiedContactValue(label);
        setTimeout(() => setCopiedContactValue(null), 2500);
      }
    } catch {
      // Ignore clipboard restriction
    }
  };

  const buildWhatsAppDirectHref = (rawPhone: string): string => {
    const digitsOnly = (rawPhone || '').replace(/[^\d]/g, '');
    return digitsOnly ? `https://wa.me/${digitsOnly}` : '';
  };

  const handleOwnerPauseAd = async (ad: MarriageAd) => {
    if (!currentUserId || ad.userId !== currentUserId) return;
    setOwnerActionBusy(true);
    setOwnerActionError(null);
    try {
      await archiveOwnMarriageAd(currentUserId, ad);
      closeAdDetails();
    } catch (err) {
      setOwnerActionError(
        err instanceof Error ? err.message : 'تعذر إيقاف الإعلان.'
      );
    } finally {
      setOwnerActionBusy(false);
    }
  };

  const handleOwnerRemovePhotoOnly = async (ad: MarriageAd) => {
    if (!currentUserId || ad.userId !== currentUserId) return;
    setOwnerActionBusy(true);
    setOwnerActionError(null);
    try {
      await removeMarriageAdPhotoOnly(currentUserId, ad);
    } catch (err) {
      setOwnerActionError(
        err instanceof Error ? err.message : 'تعذر حذف الصورة الشخصية.'
      );
    } finally {
      setOwnerActionBusy(false);
    }
  };

  const handleOwnerDeleteAdCascade = async (ad: MarriageAd) => {
    if (!currentUserId || ad.userId !== currentUserId) return;
    setOwnerActionBusy(true);
    setOwnerActionError(null);
    try {
      await deleteMarriageAdCascade(currentUserId, ad, false);
      closeAdDetails();
    } catch (err) {
      setOwnerActionError(
        err instanceof Error ? err.message : 'تعذر حذف الإعلان من قاعدة البيانات.'
      );
    } finally {
      setOwnerActionBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 max-[280px]:grid-cols-1 auto-rows-fr gap-2.5 sm:gap-4">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`h-64 border animate-pulse bg-stone-100 border-stone-200 ${resolvedRadiusClass}`}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* تنبيه عند زيارة رابط إعلان غير صالح أو تم التلاعب بمعرفه */}
      {invalidSharedAdNotice && (
        <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2">
          <span>{invalidSharedAdNotice}</span>
          <button
            type="button"
            onClick={() => setInvalidSharedAdNotice(null)}
            className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 font-semibold shrink-0"
          >
            إغلاق
          </button>
        </div>
      )}

      {sortedApprovedAds.length === 0 ? (
        <div
          style={cardArticleStyle}
          className={`w-full p-6 text-center shadow-xs ${resolvedRadiusClass}`}
        >
          <p className="text-sm font-semibold">
            لا توجد إعلانات فعالة ومعتمدة حالياً
          </p>
          <p
            style={{ color: cardSecondaryText }}
            className="text-xs opacity-85 mt-1 leading-relaxed"
          >
            ستظهر بطاقات إعلانات الزواج المعتمدة هنا تلقائياً فور نشرها.
          </p>
        </div>
      ) : (
        <>
          {/* شبكة البطاقات: بطاقتان في كل صف على شاشة الهاتف متساويتان في العرض والارتفاع */}
          <div
            className={`grid grid-cols-2 max-[280px]:grid-cols-1 auto-rows-fr items-stretch ${resolvedGapClass} w-full`}
          >
            {paginatedAds.map((ad) => {
              const displayName = (
                ad.advertiserName ||
                ad.title ||
                'معلن'
              ).trim();
              const genderLabel = ad.gender === 'female' ? 'أنثى' : 'ذكر';
              const countryFlag = getCountryFlag(ad.countryCode);
              const locationLine = formatRegionOrCityLine(ad);

              return (
                <article
                  key={ad.adId}
                  onClick={() => openAdDetailsById(ad.adId)}
                  style={cardArticleStyle}
                  className={`h-full min-w-0 overflow-hidden flex flex-col justify-between transition-transform active:scale-[0.99] cursor-pointer shadow-2xs ${resolvedRadiusClass}`}
                >
                  {/* الصورة الشخصية المرفوعة أو الصورة الافتراضية المناسبة للجنس مع حماية كاملة من الصور المكسورة */}
                  <div className="w-full h-36 sm:h-44 border-b border-stone-200/70 shrink-0">
                    <ProgressiveAdImage
                      photoUrl={ad.primaryPhotoUrl}
                      hasPhotos={ad.hasPhotos}
                      gender={ad.gender}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* محتوى البطاقة المكون من 4 أسطر واضحة ومتساوية الارتفاع دون أي أرقام هواتف أو روابط تواصل */}
                  <div
                    className={`${resolvedPaddingClass} flex-1 flex flex-col justify-between gap-1.5 min-w-0`}
                  >
                    <div className="space-y-1 min-w-0">
                      {/* السطر الأول: اسم صاحب الإعلان */}
                      <h3
                        title={displayName}
                        style={{ color: cardText }}
                        className={`${titleFontClass} leading-snug truncate`}
                      >
                        {displayName}
                      </h3>

                      {/* السطر الثاني: الجنس والعمر بجانب بعضهما لتوفير المساحة */}
                      <p
                        style={{ color: cardAccent }}
                        className="text-[11px] sm:text-xs font-bold leading-tight truncate tabular-nums"
                      >
                        <span>{genderLabel}</span>
                        <span className="mx-1.5" aria-hidden="true">
                          ·
                        </span>
                        <span>{ad.age} سنة</span>
                      </p>

                      {/* السطر الثالث: الدولة مع علمها */}
                      <p
                        title={ad.countryNameAr}
                        style={{ color: cardSecondaryText }}
                        className="text-[11px] sm:text-xs font-medium leading-snug truncate"
                      >
                        <span aria-hidden="true">{countryFlag} </span>
                        <span>{ad.countryNameAr}</span>
                      </p>

                      {/* السطر الرابع: المنطقة أو المدينة */}
                      <p
                        title={locationLine}
                        style={{ color: cardSecondaryText }}
                        className="text-[11px] sm:text-xs opacity-90 leading-snug truncate"
                      >
                        {locationLine}
                      </p>
                    </div>

                    {/* زر الدفع داخل بطاقة الإعلان قبل الدخول إلى التفاصيل (المطلوب 1) */}
                    <div className="pt-1.5 border-t border-stone-200/60">
                      <button
                        type="button"
                        onClick={(e) => handleOpenPaymentModal(ad, e)}
                        style={{
                          borderColor: cardAccent,
                          color: cardAccent,
                        }}
                        className="w-full min-h-[34px] px-2.5 py-1 rounded-lg border bg-amber-50/50 hover:bg-amber-100/60 active:scale-[0.99] text-[11px] sm:text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <CreditCard className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">الدفع لفتح التواصل</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* عنصر المراقبة والتحميل التدريجي عند الوصول إلى نهاية القائمة */}
          {hasMoreAds && (
            <div
              ref={loadMoreSentinelRef}
              className="pt-3 flex flex-col items-center justify-center"
            >
              <button
                type="button"
                onClick={() =>
                  setVisibleCount((prev) =>
                    Math.min(prev + PAGE_SIZE, sortedApprovedAds.length)
                  )
                }
                className="min-h-[42px] px-5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-800 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <ChevronDown className="w-4 h-4 text-amber-700" />
                <span>
                  عرض المزيد من الإعلانات (
                  {sortedApprovedAds.length - visibleCount} متبقي)
                </span>
              </button>
            </div>
          )}
        </>
      )}

      {/* مؤشر جلب الإعلان عند فتح رابط مشاركة مباشر */}
      {isLoadingDirectAd && !selectedAd && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white text-stone-900 rounded-2xl p-5 shadow-xl text-xs sm:text-sm font-semibold">
            جاري فتح تفاصيل الإعلان من قاعدة البيانات...
          </div>
        </div>
      )}

      {/* ====================================================================
          صفحة تفاصيل الإعلان (المرحلة 7)
          مرتبطة مباشرة بسجل الإعلان في قاعدة البيانات (/ads/{adId})
          ومفصولة أمنياً عن بيانات التواصل الخاصة (/ad_contacts/{adId})
         ==================================================================== */}
      {selectedAd && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`ad-details-title-${selectedAd.adId}`}
        >
          <div
            style={{
              backgroundColor: cardBg,
              color: cardText,
              borderColor: cardBorderColor,
            }}
            className={`w-full max-w-lg min-h-screen sm:min-h-0 border-0 sm:border shadow-2xl overflow-hidden flex flex-col justify-between my-0 sm:my-auto ${resolvedRadiusClass}`}
          >
            {/* شريط علوي لصفحة تفاصيل الإعلان */}
            <header className="px-4 py-3 border-b border-stone-200/70 flex items-center justify-between gap-2 bg-black/[0.02]">
              <button
                type="button"
                onClick={closeAdDetails}
                className="min-h-[40px] px-3 py-1.5 rounded-xl hover:bg-black/5 inline-flex items-center gap-1.5 text-xs font-bold transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة للإعلانات</span>
              </button>

              <span className="text-[11px] opacity-65 font-mono truncate">
                #{selectedAd.adId.slice(-8)}
              </span>

              <button
                type="button"
                onClick={closeAdDetails}
                className="min-h-[40px] min-w-[40px] rounded-xl hover:bg-black/5 inline-flex items-center justify-center shrink-0"
                aria-label="إغلاق صفحة تفاصيل الإعلان"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="p-4 sm:p-6 space-y-5 flex-1">
              {/* 1. الصورة الشخصية في أعلى الصفحة */}
              <section aria-label="الصورة الشخصية للمعلن">
                <div className="w-full h-64 sm:h-72 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200/80 flex items-center justify-center shadow-2xs">
                  <ProgressiveAdImage
                    photoUrl={selectedAd.primaryPhotoUrl}
                    hasPhotos={selectedAd.hasPhotos}
                    gender={selectedAd.gender}
                    alt={selectedAd.advertiserName || selectedAd.title}
                    className="w-full h-full object-contain"
                    eager
                  />
                </div>
              </section>

              {/* العناصر المرتبة من 2 إلى 7 بوضوح تام */}
              <section
                aria-label="البيانات الأساسية للإعلان"
                className="rounded-2xl border border-stone-200/80 bg-black/[0.02] divide-y divide-stone-200/60 overflow-hidden text-xs sm:text-sm"
              >
                {/* 2. الاسم */}
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                  <span className="opacity-70 font-medium shrink-0">
                    الاسم
                  </span>
                  <h2
                    id={`ad-details-title-${selectedAd.adId}`}
                    className="font-bold text-sm sm:text-base text-left break-words"
                  >
                    {selectedAd.advertiserName || selectedAd.title}
                  </h2>
                </div>

                {/* 3. الجنس */}
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                  <span className="opacity-70 font-medium shrink-0">
                    الجنس
                  </span>
                  <span
                    style={{ color: cardAccent }}
                    className="font-bold text-left"
                  >
                    {selectedAd.gender === 'female' ? 'أنثى' : 'ذكر'}
                  </span>
                </div>

                {/* 4. العمر */}
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                  <span className="opacity-70 font-medium shrink-0">
                    العمر
                  </span>
                  <span className="font-bold tabular-nums text-left">
                    {selectedAd.age} سنة
                  </span>
                </div>

                {/* 5. الدولة والعلم */}
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                  <span className="opacity-70 font-medium shrink-0">
                    الدولة
                  </span>
                  <span className="font-semibold text-left">
                    <span aria-hidden="true">
                      {getCountryFlag(selectedAd.countryCode)}{' '}
                    </span>
                    <span>{selectedAd.countryNameAr}</span>
                  </span>
                </div>

                {/* 6. المنطقة أو المدينة */}
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                  <span className="opacity-70 font-medium shrink-0">
                    {selectedAd.regionLabelAr || 'المنطقة / المدينة'}
                  </span>
                  <span className="font-semibold text-left">
                    {formatRegionOrCityLine(selectedAd)}
                  </span>
                </div>

                {/* 7. نوع الزواج */}
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                  <span className="opacity-70 font-medium shrink-0">
                    نوع الزواج
                  </span>
                  <span
                    style={{ color: cardAccent }}
                    className="font-bold text-left"
                  >
                    {selectedAd.marriageType || selectedAd.maritalStatus}
                  </span>
                </div>
              </section>

              {/* 8. أي تفاصيل إضافية مسموح بعرضها من بيانات الإعلان */}
              <section
                aria-label="التفاصيل الإضافية للإعلان"
                className="rounded-2xl border border-stone-200/80 bg-black/[0.015] p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs sm:text-sm font-bold">
                    التفاصيل الإضافية والمواصفات
                  </h3>
                  <span className="text-[11px] opacity-65 tabular-nums">
                    {selectedAd.viewsCount || 0} مشاهدة ·{' '}
                    {selectedAd.sharesCount || 0} مشاركة
                  </span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line break-words opacity-90">
                  {selectedAd.details && selectedAd.details.trim().length > 0
                    ? selectedAd.details
                    : 'لا توجد ملاحظات إضافية مدونة في هذا الإعلان.'}
                </p>
              </section>

              {/* ============================================================
                  قسم وسائل التواصل (يعرض فقط أيقونات الوسائل المتوفرة فعلياً)
                  - أيقونة واتساب عند توفر رقم واتساب
                  - أيقونة سناب شات عند توفر رابط الحساب
                  - أيقونة منصة إكس عند توفر رابط الحساب
                  - لا يعرض أيقونة وسيلة غير متوفرة إطلاقاً
                 ============================================================ */}
              <section
                aria-label="وسائل التواصل المتوفرة"
                className="rounded-2xl border border-stone-200/90 p-3.5 sm:p-4 space-y-3 bg-white/80"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                    وسائل التواصل المتوفرة
                  </h3>
                  {contactAccessResult?.entitled ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>مخول بالوصول</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500">
                      <Lock className="w-3.5 h-3.5 text-amber-700" />
                      <span>محمية بقواعد الوصول</span>
                    </span>
                  )}
                </div>

                {availableContactChannels.length === 0 ? (
                  <p className="text-xs text-stone-500">
                    لم يحدد المعلن وسائل تواصل إضافية في هذا الإعلان.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* أيقونة واتساب — تظهر فقط عند توفر رقم واتساب */}
                    {availableContactChannels.includes('whatsapp') && (
                      <button
                        type="button"
                        onClick={() => setSelectedContactChannel('whatsapp')}
                        className={`min-h-[48px] px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.99] ${
                          selectedContactChannel === 'whatsapp'
                            ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                            : 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-900 border-emerald-200'
                        }`}
                      >
                        <WhatsAppSvgIcon className="w-5 h-5 shrink-0" />
                        <span>واتساب</span>
                      </button>
                    )}

                    {/* أيقونة سناب شات — تظهر فقط عند توفر رابط حساب سناب شات */}
                    {availableContactChannels.includes('snapchat') && (
                      <button
                        type="button"
                        onClick={() => setSelectedContactChannel('snapchat')}
                        className={`min-h-[48px] px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.99] ${
                          selectedContactChannel === 'snapchat'
                            ? 'bg-amber-400 text-stone-950 border-amber-500 shadow-xs'
                            : 'bg-amber-50 hover:bg-amber-100/80 text-stone-900 border-amber-300'
                        }`}
                      >
                        <SnapchatSvgIcon className="w-5 h-5 shrink-0" />
                        <span>سناب شات</span>
                      </button>
                    )}

                    {/* أيقونة منصة إكس — تظهر فقط عند توفر رابط حساب منصة إكس */}
                    {availableContactChannels.includes('x') && (
                      <button
                        type="button"
                        onClick={() => setSelectedContactChannel('x')}
                        className={`min-h-[48px] px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.99] ${
                          selectedContactChannel === 'x'
                            ? 'bg-stone-900 text-white border-stone-950 shadow-xs'
                            : 'bg-stone-100 hover:bg-stone-200/80 text-stone-900 border-stone-300'
                        }`}
                      >
                        <XPlatformSvgIcon className="w-4 h-4 shrink-0" />
                        <span>منصة إكس</span>
                      </button>
                    )}
                  </div>
                )}

                {/* نافذة/لوحة نتيجة التحقق من صلاحية الوصول عند الضغط على أيقونة التواصل أو لصاحب الإعلان */}
                {(selectedContactChannel !== null ||
                  contactAccessResult?.entitled) && (
                  <div className="pt-2 border-t border-stone-200/70">
                    {isCheckingEntitlement ? (
                      <p className="text-xs text-stone-600 py-2">
                        جاري التحقق من صلاحية الوصول في قاعدة البيانات...
                      </p>
                    ) : contactAccessResult?.entitled &&
                      contactAccessResult.contact ? (
                      <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2.5 text-xs">
                        <p className="font-bold text-emerald-950">
                          {contactAccessResult.reasonAr}
                        </p>

                        {/* بيانات واتساب المحمية (لا تصل للمتصفح إلا بعد نجاح التحقق) */}
                        {availableContactChannels.includes('whatsapp') &&
                          contactAccessResult.contact.whatsapp &&
                          (selectedContactChannel === 'whatsapp' ||
                            selectedContactChannel === null) && (
                            <div className="p-2.5 rounded-lg bg-white border border-emerald-200/80 flex flex-wrap items-center justify-between gap-2">
                              <div className="space-y-0.5">
                                <span className="text-[11px] text-stone-500 block">
                                  رقم واتساب الموثق (
                                  {contactAccessResult.contact
                                    .whatsappAcceptsCalls
                                    ? 'يستقبل رسائل ومكالمات'
                                    : 'رسائل واتساب فقط'}
                                  ):
                                </span>
                                <span
                                  dir="ltr"
                                  className="font-mono font-bold text-stone-900 text-sm inline-block"
                                >
                                  {contactAccessResult.contact.whatsapp}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopyValue(
                                      contactAccessResult.contact!.whatsapp,
                                      'whatsapp'
                                    )
                                  }
                                  className="min-h-[36px] px-2.5 py-1 rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-800 text-[11px] font-semibold inline-flex items-center gap-1"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>
                                    {copiedContactValue === 'whatsapp'
                                      ? 'تم النسخ'
                                      : 'نسخ الرقم'}
                                  </span>
                                </button>
                                {buildWhatsAppDirectHref(
                                  contactAccessResult.contact.whatsapp
                                ) && (
                                  <a
                                    href={buildWhatsAppDirectHref(
                                      contactAccessResult.contact.whatsapp
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="min-h-[36px] px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold inline-flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>فتح واتساب</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          )}

                        {/* بيانات سناب شات المحمية */}
                        {availableContactChannels.includes('snapchat') &&
                          contactAccessResult.contact.snapchatUrl &&
                          (selectedContactChannel === 'snapchat' ||
                            selectedContactChannel === null) && (
                            <div className="p-2.5 rounded-lg bg-white border border-amber-200 flex flex-wrap items-center justify-between gap-2">
                              <div className="space-y-0.5 min-w-0">
                                <span className="text-[11px] text-stone-500 block">
                                  رابط حساب سناب شات:
                                </span>
                                <span
                                  dir="ltr"
                                  className="font-mono text-stone-900 text-xs break-all block"
                                >
                                  {contactAccessResult.contact.snapchatUrl}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopyValue(
                                      contactAccessResult.contact!.snapchatUrl!,
                                      'snapchat'
                                    )
                                  }
                                  className="min-h-[36px] px-2.5 py-1 rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-800 text-[11px] font-semibold inline-flex items-center gap-1"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>
                                    {copiedContactValue === 'snapchat'
                                      ? 'تم النسخ'
                                      : 'نسخ الرابط'}
                                  </span>
                                </button>
                                <a
                                  href={contactAccessResult.contact.snapchatUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="min-h-[36px] px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-500 text-stone-950 text-[11px] font-bold inline-flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>فتح سناب شات</span>
                                </a>
                              </div>
                            </div>
                          )}

                        {/* بيانات منصة إكس المحمية */}
                        {availableContactChannels.includes('x') &&
                          contactAccessResult.contact.xUrl &&
                          (selectedContactChannel === 'x' ||
                            selectedContactChannel === null) && (
                            <div className="p-2.5 rounded-lg bg-white border border-stone-300 flex flex-wrap items-center justify-between gap-2">
                              <div className="space-y-0.5 min-w-0">
                                <span className="text-[11px] text-stone-500 block">
                                  رابط حساب منصة إكس:
                                </span>
                                <span
                                  dir="ltr"
                                  className="font-mono text-stone-900 text-xs break-all block"
                                >
                                  {contactAccessResult.contact.xUrl}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopyValue(
                                      contactAccessResult.contact!.xUrl!,
                                      'x'
                                    )
                                  }
                                  className="min-h-[36px] px-2.5 py-1 rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-800 text-[11px] font-semibold inline-flex items-center gap-1"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>
                                    {copiedContactValue === 'x'
                                      ? 'تم النسخ'
                                      : 'نسخ الرابط'}
                                  </span>
                                </button>
                                <a
                                  href={contactAccessResult.contact.xUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="min-h-[36px] px-3 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-bold inline-flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>فتح منصة إكس</span>
                                </a>
                              </div>
                            </div>
                          )}
                      </div>
                    ) : (
                      /* بوابة حماية بيانات التواصل الخاصة قبل التخويل والدفع (لا يتم إرسال أي بيانات خاصة للمتصفح) */
                      <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/90 text-xs text-stone-800 space-y-2.5">
                        <div className="flex items-start gap-2">
                          <Lock className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-bold text-amber-950">
                              بيانات التواصل الخاصة محمية ومفصولة عن بيانات الإعلان العامة
                            </p>
                            <p className="leading-relaxed text-stone-700">
                              {contactAccessResult?.reasonAr ||
                                'لا يتم إرسال أرقام أو روابط التواصل الخاصة إلى المتصفح قبل التأكد من صلاحية المستخدم واستحقاقه للوصول إليها.'}
                            </p>
                          </div>
                        </div>

                        {contactAccessResult?.status === 'unauthenticated' &&
                          onRequireAuth && (
                            <button
                              type="button"
                              onClick={() => {
                                const adTitle =
                                  selectedAd.advertiserName || selectedAd.title;
                                closeAdDetails();
                                onRequireAuth(
                                  `يرجى تسجيل الدخول للتحقق من صلاحية الوصول إلى وسائل التواصل في إعلان (${adTitle}).`
                                );
                              }}
                              className="w-full min-h-[40px] px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
                            >
                              <LogIn className="w-4 h-4 text-amber-400" />
                              <span>تسجيل الدخول للتحقق من صلاحية الوصول</span>
                            </button>
                          )}

                        {contactAccessResult?.status === 'payment_required' && (
                          <div className="p-2.5 rounded-lg bg-white/90 border border-amber-200 text-[11px] text-stone-700 space-y-2">
                            <p className="font-semibold text-stone-900">
                              حالة استحقاق فتح وسائل التواصل:
                            </p>
                            <p>
                              لم يتم العثور على تصريح وصول فعال لحسابك لهذا الإعلان. لا يتم فتح بيانات التواصل بناءً على واجهة المستخدم وحدها، بل يتحقق الخادم من سجل الدفع الموثق.
                            </p>
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentModal(selectedAd)}
                              style={{ backgroundColor: cardAccent }}
                              className="w-full min-h-[40px] px-4 py-2 rounded-xl text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-2xs"
                            >
                              <CreditCard className="w-4 h-4 shrink-0" />
                              <span>الدفع لفتح وسائل التواصل</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* زر الدفع المباشر داخل قسم وسائل التواصل في صفحة التفاصيل عند الحاجة (المطلوب 2) */}
                {!contactAccessResult?.entitled && (
                  <div className="pt-2 border-t border-stone-200/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <span className="text-[11px] text-stone-600">
                      لفتح وسائل التواصل الخاصة بهذا الإعلان بعد اعتماد الدفع:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenPaymentModal(selectedAd)}
                      style={{ backgroundColor: cardAccent }}
                      className="min-h-[42px] px-4 py-2 rounded-xl text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.99] transition-transform"
                    >
                      <CreditCard className="w-4 h-4 shrink-0" />
                      <span>الدفع لفتح التواصل</span>
                    </button>
                  </div>
                )}
              </section>

              {/* رسائل مشاركة الإعلان والرابط الصحيح القابل للنسخ والزيارة */}
              {shareFeedback && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{shareFeedback}</span>
                  </div>
                  {generatedShareUrl && (
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-emerald-200">
                      <input
                        type="text"
                        readOnly
                        dir="ltr"
                        value={generatedShareUrl}
                        onFocus={(e) => e.currentTarget.select()}
                        className="w-full text-[11px] font-mono text-stone-700 bg-transparent outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyValue(generatedShareUrl, 'share_url')
                        }
                        className="px-2.5 py-1 rounded-md bg-emerald-700 text-white text-[11px] font-bold shrink-0"
                      >
                        {copiedContactValue === 'share_url' ? 'تم النسخ' : 'نسخ'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {ownerActionError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                  {ownerActionError}
                </div>
              )}

              {/* أزرار التحكم الخاصة بصاحب الإعلان فقط */}
              {currentUserId && selectedAd.userId === currentUserId && (
                <div className="p-3 rounded-xl bg-stone-100/80 border border-stone-200 space-y-2.5">
                  <p className="text-[11px] font-bold text-stone-700">
                    إدارة إعلانك:
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {onEditAd && (
                      <button
                        type="button"
                        disabled={ownerActionBusy}
                        onClick={() => {
                          const target = selectedAd;
                          closeAdDetails();
                          onEditAd(target);
                        }}
                        className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                        <span>تعديل الإعلان</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={ownerActionBusy}
                      onClick={() => handleOwnerPauseAd(selectedAd)}
                      className="min-h-[40px] px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <PauseCircle className="w-3.5 h-3.5 text-amber-700" />
                      <span>إيقاف الإعلان</span>
                    </button>

                    {selectedAd.hasPhotos && (
                      <button
                        type="button"
                        disabled={ownerActionBusy}
                        onClick={() => handleOwnerRemovePhotoOnly(selectedAd)}
                        className="min-h-[40px] px-3 py-1.5 rounded-lg bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <ImageOff className="w-3.5 h-3.5 text-red-600" />
                        <span>حذف الصورة</span>
                      </button>
                    )}

                    {!confirmDeleteAd ? (
                      <button
                        type="button"
                        disabled={ownerActionBusy}
                        onClick={() => setConfirmDeleteAd(true)}
                        className="min-h-[40px] px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف الإعلان</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={ownerActionBusy}
                          onClick={() => handleOwnerDeleteAdCascade(selectedAd)}
                          className="min-h-[40px] px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold disabled:opacity-50"
                        >
                          {ownerActionBusy
                            ? 'جاري الحذف...'
                            : 'تأكيد الحذف النهائي'}
                        </button>
                        <button
                          type="button"
                          disabled={ownerActionBusy}
                          onClick={() => setConfirmDeleteAd(false)}
                          className="min-h-[40px] px-2.5 py-1.5 rounded-lg bg-white border border-stone-300 text-stone-700 text-xs"
                        >
                          إلغاء
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* شريط سفلي يحتوي على زر مشاركة الإعلان، وزر الدفع عند الحاجة، وزر الإغلاق */}
            <footer className="px-4 py-3.5 border-t border-stone-200/70 bg-black/[0.02] flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleShareAd(selectedAd)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-900 text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Share2 className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>مشاركة الإعلان ({selectedAd.sharesCount || 0})</span>
                </button>

                {!contactAccessResult?.entitled && (
                  <button
                    type="button"
                    onClick={() => handleOpenPaymentModal(selectedAd)}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl border border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <CreditCard className="w-4 h-4 text-amber-800 shrink-0" />
                    <span>الدفع</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={closeAdDetails}
                style={{ backgroundColor: cardAccent }}
                className="min-h-[44px] px-6 py-2 rounded-xl text-white text-xs sm:text-sm font-bold shadow-2xs"
              >
                إغلاق
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* ====================================================================
          نافذة نظام الدفع المرتبطة بمعرف الإعلان ومعرف المستخدم (المرحلة 8)
          - لا تنشئ بوابة دفع وهمية ولا تطلب بيانات بطاقات سرية
          - لا تعرض رسالة "تم الدفع بنجاح" دون عملية حقيقية
          - جميع الأزرار تعرض حالياً رسالة: "خدمة الدفع ستتاح لاحقاً"
         ==================================================================== */}
      {paymentModalAd && (
        <div
          dir="rtl"
          className="fixed inset-0 z-[60] bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-modal-title"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white text-stone-900 border border-stone-200 shadow-2xl overflow-hidden my-auto">
            {/* رأس نافذة الدفع */}
            <header className="px-4 py-3.5 border-b border-stone-200 bg-stone-900 text-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <CreditCard className="w-5 h-5 text-amber-400 shrink-0" />
                <h2
                  id="payment-modal-title"
                  className="text-sm sm:text-base font-bold truncate"
                >
                  نظام الدفع وفتح صلاحية التواصل
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPaymentModalAd(null);
                  setPaymentButtonNotice(null);
                }}
                className="min-h-[36px] min-w-[36px] rounded-lg hover:bg-white/10 inline-flex items-center justify-center shrink-0"
                aria-label="إغلاق نافذة الدفع"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm max-h-[82vh] overflow-y-auto">
              {/* الرسالة الإلزامية الواضحة: خدمة الدفع ستتاح لاحقاً */}
              {paymentButtonNotice && (
                <div
                  role="status"
                  className="p-3.5 rounded-xl bg-amber-50 border-2 border-amber-400 text-amber-950 flex items-start gap-2.5 shadow-2xs"
                >
                  <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-sm sm:text-base">
                      {paymentButtonNotice}
                    </p>
                    <p className="text-xs text-stone-700 leading-relaxed">
                      البنية البرمجية والأمنية للدفع مجهزة بالكامل ومرتبطة بمعرف الإعلان ومعرف المستخدم، وسيتم تفعيل العمليات المالية الحقيقية في المرحلة المخصصة لها دون أي مساس ببيانات الإعلانات.
                    </p>
                  </div>
                </div>
              )}

              {/* ربط عملية الدفع بمعرف الإعلان ومعرف المستخدم وعدم تكرار السجل */}
              <section className="rounded-xl border border-stone-200 bg-stone-50 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-stone-500">الإعلان المرتبط:</span>
                  <span className="font-bold text-stone-900 truncate">
                    {paymentModalAd.advertiserName || paymentModalAd.title} (
                    {paymentModalAd.countryNameAr})
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-stone-500">معرف الإعلان (adId):</span>
                  <span className="font-mono text-[11px] text-stone-800">
                    {paymentModalAd.adId}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-stone-500">معرف المستخدم (userId):</span>
                  <span className="font-mono text-[11px] text-stone-800">
                    {currentUserId || 'غير مسجل الدخول حالياً'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-stone-500">
                    معرف العملية الفريد (لمنع التكرار):
                  </span>
                  <span className="font-mono text-[11px] text-stone-700 truncate max-w-[210px]">
                    {paymentContext?.idempotentPaymentId ||
                      `pay_ad_${paymentModalAd.adId}`}
                  </span>
                </div>
              </section>

              {/* حالات الدفع الخمس المعتمدة */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-stone-800">
                    حالة الدفع الحالية لهذا الإعلان:
                  </h3>
                  {isLoadingPaymentContext && (
                    <span className="text-[11px] text-stone-500">
                      جاري فحص السجل...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[11px]">
                  {(
                    [
                      'unpaid',
                      'processing',
                      'succeeded',
                      'failed',
                      'refunded',
                    ] as CanonicalPaymentStatus[]
                  ).map((st) => {
                    const currentSt =
                      paymentContext?.canonicalStatus || 'unpaid';
                    const isCurrent = currentSt === st;
                    return (
                      <div
                        key={st}
                        className={`px-2.5 py-2 rounded-lg border text-center font-semibold transition-colors ${
                          isCurrent
                            ? 'bg-stone-900 text-amber-300 border-stone-900 shadow-2xs'
                            : 'bg-stone-50 text-stone-500 border-stone-200 opacity-75'
                        }`}
                      >
                        {PAYMENT_STATUS_LABELS_AR[st]}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* آلية تحديد ما الذي يفتحه الدفع: إعلان معين أو صلاحية وصول محددة المدة */}
              <section className="space-y-2">
                <h3 className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>نطاق صلاحية الوصول بعد الدفع (تُحدد السياسة التجارية لاحقاً):</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(['single_ad', 'timed_access'] as PaymentUnlockScopeType[]).map(
                    (scopeKey) => {
                      const policy = PAYMENT_UNLOCK_POLICIES[scopeKey];
                      const active = paymentUnlockScope === scopeKey;
                      return (
                        <button
                          key={scopeKey}
                          type="button"
                          onClick={() => {
                            setPaymentUnlockScope(scopeKey);
                            handleTriggerPaymentNotice(policy.titleAr);
                          }}
                          className={`p-3 rounded-xl border text-right transition-all space-y-1 ${
                            active
                              ? 'border-amber-600 bg-amber-50/70 text-stone-900'
                              : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                          }`}
                        >
                          <p className="text-xs font-bold">{policy.titleAr}</p>
                          <p className="text-[11px] text-stone-600 leading-relaxed">
                            {policy.descriptionAr}
                          </p>
                        </button>
                      );
                    }
                  )}
                </div>
              </section>

              {/* بنية طرق الدفع القابلة للإضافة مستقبلاً */}
              <section className="space-y-2">
                <h3 className="text-xs font-bold text-stone-800">
                  طرق الدفع المهيأة للربط مستقبلاً:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EXTENSIBLE_PAYMENT_METHODS_CATALOG.map((method) => (
                    <button
                      key={method.methodId}
                      type="button"
                      onClick={() => handleTriggerPaymentNotice(method.titleAr)}
                      className="p-3 rounded-xl border border-stone-200 hover:border-amber-500 bg-stone-50/70 hover:bg-amber-50/40 text-right transition-all flex flex-col justify-between gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span className="text-xs font-bold text-stone-900">
                          {method.titleAr}
                        </span>
                        <span className="text-[10px] font-semibold text-amber-800">
                          ستتاح لاحقاً
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 leading-snug">
                        {method.examplesAr}
                      </p>
                    </button>
                  ))}
                </div>
              </section>

              {/* ضمانات الأمان وعدم تخزين بيانات البطاقات */}
              <div className="p-3 rounded-xl bg-stone-100 border border-stone-200 text-[11px] text-stone-700 space-y-1 leading-relaxed">
                <p className="font-bold text-stone-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>قواعد حماية المدفوعات وبيانات التواصل:</span>
                </p>
                <p>
                  • لا يتم تخزين أرقام البطاقات البنكية أو بياناتها السرية في قاعدة بيانات التطبيق مطلقاً.
                </p>
                <p>
                  • لا يُسمح بفتح بيانات التواصل بناءً على رسالة من واجهة المستخدم وحدها، بل يتحقق الخادم من مزود الدفع الموثوق قبل إصدار تصريح الوصول.
                </p>
              </div>
            </div>

            <footer className="px-4 py-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleTriggerPaymentNotice()}
                style={{ backgroundColor: cardAccent }}
                className="flex-1 min-h-[42px] px-4 py-2 rounded-xl text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <CreditCard className="w-4 h-4 shrink-0" />
                <span>متابعة الدفع — {PAYMENT_SERVICE_COMING_SOON_MESSAGE}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentModalAd(null);
                  setPaymentButtonNotice(null);
                }}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-800 text-xs sm:text-sm font-semibold"
              >
                إغلاق
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

