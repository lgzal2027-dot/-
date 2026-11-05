import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Headphones,
  Send,
  MessageCircle,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  ShieldAlert,
  CreditCard,
  LogIn,
  HelpCircle,
  MessageSquare,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  SUPPORT_TICKET_STATUS_LABELS_AR,
  SUPPORT_TICKET_TYPE_LABELS_AR,
  SupportTicket,
  SupportTicketStatus,
  SupportTicketType,
  UiConfigSettings,
} from '../types/domain';
import {
  addReplyToSupportTicket,
  createSupportTicket,
  subscribeToUserSupportTickets,
} from '../services/supportService';

interface CustomerServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  uiConfig: UiConfigSettings;
  defaultType?: SupportTicketType;
  defaultSubject?: string;
  defaultDetails?: string;
}

const TICKET_TYPE_CONFIG: {
  type: SupportTicketType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  {
    type: 'inquiry',
    label: 'استفسار عام',
    description: 'سؤال حول شروط الموقع، الخدمات، أو طريقة الاستخدام',
    icon: HelpCircle,
    color: 'text-sky-700 bg-sky-50 border-sky-200',
  },
  {
    type: 'complaint',
    label: 'شكوى واقتراح',
    description: 'ملاحظة على الخدمة أو اقتراح لتطوير التطبيق',
    icon: MessageSquare,
    color: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  {
    type: 'report_ad',
    label: 'الإبلاغ عن إعلان',
    description: 'إعلان مخالف للشريعة، غير جاد، أو يحتوي على معلومات غير لائقة',
    icon: ShieldAlert,
    color: 'text-rose-700 bg-rose-50 border-rose-200',
  },
  {
    type: 'report_user',
    label: 'الإبلاغ عن حساب',
    description: 'مستخدم يسيء استخدام المنصة أو يخالف ضوابط التواصل',
    icon: User,
    color: 'text-purple-700 bg-purple-50 border-purple-200',
  },
  {
    type: 'auth_issue',
    label: 'مشكلة تسجيل الدخول',
    description: 'تعذر الدخول للحساب أو التحقق من البريد الإلكتروني',
    icon: LogIn,
    color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  },
  {
    type: 'payment_issue',
    label: 'مشكلة في الدفع',
    description: 'استفسار عن رسوم فتح التواصل أو تعثر عملية دفع',
    icon: CreditCard,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
];

export function CustomerServiceModal({
  isOpen,
  onClose,
  uiConfig,
  defaultType = 'inquiry',
  defaultSubject = '',
  defaultDetails = '',
}: CustomerServiceModalProps) {
  const { firebaseUser, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<'channels' | 'new_ticket' | 'my_tickets'>('channels');

  // Form State
  const [ticketType, setTicketType] = useState<SupportTicketType>(defaultType);
  const [subject, setSubject] = useState(defaultSubject);
  const [details, setDetails] = useState(defaultDetails);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [attachmentBase64, setAttachmentBase64] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);

  // My Tickets State
  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [followUpMessage, setFollowUpMessage] = useState('');
  const [isSendingFollowUp, setIsSendingFollowUp] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to user tickets if logged in
  useEffect(() => {
    if (!firebaseUser?.uid) {
      setMyTickets([]);
      return;
    }
    const unsub = subscribeToUserSupportTickets(firebaseUser.uid, (tickets) => {
      setMyTickets(tickets);
    });
    return () => unsub();
  }, [firebaseUser]);

  if (!isOpen) return null;

  const hasDirectChannels = Boolean(
    uiConfig.supportWhatsapp?.trim() ||
      uiConfig.supportPhone?.trim() ||
      uiConfig.supportTelegram?.trim() ||
      uiConfig.supportEmail?.trim()
  );

  const cleanWhatsappNumber = (uiConfig.supportWhatsapp || '').replace(/[^0-9]/g, '');

  // Compress uploaded image to keep under 250KB
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSubmitError('يرجى اختيار ملف صورة صالح (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setSubmitError('حجم الصورة كبير جداً، الحد الأقصى المسموح به هو 8 ميغابايت.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          setAttachmentBase64(dataUrl);
          setSubmitError(null);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const trimmedSubject = subject.trim();
    const trimmedDetails = details.trim();

    if (trimmedSubject.length < 2) {
      setSubmitError('يرجى إدخال عنوان واضح للرسالة (حرفين على الأقل).');
      return;
    }

    if (trimmedDetails.length < 5) {
      setSubmitError('يرجى كتابة تفاصيل المشكلة أو الطلب بشكل أوضح (5 أحرف على الأقل).');
      return;
    }

    // Determine contact info
    const userId = firebaseUser?.uid || 'guest';
    const userDisplayName =
      profile?.displayName ||
      firebaseUser?.displayName ||
      guestName.trim() ||
      'زائر';

    const userEmail =
      firebaseUser?.email ||
      guestEmail.trim();

    if (!userEmail && !guestPhone.trim()) {
      setSubmitError('يرجى إدخال البريد الإلكتروني أو رقم الهاتف لنتمكن من التواصل معك والرد على طلبك.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ticketId = await createSupportTicket({
        userId,
        userDisplayName,
        userEmail: userEmail || 'guest@misyar.local',
        userPhone: guestPhone.trim(),
        type: ticketType,
        subject: trimmedSubject,
        details: trimmedDetails,
        attachmentUrl: attachmentBase64 || '',
      });

      setSubmittedTicketId(ticketId);
      // Reset form
      setSubject('');
      setDetails('');
      setAttachmentBase64('');
    } catch (err) {
      console.error('Failed to submit support ticket:', err);
      setSubmitError('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendFollowUp = async (ticket: SupportTicket) => {
    if (!followUpMessage.trim() || !firebaseUser) return;
    setIsSendingFollowUp(true);
    try {
      await addReplyToSupportTicket(ticket.ticketId, ticket, {
        senderUid: firebaseUser.uid,
        senderName: profile?.displayName || firebaseUser.displayName || 'أنا',
        senderRole: 'user',
        message: followUpMessage.trim(),
      });
      setFollowUpMessage('');
    } catch (err) {
      console.error('Failed to add follow up message:', err);
    } finally {
      setIsSendingFollowUp(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl border border-stone-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-stone-100 bg-stone-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900">
                خدمة العملاء والدعم الفني
              </h3>
              <p className="text-[11px] text-stone-500">
                فريق الدعم متاح للرد على استفساراتكم وملاحظاتكم
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-stone-500 hover:bg-stone-200/60 inline-flex items-center justify-center transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-stone-200 bg-white px-2 pt-1 gap-1 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('channels');
              setSubmittedTicketId(null);
            }}
            className={`flex-1 min-w-[100px] py-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'channels'
                ? 'border-amber-700 text-amber-800 bg-amber-50/50'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>التواصل المباشر</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('new_ticket');
              setSubmittedTicketId(null);
            }}
            className={`flex-1 min-w-[100px] py-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'new_ticket'
                ? 'border-amber-700 text-amber-800 bg-amber-50/50'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>إرسال طلب / تذكرة</span>
          </button>

          {firebaseUser && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('my_tickets');
                setSubmittedTicketId(null);
              }}
              className={`flex-1 min-w-[100px] py-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'my_tickets'
                  ? 'border-amber-700 text-amber-800 bg-amber-50/50'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>طلباتي السابقة</span>
              {myTickets.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-700 text-white text-[10px] font-bold flex items-center justify-center">
                  {myTickets.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: قنوات التواصل المباشر */}
          {activeTab === 'channels' && (
            <div className="space-y-3.5">
              {uiConfig.supportNote && (
                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/60 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>{uiConfig.supportNote}</span>
                </div>
              )}

              {hasDirectChannels ? (
                <div className="space-y-2.5">
                  {cleanWhatsappNumber && (
                    <a
                      href={`https://wa.me/${cleanWhatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs sm:text-sm font-semibold flex items-center justify-between transition-colors shadow-xs"
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                          <MessageCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold">واتساب خدمة العملاء المباشر</p>
                          <p className="text-[11px] text-emerald-700">رد سريع ومباشر على المحادثات</p>
                        </div>
                      </span>
                      <span dir="ltr" className="font-bold">{uiConfig.supportWhatsapp}</span>
                    </a>
                  )}

                  {uiConfig.supportPhone?.trim() && (
                    <a
                      href={`tel:${uiConfig.supportPhone.trim()}`}
                      className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-800 border border-stone-200 text-xs sm:text-sm font-semibold flex items-center justify-between transition-colors shadow-xs"
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-stone-800 text-white flex items-center justify-center">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold">اتصال هاتفي مباشر</p>
                          <p className="text-[11px] text-stone-500">للحالات العاجلة والاستفسارات</p>
                        </div>
                      </span>
                      <span dir="ltr" className="font-bold">{uiConfig.supportPhone}</span>
                    </a>
                  )}

                  {uiConfig.supportTelegram?.trim() && (
                    <a
                      href={
                        uiConfig.supportTelegram.startsWith('http')
                          ? uiConfig.supportTelegram
                          : `https://t.me/${uiConfig.supportTelegram.replace('@', '')}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 text-xs sm:text-sm font-semibold flex items-center justify-between transition-colors shadow-xs"
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center">
                          <Send className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold">تليجرام الدعم الفني</p>
                          <p className="text-[11px] text-sky-700">محادثة فورية وسرية</p>
                        </div>
                      </span>
                      <span dir="ltr" className="font-bold">{uiConfig.supportTelegram}</span>
                    </a>
                  )}

                  {uiConfig.supportEmail?.trim() && (
                    <a
                      href={`mailto:${uiConfig.supportEmail.trim()}`}
                      className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-800 border border-stone-200 text-xs sm:text-sm font-semibold flex items-center justify-between transition-colors shadow-xs"
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-stone-700 text-white flex items-center justify-center">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold">البريد الإلكتروني الرسمي</p>
                          <p className="text-[11px] text-stone-500">للمراسلات الرسمية والشكاوى</p>
                        </div>
                      </span>
                      <span dir="ltr" className="truncate max-w-[170px] text-xs">
                        {uiConfig.supportEmail}
                      </span>
                    </a>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-2">
                  <p className="text-xs text-stone-700 font-semibold">
                    قنوات الاتصال المباشر يتم تحديثها بواسطة الإدارة.
                  </p>
                  <p className="text-[11px] text-stone-500">
                    يمكنك إرسال طلبك أو بلاغك مباشرة وسيقوم فريق الدعم بالرد عليك.
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('new_ticket')}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 shadow-xs transition-all"
                >
                  <Send className="w-4 h-4 text-amber-400" />
                  <span>إرسال تذكرة / بلاغ جديد للدعم الفني</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: نموذج إرسال تذكرة جديدة */}
          {activeTab === 'new_ticket' && (
            <div>
              {submittedTicketId ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-stone-900">
                    تم استلام طلبك بنجاح!
                  </h4>
                  <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
                    تم حفظ رسالتك في قاعدة البيانات برقم مرجعي:{' '}
                    <span className="font-mono font-bold text-amber-800">{submittedTicketId}</span>.
                    سيتم مراجعتها من قِبل الإدارة والتواصل معك في أقرب وقت.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                    {firebaseUser && (
                      <button
                        type="button"
                        onClick={() => {
                          setSubmittedTicketId(null);
                          setActiveTab('my_tickets');
                        }}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold"
                      >
                        متابعة الردود في طلباتي
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSubmittedTicketId(null)}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-medium"
                    >
                      إرسال طلب آخر
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleTicketSubmit} className="space-y-4">
                  {submitError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* 1. نوع الطلب */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1.5">
                      نوع الطلب أو الرسالة <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {TICKET_TYPE_CONFIG.map((item) => {
                        const Icon = item.icon;
                        const isSelected = ticketType === item.type;
                        return (
                          <button
                            key={item.type}
                            type="button"
                            onClick={() => setTicketType(item.type)}
                            className={`p-2.5 rounded-xl border text-right transition-all flex flex-col gap-1 ${
                              isSelected
                                ? 'border-amber-700 bg-amber-50/80 shadow-xs'
                                : 'border-stone-200 bg-white hover:bg-stone-50'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </span>
                              <span className="text-xs font-bold text-stone-900 truncate">
                                {item.label}
                              </span>
                            </div>
                            <span className="text-[10px] text-stone-500 line-clamp-1">
                              {item.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. عنوان الرسالة */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">
                      عنوان الرسالة <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={150}
                      required
                      placeholder="مثال: استفسار عن تفعيل الإعلان أو إبلاغ عن محتوى"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>

                  {/* 3. تفاصيل المشكلة أو الطلب */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">
                      تفاصيل المشكلة أو البلاغ <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      maxLength={3000}
                      required
                      placeholder="يرجى كتابة تفاصيل المشكلة، أو رقم الإعلان محل البلاغ، أو وسيلة الدفع المستخدمة..."
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white resize-y leading-relaxed"
                    />
                    <div className="text-[10px] text-stone-400 text-left mt-0.5">
                      {details.length} / 3000
                    </div>
                  </div>

                  {/* 4. إرفاق صورة عند الحاجة */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">
                      إرفاق لقطة شاشة أو صورة توضيحية (اختياري)
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />

                    {attachmentBase64 ? (
                      <div className="relative rounded-xl border border-stone-200 bg-stone-50 p-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <img
                            src={attachmentBase64}
                            alt="المرفق"
                            className="w-12 h-12 object-cover rounded-lg border border-stone-300 shrink-0"
                          />
                          <div className="text-xs text-stone-700">
                            <p className="font-semibold">تم إرفاق الصورة بنجاح</p>
                            <p className="text-[10px] text-emerald-700">جاهزة للإرسال مع الطلب</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAttachmentBase64('');
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-medium"
                        >
                          إزالة الصورة
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2.5 px-3 rounded-xl border border-dashed border-stone-300 hover:border-amber-500 bg-stone-50/60 hover:bg-amber-50/40 text-stone-600 text-xs font-medium inline-flex items-center justify-center gap-2 transition-colors"
                      >
                        <ImageIcon className="w-4 h-4 text-amber-700" />
                        <span>اختيار صورة توضيحية من الجهاز</span>
                      </button>
                    )}
                  </div>

                  {/* 5. بيانات التواصل إذا كان زائراً غير مسجل */}
                  {!firebaseUser ? (
                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5">
                      <p className="text-xs font-bold text-stone-800">
                        بيانات التواصل للرد عليك (للزوار غير المسجلين):
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <input
                            type="text"
                            placeholder="الاسم المستعار"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            className="w-full rounded-lg border border-stone-300 px-2.5 py-2 text-xs bg-white"
                          />
                        </div>
                        <div>
                          <input
                            type="email"
                            dir="ltr"
                            placeholder="البريد الإلكتروني *"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            className="w-full rounded-lg border border-stone-300 px-2.5 py-2 text-xs bg-white text-right"
                          />
                        </div>
                        <div>
                          <input
                            type="tel"
                            dir="ltr"
                            placeholder="رقم الهاتف أو واتساب"
                            value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                            className="w-full rounded-lg border border-stone-300 px-2.5 py-2 text-xs bg-white text-right"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>سيتم ربط الطلب بحسابك تلقائياً ({firebaseUser.email})</span>
                      </span>
                      <span className="text-[11px] font-bold">{profile?.displayName || 'المعلن'}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'جاري إرسال الطلب...' : 'إرسال الطلب إلى خدمة العملاء'}</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: طلباتي السابقة ومتابعة الردود */}
          {activeTab === 'my_tickets' && (
            <div className="space-y-3">
              {myTickets.length === 0 ? (
                <div className="py-8 text-center space-y-2 text-stone-500">
                  <FileText className="w-8 h-8 mx-auto text-stone-300" />
                  <p className="text-xs font-semibold">لم تقم بإرسال أي تذاكر دعم سابقة حتى الآن.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('new_ticket')}
                    className="text-xs text-amber-800 font-bold hover:underline"
                  >
                    إرسال طلبك الأول الآن
                  </button>
                </div>
              ) : (
                myTickets.map((ticket) => {
                  const isExpanded = expandedTicketId === ticket.ticketId;
                  const statusLabel =
                    SUPPORT_TICKET_STATUS_LABELS_AR[ticket.status] || ticket.status;
                  const typeLabel =
                    SUPPORT_TICKET_TYPE_LABELS_AR[ticket.type] || ticket.type;

                  const statusBadgeClass =
                    ticket.status === 'new'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : ticket.status === 'in_progress'
                      ? 'bg-sky-100 text-sky-800 border-sky-300'
                      : ticket.status === 'resolved'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-stone-100 text-stone-700 border-stone-300';

                  return (
                    <div
                      key={ticket.ticketId}
                      className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-2xs"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedTicketId(isExpanded ? null : ticket.ticketId)
                        }
                        className="w-full p-3 text-right flex items-center justify-between gap-2 hover:bg-stone-50/70 transition-colors"
                      >
                        <div className="space-y-1 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusBadgeClass}`}
                            >
                              {statusLabel}
                            </span>
                            <span className="text-[11px] font-semibold text-stone-500">
                              {typeLabel}
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-stone-900 truncate">
                            {ticket.subject}
                          </h5>
                        </div>
                        <div className="shrink-0 text-stone-400">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-3.5 border-t border-stone-100 bg-stone-50/50 space-y-3 text-xs">
                          <div>
                            <p className="text-[11px] font-bold text-stone-700 mb-1">تفاصيل رسالتك:</p>
                            <p className="text-stone-800 leading-relaxed bg-white p-2.5 rounded-lg border border-stone-200">
                              {ticket.details}
                            </p>
                          </div>

                          {ticket.attachmentUrl && (
                            <div>
                              <p className="text-[11px] font-bold text-stone-700 mb-1">المرفق التوضيحي:</p>
                              <img
                                src={ticket.attachmentUrl}
                                alt="المرفق"
                                className="max-h-48 rounded-lg border border-stone-300 object-contain bg-white p-1"
                              />
                            </div>
                          )}

                          {/* سجل الردود */}
                          <div className="space-y-2 pt-1">
                            <p className="text-[11px] font-bold text-stone-800 flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                              <span>سجل الردود والمتابعة ({ticket.replies?.length || 0}):</span>
                            </p>

                            {(!ticket.replies || ticket.replies.length === 0) ? (
                              <p className="text-[11px] text-stone-500 italic p-2 rounded-lg bg-stone-100">
                                الطلب قيد المراجعة لدى فريق الإدارة، سيصلك الرد هنا قريباً.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {ticket.replies.map((reply) => {
                                  const isStaff =
                                    reply.senderRole === 'moderator' ||
                                    reply.senderRole === 'super_admin';
                                  return (
                                    <div
                                      key={reply.replyId}
                                      className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                                        isStaff
                                          ? 'bg-amber-50/70 border-amber-200 mr-2 text-stone-900'
                                          : 'bg-white border-stone-200 ml-2 text-stone-800'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between text-[10px]">
                                        <span className="font-bold flex items-center gap-1">
                                          {isStaff ? (
                                            <span className="text-amber-800 font-extrabold">
                                              🛡️ إدارة خدمة العملاء ({reply.senderName})
                                            </span>
                                          ) : (
                                            <span className="text-stone-600">أنت ({reply.senderName})</span>
                                          )}
                                        </span>
                                      </div>
                                      <p className="leading-relaxed whitespace-pre-wrap">{reply.message}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* كتابة رد متابعة إذا لم يكن الطلب مغلقاً */}
                            {ticket.status !== 'closed' ? (
                              <div className="pt-2 flex items-center gap-1.5">
                                <input
                                  type="text"
                                  placeholder="اكتب رد متابعة أو توضيح إضافي..."
                                  value={followUpMessage}
                                  onChange={(e) => setFollowUpMessage(e.target.value)}
                                  className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-xs bg-white text-stone-900"
                                />
                                <button
                                  type="button"
                                  disabled={!followUpMessage.trim() || isSendingFollowUp}
                                  onClick={() => handleSendFollowUp(ticket)}
                                  className="px-3 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold shrink-0 disabled:opacity-50"
                                >
                                  إرسال
                                </button>
                              </div>
                            ) : (
                              <div className="p-2 rounded-lg bg-stone-200/60 text-stone-600 text-[11px] text-center font-medium">
                                تم إغلاق هذا الطلب بعد المعالجة.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
