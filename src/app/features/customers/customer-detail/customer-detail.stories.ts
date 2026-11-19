import { provideRouter } from '@angular/router';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';

import type { Customer, CustomerOrderSummary } from '../models/customer.model';

import { CustomerDetail } from './customer-detail';
import { CUSTOMER_DETAIL_ERROR } from './customer-detail.resolver';

const CUSTOMER: Customer = {
  id: '3',
  fullName: 'مریم حسینی',
  phone: '09121000003',
  email: 'maryam.hosseini@example.com',
  status: 'active',
  orderCount: 2,
  totalSpent: 3_200_000,
  createdAt: 1_728_000_000_000,
  addresses: [
    {
      id: '3-1',
      title: 'خانه',
      province: 'تهران',
      city: 'تهران',
      street: 'خیابان ولیعصر، کوچهٔ شهید نوری، پلاک ۱۲، واحد ۴',
      postalCode: '1234567890',
      receiver: 'مریم حسینی',
      phone: '09121000003',
      isDefault: true,
    },
    {
      id: '3-2',
      title: 'محل کار',
      province: 'تهران',
      city: 'تهران',
      street: 'بلوار کشاورز، کوچهٔ دوم، پلاک ۸، طبقهٔ سوم',
      postalCode: '1234567804',
      receiver: 'مریم حسینی',
      phone: '09121000003',
      isDefault: false,
    },
  ],
};

const ORDERS: readonly CustomerOrderSummary[] = [
  {
    id: '1',
    code: 'ORD-14000',
    status: 'delivered',
    total: 1_600_000,
    createdAt: 1_728_000_000_000,
  },
  { id: '2', code: 'ORD-14001', status: 'pending', total: 1_600_000, createdAt: 1_719_000_000_000 },
];

const meta: Meta<CustomerDetail> = {
  title: 'Features/Customers/Profile',
  component: CustomerDetail,
  decorators: [
    applicationConfig({
      providers: [provideRouter([])],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'Customer profile (BO-I02): contact card, status, order count and total spend, the saved',
          'addresses and the five latest orders with links into the orders module.',
          '',
          '**The resolver loads both requests in parallel** (`forkJoin`), so the first paint is the',
          'data. A 404 redirects to `/404`; any other failure renders the retry block, and retry',
          "re-runs the resolver because the route declares `runGuardsAndResolvers: 'always'`.",
          '',
          '**A customer without orders is a valid profile** (BO-I05 tc 7), so the orders card shows',
          'its own empty state rather than an empty table.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<CustomerDetail>;

/** Active customer, two addresses, two orders. */
export const Default: Story = {
  args: { detail: { customer: CUSTOMER, orders: ORDERS } },
};

/** Blocked account: the red pill, same layout. */
export const Blocked: Story = {
  args: {
    detail: { customer: { ...CUSTOMER, status: 'blocked' }, orders: ORDERS },
  },
};

/** A shopper who registered but has not bought yet (BO-I05 tc 7). */
export const NoOrders: Story = {
  args: {
    detail: {
      customer: { ...CUSTOMER, orderCount: 0, totalSpent: 0 },
      orders: [],
    },
  },
};

/** The resolver failed for a non-404 reason: the retry block replaces the cards. */
export const RequestFailed: Story = {
  args: { detail: { error: CUSTOMER_DETAIL_ERROR } },
};
