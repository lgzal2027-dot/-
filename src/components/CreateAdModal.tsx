import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Send,
  Upload,
  Trash2,
  RefreshCw,
  Check,
  Search,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  ARAB_COUNTRIES,
  AdGender,
  DEFAULT_MARRIAGE_TYPES,
  MANUAL_REGION_ID,
  MANUAL_SUBREGION_ID,
  MarriageAd,
  UiConfigSettings,
  getDefaultAvatarByGender,
  getEffectiveCountriesForUiConfig,
  resolveRegionByIdOrName,
  resolveSubRegionByIdOrName,
} from '../types/domain';
import {
  assertOnlineConnection,
  createMarriageAdWithContact,
  deleteAdPersonalPhotoFromCloud,
  getProtectedAdContact,
  isValidSnapchatUrl,
  isValidXUrl,
  processPersonalPhotoFromDevice,
  updateMarriageAdWithContact,
} from '../services/adService';
import { getGeneralAdminSettings } from '../services/adminService';

interface CreateAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  uiConfig: UiConfigSettings;
  editingAd?: MarriageAd | null;
}

type FieldKey =
  | 'photo'
  | 'advertiserName'
  | 'gender'
  | 'age'
  | 'countryCode'
  | 'region'
  | 'subRegion'
  | 'marriageType'
  | 'contacts'
  | 'whatsappNumber'
  | 'snapchatUrl'
  | 'xUrl';

