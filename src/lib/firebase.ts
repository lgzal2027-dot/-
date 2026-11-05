import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App using provisioned configuration
export const app = initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore with the provisioned named database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Authentication and configure Arabic language & secure local session persistence
export const auth = getAuth(app);
auth.languageCode = 'ar';
void setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error('Failed to set auth persistence:', err);
});

// Configure official Google Sign-In Provider (supports choosing Google account on mobile/desktop)
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Initialize Cloud Storage for ad photos and payment receipts
export const storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Standardized Firestore error handler required for diagnosing security rule and permission issues.
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Translates Firebase Authentication error codes into clear, actionable Arabic messages.
 */
export function translateFirebaseAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  const message = error instanceof Error ? error.message : String(error);

  switch (code) {
    case 'auth/email-already-in-use':
      return 'هذا البريد الإلكتروني مسجل مسبقاً. يرجى تسجيل الدخول به أو استخدام خيار استعادة كلمة المرور، أو تسجيل الدخول عبر Google إذا كنت قد أنشأت حسابك بواسطته.';
    case 'auth/invalid-email':
      return 'صيغة البريد الإلكتروني غير صحيحة. يرجى التحقق من كتابة البريد بشكل سليم.';
    case 'auth/user-not-found':
      return 'لا يوجد حساب مسجل بهذا البريد الإلكتروني.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة. إذا كنت قد سجلت عبر Google سابقاً، يمكنك الدخول عبر زر Google أو استخدام "نسيت كلمة المرور".';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة جداً. يجب أن تتكون من 6 أحرف أو أرقام على الأقل.';
    case 'auth/too-many-requests':
      return 'تم إجراء محاولات كثيرة متتالية. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.';
    case 'auth/user-disabled':
      return 'تم إيقاف هذا الحساب من قِبل الإدارة.';
    case 'auth/popup-closed-by-user':
      return 'تم إغلاق نافذة تسجيل الدخول قبل استكمال العملية.';
    case 'auth/popup-blocked':
      return 'قام المتصفح بحظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع والمحاولة مجدداً.';
    case 'auth/account-exists-with-different-credential':
      return 'هذا البريد الإلكتروني مرتبط بطريقة دخول أخرى لنفس الحساب. يرجى تسجيل الدخول بالطريقة السابقة لربط الطريقتين معاً.';
    case 'auth/credential-already-in-use':
      return 'وسيلة الدخول هذه مرتبطة بحساب آخر بالفعل.';
    case 'auth/provider-already-linked':
      return 'طريقة الدخول هذه مرتبطة بحسابك بالفعل.';
    case 'auth/requires-recent-login':
      return 'لأسباب أمنية، يرجى تسجيل الخروج ثم إعادة تسجيل الدخول لتنفيذ هذا الإجراء الحساس.';
    case 'auth/operation-not-allowed':
      return 'مزود الدخول بالبريد وكلمة المرور يحتاج إلى تفعيل من لوحة تحكم Firebase (Authentication > Sign-in method > Email/Password).';
    case 'auth/network-request-failed':
      return 'تعذر الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.';
    default:
      return message || 'حدث خطأ أثناء عملية المصادقة. يرجى المحاولة مرة أخرى.';
  }
}

/**
 * Validates live connection to Firestore server on boot.
 */
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return false;
    }
    return true;
  }
}

// Run boot connection validation
void testConnection();
