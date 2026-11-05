import React, { useMemo, useState } from 'react';
import {
  LogIn,
  UserCheck,
  Settings,
  LogOut,
  X,
  UserPlus,
  MailCheck,
  RefreshCw,
  KeyRound,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ARAB_COUNTRIES, UserGender } from '../types/domain';

interface TopAuthBarProps {
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authPromptReason: string | null;
  setAuthPromptReason: (reason: string | null) => void;
  onOpenAccountSheet: () => void;
  onOpenAdminSheet: () => void;
}

export function TopAuthBar({
  authModalOpen,
  setAuthModalOpen,
  authPromptReason,
  setAuthPromptReason,
  onOpenAccountSheet,
  onOpenAdminSheet,
}: TopAuthBarProps) {
  const {
    firebaseUser,
    isEmailVerified,
    profile,
    permissions,
    isProcessing,
    authError,
    authNotice,
    clearAuthMessages,
    registerWithEmail,
    signInWithEmail,
    signInWithGoogle,
    resendVerificationEmail,
    checkEmailVerificationNow,
    sendPasswordReset,
    signOut,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'reset'>(
    'login'
  );

  // Login & Reset state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');

  // Registration state
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState<UserGender>('male');
  const [countryCode, setCountryCode] = useState('SA');
  const [cityName, setCityName] = useState('الرياض');
  const [phone, setPhone] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const selectedCountry = useMemo(
    () =>
      ARAB_COUNTRIES.find((c) => c.code === countryCode) || ARAB_COUNTRIES[0],
    [countryCode]
  );

  const handleCountryChange = (newCode: string) => {
    setCountryCode(newCode);
    const found = ARAB_COUNTRIES.find((c) => c.code === newCode);
    if (found && found.cities.length > 0) {
      setCityName(found.cities[0].nameAr);
    }
  };

  const switchTab = (tab: 'login' | 'register' | 'reset') => {
    setActiveTab(tab);
    setLocalError(null);
    clearAuthMessages();
  };

  const handleEmailLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const pwd = loginPassword;
    setLoginPassword(''); // Never retain password in state after submission
    const ok = await signInWithEmail(loginEmail, pwd);
    if (ok && authModalOpen) {
      setAuthModalOpen(false);
      setAuthPromptReason(null);
    }
  };

  const handleGoogleAuthClick = async (withRegData = false) => {
    setLocalError(null);
    const ok = await signInWithGoogle(
      withRegData && displayName.trim().length >= 2
        ? {
            displayName: displayName.trim(),
            gender,
            countryCode,
            cityName,
            phone: phone.trim(),
          }
        : undefined
    );
    if (ok) {
      setAuthModalOpen(false);
      setAuthPromptReason(null);
    }
  };

  const handleEmailRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (displayName.trim().length < 2) {
      setLocalError('يرجى إدخال الاسم التعريفي أو الكنية (حرفان على الأقل).');
      return;
    }
    if (regPassword.length < 6) {
      setLocalError('كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setLocalError('كلمة المرور وتأكيد كلمة المرور غير متطابقين.');
      return;
    }

    const pwd = regPassword;
    const confirmPwd = regConfirmPassword;
    // Clear passwords immediately from memory
    setRegPassword('');
    setRegConfirmPassword('');

    const ok = await registerWithEmail({
      email: regEmail,
      password: pwd,
      confirmPassword: confirmPwd,
      displayName: displayName.trim(),
      gender,
      countryCode,
      cityName,
      phone: phone.trim(),
    });

    if (ok) {
      setAuthModalOpen(false);
      setAuthPromptReason(null);
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    await sendPasswordReset(resetEmail);
  };

  return (
    <>
      <header className="w-full bg-white border-b border-stone-200 px-3 sm:px-5 py-2.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          {/* حالة المستخدم أو زر تسجيل الدخول */}
          {!firebaseUser ? (
            <button
              type="button"
              onClick={() => {
                setAuthPromptReason(null);
                switchTab('login');
                setAuthModalOpen(true);
              }}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>تسجيل الدخول</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
              {isEmailVerified ? (
                <button
                  type="button"
                  onClick={onOpenAccountSheet}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-medium inline-flex items-center gap-1.5 transition-colors max-w-[190px] sm:max-w-xs"
                  title="إعدادات الحساب"
                >
                  <UserCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span className="truncate font-semibold">
                    {profile?.displayName || firebaseUser.displayName || 'حسابي'}
                  </span>
                  <span aria-hidden="true" className="text-stone-400">
                    ·
                  </span>
                  <span className="text-[11px] text-stone-600 shrink-0">
                    {permissions.labelAr}
                  </span>
                </button>
              ) : (
                <span className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold inline-flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span className="truncate max-w-[150px] sm:max-w-xs">
                    {firebaseUser.email} (بانتظار تفعيل البريد)
                  </span>
                </span>
              )}

              {isEmailVerified &&
                (permissions.canManageAdminSettings ||
                  permissions.canModerateAds) && (
                  <button
                    type="button"
                    onClick={onOpenAdminSheet}
                    className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Settings className="w-3.5 h-3.5 shrink-0" />
                    <span>لوحة الإدارة</span>
                  </button>
                )}

              <button
                type="button"
                onClick={signOut}
                disabled={isProcessing}
                className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                title="تسجيل الخروج"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">خروج</span>
              </button>
            </div>
          )}

          {/* اسم التطبيق مختصراً على الطرف الآخر */}
          <div className="text-xs sm:text-sm font-bold text-stone-800 truncate">
            خطابة الزواج المسيار
          </div>
        </div>

        {/* شريط التحقق الفعلي الإلزامي عند كون البريد الإلكتروني غير موثق */}
        {firebaseUser && !isEmailVerified && (
          <div className="max-w-5xl mx-auto mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-amber-950 leading-relaxed">
                البريد الإلكتروني ({firebaseUser.email}) غير موثق بعد. تم إرسال رابط التحقق إلى بريدك؛ لا يُعتبر الحساب موثقاً ولا يمكن نشر إعلان قبل إتمام التحقق الفعلي.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={checkEmailVerificationNow}
                  disabled={isProcessing}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <MailCheck className="w-3.5 h-3.5" />
                  <span>تحققت من البريد الآن</span>
                </button>
                <button
                  type="button"
                  onClick={resendVerificationEmail}
                  disabled={isProcessing}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-800 border border-amber-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>إعادة إرسال رسالة التحقق</span>
                </button>
              </div>
            </div>

            {(authNotice || authError) && (
              <p
                className={`text-xs font-medium ${
                  authError ? 'text-red-700' : 'text-emerald-800'
                }`}
              >
                {authError || authNotice}
              </p>
            )}
          </div>
        )}
      </header>

      {/* النافذة المنبثقة لتسجيل الدخول / إنشاء حساب جديد / استعادة كلمة المرور */}
      {authModalOpen && !firebaseUser && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden my-auto">
            {/* رأس النافذة */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-stone-100">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">
                {activeTab === 'reset'
                  ? 'استعادة كلمة المرور'
                  : 'تسجيل الدخول وإنشاء الحساب'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setAuthModalOpen(false);
                  setAuthPromptReason(null);
                  clearAuthMessages();
                }}
                className="min-h-[36px] min-w-[36px] rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 inline-flex items-center justify-center transition-colors"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 max-h-[84vh] overflow-y-auto">
              {authPromptReason && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                  {authPromptReason}
                </div>
              )}

              {/* الخياران الرئيسيان في النافذة المنبثقة: 1. تسجيل الدخول 2. إنشاء حساب جديد */}
              {activeTab !== 'reset' && (
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => switchTab('login')}
                    className={`min-h-[42px] px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                      activeTab === 'login'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <LogIn className="w-4 h-4 shrink-0" />
                    <span>تسجيل الدخول</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => switchTab('register')}
                    className={`min-h-[42px] px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                      activeTab === 'register'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <UserPlus className="w-4 h-4 shrink-0" />
                    <span>إنشاء حساب جديد</span>
                  </button>
                </div>
              )}

              {(authError || localError) && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed">
                  {localError || authError}
                </div>
              )}

              {authNotice && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 leading-relaxed">
                  {authNotice}
                </div>
              )}

              {/* تبويب 1: تسجيل الدخول */}
              {activeTab === 'login' && (
                <div className="space-y-4">
                  <form onSubmit={handleEmailLoginSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">
                        البريد الإلكتروني
                      </label>
                      <input
                        type="email"
                        required
                        dir="ltr"
                        autoComplete="email"
                        placeholder="name@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs sm:text-sm text-right focus:outline-none focus:border-stone-900"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-stone-700">
                          كلمة المرور
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setResetEmail(loginEmail);
                            switchTab('reset');
                          }}
                          className="text-xs font-semibold text-amber-700 hover:underline"
                        >
                          نسيت كلمة المرور؟
                        </button>
                      </div>
                      <input
                        type="password"
                        required
                        dir="ltr"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs sm:text-sm text-right focus:outline-none focus:border-stone-900"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>
                        {isProcessing
                          ? 'جاري تسجيل الدخول...'
                          : 'تسجيل الدخول بالبريد وكلمة المرور'}
                      </span>
                    </button>
                  </form>

                  <div className="relative flex py-1 items-center">
                    <div className="grow border-t border-stone-200" />
                    <span className="shrink mx-3 text-[11px] text-stone-400">
                      أو
                    </span>
                    <div className="grow border-t border-stone-200" />
                  </div>

                  {/* تسجيل الدخول باستخدام حساب Google الرسمي */}
                  <button
                    type="button"
                    onClick={() => handleGoogleAuthClick(false)}
                    disabled={isProcessing}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span>المتابعة باستخدام حساب Google</span>
                  </button>
                </div>
              )}

              {/* تبويب 2: إنشاء حساب جديد بالبريد وكلمة المرور */}
              {activeTab === 'register' && (
                <div className="space-y-3.5">
                  <form onSubmit={handleEmailRegisterSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">
                        الاسم التعريفي أو الكنية
                      </label>
                      <input
                        type="text"
                        required
                        minLength={2}
                        maxLength={80}
                        placeholder="مثال: أبو عبدالرحمن / أم سارة"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-stone-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">
                        البريد الإلكتروني (سيُرسل إليه رابط التحقق الإلزامي)
                      </label>
                      <input
                        type="email"
                        required
                        dir="ltr"
                        autoComplete="email"
                        placeholder="name@example.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs sm:text-sm text-right focus:outline-none focus:border-stone-900"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          كلمة المرور (6 أحرف فأكثر)
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          dir="ltr"
                          autoComplete="new-password"
                          placeholder="••••••••"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs sm:text-sm text-right focus:outline-none focus:border-stone-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          تأكيد كلمة المرور
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          dir="ltr"
                          autoComplete="new-password"
                          placeholder="••••••••"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs sm:text-sm text-right focus:outline-none focus:border-stone-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          الجنس
                        </label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value as UserGender)}
                          className="w-full rounded-lg border border-stone-300 px-2.5 py-2 text-xs sm:text-sm bg-white focus:outline-none focus:border-stone-900"
                        >
                          <option value="male">ذكر</option>
                          <option value="female">أنثى</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          رقم التواصل (اختياري)
                        </label>
                        <input
                          type="tel"
                          dir="ltr"
                          maxLength={30}
                          placeholder="+966..."
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full rounded-lg border border-stone-300 px-2.5 py-2 text-xs sm:text-sm text-right focus:outline-none focus:border-stone-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          الدولة
                        </label>
                        <select
                          value={countryCode}
                          onChange={(e) => handleCountryChange(e.target.value)}
                          className="w-full rounded-lg border border-stone-300 px-2.5 py-2 text-xs sm:text-sm bg-white focus:outline-none focus:border-stone-900"
                        >
                          <optgroup label="دول الخليج العربي">
                            {ARAB_COUNTRIES.filter((c) => c.isGulf).map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.nameAr}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="الدول العربية">
                            {ARAB_COUNTRIES.filter((c) => !c.isGulf).map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.nameAr}
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
                          className="w-full rounded-lg border border-stone-300 px-2.5 py-2 text-xs sm:text-sm bg-white focus:outline-none focus:border-stone-900"
                        >
                          {selectedCountry.cities.map((city) => (
                            <option key={city.nameEn} value={city.nameAr}>
                              {city.nameAr}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>
                        {isProcessing
                          ? 'جاري إنشاء الحساب وإرسال التحقق...'
                          : 'إنشاء حساب وإرسال رسالة التحقق'}
                      </span>
                    </button>
                  </form>

                  <div className="relative flex py-0.5 items-center">
                    <div className="grow border-t border-stone-200" />
                    <span className="shrink mx-3 text-[11px] text-stone-400">
                      أو التسجيل السريع عبر
                    </span>
                    <div className="grow border-t border-stone-200" />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGoogleAuthClick(true)}
                    disabled={isProcessing}
                    className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <span>التسجيل باستخدام حساب Google الموثق</span>
                  </button>
                </div>
              )}

              {/* تبويب 3: استعادة الحساب (نسيت كلمة المرور) */}
              {activeTab === 'reset' && (
                <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
                  <p className="text-xs text-stone-600 leading-relaxed">
                    أدخل البريد الإلكتروني المسجل بحسابك، وسنرسل إليك رابطاً لإعادة تعيين كلمة المرور الجديدة:
                  </p>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      required
                      dir="ltr"
                      placeholder="name@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs sm:text-sm text-right focus:outline-none focus:border-stone-900"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => switchTab('login')}
                      className="min-h-[42px] px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold"
                    >
                      العودة لتسجيل الدخول
                    </button>

                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="min-h-[42px] px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>
                        {isProcessing
                          ? 'جاري الإرسال...'
                          : 'إرسال رابط إعادة التعيين'}
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
