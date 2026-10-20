import { provideRouter } from '@angular/router';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';

import type { DashboardRecentOrder } from '../models/dashboard.model';

import { RecentOrders } from './recent-orders';

const SAMPLE_ORDERS: DashboardRecentOrder[] = [
  {
    id: 'ord-14000',
    code: 'ORD-14000',
    customerId: 'c-1',
    customerName: 'زهرا محمدی',
    status: 'pending',
    total: 480000,
    itemCount: 2,
    createdAt: 1729684800000,
  },
  {
    id: 'ord-14001',
    code: 'ORD-14001',
    customerId: 'c-2',
    customerName: 'علی رضایی',
    status: 'paid',
    total: 572000,
    itemCount: 1,
    createdAt: 1729684800000,
  },
  {
    id: 'ord-14002',
    code: 'ORD-14002',
    customerId: 'c-3',
    customerName: 'مریم حسینی',
    status: 'processing',
    total: 664000,
    itemCount: 3,
    createdAt: 1729684800000,
  },
  {
    id: 'ord-14003',
    code: 'ORD-14003',
    customerId: 'c-4',
    customerName: 'رضا کریمی',
    status: 'shipped',
    total: 756000,
    itemCount: 1,
    createdAt: 1729684800000,
  },
  {
    id: 'ord-14004',
    code: 'ORD-14004',
    customerId: 'c-5',
    customerName: 'سارا احمدی',
    status: 'delivered',
    total: 848000,
    itemCount: 2,
    createdAt: 1729598400000,
  },
  {
    id: 'ord-14005',
    code: 'ORD-14005',
    customerId: 'c-6',
    customerName: 'محمد نوری',
    status: 'cancelled',
    total: 940000,
    itemCount: 1,
    createdAt: 1729598400000,
  },
  {
    id: 'ord-14006',
    code: 'ORD-14006',
    customerId: 'c-7',
    customerName: 'نگار شریفی',
    status: 'pending',
    total: 1032000,
    itemCount: 4,
    createdAt: 1729598400000,
  },
  {
    id: 'ord-14007',
    code: 'ORD-14007',
    customerId: 'c-8',
    customerName: 'امیر صادقی',
    status: 'paid',
    total: 1124000,
    itemCount: 2,
    createdAt: 1729598400000,
  },
];

const meta: Meta<RecentOrders> = {
  title: 'Features/Dashboard/RecentOrders',
  component: RecentOrders,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [provideRouter([])],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'Recent Orders widget (BO-E04) displaying the 8 latest orders with Persian formatting,',
          'status badges, and details navigation, strictly matching the Arino admin panel template.',
          '',
          '**BO-E07 — one `state()` for all four outcomes.** The widget reads a single `state()`',
          'computed that resolves to `loading | error | empty | data` (tc 7), so the fetch’s three',
          'possible endings are drawn from one `@switch` instead of three scattered `@if`s. Priority:',
          '`error` wins over everything (a failed request must never look like an empty list or a slow',
          'one), then `loading` OR a `null` payload (still in flight), then a real `[]` (`empty`), then',
          '`data`. On `error` the card renders `<app-error-state>` — the SAME retry block the page',
          'and the other widgets draw (tc 8) — and «تلاش دوباره» emits `retry`, which the page',
          're-runs the order request on.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<RecentOrders>;

export const Default: Story = {
  args: {
    orders: SAMPLE_ORDERS,
    loading: false,
  },
};

export const Loading: Story = {
  args: {
    orders: null,
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    orders: [],
    loading: false,
  },
};

/**
 * The fetch rejected (BO-E07 tc 2 / tc 8).
 *
 * `error` is non-null, so `state()` resolves to `'error'` BEFORE the `null`
 * payload could fall through to `'loading'` — the table shows the retry block,
 * never a silent «هیچ سفارشی یافت نشد». «تلاش دوباره» emits `retry`; bind it to
 * re-run the orders request.
 */
export const Error: Story = {
  args: {
    orders: null,
    loading: false,
    error: 'دریافت سفارشات ناموفق بود',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The card hands the message to `<app-error-state>`: a red alert with `role="alert"`, the ' +
          'text «دریافت سفارشات ناموفق بود», and a «تلاش دوباره» button whose only job is `retry.emit()`.',
      },
    },
  },
};
