// src/app/core/mock/fixtures/coupons.fixture.ts
//
// The coupon dataset (BO-J01..J04). One export, because a coupon has no second
// projection: the list row and the edit form read the same record.
//
// The 12 rows cover every state the screen can show, so each one is reachable
// without hand-editing the fixture:
//
//   active    in range, uses left, switch on
//   inactive  switch off (still in range)
//   expired   `to` is in the past
//   exhausted `usedCount` reached `maxUses`
//
// `status` is NOT stored: it is derived by `couponState()` from `to`, the use
// count and the switch. Storing it would let the badge disagree with the
// numbers printed beside it the moment one of them changes.

const DAY = 86_400_000;

/**
 * The coupon clock is the REAL clock, unlike the other fixtures.
 *
 * An expiry is a fact about today, not about the catalogue's fixed demo date:
 * a coupon seeded around `NOW` would read «منقضی» for every run after
 * that date, and the expired/active split would silently become "all expired".
 * The window is recomputed at module load, so the demo is always correct.
 */
const NOW = Date.now();

export type MockCouponType = 'percent' | 'amount';

export interface MockCoupon {
  readonly id: string;
  code: string;
  type: MockCouponType;
  value: number;
  minCart: number;
  maxUses: number;
  /** `null` = no per-customer cap. */
  maxUsesPerUser: number | null;
  usedCount: number;
  /** UTC milliseconds, inclusive start and end of the campaign. */
  from: number;
  to: number;
  description: string;
  isActive: boolean;
  readonly createdAt: number;
}

/** The seed array; the mock copies it into a mutable store. */
export const MOCK_COUPONS: readonly MockCoupon[] = [
  {
    id: '1',
    code: 'WELCOME10',
    type: 'percent',
    value: 10,
    minCart: 0,
    maxUses: 1000,
    maxUsesPerUser: 1,
    usedCount: 120,
    from: NOW - 30 * DAY,
    to: NOW + 30 * DAY,
    description: 'تخفیف اولین خرید',
    isActive: true,
    createdAt: NOW - 40 * DAY,
  },
  {
    id: '2',
    code: 'OFF20',
    type: 'percent',
    value: 20,
    minCart: 500_000,
    maxUses: 500,
    maxUsesPerUser: 2,
    usedCount: 318,
    from: NOW - 10 * DAY,
    to: NOW + 20 * DAY,
    description: 'کمپین پاییزه',
    isActive: true,
    createdAt: NOW - 12 * DAY,
  },
  {
    id: '3',
    code: 'CASH50',
    type: 'amount',
    value: 50_000,
    minCart: 400_000,
    maxUses: 200,
    maxUsesPerUser: 1,
    usedCount: 42,
    from: NOW - 5 * DAY,
    to: NOW + 10 * DAY,
    description: 'تخفیف نقدی سبدهای بالای ۴۰۰ هزار',
    isActive: true,
    createdAt: NOW - 6 * DAY,
  },
  {
    id: '4',
    code: 'FREESHIP',
    type: 'amount',
    value: 45_000,
    minCart: 700_000,
    maxUses: 300,
    maxUsesPerUser: null,
    usedCount: 96,
    from: NOW - 2 * DAY,
    to: NOW + 40 * DAY,
    description: 'ارسال رایگان',
    isActive: true,
    createdAt: NOW - 3 * DAY,
  },
  {
    id: '5',
    code: 'SUMMER15',
    type: 'percent',
    value: 15,
    minCart: 0,
    maxUses: 400,
    maxUsesPerUser: 1,
    usedCount: 400,
    from: NOW - 60 * DAY,
    to: NOW - 5 * DAY,
    description: 'کمپین تابستانه',
    isActive: false,
    createdAt: NOW - 70 * DAY,
  },
  {
    id: '6',
    code: 'NOWRUZ30',
    type: 'percent',
    value: 30,
    minCart: 1_000_000,
    maxUses: 100,
    maxUsesPerUser: 1,
    usedCount: 100,
    from: NOW - 90 * DAY,
    to: NOW - 30 * DAY,
    description: 'جشنوارهٔ نوروز',
    isActive: false,
    createdAt: NOW - 100 * DAY,
  },
  {
    id: '7',
    code: 'CASH100',
    type: 'amount',
    value: 100_000,
    minCart: 1_500_000,
    maxUses: 50,
    maxUsesPerUser: 1,
    usedCount: 50,
    from: NOW - 20 * DAY,
    to: NOW + 5 * DAY,
    description: 'تخفیف خرید عمده',
    isActive: true,
    createdAt: NOW - 25 * DAY,
  },
  {
    id: '8',
    code: 'BULK200',
    type: 'amount',
    value: 200_000,
    minCart: 3_000_000,
    maxUses: 20,
    maxUsesPerUser: 1,
    usedCount: 20,
    from: NOW - 15 * DAY,
    to: NOW + 15 * DAY,
    description: 'کوپن فروش سازمانی',
    isActive: true,
    createdAt: NOW - 16 * DAY,
  },
  {
    id: '9',
    code: 'VIP25',
    type: 'percent',
    value: 25,
    minCart: 2_000_000,
    maxUses: 30,
    maxUsesPerUser: 1,
    usedCount: 7,
    from: NOW - 3 * DAY,
    to: NOW + 60 * DAY,
    description: 'مشتریان وفادار',
    isActive: false,
    createdAt: NOW - 4 * DAY,
  },
  {
    id: '10',
    code: 'OLD5',
    type: 'percent',
    value: 5,
    minCart: 0,
    maxUses: 1000,
    maxUsesPerUser: null,
    usedCount: 640,
    from: NOW - 200 * DAY,
    to: NOW - 120 * DAY,
    description: 'کوپن قدیمی',
    isActive: false,
    createdAt: NOW - 210 * DAY,
  },
  {
    id: '11',
    code: 'WINTER12',
    type: 'percent',
    value: 12,
    minCart: 300_000,
    maxUses: 250,
    maxUsesPerUser: 1,
    usedCount: 31,
    from: NOW - 1 * DAY,
    to: NOW + 45 * DAY,
    description: 'پیش‌فروش زمستانه',
    isActive: false,
    createdAt: NOW - 2 * DAY,
  },
  {
    id: '12',
    code: 'GIFT40',
    type: 'amount',
    value: 40_000,
    minCart: 1_000_000,
    maxUses: 150,
    maxUsesPerUser: 1,
    usedCount: 12,
    from: NOW,
    to: NOW + 90 * DAY,
    description: 'هدیهٔ خرید بالای یک میلیون',
    isActive: true,
    createdAt: NOW,
  },
];