export function CreateAdModal({
  isOpen,
  onClose,
  uiConfig,
  editingAd = null,
}: CreateAdModalProps) {
  const { firebaseUser, isEmailVerified, profile, permissions } = useAuth();

  const isEditMode = Boolean(editingAd && editingAd.adId);

  // Idempotent draft adId per Create session + synchronous submit lock to prevent duplicate ads on rapid clicks
  const draftAdIdRef = useRef<string>('');
  const submitLockRef = useRef<boolean>(false);

  // 1. Personal Photo State (Uploaded from device -> Immediately converted to URL)
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string>('');
  const [uploadedFileId, setUploadedFileId] = useState<string>('');
  const [uploadedPhotoId, setUploadedPhotoId] = useState<string>('');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  // 2. Name State
  const [advertiserName, setAdvertiserName] = useState('');

  // 3. Gender State ('male' | 'female')
  const [gender, setGender] = useState<AdGender | ''>('male');

  // 4. Age State
  const [ageInput, setAgeInput] = useState<string>('28');

  // 5. Country State (Fixed Country Code + Searchable Dropdown)
  const [countryCode, setCountryCode] = useState<string>('');
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');

  // 6. Cascading Region & Sub-Region State using Fixed IDs + Manual Entry Option
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [manualRegionAr, setManualRegionAr] = useState<string>('');
  const [selectedSubRegionId, setSelectedSubRegionId] = useState<string>('');
  const [manualSubRegionAr, setManualSubRegionAr] = useState<string>('');

  // 6b. Dynamic Countries & Regions (Managed by Admin in /ui_settings/main)
  const effectiveCountries = useMemo(
    () => getEffectiveCountriesForUiConfig(uiConfig),
    [uiConfig]
  );

  // 7. Marriage Type State (Dynamic from Admin Config)
  const availableMarriageTypes = useMemo(() => {
    return Array.isArray(uiConfig.marriageTypes) &&
      uiConfig.marriageTypes.length > 0
      ? uiConfig.marriageTypes
      : DEFAULT_MARRIAGE_TYPES;
  }, [uiConfig.marriageTypes]);

  const [marriageType, setMarriageType] = useState<string>('');

  // 8. Contact Methods State (At least 1 required, can choose all 3)
  const [enableWhatsapp, setEnableWhatsapp] = useState<boolean>(true);
  const [whatsappDialCode, setWhatsappDialCode] = useState<string>('+966');
  const [whatsappNumber, setWhatsappNumber] = useState<string>('');
  const [whatsappAcceptsCalls, setWhatsappAcceptsCalls] =
    useState<boolean>(false);

  const [enableSnapchat, setEnableSnapchat] = useState<boolean>(false);
  const [snapchatUrl, setSnapchatUrl] = useState<string>('');

  const [enableX, setEnableX] = useState<boolean>(false);
  const [xUrl, setXUrl] = useState<string>('');

  // Optional brief bio/notes
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [isLoadingEditContacts, setIsLoadingEditContacts] = useState(false);

  // Validation & Submission State
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldKey, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitBannerError, setSubmitBannerError] = useState<string | null>(
    null
  );
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Refs for auto-scrolling and focusing the first invalid field
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const deviceFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize form for either Create Mode or Edit Mode when opened
  useEffect(() => {
    if (!isOpen) {
      submitLockRef.current = false;
      return;
    }

    setFieldErrors({});
    setSubmitBannerError(null);
    setSuccessMsg(null);
    submitLockRef.current = false;

    if (editingAd && editingAd.adId) {
      // Edit Mode: Populate existing ad fields so saving updates the same adId
      draftAdIdRef.current = editingAd.adId;
      setAdvertiserName(editingAd.advertiserName || editingAd.title || '');
      setGender(editingAd.gender === 'female' ? 'female' : 'male');
      setAgeInput(String(editingAd.age || 28));
      setCountryCode(editingAd.countryCode || 'SA');

      const country =
        effectiveCountries.find(
          (c) => c.code === (editingAd.countryCode || 'SA')
        ) ||
        ARAB_COUNTRIES.find((c) => c.code === (editingAd.countryCode || 'SA'));
      const matchedRegion = resolveRegionByIdOrName(
        country,
        editingAd.regionId || editingAd.regionNameAr
      );

      if (matchedRegion) {
        setSelectedRegionId(matchedRegion.id);
        setManualRegionAr('');
        const matchedSub = resolveSubRegionByIdOrName(
          matchedRegion,
          editingAd.subRegionId || editingAd.subRegionNameAr
        );
        if (matchedSub) {
          setSelectedSubRegionId(matchedSub.id);
          setManualSubRegionAr('');
        } else {
          setSelectedSubRegionId(MANUAL_SUBREGION_ID);
          setManualSubRegionAr(editingAd.subRegionNameAr || '');
        }
      } else {
        setSelectedRegionId(MANUAL_REGION_ID);
        setManualRegionAr(editingAd.regionNameAr || '');
        setSelectedSubRegionId(MANUAL_SUBREGION_ID);
        setManualSubRegionAr(editingAd.subRegionNameAr || '');
      }

      setMarriageType(
        editingAd.marriageType ||
          editingAd.maritalStatus ||
          availableMarriageTypes[0] ||
          DEFAULT_MARRIAGE_TYPES[0]
      );
      setAdditionalNotes(editingAd.details || '');

      if (editingAd.hasPhotos && editingAd.primaryPhotoUrl) {
        setUploadedPhotoUrl(editingAd.primaryPhotoUrl);
        setUploadedFileId(editingAd.photoFileId || '');
      } else {
        setUploadedPhotoUrl('');
        setUploadedFileId('');
      }
      setUploadedPhotoId('');

      // Load isolated contact details for editing
      let active = true;
      setIsLoadingEditContacts(true);
      getProtectedAdContact(editingAd.adId)
        .then((contact) => {
          if (!active || !contact) return;
          const hasWa = Boolean(contact.whatsapp && contact.whatsapp.trim());
          setEnableWhatsapp(hasWa);
          const dial =
            contact.whatsappDialCode || country?.dialCode || '+966';
          setWhatsappDialCode(dial);
          const rawWa = contact.whatsapp || '';
          const localNumber = rawWa.startsWith(dial)
            ? rawWa.slice(dial.length)
            : rawWa.replace(/^\+\d{1,3}/, '');
          setWhatsappNumber(localNumber);
          setWhatsappAcceptsCalls(Boolean(contact.whatsappAcceptsCalls));

          const hasSnap = Boolean(
            contact.snapchatUrl && contact.snapchatUrl.trim()
          );
          setEnableSnapchat(hasSnap);
          setSnapchatUrl(contact.snapchatUrl || '');

          const hasXAccount = Boolean(contact.xUrl && contact.xUrl.trim());
          setEnableX(hasXAccount);
          setXUrl(contact.xUrl || '');
        })
        .catch(() => {})
        .finally(() => {
          if (active) setIsLoadingEditContacts(false);
        });

      return () => {
        active = false;
      };
    } else {
      // Create Mode: Generate a single fixed draftAdId so repeated clicks or retries never duplicate the ad
      draftAdIdRef.current = `ad_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      if (profile) {
        setAdvertiserName((prev) => prev || profile.displayName || '');
        if (profile.gender === 'female') {
          setGender('female');
        } else if (profile.gender === 'male') {
          setGender('male');
        }
      }
    }
  }, [isOpen, editingAd]);

  useEffect(() => {
    if (
      availableMarriageTypes.length > 0 &&
      (!marriageType || !availableMarriageTypes.includes(marriageType))
    ) {
      setMarriageType(availableMarriageTypes[0]);
    }
  }, [availableMarriageTypes, marriageType]);

  const selectedCountry = useMemo(
    () =>
      effectiveCountries.find((c) => c.code === countryCode) ||
      ARAB_COUNTRIES.find((c) => c.code === countryCode) ||
      null,
    [countryCode, effectiveCountries]
  );

  const filteredCountries = useMemo(() => {
    const q = countrySearchQuery.trim().toLowerCase();
    if (!q) return effectiveCountries;
    return effectiveCountries.filter(
      (c) =>
        c.nameAr.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dialCode.includes(q)
    );
  }, [countrySearchQuery, effectiveCountries]);

  const selectedRegionObj = useMemo(() => {
    if (
      !selectedCountry ||
      !selectedRegionId ||
      selectedRegionId === MANUAL_REGION_ID
    ) {
      return null;
    }
    return (
      selectedCountry.regions.find((r) => r.id === selectedRegionId) || null
    );
  }, [selectedCountry, selectedRegionId]);

  // Strictly block access if user is not signed in OR email is not verified
  if (!isOpen || !firebaseUser || !isEmailVerified) {
    return null;
  }

  // Block editing if the current user is not the owner of the ad
  if (isEditMode && editingAd && editingAd.userId !== firebaseUser.uid) {
    return null;
  }

  const clearFieldError = (key: FieldKey) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const focusAndScrollToField = (key: FieldKey) => {
    const el = fieldRefs.current[key];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const focusable = el.querySelector<
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLButtonElement
      | HTMLTextAreaElement
    >('input, select, button, textarea');
    if (focusable) {
      setTimeout(() => focusable.focus({ preventScroll: true }), 180);
    } else {
      setTimeout(() => el.focus({ preventScroll: true }), 180);
    }
  };

  /**
   * Immediately upon selecting an image from the device, validates it
   * and converts it into a ready URL so it displays as a natural photo.
   */
  const handlePhotoFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    clearFieldError('photo');
    setSubmitBannerError(null);
    setIsProcessingPhoto(true);

    try {
      // Only delete temporary unsaved file if not the original editingAd's committed file
      if (
        uploadedFileId &&
        (!editingAd || uploadedFileId !== editingAd.photoFileId)
      ) {
        await deleteAdPersonalPhotoFromCloud(uploadedFileId);
      }
      const converted = await processPersonalPhotoFromDevice(
        file,
        firebaseUser.uid
      );
      setUploadedPhotoUrl(converted.url);
      setUploadedFileId(converted.fileId);
      setUploadedPhotoId(converted.photoId);
    } catch (err) {
      setFieldErrors((prev) => ({
        ...prev,
        photo:
          err instanceof Error
            ? err.message
            : 'ملف الصورة غير صالح. يرجى اختيار صورة JPG أو PNG أو WEBP لا تتجاوز 5 ميجابايت.',
      }));
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    clearFieldError('photo');
    if (
      uploadedFileId &&
      (!editingAd || uploadedFileId !== editingAd.photoFileId)
    ) {
      await deleteAdPersonalPhotoFromCloud(uploadedFileId);
    }
    setUploadedPhotoUrl('');
    setUploadedFileId('');
    setUploadedPhotoId('');
  };

  const handleSelectCountry = (code: string) => {
    setCountryCode(code);
    setCountryDropdownOpen(false);
    setCountrySearchQuery('');
    clearFieldError('countryCode');
    clearFieldError('region');
    clearFieldError('subRegion');

    const country =
      effectiveCountries.find((c) => c.code === code) ||
      ARAB_COUNTRIES.find((c) => c.code === code);
    if (country) {
      setWhatsappDialCode(country.dialCode);
      if (country.regions.length > 0) {
        const firstRegion = country.regions[0];
        setSelectedRegionId(firstRegion.id);
        setManualRegionAr('');
        if (firstRegion.subRegions.length > 0) {
          setSelectedSubRegionId(firstRegion.subRegions[0].id);
          setManualSubRegionAr('');
        } else {
          setSelectedSubRegionId(MANUAL_SUBREGION_ID);
          setManualSubRegionAr('');
        }
      } else {
        setSelectedRegionId(MANUAL_REGION_ID);
        setSelectedSubRegionId(MANUAL_SUBREGION_ID);
      }
    }
  };

  const handleRegionChange = (regionId: string) => {
    setSelectedRegionId(regionId);
    clearFieldError('region');
    clearFieldError('subRegion');

    if (regionId === MANUAL_REGION_ID) {
      setSelectedSubRegionId(MANUAL_SUBREGION_ID);
      return;
    }

    const foundRegion = selectedCountry?.regions.find(
      (r) => r.id === regionId
    );
    if (foundRegion && foundRegion.subRegions.length > 0) {
      setSelectedSubRegionId(foundRegion.subRegions[0].id);
      setManualSubRegionAr('');
    } else {
      setSelectedSubRegionId(MANUAL_SUBREGION_ID);
    }
  };

  const validateAllFields = (): {
    valid: boolean;
    errors: Partial<Record<FieldKey, string>>;
    firstErrorKey: FieldKey | null;
  } => {
    const errors: Partial<Record<FieldKey, string>> = {};
    const orderedKeys: FieldKey[] = [];

    const markError = (key: FieldKey, msg: string) => {
      if (!errors[key]) {
        errors[key] = msg;
        orderedKeys.push(key);
      }
    };

    // 2. Name Validation
    const cleanName = advertiserName.trim();
    if (!cleanName) {
      markError('advertiserName', 'يرجى كتابة الاسم وعدم ترك الحقل فارغاً.');
    } else if (cleanName.length < 2) {
      markError('advertiserName', 'يجب ألا يقل الاسم عن حرفين.');
    } else if (cleanName.length > 80) {
      markError('advertiserName', 'الاسم طويل جداً (الحد الأقصى 80 حرفاً).');
    }

    // 3. Gender Validation
    if (gender !== 'male' && gender !== 'female') {
      markError('gender', 'يرجى تحديد الجنس (ذكر أو أنثى).');
    }

    // 4. Age Validation
    const parsedAge = Number(ageInput);
    if (
      !ageInput.trim() ||
      Number.isNaN(parsedAge) ||
      !Number.isInteger(parsedAge)
    ) {
      markError('age', 'يرجى إدخال العمر بالسنوات كرقم صحيح.');
    } else if (parsedAge < 18) {
      markError(
        'age',
        'الحد الأدنى للعمر المسموح به هو 18 عاماً (لا يُسمح بأعمار أقل من 18).'
      );
    } else if (parsedAge > 99) {
      markError('age', 'يرجى إدخال عمر صحيح بين 18 و99 عاماً.');
    }

    // 5. Country Validation
    if (!countryCode || !selectedCountry) {
      markError('countryCode', 'يرجى اختيار الدولة من القائمة.');
    }

    // 6. Region & Sub-Region Validation (using Fixed IDs + Manual fallback)
    if (selectedCountry) {
      const effectiveRegionAr =
        selectedRegionId === MANUAL_REGION_ID
          ? manualRegionAr.trim()
          : selectedRegionObj?.nameAr || '';

      if (!effectiveRegionAr || effectiveRegionAr.length < 2) {
        markError(
          'region',
          `يرجى تحديد ${selectedCountry.regionLabelAr} أو كتابتها بشكل صحيح.`
        );
      } else if (effectiveRegionAr.length > 80) {
        markError(
          'region',
          `اسم ${selectedCountry.regionLabelAr} يتجاوز الحد المسموح به.`
        );
      }

      const matchedSubObj = selectedRegionObj?.subRegions.find(
        (s) => s.id === selectedSubRegionId
      );
      const effectiveSubRegionAr =
        selectedRegionId === MANUAL_REGION_ID ||
        selectedSubRegionId === MANUAL_SUBREGION_ID
          ? manualSubRegionAr.trim()
          : matchedSubObj?.nameAr || '';

      if (!effectiveSubRegionAr || effectiveSubRegionAr.length < 2) {
        markError(
          'subRegion',
          `يرجى تحديد ${selectedCountry.subRegionLabelAr} أو إدخالها يدوياً بشكل صحيح.`
        );
      } else if (effectiveSubRegionAr.length > 80) {
        markError(
          'subRegion',
          `اسم ${selectedCountry.subRegionLabelAr} يتجاوز الحد المسموح به.`
        );
      }
    }

    // 7. Marriage Type Validation
    if (!marriageType || marriageType.trim().length < 2) {
      markError('marriageType', 'يرجى اختيار نوع الزواج.');
    }

    // 8. Contact Methods Validation (At least 1 required)
    if (!enableWhatsapp && !enableSnapchat && !enableX) {
      markError(
        'contacts',
        'يجب اختيار وسيلة تواصل واحدة على الأقل (واتساب أو سناب شات أو منصة إكس).'
      );
    }

    if (enableWhatsapp) {
      const digitsOnly = whatsappNumber.replace(/[\s\-()]/g, '');
      if (!digitsOnly) {
        markError('whatsappNumber', 'يرجى إدخال رقم هاتف واتساب.');
      } else if (!/^\d{6,15}$/.test(digitsOnly)) {
        markError(
          'whatsappNumber',
          'رقم الهاتف غير صحيح. يرجى إدخال الأرقام فقط (6 إلى 15 رقماً بدون مفتاح الدولة).'
        );
      }
    }

    if (enableSnapchat) {
      if (!snapchatUrl.trim()) {
        markError('snapchatUrl', 'يرجى إدخال رابط حساب سناب شات.');
      } else if (!isValidSnapchatUrl(snapchatUrl)) {
        markError(
          'snapchatUrl',
          'صيغة رابط سناب شات غير صحيحة. مثال: https://www.snapchat.com/add/username'
        );
      }
    }

    if (enableX) {
      if (!xUrl.trim()) {
        markError('xUrl', 'يرجى إدخال رابط حساب منصة إكس (X).');
      } else if (!isValidXUrl(xUrl)) {
        markError(
          'xUrl',
          'صيغة رابط منصة إكس غير صحيحة. مثال: https://x.com/username'
        );
      }
    }

    return {
      valid: orderedKeys.length === 0,
      errors,
      firstErrorKey: orderedKeys[0] || null,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Synchronous guard against repeated/rapid clicks on Save button
    if (submitLockRef.current || isSubmitting || isProcessingPhoto) {
      return;
    }

    setSubmitBannerError(null);
    setSuccessMsg(null);

    // Check internet connection before starting
    try {
      assertOnlineConnection();
    } catch (offlineErr) {
      setSubmitBannerError(
        offlineErr instanceof Error
          ? offlineErr.message
          : 'انقطع الاتصال بالإنترنت أثناء محاولة الحفظ.'
      );
      return;
    }

    // Do not clear user data on validation error; highlight and focus the first invalid field
    const validation = validateAllFields();
    setFieldErrors(validation.errors);

    if (!validation.valid) {
      if (validation.firstErrorKey) {
        focusAndScrollToField(validation.firstErrorKey);
      }
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      await firebaseUser.reload();
      if (!firebaseUser.emailVerified) {
        setSubmitBannerError(
          'لا يُسمح بنشر أو تعديل إعلان قبل التحقق الفعلي من البريد الإلكتروني.'
        );
        submitLockRef.current = false;
        setIsSubmitting(false);
        return;
      }

      if (profile?.accountStatus === 'banned') {
        setSubmitBannerError(
          `حسابك محظور من إنشاء أو نشر الإعلانات${profile.bannedReason ? ` (السبب: ${profile.bannedReason})` : ''}. يرجى التواصل مع إدارة المنصة للمساعدة.`
        );
        submitLockRef.current = false;
        setIsSubmitting(false);
        return;
      }

      if (profile?.accountStatus === 'restricted' || profile?.accountStatus === 'suspended') {
        const restrictionNote = profile.restrictionReason ? ` (السبب: ${profile.restrictionReason})` : '';
        const expiryNote = profile.restrictionUntil?.toDate
          ? ` حتى تاريخ: ${profile.restrictionUntil.toDate().toLocaleDateString('ar-SA')}`
          : '';
        setSubmitBannerError(
          `حسابك مقيد مؤقتاً من نشر الإعلانات الجديدة${expiryNote}${restrictionNote}.`
        );
        submitLockRef.current = false;
        setIsSubmitting(false);
        return;
      }

      const validGender: AdGender = gender === 'female' ? 'female' : 'male';

      // Use the already-converted photo URL (or default gender avatar if not uploaded)
      const hasUploadedPhoto = Boolean(uploadedPhotoUrl);
      const finalPhotoUrl =
        uploadedPhotoUrl || getDefaultAvatarByGender(validGender);
      const finalPhotoFileId = hasUploadedPhoto ? uploadedFileId : '';
      const finalPhotoId = hasUploadedPhoto ? uploadedPhotoId : undefined;

      // Determine status based on Admin Policy (requireAdApproval in /admin_settings/general)
      let targetStatus: 'pending' | 'approved' = 'approved';
      try {
        const { settings } = await getGeneralAdminSettings(false);
        if (settings.requireAdApproval && !permissions.canModerateAds) {
          targetStatus = 'pending';
        }
      } catch {
        targetStatus = 'approved';
      }

      const country = selectedCountry!;
      const matchedRegionObj =
        selectedRegionId !== MANUAL_REGION_ID
          ? country.regions.find((r) => r.id === selectedRegionId) || null
          : null;
      const effectiveRegionId = matchedRegionObj
        ? matchedRegionObj.id
        : MANUAL_REGION_ID;
      const effectiveRegionAr = matchedRegionObj
        ? matchedRegionObj.nameAr
        : manualRegionAr.trim();

      const matchedSubRegionObj =
        matchedRegionObj && selectedSubRegionId !== MANUAL_SUBREGION_ID
          ? matchedRegionObj.subRegions.find(
              (s) => s.id === selectedSubRegionId
            ) || null
          : null;
      const effectiveSubRegionId = matchedSubRegionObj
        ? matchedSubRegionObj.id
        : MANUAL_SUBREGION_ID;
      const effectiveSubRegionAr = matchedSubRegionObj
        ? matchedSubRegionObj.nameAr
        : manualSubRegionAr.trim();

      const combinedLocationAr = `${effectiveRegionAr} - ${effectiveSubRegionAr}`;
      const combinedLocationEn = `${
        matchedRegionObj?.nameEn || effectiveRegionAr
      } - ${matchedSubRegionObj?.nameEn || effectiveSubRegionAr}`;

      const autoTitle = `${advertiserName.trim()} — ${marriageType.trim()}`;
      const formattedDetails =
        additionalNotes.trim() ||
        `الاسم: ${advertiserName.trim()} | النوع: ${marriageType.trim()} | ${country.regionLabelAr}: ${effectiveRegionAr} (${effectiveSubRegionAr})`;

      const cleanWhatsappDigits = enableWhatsapp
        ? whatsappNumber.replace(/[\s\-()]/g, '')
        : '';
      const fullWhatsapp = enableWhatsapp
        ? `${whatsappDialCode}${cleanWhatsappDigits}`
        : '';

      const contactPayload = {
        phone: enableWhatsapp && whatsappAcceptsCalls ? fullWhatsapp : '',
        whatsapp: fullWhatsapp,
        whatsappDialCode: enableWhatsapp ? whatsappDialCode : '',
        whatsappAcceptsCalls: enableWhatsapp ? whatsappAcceptsCalls : false,
        snapchatUrl: enableSnapchat ? snapchatUrl.trim() : '',
        xUrl: enableX ? xUrl.trim() : '',
        telegram: '',
        email: firebaseUser.email || '',
        preferredContactTime: '',
      };

      if (isEditMode && editingAd) {
        // Update the exact same MarriageAd record in Firestore
        await updateMarriageAdWithContact(
          firebaseUser.uid,
          editingAd,
          {
            advertiserName: advertiserName.trim(),
            title: autoTitle,
            gender: validGender,
            age: Number(ageInput),
            maritalStatus: marriageType.trim(),
            marriageType: marriageType.trim(),
            countryCode: country.code,
            countryNameAr: country.nameAr,
            countryNameEn: country.nameEn,
            regionId: effectiveRegionId,
            regionLabelAr: country.regionLabelAr,
            regionNameAr: effectiveRegionAr,
            subRegionId: effectiveSubRegionId,
            subRegionLabelAr: country.subRegionLabelAr,
            subRegionNameAr: effectiveSubRegionAr,
            cityNameAr: combinedLocationAr,
            cityNameEn: combinedLocationEn,
            details: formattedDetails,
            partnerRequirements: marriageType.trim(),
            hasPhotos: hasUploadedPhoto,
            primaryPhotoUrl: finalPhotoUrl,
            photoFileId: finalPhotoFileId,
            newPhotoId: finalPhotoId,
            nextStatus: targetStatus,
          },
          contactPayload
        );

        setSuccessMsg(
          'تم تحديث بيانات إعلانك الحالي ومزامنته في قاعدة البيانات بنجاح دون إنشاء إعلان مكرر.'
        );
      } else {
        // Create Mode using the idempotent draftAdIdRef.current
        const adId =
          draftAdIdRef.current ||
          `ad_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        await createMarriageAdWithContact(
          firebaseUser.uid,
          {
            adId,
            advertiserName: advertiserName.trim(),
            title: autoTitle,
            gender: validGender,
            age: Number(ageInput),
            maritalStatus: marriageType.trim(),
            marriageType: marriageType.trim(),
            countryCode: country.code,
            countryNameAr: country.nameAr,
            countryNameEn: country.nameEn,
            regionId: effectiveRegionId,
            regionLabelAr: country.regionLabelAr,
            regionNameAr: effectiveRegionAr,
            subRegionId: effectiveSubRegionId,
            subRegionLabelAr: country.subRegionLabelAr,
            subRegionNameAr: effectiveSubRegionAr,
            cityNameAr: combinedLocationAr,
            cityNameEn: combinedLocationEn,
            details: formattedDetails,
            partnerRequirements: marriageType.trim(),
            hasPhotos: hasUploadedPhoto,
            primaryPhotoUrl: finalPhotoUrl,
            photoFileId: finalPhotoFileId,
            photoId: finalPhotoId,
            initialStatus: targetStatus,
          },
          contactPayload
        );

        setSuccessMsg(
          targetStatus === 'approved'
            ? 'تم حفظ إعلانك ومزامنته في قاعدة البيانات السحابية بنجاح، وهو معروض الآن في الواجهة الرئيسية.'
            : 'تم حفظ إعلانك في قاعدة البيانات بحالة (بانتظار المراجعة) وسيظهر للزوار فور اعتماده من الإدارة.'
        );
      }
    } catch (err) {
      // Unlock submission only on error so user can retry (with the same draftAdIdRef so no duplicate is created)
      submitLockRef.current = false;
      setSubmitBannerError(
        err instanceof Error
          ? err.message
          : 'تعذر حفظ الإعلان في قاعدة البيانات، يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentAvatarPreview =
    uploadedPhotoUrl ||
    getDefaultAvatarByGender(gender === 'female' ? 'female' : 'male');

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-ad-modal-title"
    >
      <div className="w-full max-w-xl bg-white rounded-2xl border border-stone-200 shadow-2xl overflow-hidden my-auto">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-stone-200 bg-stone-50">
          <div>
            <h2
              id="create-ad-modal-title"
              className="text-sm sm:text-base font-bold text-stone-900"
            >
              {isEditMode
                ? 'تعديل بيانات الإعلان المحفوظ'
                : 'إضافة إعلان زواج جديد'}
            </h2>
            <p className="text-[11px] text-stone-500 mt-0.5">
              {isEditMode
                ? `تحديث السجل الأصلي (${editingAd?.adId}) دون إنشاء إعلان مكرر`
                : 'أدخل بيانات الإعلان بالترتيب الموضح أدناه'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[36px] min-w-[36px] rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 inline-flex items-center justify-center"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="p-4 sm:p-5 space-y-5 max-h-[82vh] overflow-y-auto"
        >
          {profile?.accountStatus === 'banned' && (
            <div className="p-3.5 rounded-xl bg-red-100 border border-red-300 text-xs text-red-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">حسابك محظور من إنشاء أو تعديل الإعلانات.</p>
                {profile.bannedReason && (
                  <p className="mt-1 text-[11px] text-red-800">سبب الحظر: {profile.bannedReason}</p>
                )}
              </div>
            </div>
          )}

          {(profile?.accountStatus === 'restricted' || profile?.accountStatus === 'suspended') && (
            <div className="p-3.5 rounded-xl bg-amber-100 border border-amber-300 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">حسابك مقيد مؤقتاً من نشر الإعلانات.</p>
                {profile.restrictionReason && (
                  <p className="mt-1 text-[11px] text-amber-800">السبب: {profile.restrictionReason}</p>
                )}
                {profile.restrictionUntil?.toDate && (
                  <p className="mt-0.5 text-[11px] text-amber-800">
                    ينتهي التقييد في: {profile.restrictionUntil.toDate().toLocaleDateString('ar-SA')}
                  </p>
                )}
              </div>
            </div>
          )}

          {!isOnline && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-2">
              <WifiOff className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                أنت غير متصل بالإنترنت حالياً. لن يتم حفظ الإعلان حتى يعود الاتصال بالشبكة.
              </span>
            </div>
          )}

          {submitBannerError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{submitBannerError}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-xs sm:text-sm text-emerald-900 space-y-2">
              <div className="flex items-start gap-2 font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                >
                  العودة للواجهة الرئيسية
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 1. الصورة الشخصية (رفع من الجهاز -> تحويل فوري إلى رابط وحفظ) */}
          {/* ========================================================= */}
          <div
            ref={(el) => {
              fieldRefs.current.photo = el;
            }}
            tabIndex={-1}
            className={`p-3.5 rounded-xl border transition-colors ${
              fieldErrors.photo
                ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20'
                : 'border-stone-200 bg-stone-50/60'
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs sm:text-sm font-bold text-stone-900">
                1. الصورة الشخصية{' '}
                <span className="text-[11px] font-normal text-stone-500">
                  (اختياري)
                </span>
              </label>
              <span className="text-[11px] text-stone-500">
                JPG, PNG, WEBP — بحد أقصى 5MB
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3.5">
              {/* معاينة طبيعية للصورة كما تم رفعها من الجهاز */}
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-stone-300 bg-white shrink-0 shadow-xs">
                <img
                  src={currentAvatarPreview}
                  alt="معاينة الصورة الشخصية"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 w-full space-y-2">
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  {isProcessingPhoto
                    ? 'جاري تحويل الصورة المرفوعة إلى رابط جاهز للحفظ...'
                    : uploadedPhotoUrl
                    ? 'تم رفع الصورة من جهازك وتحويلها إلى رابط جاهز للعرض في الإعلان.'
                    : `عند عدم رفع صورة من جهازك، سيتم استخدام الصورة الافتراضية المناسبة لـ (${
                        gender === 'female' ? 'أنثى' : 'ذكر'
                      }).`}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  {/* زر رفع صورة من الجهاز */}
                  <button
                    type="button"
                    disabled={isProcessingPhoto || isSubmitting}
                    onClick={() => deviceFileInputRef.current?.click()}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {uploadedPhotoUrl ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>تغيير الصورة من الجهاز</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {isProcessingPhoto
                            ? 'جاري رفع وتحويل الصورة...'
                            : 'رفع صورة من الجهاز'}
                        </span>
                      </>
                    )}
                  </button>

                  {/* زر حذف الصورة المرفوعة */}
                  {uploadedPhotoUrl && (
                    <button
                      type="button"
                      disabled={isProcessingPhoto || isSubmitting}
                      onClick={handleRemovePhoto}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف الصورة</span>
                    </button>
                  )}
                </div>

                {/* مدخل اختيار الصورة من الجهاز */}
                <input
                  ref={deviceFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoFileSelected}
                  className="hidden"
                />
              </div>
            </div>

            {fieldErrors.photo && (
              <p className="mt-2 text-xs font-medium text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.photo}</span>
              </p>
            )}
          </div>

          {/* ========================================================= */}
          {/* 2. الاسم (إلزامي) */}
          {/* ========================================================= */}
          <div
            ref={(el) => {
              fieldRefs.current.advertiserName = el;
            }}
            tabIndex={-1}
          >
            <label
              htmlFor="ad-advertiser-name"
              className="block text-xs sm:text-sm font-bold text-stone-900 mb-1.5"
            >
              2. الاسم <span className="text-red-600">*</span>
            </label>
            <input
              id="ad-advertiser-name"
              type="text"
              maxLength={80}
              placeholder="اكتب الاسم أو الكنية (مثال: أبو فهد / سارة)"
              value={advertiserName}
              onChange={(e) => {
                setAdvertiserName(e.target.value);
                clearFieldError('advertiserName');
              }}
              className={`w-full min-h-[42px] rounded-xl border px-3.5 py-2 text-xs sm:text-sm focus:outline-none transition-colors ${
                fieldErrors.advertiserName
                  ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20'
                  : 'border-stone-300 bg-white focus:border-stone-900'
              }`}
            />
            {fieldErrors.advertiserName && (
              <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.advertiserName}</span>
              </p>
            )}
          </div>

          {/* ========================================================= */}
          {/* 3. الجنس (خياران: ذكر / أنثى بمربعات اختيار واضحة وعلامة صح) */}
          {/* ========================================================= */}
          <div
            ref={(el) => {
              fieldRefs.current.gender = el;
            }}
            tabIndex={-1}
          >
            <label className="block text-xs sm:text-sm font-bold text-stone-900 mb-1.5">
              3. الجنس <span className="text-red-600">*</span>
            </label>
            <div
              className={`grid grid-cols-2 gap-3 p-1 rounded-xl ${
                fieldErrors.gender
                  ? 'border border-red-500 ring-1 ring-red-500 bg-red-50/20'
                  : ''
              }`}
            >
              {[
                { value: 'male' as const, label: 'ذكر' },
                { value: 'female' as const, label: 'أنثى' },
              ].map((option) => {
                const isSelected = gender === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    onClick={() => {
                      setGender(option.value);
                      clearFieldError('gender');
                    }}
                    className={`min-h-[46px] px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-amber-700 bg-amber-50/80 text-stone-900 shadow-xs'
                        : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <span>{option.label}</span>
                    <span
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-amber-700 border-amber-700 text-white'
                          : 'border-stone-400 bg-white'
                      }`}
                    >
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            {fieldErrors.gender && (
              <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.gender}</span>
              </p>
            )}
          </div>

          {/* ========================================================= */}
          {/* 4. العمر (بالسنوات - إلزامي - الحد الأدنى 18 عاماً) */}
          {/* ========================================================= */}
          <div
            ref={(el) => {
              fieldRefs.current.age = el;
            }}
            tabIndex={-1}
          >
            <label
              htmlFor="ad-age-input"
              className="block text-xs sm:text-sm font-bold text-stone-900 mb-1.5"
            >
              4. العمر (بالسنوات — الحد الأدنى 18 عاماً){' '}
              <span className="text-red-600">*</span>
            </label>
            <input
              id="ad-age-input"
              type="number"
              inputMode="numeric"
              min={18}
              max={99}
              placeholder="مثال: 32"
              value={ageInput}
              onChange={(e) => {
                setAgeInput(e.target.value);
                clearFieldError('age');
              }}
              className={`w-full min-h-[42px] rounded-xl border px-3.5 py-2 text-xs sm:text-sm tabular-nums focus:outline-none transition-colors ${
                fieldErrors.age
                  ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20'
                  : 'border-stone-300 bg-white focus:border-stone-900'
              }`}
            />
            {fieldErrors.age && (
              <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.age}</span>
              </p>
            )}
          </div>

          {/* ========================================================= */}
          {/* 5. الدولة (قائمة الدول العربية مع البحث وعلم الدولة ورمز ثابت) */}
          {/* ========================================================= */}
          <div
            ref={(el) => {
              fieldRefs.current.countryCode = el;
            }}
            tabIndex={-1}
            className="relative"
          >
            <label className="block text-xs sm:text-sm font-bold text-stone-900 mb-1.5">
              5. الدولة <span className="text-red-600">*</span>
            </label>

            <button
              type="button"
              onClick={() => setCountryDropdownOpen((prev) => !prev)}
              className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm flex items-center justify-between transition-colors ${
                fieldErrors.countryCode
                  ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20'
                  : 'border-stone-300 bg-white hover:border-stone-400'
              }`}
            >
              {selectedCountry ? (
                <span className="flex items-center gap-2 font-semibold text-stone-900">
                  <span className="text-lg leading-none" aria-hidden="true">
                    {selectedCountry.flag}
                  </span>
                  <span>{selectedCountry.nameAr}</span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    ({selectedCountry.code})
                  </span>
                </span>
              ) : (
                <span className="text-stone-400">
                  اختر الدولة العربية من القائمة...
                </span>
              )}
              <ChevronDown className="w-4 h-4 text-stone-500 shrink-0" />
            </button>

            {countryDropdownOpen && (
              <div className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white shadow-lg overflow-hidden z-30">
                <div className="p-2 border-b border-stone-200 bg-stone-50">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-stone-400 absolute right-3 pointer-events-none" />
                    <input
                      type="text"
                      value={countrySearchQuery}
                      onChange={(e) => setCountrySearchQuery(e.target.value)}
                      placeholder="ابحث عن اسم الدولة..."
                      className="w-full rounded-lg border border-stone-300 bg-white pr-9 pl-3 py-1.5 text-xs focus:outline-none focus:border-stone-900"
                    />
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-stone-100">
                  {filteredCountries.length === 0 ? (
                    <p className="p-3 text-xs text-stone-500 text-center">
                      لا توجد دولة مطابقة لبحثك
                    </p>
                  ) : (
                    filteredCountries.map((country) => {
                      const isCurrent = country.code === countryCode;
                      return (
                        <button
                          key={country.code}
                          type="button"
                          onClick={() => handleSelectCountry(country.code)}
                          className={`w-full px-3.5 py-2.5 text-right text-xs sm:text-sm flex items-center justify-between hover:bg-amber-50/60 transition-colors ${
                            isCurrent
                              ? 'bg-amber-50 font-bold text-stone-900'
                              : 'text-stone-800'
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <span className="text-lg leading-none">
                              {country.flag}
                            </span>
                            <span>{country.nameAr}</span>
                          </span>
                          {isCurrent && (
                            <Check className="w-4 h-4 text-amber-700 shrink-0" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {fieldErrors.countryCode && (
              <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.countryCode}</span>
              </p>
            )}
          </div>

          {/* ========================================================= */}
          {/* 6. المنطقة (يظهر بعد اختيار الدولة - بمعرفات ثابتة + إدخال يدوي) */}
          {/* ========================================================= */}
          {selectedCountry && (
            <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/70 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-stone-900">
                  6. المنطقة والتقسيم الإداري في {selectedCountry.flag}{' '}
                  {selectedCountry.nameAr} <span className="text-red-600">*</span>
                </span>
              </div>

              {/* المستوى الإداري الأول (مرتبط بمعرف ثابت region.id) */}
              <div
                ref={(el) => {
                  fieldRefs.current.region = el;
                }}
                tabIndex={-1}
              >
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  {selectedCountry.regionLabelAr}{' '}
                  <span className="text-red-600">*</span>
                </label>
                <select
                  value={selectedRegionId}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  className={`w-full min-h-[42px] rounded-xl border px-3 py-2 text-xs sm:text-sm bg-white focus:outline-none ${
                    fieldErrors.region
                      ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20'
                      : 'border-stone-300 focus:border-stone-900'
                  }`}
                >
                  {selectedCountry.regions.map((reg) => (
                    <option key={reg.id} value={reg.id}>
                      {reg.nameAr}
                    </option>
                  ))}
                  <option value={MANUAL_REGION_ID}>
                    أخرى — إدخال {selectedCountry.regionLabelAr} يدوياً
                  </option>
                </select>

                {selectedRegionId === MANUAL_REGION_ID && (
                  <input
                    type="text"
                    maxLength={80}
                    placeholder={`اكتب اسم ${selectedCountry.regionLabelAr} هنا...`}
                    value={manualRegionAr}
                    onChange={(e) => {
                      setManualRegionAr(e.target.value);
                      clearFieldError('region');
                    }}
                    className={`mt-2 w-full min-h-[40px] rounded-xl border px-3 py-2 text-xs sm:text-sm bg-white focus:outline-none ${
                      fieldErrors.region
                        ? 'border-red-500 ring-1 ring-red-500'
                        : 'border-stone-300 focus:border-stone-900'
                    }`}
                  />
                )}

                {fieldErrors.region && (
                  <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.region}</span>
                  </p>
                )}
              </div>

              {/* المستوى الإداري الثاني المتدرج (مرتبط بمعرف ثابت subRegion.id) */}
              <div
                ref={(el) => {
                  fieldRefs.current.subRegion = el;
                }}
                tabIndex={-1}
              >
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  {selectedCountry.subRegionLabelAr}{' '}
                  <span className="text-red-600">*</span>
                </label>

                {selectedRegionObj && selectedRegionObj.subRegions.length > 0 ? (
                  <>
                    <select
                      value={selectedSubRegionId}
                      onChange={(e) => {
                        setSelectedSubRegionId(e.target.value);
                        clearFieldError('subRegion');
                      }}
                      className={`w-full min-h-[42px] rounded-xl border px-3 py-2 text-xs sm:text-sm bg-white focus:outline-none ${
                        fieldErrors.subRegion
                          ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20'
                          : 'border-stone-300 focus:border-stone-900'
                      }`}
                    >
                      {selectedRegionObj.subRegions.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.nameAr}
                        </option>
                      ))}
                      <option value={MANUAL_SUBREGION_ID}>
                        غير موجودة في القائمة — إدخال يدوي
                      </option>
                    </select>

                    {selectedSubRegionId === MANUAL_SUBREGION_ID && (
                      <input
                        type="text"
                        maxLength={80}
                        placeholder={`اكتب اسم ${selectedCountry.subRegionLabelAr} يدوياً...`}
                        value={manualSubRegionAr}
                        onChange={(e) => {
                          setManualSubRegionAr(e.target.value);
                          clearFieldError('subRegion');
                        }}
                        className={`mt-2 w-full min-h-[40px] rounded-xl border px-3 py-2 text-xs sm:text-sm bg-white focus:outline-none ${
                          fieldErrors.subRegion
                            ? 'border-red-500 ring-1 ring-red-500'
                            : 'border-stone-300 focus:border-stone-900'
                        }`}
                      />
                    )}
                  </>
                ) : (
                  <input
                    type="text"
                    maxLength={80}
                    placeholder={`اكتب اسم ${selectedCountry.subRegionLabelAr}...`}
                    value={manualSubRegionAr}
                    onChange={(e) => {
                      setManualSubRegionAr(e.target.value);
                      clearFieldError('subRegion');
                    }}
                    className={`w-full min-h-[42px] rounded-xl border px-3 py-2 text-xs sm:text-sm bg-white focus:outline-none ${
                      fieldErrors.subRegion
                        ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20'
                        : 'border-stone-300 focus:border-stone-900'
                    }`}
                  />
                )}

                {fieldErrors.subRegion && (
                  <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.subRegion}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 7. نوع الزواج (مدار ديناميكياً من لوحة الإدارة) */}
          {/* ========================================================= */}
          <div
            ref={(el) => {
              fieldRefs.current.marriageType = el;
            }}
            tabIndex={-1}
          >
            <label
              htmlFor="ad-marriage-type"
              className="block text-xs sm:text-sm font-bold text-stone-900 mb-1.5"
            >
              7. نوع الزواج <span className="text-red-600">*</span>
            </label>
            <select
              id="ad-marriage-type"
              value={marriageType}
              onChange={(e) => {
                setMarriageType(e.target.value);
                clearFieldError('marriageType');
              }}
              className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2 text-xs sm:text-sm bg-white focus:outline-none transition-colors ${
                fieldErrors.marriageType
                  ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20'
                  : 'border-stone-300 focus:border-stone-900'
              }`}
            >
              {availableMarriageTypes.map((typeOption) => (
                <option key={typeOption} value={typeOption}>
                  {typeOption}
                </option>
              ))}
            </select>
            {fieldErrors.marriageType && (
              <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.marriageType}</span>
              </p>
            )}
          </div>

          {/* ========================================================= */}
          {/* 8. وسائل التواصل (يجب اختيار وسيلة واحدة على الأقل، ويمكن اختيار الجميع) */}
          {/* ========================================================= */}
          <div
            ref={(el) => {
              fieldRefs.current.contacts = el;
            }}
            tabIndex={-1}
            className={`p-3.5 rounded-xl border space-y-3.5 transition-colors ${
              fieldErrors.contacts
                ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20'
                : 'border-stone-200 bg-stone-50/80'
            }`}
          >
            <div>
              <label className="block text-xs sm:text-sm font-bold text-stone-900">
                8. وسائل التواصل <span className="text-red-600">*</span>
              </label>
              <p className="text-[11px] text-stone-600 mt-0.5">
                {isLoadingEditContacts
                  ? 'جاري استرجاع بيانات وسائل التواصل المحفوظة...'
                  : 'اختر وسيلة تواصل واحدة على الأقل (ويمكنك تفعيل جميع الوسائل المتاحة):'}
              </p>
            </div>

            {fieldErrors.contacts && (
              <p className="text-xs font-medium text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.contacts}</span>
              </p>
            )}

            {/* أ. واتساب */}
            <div
              ref={(el) => {
                fieldRefs.current.whatsappNumber = el;
              }}
              className={`p-3 rounded-xl border bg-white space-y-2.5 ${
                fieldErrors.whatsappNumber
                  ? 'border-red-500 ring-1 ring-red-500'
                  : 'border-stone-200'
              }`}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={enableWhatsapp}
                onClick={() => {
                  const next = !enableWhatsapp;
                  setEnableWhatsapp(next);
                  clearFieldError('contacts');
                  if (!next) clearFieldError('whatsappNumber');
                }}
                className="w-full flex items-center justify-between text-xs sm:text-sm font-bold text-stone-900"
              >
                <span>أ. واتساب (WhatsApp)</span>
                <span
                  className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                    enableWhatsapp
                      ? 'bg-emerald-700 border-emerald-700 text-white'
                      : 'border-stone-400 bg-white'
                  }`}
                >
                  {enableWhatsapp && (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  )}
                </span>
              </button>

              {enableWhatsapp && (
                <div className="space-y-2.5 pt-1 border-t border-stone-100">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-stone-600 mb-1">
                        مفتاح الدولة
                      </label>
                      <select
                        dir="ltr"
                        value={whatsappDialCode}
                        onChange={(e) => setWhatsappDialCode(e.target.value)}
                        className="w-full min-h-[40px] rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs bg-white font-semibold"
                      >
                        {ARAB_COUNTRIES.map((c) => (
                          <option key={c.code} value={c.dialCode}>
                            {c.flag} {c.dialCode} ({c.nameAr})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-stone-600 mb-1">
                        رقم الهاتف <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="tel"
                        dir="ltr"
                        inputMode="tel"
                        maxLength={15}
                        placeholder="5XXXXXXXX"
                        value={whatsappNumber}
                        onChange={(e) => {
                          setWhatsappNumber(e.target.value);
                          clearFieldError('whatsappNumber');
                        }}
                        className={`w-full min-h-[40px] rounded-lg border px-3 py-1.5 text-xs sm:text-sm text-right focus:outline-none ${
                          fieldErrors.whatsappNumber
                            ? 'border-red-500 bg-red-50/20'
                            : 'border-stone-300 focus:border-stone-900'
                        }`}
                      />
                    </div>
                  </div>

                  {/* خيار: هل الرقم يستقبل مكالمات أيضاً أم لا */}
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={whatsappAcceptsCalls}
                    onClick={() => setWhatsappAcceptsCalls((prev) => !prev)}
                    className="w-full p-2 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 flex items-center justify-between text-xs text-stone-800"
                  >
                    <span>هذا الرقم يستقبل مكالمات هاتفية أيضاً</span>
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        whatsappAcceptsCalls
                          ? 'bg-amber-700 border-amber-700 text-white'
                          : 'border-stone-400 bg-white'
                      }`}
                    >
                      {whatsappAcceptsCalls && (
                        <Check className="w-3 h-3 stroke-[3]" />
                      )}
                    </span>
                  </button>

                  {fieldErrors.whatsappNumber && (
                    <p className="text-xs font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.whatsappNumber}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ب. سناب شات */}
            <div
              ref={(el) => {
                fieldRefs.current.snapchatUrl = el;
              }}
              className={`p-3 rounded-xl border bg-white space-y-2.5 ${
                fieldErrors.snapchatUrl
                  ? 'border-red-500 ring-1 ring-red-500'
                  : 'border-stone-200'
              }`}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={enableSnapchat}
                onClick={() => {
                  const next = !enableSnapchat;
                  setEnableSnapchat(next);
                  clearFieldError('contacts');
                  if (!next) clearFieldError('snapchatUrl');
                }}
                className="w-full flex items-center justify-between text-xs sm:text-sm font-bold text-stone-900"
              >
                <span>ب. سناب شات (Snapchat)</span>
                <span
                  className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                    enableSnapchat
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'border-stone-400 bg-white'
                  }`}
                >
                  {enableSnapchat && (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  )}
                </span>
              </button>

              {enableSnapchat && (
                <div className="space-y-1.5 pt-1 border-t border-stone-100">
                  <label className="block text-[11px] font-medium text-stone-600">
                    رابط حساب سناب شات <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="url"
                    dir="ltr"
                    maxLength={300}
                    placeholder="https://www.snapchat.com/add/username"
                    value={snapchatUrl}
                    onChange={(e) => {
                      setSnapchatUrl(e.target.value);
                      clearFieldError('snapchatUrl');
                    }}
                    className={`w-full min-h-[40px] rounded-lg border px-3 py-1.5 text-xs focus:outline-none ${
                      fieldErrors.snapchatUrl
                        ? 'border-red-500 bg-red-50/20'
                        : 'border-stone-300 focus:border-stone-900'
                    }`}
                  />
                  {fieldErrors.snapchatUrl && (
                    <p className="text-xs font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.snapchatUrl}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ج. منصة إكس (X) */}
            <div
              ref={(el) => {
                fieldRefs.current.xUrl = el;
              }}
              className={`p-3 rounded-xl border bg-white space-y-2.5 ${
                fieldErrors.xUrl
                  ? 'border-red-500 ring-1 ring-red-500'
                  : 'border-stone-200'
              }`}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={enableX}
                onClick={() => {
                  const next = !enableX;
                  setEnableX(next);
                  clearFieldError('contacts');
                  if (!next) clearFieldError('xUrl');
                }}
                className="w-full flex items-center justify-between text-xs sm:text-sm font-bold text-stone-900"
              >
                <span>ج. منصة إكس (X)</span>
                <span
                  className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                    enableX
                      ? 'bg-stone-900 border-stone-900 text-white'
                      : 'border-stone-400 bg-white'
                  }`}
                >
                  {enableX && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </span>
              </button>

              {enableX && (
                <div className="space-y-1.5 pt-1 border-t border-stone-100">
                  <label className="block text-[11px] font-medium text-stone-600">
                    رابط حساب منصة إكس (X) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="url"
                    dir="ltr"
                    maxLength={300}
                    placeholder="https://x.com/username"
                    value={xUrl}
                    onChange={(e) => {
                      setXUrl(e.target.value);
                      clearFieldError('xUrl');
                    }}
                    className={`w-full min-h-[40px] rounded-lg border px-3 py-1.5 text-xs focus:outline-none ${
                      fieldErrors.xUrl
                        ? 'border-red-500 bg-red-50/20'
                        : 'border-stone-300 focus:border-stone-900'
                    }`}
                  />
                  {fieldErrors.xUrl && (
                    <p className="text-xs font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.xUrl}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ملاحظات إضافية اختيارية */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              مواصفات أو ملاحظات إضافية{' '}
              <span className="text-[11px] font-normal text-stone-500">
                (اختياري)
              </span>
            </label>
            <textarea
              rows={2}
              maxLength={1500}
              placeholder="يمكنك إضافة نبذة مختصرة أو شروط إضافية إن رغبت..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:border-stone-900"
            />
          </div>

          {/* أزرار الحفظ والإغلاق */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs sm:text-sm font-semibold"
            >
              إغلاق
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isProcessingPhoto || !isOnline}
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? isEditMode
                    ? 'جاري تحديث الإعلان...'
                    : 'جاري حفظ الإعلان...'
                  : isEditMode
                  ? 'حفظ التعديلات'
                  : 'حفظ الإعلان'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
