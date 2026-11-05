/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  AdminSettings,
  MarriageAd,
  UiConfigSettings,
} from './types/domain';
import {
  DEFAULT_ADMIN_SETTINGS,
  DEFAULT_UI_CONFIG,
  subscribeToGeneralAdminSettings,
  subscribeToUiConfig,
} from './services/adminService';
import {
  subscribeToApprovedMarriageAds,
  subscribeToUserOwnMarriageAds,
} from './services/adService';
import { TopAuthBar } from './components/TopAuthBar';
import { HeroBannerArea } from './components/HeroBannerArea';
import { NewsTickerBar } from './components/NewsTickerBar';
import { AdCardsGrid } from './components/AdCardsGrid';
import { CreateAdModal } from './components/CreateAdModal';
import { CustomerServiceFooter } from './components/CustomerServiceFooter';
import { AccountAndAdminDrawer } from './components/AccountAndAdminDrawer';

function MainMatchmakingScreen() {
  const {
    firebaseUser,
    isEmailVerified,
    permissions,
    isAuthReady,
    checkEmailVerificationNow,
  } = useAuth();

  const [uiConfig, setUiConfig] = useState<UiConfigSettings>(DEFAULT_UI_CONFIG);
  const [adminSettings, setAdminSettings] = useState<
    Omit<AdminSettings, 'updatedAt'> | AdminSettings
  >(DEFAULT_ADMIN_SETTINGS);
  const [approvedAds, setApprovedAds] = useState<MarriageAd[]>([]);
  const [ownAds, setOwnAds] = useState<MarriageAd[]>([]);
  const [isLoadingAds, setIsLoadingAds] = useState(true);

  // Modals & Sheets State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authPromptReason, setAuthPromptReason] = useState<string | null>(null);
  const [createAdOpen, setCreateAdOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<MarriageAd | null>(null);
  const [drawerMode, setDrawerMode] = useState<'account' | 'admin' | null>(null);

  // Real-time subscription to UI Configuration (/ui_settings/main)
  useEffect(() => {
    const unsubUi = subscribeToUiConfig((cfg) => {
      setUiConfig(cfg);
    });
    return () => unsubUi();
  }, []);

  // Real-time subscription to General Admin Settings (/admin_settings/general)
  useEffect(() => {
    const unsubAdmin = subscribeToGeneralAdminSettings((settings) => {
      setAdminSettings(settings);
    });
    return () => unsubAdmin();
  }, []);

  // Real-time subscription to Approved Marriage Ads (/ads where status == 'approved')
  useEffect(() => {
    const unsubAds = subscribeToApprovedMarriageAds((items) => {
      setApprovedAds(items);
      setIsLoadingAds(false);
    });
    return () => unsubAds();
  }, []);

  // Real-time subscription to the logged-in user's own ads (so they can also see their pending ads persisted across reloads & devices)
  useEffect(() => {
    if (!firebaseUser || !isEmailVerified) {
      setOwnAds([]);
      return;
    }
    const unsubOwn = subscribeToUserOwnMarriageAds(
      firebaseUser.uid,
      (items) => {
        setOwnAds(items);
      }
    );
    return () => unsubOwn();
  }, [firebaseUser, isEmailVerified]);

  // Main screen displays active & approved ads only, deduplicated by adId
  const visibleAds = useMemo(() => {
    const map = new Map<string, MarriageAd>();
    for (const ad of approvedAds) {
      if (ad && ad.adId && ad.status === 'approved') {
        map.set(ad.adId, ad);
      }
    }
    return Array.from(map.values());
  }, [approvedAds]);

  const handleCreateAdClick = async () => {
    if (!adminSettings.platformEnabled && !permissions.canModerateAds) {
      return;
    }

    if (!firebaseUser) {
      setAuthPromptReason(
        'لا يُسمح بإنشاء إعلان زواج قبل تسجيل الدخول أو إنشاء حساب جديد.'
      );
      setAuthModalOpen(true);
      return;
    }

    if (!isEmailVerified) {
      const verifiedNow = await checkEmailVerificationNow();
      if (!verifiedNow) {
        return;
      }
    }

    setEditingAd(null);
    setCreateAdOpen(true);
  };

  const handleEditOwnAd = (ad: MarriageAd) => {
    if (!firebaseUser || !isEmailVerified || ad.userId !== firebaseUser.uid) {
      return;
    }
    setEditingAd(ad);
    setCreateAdOpen(true);
  };

  if (!isAuthReady) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-stone-50 flex items-center justify-center p-4 text-stone-700"
      >
        <p className="text-sm font-medium">جاري تحميل المنصة...</p>
      </div>
    );
  }

  const appBgStyle: React.CSSProperties = {
    backgroundColor: uiConfig.appBgColor || '#fafaf9',
    backgroundImage: uiConfig.appBgImageUrl
      ? `url("${uiConfig.appBgImageUrl}")`
      : undefined,
    backgroundSize:
      uiConfig.appBgImageFit === 'repeat'
        ? 'auto'
        : uiConfig.appBgImageFit || 'cover',
    backgroundRepeat:
      uiConfig.appBgImageFit === 'repeat' ? 'repeat' : 'no-repeat',
    backgroundPosition: 'center top',
    backgroundAttachment: 'fixed',
  };

  return (
    <div
      dir="rtl"
      style={appBgStyle}
      className="min-h-screen w-full max-w-full overflow-x-hidden text-stone-900 flex flex-col justify-between transition-colors duration-200 relative"
    >
      {/* طبقة حماية التباين ومنع تشويه النصوص عند استخدام خلفية صورية */}
      {uiConfig.appBgImageUrl && (uiConfig.appBgOverlayOpacity || 0) > 0 && (
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            backgroundColor: uiConfig.appBgOverlayColor || '#ffffff',
            opacity: Math.max(0, Math.min(1, uiConfig.appBgOverlayOpacity)),
          }}
        />
      )}

      <div className="w-full relative z-10 flex flex-col justify-between min-h-screen">
        {/* أولاً: شريط الدخول في أعلى الشاشة */}
        <TopAuthBar
          authModalOpen={authModalOpen}
          setAuthModalOpen={setAuthModalOpen}
          authPromptReason={authPromptReason}
          setAuthPromptReason={setAuthPromptReason}
          onOpenAccountSheet={() => setDrawerMode('account')}
          onOpenAdminSheet={() => setDrawerMode('admin')}
        />

        {/* ثانياً: المساحة الإعلانية العلوية (تعادل ~30% من ارتفاع شاشة الهاتف) */}
        <HeroBannerArea
          uiConfig={uiConfig}
          canManageAdmin={isEmailVerified && permissions.canManageAdminSettings}
          onOpenAdminBannerSettings={() => setDrawerMode('admin')}
        />

        {/* ثالثاً: الشريط الإخباري مباشرة تحت المساحة الإعلانية */}
        <NewsTickerBar uiConfig={uiConfig} />

        {/* المحتوى الرئيسي: رابعاً زر إنشاء إعلان + خامساً بطاقات الإعلانات */}
        <main className="max-w-5xl mx-auto w-full px-3 sm:px-5 pt-4 pb-6 space-y-4">
          {!adminSettings.platformEnabled && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs sm:text-sm text-amber-900 font-semibold text-center">
              التطبيق في وضع الصيانة المؤقتة حالياً بطلب من إدارة المنصة.
            </div>
          )}

          {/* رابعاً: زر إنشاء إعلان تحت الشريط الإخباري مباشرة */}
          <section aria-label="إنشاء إعلان جديد" className="w-full">
            <button
              type="button"
              disabled={!adminSettings.platformEnabled && !permissions.canModerateAds}
              onClick={handleCreateAdClick}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-[0.99] text-white text-sm sm:text-base font-bold inline-flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
            >
              <PlusCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>إنشاء إعلان زواج</span>
            </button>
          </section>

          {/* خامساً: بطاقات الإعلانات (شبكة من عمودين على الهواتف) */}
          <section aria-label="قائمة إعلانات الزواج" className="w-full space-y-2.5">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-xs sm:text-sm font-bold text-stone-800">
                أحدث إعلانات الزواج المسيار
              </h2>
              <span className="text-[11px] text-stone-500 tabular-nums">
                {visibleAds.length} إعلان
              </span>
            </div>

            <AdCardsGrid
              ads={visibleAds}
              uiConfig={uiConfig}
              isLoading={isLoadingAds}
              currentUserId={firebaseUser?.uid}
              isEmailVerified={isEmailVerified}
              canModerateAds={isEmailVerified && permissions.canModerateAds}
              isSuperAdmin={
                isEmailVerified && permissions.canManageAdminSettings
              }
              onRequireAuth={(reason) => {
                setAuthPromptReason(reason);
                setAuthModalOpen(true);
              }}
              onEditAd={handleEditOwnAd}
            />
          </section>
        </main>

        {/* سادساً: خدمة العملاء في أسفل الواجهة */}
        <CustomerServiceFooter uiConfig={uiConfig} />
      </div>

      {/* النوافذ المنبثقة: نموذج إنشاء/تعديل الإعلان + إعدادات الحساب والإدارة */}
      <CreateAdModal
        isOpen={createAdOpen}
        onClose={() => {
          setCreateAdOpen(false);
          setEditingAd(null);
        }}
        uiConfig={uiConfig}
        editingAd={editingAd}
      />

      <AccountAndAdminDrawer
        mode={drawerMode}
        onClose={() => setDrawerMode(null)}
        uiConfig={uiConfig}
        ownAds={ownAds}
        onEditAd={handleEditOwnAd}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainMatchmakingScreen />
      </AuthProvider>
    </ErrorBoundary>
  );
}
