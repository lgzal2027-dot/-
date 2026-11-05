import React, { useMemo } from 'react';
import { UiConfigSettings } from '../types/domain';

interface NewsTickerBarProps {
  uiConfig: UiConfigSettings;
}

/**
 * الشريط الإخباري:
 * - يوضع مباشرة تحت المساحة الإعلانية
 * - حركة النص مستمرة دون فراغات واضحة ودون توقف أثناء التمرير
 * - يدعم اتجاه الحركة (من اليسار إلى اليمين LTR افتراضياً، أو من اليمين إلى اليسار RTL)
 * - يدعم النصوص العربية الطويلة
 * - حجم الخط ولونه ولون الخلفية وسرعته قابلة للتحكم المستقل من لوحة الإدارة
 * - معزول عمودياً بحيث لا يؤثر تغيير حجم الخط أو السرعة على بقية الواجهة
 */
export function NewsTickerBar({ uiConfig }: NewsTickerBarProps) {
  const cleanText = (uiConfig.tickerText || '').trim();

  // Create seamless repeated text chunk so even very short or long Arabic texts fill wide screens with zero gaps
  const repeatedChunk = useMemo(() => {
    if (!cleanText) return '';
    // Repeat at least 4 times per chunk
    return Array.from({ length: 4 })
      .map(() => cleanText)
      .join('   •   ');
  }, [cleanText]);

  if (!uiConfig.tickerEnabled || !cleanText) {
    return null;
  }

  const fontSizeClass =
    uiConfig.tickerFontSize === 'lg'
      ? 'text-base sm:text-lg'
      : uiConfig.tickerFontSize === 'base'
      ? 'text-sm sm:text-base'
      : 'text-xs sm:text-sm';

  const durationSeconds = Math.max(
    5,
    Math.min(180, Number(uiConfig.tickerSpeedSeconds) || 28)
  );

  const isRtlDirection = uiConfig.tickerDirection === 'rtl';

  return (
    <section
      aria-label="الشريط الإخباري المتحرك"
      style={{
        backgroundColor: uiConfig.tickerBgColor || '#1c1917',
        color: uiConfig.tickerTextColor || '#ffffff',
      }}
      className="w-full overflow-hidden border-b border-stone-200 select-none py-2 min-h-[36px] max-h-[52px] flex items-center"
    >
      <div dir="ltr" className="w-full overflow-hidden flex items-center">
        <div
          className={`${
            isRtlDirection ? 'ticker-track-rtl' : 'ticker-track-ltr'
          } font-medium ${fontSizeClass}`}
          style={{
            animationDuration: `${durationSeconds}s`,
          }}
        >
          {/* الكتلة الأولى الأساسية */}
          <span
            dir="rtl"
            className="inline-block whitespace-nowrap px-4 shrink-0"
          >
            {repeatedChunk}   •   
          </span>

          {/* الكتلة الثانية المتطابقة تماماً لضمان الحركة الحلقية المستمرة دون أي فراغات */}
          <span
            dir="rtl"
            aria-hidden="true"
            className="inline-block whitespace-nowrap px-4 shrink-0"
          >
            {repeatedChunk}   •   
          </span>
        </div>
      </div>
    </section>
  );
}
