# وثيقة مواصفات الأمان وحماية البيانات (Security Specification - Phase 0)

## 1. ثوابت سلامة البيانات (Data Invariants)
1. **عزل البيانات الشخصية (PII Isolation):**
   - بيانات المستخدم الشخصية الحساسة (`email`, `phone`) معزولة في المجموعة `/user_private/{userId}` ولا يمكن قراءتها إلا من قِبل صاحب الحساب نفسه أو المشرف/المدير الرئيسي.
   - وسائل التواصل الخاصة بالإعلان (`whatsapp`, `phone`, `telegram`, `email`) معزولة في `/ad_contacts/{adId}` ومنفصلة تماماً عن وثيقة الإعلان العامة `/ads/{adId}`، ولا تُقرأ إلا لصاحب الإعلان أو المشرفين أو المستخدم الذي يملك تصريح وصول فعّال في `/contact_access/{adId}_{userId}`.
2. **الفصل الصارم بين الصلاحيات (Three-Tier RBAC):**
   - **المستخدم العادي (`user`):** يدير ملفه الشخصي وإعلاناته وصوره ووسائل تواصله وطلبات الدفع الخاصة به فقط، ولا يمكنه ترقية صلاحيته بنفسه (`role` مقيد بـ `'user'` عند الإنشاء، باستثناء البريد الموثق للمدير الرئيسي المؤسس).
   - **المشرف (`moderator`):** مُعرّف عبر وثيقة موثوقة في `/staff_roles/{uid}` بقيمة `role == 'moderator'`؛ يمتلك صلاحية مراجعة الإعلانات والصور والمدفوعات وتفعيل تصاريح الوصول لبيانات التواصل، دون صلاحية تعديل الإعدادات الإدارية العليا أو تعيين مشرفين آخرين.
   - **المدير الرئيسي (`super_admin`):** مُعرّف عبر البريد الموثق للمالك الرئيسي (`lgzal2027@gmail.com`) أو وثيقة `/staff_roles/{uid}` بقيمة `role == 'super_admin'`؛ يمتلك صلاحية إدارة المشرفين (`/staff_roles`) وإعدادات المنصة العامة (`/admin_settings`) وكافة العمليات الإشرافية.
3. **النزاهة الزمنية ومنع الحقول الخفية (Temporal & Schema Integrity):**
   - جميع حقول التوقيت (`createdAt`, `updatedAt`) يجب أن تطابق `request.time`.
   - جميع عمليات الإنشاء والتحديث تخضع لدوال تحقق صارمة `isValid[Entity]` مع فحص `hasAll` و`hasOnly` وأحجام النصوص.

---

## 2. حمولات الاختبار الهجومية (The "Dirty Dozen" Payloads)
1. **Payload 1 (Self-Role Escalation on Create):** محاولة مستخدم عادي إنشاء حساب في `/users/{uid}` مع تمرير `role: "super_admin"`.
2. **Payload 2 (Role Tampering on Update):** محاولة مستخدم عادي تعديل حقل `role` أو `accountStatus` في وثيقته `/users/{uid}`.
3. **Payload 3 (Cross-User PII Read):** محاولة مستخدم مسجل قراءة `/user_private/{otherUserId}` لمستخدم آخر.
4. **Payload 4 (Unauthorized Ad Contact Read):** محاولة زائر أو مستخدم بدون تصريح دفع قراءة `/ad_contacts/{adId}`.
5. **Payload 5 (Ad Contact Scraping via List):** محاولة تنفيذ استعلام `list` على `/ad_contacts`.
6. **Payload 6 (Underage Ad Creation):** محاولة إنشاء إعلان في `/ads/{adId}` بعمر أقل من 18 سنة (`age: 16`).
7. **Payload 7 (Ad Status Self-Approval):** محاولة مستخدم عادي نشر إعلان مباشرة بحالة `status: "approved"` أو تعديل حالته إلى `approved`.
8. **Payload 8 (Shadow Field Injection):** إرسال حقل غير مصرح به مثل `isVerified: true` داخل وثيقة `/ads/{adId}`.
9. **Payload 9 (Fake Payment Approval):** محاولة مستخدم عادي إنشاء سجل دفع في `/payments/{paymentId}` بحالة `status: "approved"`.
10. **Payload 10 (Self-Granted Contact Access):** محاولة مستخدم عادي إنشاء وثيقة في `/contact_access/{accessId}` لنفسه بدون صلاحية مشرف.
11. **Payload 11 (Moderator Escalating to Super Admin Settings):** محاولة مشرف (`moderator`) تعديل `/admin_settings/general` أو إضافة مشرف في `/staff_roles`.
12. **Payload 12 (Spoofed Timestamp / Oversized ID):** محاولة إرسال معرف وثيقة يتجاوز 128 حرفاً أو يحتوي رموزاً غير صالحة أو تمرير `createdAt` لا يطابق `request.time`.
