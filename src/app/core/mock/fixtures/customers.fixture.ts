// src/app/core/mock/fixtures/customers.fixture.ts
//
// The customers dataset (BO-I04). Two exports, one source, the same rule the
// orders fixture follows:
//
//   MOCK_CUSTOMER_DETAILS — every customer with addresses, order count and spend
//   MOCK_CUSTOMERS        — the list projection (no addresses), PROJECTED from
//                           the details, so the list and the profile cannot
//                           disagree about one customer's order count.
//
// The first eight names are the ones `MOCK_ORDER_DETAILS` references by id
// ('1'..'8'), so a customer's profile finds their real orders. The other 179
// exist so the list has real paging (187 rows, 10 pages at the default size)
// and so the dashboard's `customerCount` is derived instead of hand-written.
//
// Only the first eight have orders: a profile without orders is a state the
// detail page must render (BO-I05 tc 7), and it is reachable by opening row 9.
//
// `totalSpent` skips cancelled and returned orders: the customer did not pay
// for those, and counting them would print a spend the money never left.

import { MOCK_ORDER_DETAILS } from './orders.fixture';
import { FIXTURE_NOW } from './products.fixture';

const DAY = 86_400_000;

export type MockCustomerStatus = 'active' | 'blocked';

export interface MockCustomerAddress {
  readonly id: string;
  readonly title: string;
  readonly province: string;
  readonly city: string;
  readonly street: string;
  readonly postalCode: string;
  readonly receiver: string;
  readonly phone: string;
  readonly isDefault: boolean;
}

export interface MockCustomer {
  readonly id: string;
  readonly fullName: string;
  readonly phone: string;
  readonly email: string;
  readonly status: MockCustomerStatus;
  readonly orderCount: number;
  readonly totalSpent: number;
  readonly createdAt: number;
}

export interface MockCustomerDetail extends MockCustomer {
  readonly addresses: readonly MockCustomerAddress[];
}

/** The eight shoppers the orders fixture already names, in id order. */
const KNOWN_NAMES = [
  'زهرا محمدی',
  'علی رضایی',
  'مریم حسینی',
  'رضا کریمی',
  'سارا احمدی',
  'محمد نوری',
  'نگار شریفی',
  'سید محمدحسین حسینی‌نژاد موسوی',
] as const;

const FIRST_NAMES = [
  'آرش',
  'بهنام',
  'پریسا',
  'تینا',
  'حسین',
  'خاطره',
  'دانیال',
  'رها',
  'سعید',
  'شادی',
  'صادق',
  'طاهره',
  'فرزانه',
  'کامران',
  'گلناز',
  'لیلا',
  'مانی',
  'نازنین',
  'هستی',
  'یاسر',
] as const;

const LAST_NAMES = [
  'اکبری',
  'بهرامی',
  'پناهی',
  'جهانی',
  'حیدری',
  'خسروی',
  'دهقان',
  'رستمی',
  'سلطانی',
  'فرهنگ',
] as const;

const REGIONS = [
  { province: 'تهران', city: 'تهران' },
  { province: 'اصفهان', city: 'اصفهان' },
  { province: 'خراسان رضوی', city: 'مشهد' },
  { province: 'فارس', city: 'شیراز' },
  { province: 'آذربایجان شرقی', city: 'تبریز' },
] as const;

const STREETS = [
  'خیابان ولیعصر، کوچهٔ شهید نوری، پلاک ۱۲، واحد ۴',
  'بلوار کشاورز، کوچهٔ دوم، پلاک ۸، طبقهٔ سوم',
  'خیابان انقلاب، نبش کوچهٔ مهر، پلاک ۴۵، واحد ۷',
  'بلوار معلم، کوچهٔ یاس، پلاک ۳، واحد ۱',
  'خیابان آزادی، کوچهٔ شهید کاظمی، پلاک ۲۷، طبقهٔ دوم',
] as const;

const CUSTOMER_COUNT = 187;

/** A stable name for row `i`; the first eight are the order fixture's own. */
function nameFor(index: number): string {
  if (index < KNOWN_NAMES.length) {
    return KNOWN_NAMES[index];
  }

  const first = FIRST_NAMES[index % FIRST_NAMES.length];
  const last = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];

  return `${first} ${last}`;
}

/** Orders of one customer, with the two statuses that are not a purchase excluded. */
function ordersOf(customerId: string): readonly { total: number; status: string }[] {
  return MOCK_ORDER_DETAILS.filter((order) => order.customerId === customerId);
}

function addressesFor(index: number, fullName: string, phone: string): MockCustomerAddress[] {
  const region = REGIONS[index % REGIONS.length];

  return Array.from({ length: 1 + (index % 2) }, (_, n) => ({
    id: `${index + 1}-${n + 1}`,
    title: n === 0 ? 'خانه' : 'محل کار',
    province: region.province,
    city: region.city,
    street: STREETS[(index + n) % STREETS.length],
    postalCode: String(1_234_567_890 + index * 7).slice(0, 10),
    receiver: fullName,
    phone,
    isDefault: n === 0,
  }));
}

function buildCustomer(index: number): MockCustomerDetail {
  const id = String(index + 1);
  const fullName = nameFor(index);
  const phone = `0912${String(1_000_000 + index * 1379).slice(-7)}`;
  const orders = ordersOf(id);
  const totalSpent = orders
    .filter((order) => order.status !== 'cancelled' && order.status !== 'returned')
    .reduce((sum, order) => sum + order.total, 0);

  return {
    id,
    fullName,
    phone,
    email: `customer${index + 1}@example.com`,
    // One blocked customer in every nine, so the status filter has both answers.
    status: index % 9 === 4 ? 'blocked' : 'active',
    orderCount: orders.length,
    totalSpent,
    createdAt: FIXTURE_NOW - (index + 2) * 3 * DAY,
    addresses: addressesFor(index, fullName, phone),
  };
}

export const MOCK_CUSTOMER_DETAILS: readonly MockCustomerDetail[] = Array.from(
  { length: CUSTOMER_COUNT },
  (_, index) => buildCustomer(index),
);

/** The list row: the detail minus the addresses, which the table never prints. */
export function toCustomerListItem(customer: MockCustomerDetail): MockCustomer {
  return {
    id: customer.id,
    fullName: customer.fullName,
    phone: customer.phone,
    email: customer.email,
    status: customer.status,
    orderCount: customer.orderCount,
    totalSpent: customer.totalSpent,
    createdAt: customer.createdAt,
  };
}

export const MOCK_CUSTOMERS: readonly MockCustomer[] =
  MOCK_CUSTOMER_DETAILS.map(toCustomerListItem);
