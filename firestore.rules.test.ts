/**
 * Firestore Security Rules Specification Test Suite
 * Verifies that all 12 "Dirty Dozen" attack payloads return PERMISSION_DENIED.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  authUid: string | null;
  emailVerified?: boolean;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TEST_CASES: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Self-Role Escalation on User Create',
    collection: '/users/user_1',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: true,
    payload: {
      uid: 'user_1',
      displayName: 'أحمد',
      gender: 'male',
      countryCode: 'SA',
      cityName: 'الرياض',
      role: 'super_admin',
      accountStatus: 'active',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Role Tampering on User Update',
    collection: '/users/user_1',
    operation: 'update',
    authUid: 'user_1',
    emailVerified: true,
    payload: {
      role: 'moderator',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Cross-User Private PII Read',
    collection: '/user_private/user_2',
    operation: 'get',
    authUid: 'user_1',
    emailVerified: true,
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Unauthorized Ad Contact Read Without Payment Grant',
    collection: '/ad_contacts/ad_100',
    operation: 'get',
    authUid: 'user_1',
    emailVerified: true,
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Bulk Scraping Ad Contacts via List Query',
    collection: '/ad_contacts',
    operation: 'list',
    authUid: 'user_1',
    emailVerified: true,
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Underage Marriage Ad Creation (age < 18)',
    collection: '/ads/ad_101',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: true,
    payload: {
      adId: 'ad_101',
      userId: 'user_1',
      age: 16,
      status: 'pending',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'User Self-Approving Marriage Ad on Create',
    collection: '/ads/ad_102',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: true,
    payload: {
      adId: 'ad_102',
      userId: 'user_1',
      age: 30,
      status: 'approved',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Shadow Field Injection on Marriage Ad',
    collection: '/ads/ad_103',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: true,
    payload: {
      adId: 'ad_103',
      userId: 'user_1',
      isFeaturedBypass: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'User Self-Approving Payment Record',
    collection: '/payments/pay_1',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: true,
    payload: {
      paymentId: 'pay_1',
      userId: 'user_1',
      status: 'approved',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'User Self-Granting Contact Access Record',
    collection: '/contact_access/ad_100_user_1',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: true,
    payload: {
      accessId: 'ad_100_user_1',
      adId: 'ad_100',
      userId: 'user_1',
      status: 'active',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Moderator Attempting to Modify Super Admin Settings',
    collection: '/admin_settings/general',
    operation: 'update',
    authUid: 'moderator_1',
    emailVerified: true,
    payload: {
      contactUnlockFee: 0,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unverified Email Attempting Write Operation',
    collection: '/users/user_unverified',
    operation: 'create',
    authUid: 'user_unverified',
    emailVerified: false,
    payload: {
      uid: 'user_unverified',
      role: 'user',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
];
