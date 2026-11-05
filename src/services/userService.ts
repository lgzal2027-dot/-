import {
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  BOOTSTRAPPED_SUPER_ADMIN_EMAIL,
  StaffRole,
  UserGender,
  UserPrivate,
  UserProfile,
  UserRole,
  VALIDATION_LIMITS,
} from '../types/domain';

function sanitizeString(value: string, maxLength: number, fallback = ''): string {
  const trimmed = (value || fallback).trim();
  return trimmed.slice(0, maxLength);
}

/**
 * Resolves the authoritative role for a user by checking:
 * 1. Email verification status (unverified users are strictly 'user' with no write/admin access)
 * 2. Verified Bootstrapped Super Admin email
 * 3. /staff_roles/{uid} document in Firestore
 * 4. Defaulting to 'user'
 */
export async function resolveAuthoritativeRole(
  firebaseUser: User,
  forceServer = false
): Promise<UserRole> {
  if (!firebaseUser.emailVerified) {
    return 'user';
  }

  if (
    firebaseUser.email?.toLowerCase() === BOOTSTRAPPED_SUPER_ADMIN_EMAIL.toLowerCase()
  ) {
    return 'super_admin';
  }

  const staffPath = `staff_roles/${firebaseUser.uid}`;
  try {
    const ref = doc(db, 'staff_roles', firebaseUser.uid);
    const staffSnap = forceServer
      ? await getDocFromServer(ref)
      : await getDoc(ref);
    if (staffSnap.exists()) {
      const data = staffSnap.data() as StaffRole;
      if (data.role === 'super_admin' || data.role === 'moderator') {
        return data.role;
      }
    }
    return 'user';
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, staffPath);
  }
}

/**
 * Verifies live from the server and database whether the current user has staff/admin privileges.
 * Used as a hard server-backed guard before rendering or executing any Admin Panel functionality.
 */
export async function verifyAdminAccessFromServer(
  firebaseUser: User | null
): Promise<{
  allowed: boolean;
  role: UserRole;
  reason: string | null;
}> {
  if (!firebaseUser) {
    return {
      allowed: false,
      role: 'user',
      reason: 'يجب تسجيل الدخول أولاً.',
    };
  }

  await firebaseUser.reload();
  if (!firebaseUser.emailVerified) {
    return {
      allowed: false,
      role: 'user',
      reason: 'لا يمكن الوصول إلى الوظائف المحمية قبل تأكيد البريد الإلكتروني الفعلي.',
    };
  }

  await firebaseUser.getIdToken(true);
  const role = await resolveAuthoritativeRole(firebaseUser, true);

  if (role === 'super_admin' || role === 'moderator') {
    return {
      allowed: true,
      role,
      reason: null,
    };
  }

  return {
    allowed: false,
    role: 'user',
    reason: 'غير مصرح لحساب المستخدم العادي بالوصول إلى لوحة الإدارة.',
  };
}

/**
 * Fetches or initializes the user's profile (/users/{uid}) and isolated private PII (/user_private/{uid}).
 * Requires firebaseUser.emailVerified === true before performing any Firestore writes.
 */
