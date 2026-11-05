import React, { useState } from 'react';
import { Headphones, Phone, Mail, MessageCircle, Send, X } from 'lucide-react';
import { UiConfigSettings } from '../types/domain';
import { CustomerServiceModal } from './CustomerServiceModal';

interface CustomerServiceFooterProps {
  uiConfig: UiConfigSettings;
}

export function CustomerServiceFooter({ uiConfig }: CustomerServiceFooterProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <footer className="w-full border-t border-stone-200 bg-white/90 py-4 px-4 mt-8">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        <span className="text-[11px] text-stone-500">
          منصة خطابة الزواج المسيار
        </span>

        {/* زر خدمة العملاء الصغير وغير المزعج */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="min-h-[36px] px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
        >
          <Headphones className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>خدمة العملاء</span>
        </button>
      </div>

      <CustomerServiceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        uiConfig={uiConfig}
      />
    </footer>
  );
}
