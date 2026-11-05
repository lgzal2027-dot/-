import React, { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Settings, ExternalLink } from 'lucide-react';
import { UiConfigSettings } from '../types/domain';

interface HeroBannerAreaProps {
  uiConfig: UiConfigSettings;
  canManageAdmin: boolean;
  onOpenAdminBannerSettings: () => void;
}

interface BannerItem {
  slot: 1 | 2;
  url: string;
  link?: string;
}

/**
 * المساحة الإعلانية العلوية:
 * - تعادل تقريباً 30% من ارتفاع شاشة الهاتف (h-[30vh] min-h-[180px] max-h-[320px])
 * - مستقلة عن بقية الواجهة
 * - تدعم رفع صورة واحدة أو صورتين مع إمكانية تفعيل صورة واحدة أو الصورتين معاً
 * - خيار إضافة رابط عند الضغط على كل صورة (يفتح الرابط بأمان في لسان تبويب جديد)
 * - التحكم في ترتيب العرض ومدة كل صورة بالثواني
 * - حفظ حقيقي في التخزين السحابي وانعكاس فوري على الواجهة
 */
export function HeroBannerArea({
  uiConfig,
  canManageAdmin,
  onOpenAdminBannerSettings,
}: HeroBannerAreaProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});

  const activeBannerItems = useMemo<BannerItem[]>(() => {
    const img1Url = (uiConfig.bannerImage1Url || '').trim();
    const img2Url = (uiConfig.bannerImage2Url || '').trim();
    const link1 = (uiConfig.bannerImage1Link || '').trim();
    const link2 = (uiConfig.bannerImage2Link || '').trim();

    const isSlot1Eligible =
      uiConfig.bannerSlot1Active !== false &&
      img1Url.length > 0 &&
      !failedUrls[img1Url];

    const isSlot2Eligible =
      uiConfig.bannerSlot2Active !== false &&
      img2Url.length > 0 &&
      !failedUrls[img2Url];

    const item1: BannerItem = { slot: 1, url: img1Url, link: link1 };
    const item2: BannerItem = { slot: 2, url: img2Url, link: link2 };

    const candidates =
      uiConfig.bannerOrder === '2_then_1' ? [item2, item1] : [item1, item2];

    return candidates.filter((item) =>
      item.slot === 1 ? isSlot1Eligible : isSlot2Eligible
    );
  }, [
    uiConfig.bannerImage1Url,
    uiConfig.bannerImage2Url,
    uiConfig.bannerImage1Link,
    uiConfig.bannerImage2Link,
    uiConfig.bannerSlot1Active,
    uiConfig.bannerSlot2Active,
    uiConfig.bannerOrder,
    failedUrls,
  ]);

  useEffect(() => {
    setActiveIndex(0);
  }, [activeBannerItems.length, uiConfig.bannerOrder]);

  useEffect(() => {
    if (activeBannerItems.length <= 1) return;
    const durationMs =
      Math.max(2, Number(uiConfig.bannerIntervalSeconds) || 6) * 1000;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % activeBannerItems.length);
    }, durationMs);
    return () => window.clearInterval(timer);
  }, [activeBannerItems.length, uiConfig.bannerIntervalSeconds]);

  if (!uiConfig.bannerEnabled) {
    return null;
  }

  const currentItem =
    activeBannerItems[activeIndex] || activeBannerItems[0] || null;

  if (!currentItem) {
    if (!canManageAdmin) {
      return null;
    }
    return (
      <section
        aria-label="المساحة الإعلانية العلوية"
        className="w-full bg-stone-100 border-b border-stone-200 overflow-hidden"
      >
        <div className="max-w-5xl mx-auto w-full h-[30vh] min-h-[180px] max-h-[320px] flex flex-col items-center justify-center p-4 text-center text-stone-500 bg-stone-200/60">
          <ImageIcon className="w-7 h-7 text-stone-400 mb-2 shrink-0" />
          <p className="text-xs sm:text-sm font-medium text-stone-700">
            المساحة الإعلانية العلوية (مفعلة من الإدارة — لا توجد صور نشطة حالياً)
          </p>
          <button
            type="button"
            onClick={onOpenAdminBannerSettings}
            className="mt-2.5 min-h-[38px] px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>رفع أو تفعيل صور الإعلانات (صورة أو صورتين)</span>
          </button>
        </div>
      </section>
    );
  }

  const hasLink = Boolean(currentItem.link && currentItem.link.trim().length > 0);

  const renderImageContent = () => (
    <>
      <img
        key={currentItem.url}
        src={currentItem.url}
        alt={`إعلان المنصة العلوي (${currentItem.slot})`}
        referrerPolicy="no-referrer"
        onError={() =>
          setFailedUrls((prev) => ({ ...prev, [currentItem.url]: true }))
        }
        className="w-full h-full object-cover object-center select-none block"
      />

      {/* إذا كان هناك رابط مخصص، اعرض مؤشر الرابط الصغير */}
      {hasLink && (
        <div
          dir="rtl"
          className="absolute top-2.5 right-2.5 px-2 py-1 rounded-lg bg-black/60 text-white text-[11px] font-medium backdrop-blur-xs flex items-center gap-1 opacity-90 transition-opacity"
        >
          <ExternalLink className="w-3 h-3 text-amber-400" />
          <span>انقر لفتح الرابط</span>
        </div>
      )}

      {/* مؤشرات التنقل بين الصورتين عند تفعيل الاثنتين معاً */}
      {activeBannerItems.length > 1 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-xs z-10">
          {activeBannerItems.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveIndex(idx);
              }}
              aria-label={`عرض الصورة الإعلانية ${idx + 1}`}
              className={`h-2 rounded-full transition-all ${
                idx === activeIndex
                  ? 'w-5 bg-white'
                  : 'w-2 bg-white/60 hover:bg-white/90'
              }`}
            />
          ))}
        </div>
      )}
    </>
  );

  return (
    <section
      aria-label="المساحة الإعلانية العلوية"
      className="w-full bg-stone-100 border-b border-stone-200 overflow-hidden"
    >
      <div className="max-w-5xl mx-auto w-full h-[30vh] min-h-[180px] max-h-[320px] relative overflow-hidden bg-stone-200/70">
        {hasLink ? (
          <a
            href={currentItem.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="الانتقال إلى الرابط الإعلاني"
            className="block w-full h-full relative cursor-pointer"
          >
            {renderImageContent()}
          </a>
        ) : (
          <div className="w-full h-full relative">
            {renderImageContent()}
          </div>
        )}
      </div>
    </section>
  );
}