export async function ensureUserProfile(
  firebaseUser: User,
  pendingRegistration?: {
    displayName?: string;
    gender?: UserGender;
    countryCode?: string;
    cityName?: string;
    phone?: string;
  }
): Promise<{
  profile: UserProfile | null;
  privateInfo: UserPrivate | null;
  effectiveRole: UserRole;
}> {
  // Do NOT treat unverified accounts as verified or attempt protected writes before actual verification
  if (!firebaseUser.emailVerified) {
    return {
      profile: null,
      privateInfo: null,
      effectiveRole: 'user',
    };
  }

  const uid = firebaseUser.uid;
  const userPath = `users/${uid}`;
  const privatePath = `user_private/${uid}`;

  const effectiveRole = await resolveAuthoritativeRole(firebaseUser);

  let profileData: UserProfile;
  try {
    const profileRef = doc(db, 'users', uid);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      const initialRole: UserRole =
        effectiveRole === 'super_admin' ? 'super_admin' : 'user';
      const rawName = sanitizeString(
        pendingRegistration?.displayName ||
          firebaseUser.displayName ||
          firebaseUser.email?.split('@')[0] ||
          'مستخدم',
        VALIDATION_LIMITS.DISPLAY_NAME_MAX,
        'مستخدم'
      );
      const safeDisplayName =
        rawName.length >= VALIDATION_LIMITS.DISPLAY_NAME_MIN ? rawName : 'مستخدم';

      await setDoc(profileRef, {
        uid,
        displayName: safeDisplayName,
        gender: pendingRegistration?.gender || 'unspecified',
        countryCode: sanitizeString(
          pendingRegistration?.countryCode || 'SA',
          VALIDATION_LIMITS.COUNTRY_CODE_MAX,
          'SA'
        ),
        cityName: sanitizeString(
          pendingRegistration?.cityName || 'الرياض',
          VALIDATION_LIMITS.CITY_NAME_MAX,
          'الرياض'
        ),
        role: initialRole,
        accountStatus: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const createdSnap = await getDoc(profileRef);
      profileData = createdSnap.data() as UserProfile;
    } else {
      profileData = profileSnap.data() as UserProfile;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }

  let privateData: UserPrivate;
  try {
    const privateRef = doc(db, 'user_private', uid);
    const privateSnap = await getDoc(privateRef);

    if (!privateSnap.exists()) {
      const safeEmail = sanitizeString(
        firebaseUser.email || 'user@example.com',
        VALIDATION_LIMITS.EMAIL_MAX,
        'user@example.com'
      );
      await setDoc(privateRef, {
        uid,
        email: safeEmail,
        phone: sanitizeString(
          pendingRegistration?.phone || firebaseUser.phoneNumber || '',
          VALIDATION_LIMITS.PHONE_MAX,
          ''
        ),
        updatedAt: serverTimestamp(),
      });
      const createdPrivateSnap = await getDoc(privateRef);
      privateData = createdPrivateSnap.data() as UserPrivate;
    } else {
      privateData = privateSnap.data() as UserPrivate;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, privatePath);
  }

  return {
    profile: profileData,
    privateInfo: privateData,
    effectiveRole:
      effectiveRole !== 'user' ? effectiveRole : profileData.role,
  };
}

/**
 * Updates the authenticated user's profile fields allowed by security rules.
 */
export async function updateOwnUserProfile(
  uid: string,
  updates: {
    displayName: string;
    gender: UserGender;
    countryCode: string;
    cityName: string;
  }
): Promise<void> {
  const path = `users/${uid}`;
  const safeDisplayName = sanitizeString(
    updates.displayName,
    VALIDATION_LIMITS.DISPLAY_NAME_MAX
  );
  if (safeDisplayName.length < VALIDATION_LIMITS.DISPLAY_NAME_MIN) {
    throw new Error('الاسم التعريفي يجب أن يتكون من حرفين على الأقل.');
  }

  try {
    await updateDoc(doc(db, 'users', uid), {
      displayName: safeDisplayName,
      gender: updates.gender,
      countryCode: sanitizeString(updates.countryCode, VALIDATION_LIMITS.COUNTRY_CODE_MAX, 'SA'),
      cityName: sanitizeString(updates.cityName, VALIDATION_LIMITS.CITY_NAME_MAX, 'الرياض'),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Updates the authenticated user's isolated private contact details (/user_private/{uid}).
 */
export async function updateOwnUserPrivate(
  uid: string,
  updates: { email: string; phone: string }
): Promise<void> {
  const path = `user_private/${uid}`;
  try {
    await updateDoc(doc(db, 'user_private', uid), {
      email: sanitizeString(updates.email, VALIDATION_LIMITS.EMAIL_MAX),
      phone: sanitizeString(updates.phone, VALIDATION_LIMITS.PHONE_MAX),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
