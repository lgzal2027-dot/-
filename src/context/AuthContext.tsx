import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AuthCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import {
  auth,
  googleProvider,
  translateFirebaseAuthError,
} from '../lib/firebase';
import {
  getRolePermissions,
  RolePermissions,
  UserGender,
  UserPrivate,
  UserProfile,
  UserRole,
} from '../types/domain';
import {
  ensureUserProfile,
  updateOwnUserPrivate,
  updateOwnUserProfile,
  verifyAdminAccessFromServer,
} from '../services/userService';

export interface InitialRegistrationInput {
  displayName: string;
  gender: UserGender;
  countryCode: string;
  cityName: string;
  phone: string;
}

export interface EmailRegistrationInput extends InitialRegistrationInput {
  email: string;
  password: string;
  confirmPassword: string;
}

interface AuthContextValue {
  firebaseUser: User | null;
  isEmailVerified: boolean;
  linkedProviders: string[];
  profile: UserProfile | null;
  privateInfo: UserPrivate | null;
  role: UserRole;
  permissions: RolePermissions;
  isAuthReady: boolean;
  isProcessing: boolean;
  authError: string | null;
  authNotice: string | null;
  clearAuthMessages: () => void;
  registerWithEmail: (input: EmailRegistrationInput) => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signInWithGoogle: (registrationData?: InitialRegistrationInput) => Promise<boolean>;
  resendVerificationEmail: () => Promise<boolean>;
  checkEmailVerificationNow: () => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  linkGoogleToCurrentAccount: () => Promise<boolean>;
  linkPasswordToCurrentAccount: (password: string, confirmPassword: string) => Promise<boolean>;
  verifyServerAdminAccess: () => Promise<{ allowed: boolean; reason: string | null }>;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PENDING_REG_KEY_PREFIX = 'misyar_pending_reg_';

function savePendingRegMetadata(uid: string, data: InitialRegistrationInput) {
  try {
    sessionStorage.setItem(
      `${PENDING_REG_KEY_PREFIX}${uid}`,
      JSON.stringify({
        displayName: data.displayName,
        gender: data.gender,
        countryCode: data.countryCode,
        cityName: data.cityName,
        phone: data.phone,
      })
    );
  } catch {
    // Ignore storage quota issues
  }
}

function loadPendingRegMetadata(uid: string): InitialRegistrationInput | undefined {
  try {
    const raw = sessionStorage.getItem(`${PENDING_REG_KEY_PREFIX}${uid}`);
    if (!raw) return undefined;
    return JSON.parse(raw) as InitialRegistrationInput;
  } catch {
    return undefined;
  }
}

function clearPendingRegMetadata(uid: string) {
  try {
    sessionStorage.removeItem(`${PENDING_REG_KEY_PREFIX}${uid}`);
  } catch {
    // Ignore
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [privateInfo, setPrivateInfo] = useState<UserPrivate | null>(null);
  const [role, setRole] = useState<UserRole>('user');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [pendingLinkCredential, setPendingLinkCredential] =
    useState<AuthCredential | null>(null);

  const clearAuthMessages = () => {
    setAuthError(null);
    setAuthNotice(null);
  };

  const syncUserState = async (
    user: User,
    explicitReg?: InitialRegistrationInput
  ) => {
    setIsProcessing(true);
    try {
      const verified = Boolean(user.emailVerified);
      setIsEmailVerified(verified);
      setLinkedProviders(user.providerData.map((p) => p.providerId));

      if (!verified) {
        setProfile(null);
        setPrivateInfo(null);
        setRole('user');
        return;
      }

      const pendingMeta = explicitReg || loadPendingRegMetadata(user.uid);
      const result = await ensureUserProfile(user, pendingMeta);
      if (pendingMeta) {
        clearPendingRegMetadata(user.uid);
      }

      setProfile(result.profile);
      setPrivateInfo(result.privateInfo);
      setRole(result.effectiveRole);
    } catch (err) {
      setAuthError(translateFirebaseAuthError(err));
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await syncUserState(user);
      } else {
        setIsEmailVerified(false);
        setLinkedProviders([]);
        setProfile(null);
        setPrivateInfo(null);
        setRole('user');
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const registerWithEmail = async (
    input: EmailRegistrationInput
  ): Promise<boolean> => {
    clearAuthMessages();
    const cleanEmail = input.email.trim();
    const cleanName = input.displayName.trim();

    if (cleanName.length < 2) {
      setAuthError('يرجى إدخال الاسم التعريفي أو الكنية (حرفان على الأقل).');
      return false;
    }
    if (!cleanEmail.includes('@')) {
      setAuthError('يرجى إدخال بريد إلكتروني صحيح.');
      return false;
    }
    if (input.password.length < 6) {
      setAuthError('كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل.');
      return false;
    }
    if (input.password !== input.confirmPassword) {
      setAuthError('كلمة المرور وتأكيد كلمة المرور غير متطابقين.');
      return false;
    }

    setIsProcessing(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        input.password
      );

      await updateProfile(cred.user, {
        displayName: cleanName,
      });

      savePendingRegMetadata(cred.user.uid, {
        displayName: cleanName,
        gender: input.gender,
        countryCode: input.countryCode,
        cityName: input.cityName,
        phone: input.phone.trim(),
      });

      await sendEmailVerification(cred.user);

      setFirebaseUser(cred.user);
      setIsEmailVerified(Boolean(cred.user.emailVerified));
      setLinkedProviders(cred.user.providerData.map((p) => p.providerId));
      setAuthNotice(
        `تم إنشاء الحساب وإرسال رسالة التحقق إلى (${cleanEmail}). يرجى فتح بريدك الإلكتروني والضغط على رابط التحقق، ثم الضغط على زر "تحققت من البريد الآن".`
      );
      return true;
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      if (code === 'auth/email-already-in-use') {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, cleanEmail);
          if (methods.includes('google.com') && !methods.includes('password')) {
            setAuthError(
              'هذا البريد الإلكتروني مسجل مسبقاً عبر حساب Google. يرجى تسجيل الدخول باستخدام زر Google، ويمكنك بعدها إضافة كلمة مرور لنفس الحساب من إعدادات حسابك دون إنشاء حساب مكرر.'
            );
            return false;
          }
        } catch {
          // Fallback to standard translated error
        }
      }
      setAuthError(translateFirebaseAuthError(err));
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const signInWithEmail = async (
    email: string,
    password: string
  ): Promise<boolean> => {
    clearAuthMessages();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setAuthError('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
      return false;
    }

    setIsProcessing(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);

      // If there was a pending Google credential for the same email, link it after ownership is verified
      if (pendingLinkCredential && cred.user.emailVerified) {
        try {
          await linkWithCredential(cred.user, pendingLinkCredential);
          setPendingLinkCredential(null);
          setAuthNotice('تم ربط حساب Google بحسابك الحالي بنجاح.');
        } catch {
          // Ignore if already linked
        }
      }

      await cred.user.reload();
      await syncUserState(cred.user);

      if (!cred.user.emailVerified) {
        setAuthNotice(
          'تم تسجيل الدخول، ولكن بريدك الإلكتروني غير موثق بعد. يرجى تأكيد البريد الإلكتروني لتفعيل حسابك.'
        );
      }
      return true;
    } catch (err) {
      setAuthError(translateFirebaseAuthError(err));
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const signInWithGoogle = async (
    registrationData?: InitialRegistrationInput
  ): Promise<boolean> => {
    clearAuthMessages();
    setIsProcessing(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await cred.user.reload();

      if (registrationData && cred.user.emailVerified) {
        await ensureUserProfile(cred.user, registrationData);
        await updateOwnUserProfile(cred.user.uid, {
          displayName:
            registrationData.displayName.trim() ||
            cred.user.displayName ||
            'مستخدم',
          gender: registrationData.gender,
          countryCode: registrationData.countryCode,
          cityName: registrationData.cityName,
        });
        await updateOwnUserPrivate(cred.user.uid, {
          email: cred.user.email || 'user@example.com',
          phone: registrationData.phone.trim(),
        });
      }

      await syncUserState(cred.user, registrationData);
      return true;
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      if (code === 'auth/account-exists-with-different-credential') {
        const pendingCred = GoogleAuthProvider.credentialFromError(
          err as never
        );
        if (pendingCred) {
          setPendingLinkCredential(pendingCred);
        }
        setAuthError(
          'هذا البريد مسجل مسبقاً بكلمة مرور. يرجى تسجيل الدخول بكلمة المرور أولاً ليتم ربط حساب Google بنفس الحساب تلقائياً دون تكرار.'
        );
        return false;
      }
      setAuthError(translateFirebaseAuthError(err));
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const resendVerificationEmail = async (): Promise<boolean> => {
    clearAuthMessages();
    if (!auth.currentUser) {
      setAuthError('لا توجد جلسة نشطة لإرسال رسالة التحقق.');
      return false;
    }

    setIsProcessing(true);
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        await syncUserState(auth.currentUser);
        setAuthNotice('بريدك الإلكتروني موثق بالفعل.');
        return true;
      }

      await sendEmailVerification(auth.currentUser);
      setAuthNotice(
        `تمت إعادة إرسال رسالة التحقق إلى (${auth.currentUser.email}). يرجى فحص صندوق الوارد أو الرسائل غير المرغوب فيها (Spam).`
      );
      return true;
    } catch (err) {
      setAuthError(translateFirebaseAuthError(err));
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const checkEmailVerificationNow = async (): Promise<boolean> => {
    clearAuthMessages();
    if (!auth.currentUser) {
      setAuthError('يرجى تسجيل الدخول أولاً.');
      return false;
    }

    setIsProcessing(true);
    try {
      await auth.currentUser.reload();
      await auth.currentUser.getIdToken(true);

      const verified = Boolean(auth.currentUser.emailVerified);
      setIsEmailVerified(verified);

      if (!verified) {
        setAuthError(
          'لم يتم التحقق الفعلي من البريد الإلكتروني بعد. يرجى الضغط على الرابط المرسل إلى بريدك الإلكتروني أولاً ثم المحاولة مجدداً.'
        );
        return false;
      }

      await syncUserState(auth.currentUser);
      setAuthNotice('تم التحقق من بريدك الإلكتروني وتفعيل حسابك بنجاح.');
      return true;
    } catch (err) {
      setAuthError(translateFirebaseAuthError(err));
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const sendPasswordReset = async (email: string): Promise<boolean> => {
    clearAuthMessages();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthError('يرجى إدخال البريد الإلكتروني المسجل لإرسال رابط استعادة كلمة المرور.');
      return false;
    }

    setIsProcessing(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setAuthNotice(
        `تم إرسال رابط إعادة تعيين كلمة المرور إلى (${cleanEmail}) بنجاح. يرجى مراجعة بريدك الإلكتروني.`
      );
      return true;
    } catch (err) {
      setAuthError(translateFirebaseAuthError(err));
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const linkGoogleToCurrentAccount = async (): Promise<boolean> => {
    clearAuthMessages();
    if (!auth.currentUser) return false;
    setIsProcessing(true);
    try {
      const cred = await linkWithPopup(auth.currentUser, googleProvider);
      await cred.user.reload();
      await syncUserState(cred.user);
      setAuthNotice('تم ربط حساب Google بحسابك الحالي بنجاح.');
      return true;
    } catch (err) {
      setAuthError(translateFirebaseAuthError(err));
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const linkPasswordToCurrentAccount = async (
    password: string,
    confirmPassword: string
  ): Promise<boolean> => {
    clearAuthMessages();
    if (!auth.currentUser || !auth.currentUser.email) return false;
    if (password.length < 6) {
      setAuthError('كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.');
      return false;
    }
    if (password !== confirmPassword) {
      setAuthError('كلمة المرور وتأكيدها غير متطابقين.');
      return false;
    }

    setIsProcessing(true);
    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        password
      );
      const cred = await linkWithCredential(auth.currentUser, credential);
      await cred.user.reload();
      await syncUserState(cred.user);
      setAuthNotice(
        'تم ربط الدخول بالبريد وكلمة المرور بنفس حسابك الحالي بنجاح.'
      );
      return true;
    } catch (err) {
      setAuthError(translateFirebaseAuthError(err));
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const verifyServerAdminAccess = async (): Promise<{
    allowed: boolean;
    reason: string | null;
  }> => {
    const res = await verifyAdminAccessFromServer(auth.currentUser);
    setRole(res.role);
    return {
      allowed: res.allowed,
      reason: res.reason,
    };
  };

  const signOut = async () => {
    setIsProcessing(true);
    clearAuthMessages();
    try {
      await firebaseSignOut(auth);
      setFirebaseUser(null);
      setIsEmailVerified(false);
      setLinkedProviders([]);
      setProfile(null);
      setPrivateInfo(null);
      setRole('user');
    } catch (err) {
      setAuthError(translateFirebaseAuthError(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const refreshUserProfile = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      await syncUserState(auth.currentUser);
    }
  };

  // Unverified users strictly get regular 'user' permissions with no admin capabilities
  const effectivePermissions = isEmailVerified
    ? getRolePermissions(role)
    : getRolePermissions('user');

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        isEmailVerified,
        linkedProviders,
        profile,
        privateInfo,
        role: isEmailVerified ? role : 'user',
        permissions: effectivePermissions,
        isAuthReady,
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
        linkGoogleToCurrentAccount,
        linkPasswordToCurrentAccount,
        verifyServerAdminAccess,
        signOut,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
