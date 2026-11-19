import { provideRouter } from '@angular/router';
import type { OrderStatus } from '@shared/models/status-badge.model';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';

import type { Order, OrderStatusHistoryEntry } from '../models/order.model';

import { OrderDetail } from './order-detail';
import { ORDER_DETAIL_ERROR } from './order-detail.resolver';

const CREATED_AT = 1729684800000;
const TWO_HOURS = 7_200_000;

/** A tiny catalogue-style thumbnail, so the image branch renders without a CDN. */
const HEADPHONE_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E" +
  "%3Crect width='80' height='80' rx='12' fill='%23e0e7ff'/%3E" +
  "%3Cpath d='M24 44v-6a16 16 0 0 1 32 0v6' stroke='%236366f1' stroke-width='5' fill='none'/%3E" +
  "%3Crect x='20' y='42' width='10' height='16' rx='4' fill='%236366f1'/%3E" +
  "%3Crect x='50' y='42' width='10' height='16' rx='4' fill='%236366f1'/%3E%3C/svg%3E";

/** History entries walk two hours per step; the last one carries the note. */
function historyOf(
  statuses: readonly OrderStatus[],
  note: string | null = null,
): OrderStatusHistoryEntry[] {
  return statuses.map((status, index) => ({
    id: `h-${index + 1}`,
    status,
    note: index === statuses.length - 1 ? note : null,
    createdAt: CREATED_AT + index * TWO_HOURS,
  }));
}

const LIFECYCLE: readonly OrderStatus[] = ['pending', 'paid', 'processing', 'shipped', 'delivered'];

/**
 * The base record every story derives from. The money obeys the one rule:
 * subtotal 3,000,000 = Σ lines; total 2,745,000 = subtotal − 300,000 + 45,000.
 */
const BASE_ORDER: Order = {
  id: '7',
  code: 'ORD-14006',
  customerId: 'c-1',
  customerName: 'علی رضایی',
  status: 'delivered',
  total: 2_745_000,
  itemCount: 3,
  createdAt: CREATED_AT,
  items: [
    {
      id: 'oi-1',
      productId: 'p-7',
      productName: 'هدفون بی‌سیم سونی WH-1000XM5',
      productImage: HEADPHONE_IMAGE,
      variantName: 'مشکی',
      quantity: 1,
      unitPrice: 2_100_000,
      totalPrice: 2_100_000,
    },
    {
      id: 'oi-2',
      productId: 'p-2',
      productName: 'ماوس گیمینگ لاجیتک G502',
      productImage: null,
      variantName: null,
      quantity: 2,
      unitPrice: 450_000,
      totalPrice: 900_000,
    },
  ],
  subtotal: 3_000_000,
  discount: 300_000,
  shippingCost: 45_000,
  shippingMethod: 'پست پیشتاز',
  address: {
    fullName: 'علی رضایی',
    phone: '09121234567',
    province: 'تهران',
    city: 'تهران',
    postalCode: '1100000000',
    address: 'خیابان ولیعصر، کوچهٔ بهار، پلاک ۱۲، واحد ۳',
  },
  payment: {
    method: 'پرداخت آنلاین',
    gateway: 'زرین‌پال',
    trackingCode: '202600001234',
    paidAt: CREATED_AT + 600_000,
  },
  statusHistory: historyOf(LIFECYCLE),
};

const meta: Meta<OrderDetail> = {
  title: 'Features/Orders/Detail',
  component: OrderDetail,
  decorators: [
    applicationConfig({
      providers: [provideRouter([])],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'Order detail page (BO-H01 tc 10’s destination): `/orders/:id`, read-only. The resolver',
          'hands the page a COMPLETE order, so the first paint is already the data — order info,',
          'customer and delivery address, payment snapshot, the items table, the financial summary',
          'and the status history, all in the Arino card grid.',
          '',
          '**Three outcomes, one wrapper input.** `{ order }` renders the cards, `{ error }`',
          'renders the shared retry block («تلاش دوباره» re-runs the resolver via',
          '`onSameUrlNavigation: reload` + `runGuardsAndResolvers: always`), and a 404 never',
          'reaches this component — the resolver redirects to `/404`.',
          '',
          '**Honest nulls.** A pending or cancelled order has no gateway, no tracking code and no',
          '`paidAt`; the payment card prints «پرداخت نشده» instead of inventing values. Free',
          'shipping prints «رایگان», and a discount is only shown when it is real.',
          '',
          'BO-H04 adds the status-change action, BO-H05 the timeline component and BO-H06 the',
          'invoice — nothing here pretends those exist yet.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<OrderDetail>;

/** A delivered order: full lifecycle history, a real discount, paid shipping. */
export const Delivered: Story = {
  args: { detail: { order: BASE_ORDER } },
};

/** Not paid yet: no gateway, no tracking, «پرداخت نشده» — nulls, not empty strings. */
export const PendingUnpaid: Story = {
  args: {
    detail: {
      order: {
        ...BASE_ORDER,
        id: '1',
        code: 'ORD-14000',
        status: 'pending',
        payment: { method: 'پرداخت آنلاین', gateway: null, trackingCode: null, paidAt: null },
        statusHistory: historyOf(['pending']),
      },
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          'The payment card shows the amber «پرداخت نشده» pill and dashes for gateway/tracking; ' +
          'the history is a single «در انتظار پرداخت» entry. The badge and the last history entry ' +
          'always agree.',
      },
    },
  },
};

/** Cancelled by the customer: the history's last entry carries the reason. */
export const Cancelled: Story = {
  args: {
    detail: {
      order: {
        ...BASE_ORDER,
        id: '6',
        code: 'ORD-14005',
        status: 'cancelled',
        customerName: 'مریم حسینی',
        payment: { method: 'پرداخت آنلاین', gateway: null, trackingCode: null, paidAt: null },
        statusHistory: historyOf(['pending', 'cancelled'], 'انصراف مشتری از خرید'),
      },
    },
  },
};

/** Returned after delivery: the full lifecycle plus the return reason. */
export const Returned: Story = {
  args: {
    detail: {
      order: {
        ...BASE_ORDER,
        id: '13',
        code: 'ORD-14012',
        status: 'returned',
        customerName: 'مهدی یوسفی',
        statusHistory: historyOf([...LIFECYCLE, 'returned'], 'مرجوعی به دلیل مغایرت کالا'),
      },
    },
  },
};

/** Free shipping: «رایگان» in green, and the total drops by the shipping fee. */
export const FreeShipping: Story = {
  args: {
    detail: {
      order: {
        ...BASE_ORDER,
        id: '6',
        code: 'ORD-14005',
        shippingCost: 0,
        shippingMethod: 'ارسال رایگان',
        total: 2_700_000,
      },
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          '`shippingCost: 0` prints «رایگان» instead of «۰ تومان», and the grand total is ' +
          'subtotal − discount with no shipping line added — the summary still obeys ' +
          'total = subtotal − discount + shipping.',
      },
    },
  },
};

/**
 * The resolver failed (server down, status 0): the retry block, not empty cards.
 *
 * In the app, «تلاش دوباره» re-runs the resolver on the same URL; here the stub
 * input stays `{ error }`, so the story shows the failure state itself.
 */
export const LoadFailed: Story = {
  args: { detail: { error: ORDER_DETAIL_ERROR } },
  parameters: {
    docs: {
      description: {
        story:
          'A non-404 failure renders the shared `<app-error-state>` with the resolver’s own ' +
          'sentence. A 404 never reaches this page — it redirects to `/404`.',
      },
    },
  },
};
