// src/app/features/dashboard/low-stock/low-stock.stories.ts
//
// The five states of the low-stock card, in the order a user meets them:
// no answer yet → healthy → a mixed list → only zeros → a tighter threshold.
//
// `NoResponseYet` and `HealthyStock` look similar and are NOT the same story:
// the first is "we do not know", the second is "we know, and it is fine". They
// used to render identically, which was the bug.

import { provideRouter } from '@angular/router';
import { applicationConfig } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';

import type { DashboardLowStockItem } from '../models/dashboard.model';

import { LowStock } from './low-stock';

// ─── fixture data ────────────────────────────────────────────────────────────

const ITEMS: DashboardLowStockItem[] = [
  { id: 'p1', name: 'کیبورد مکانیکی ریزر', stock: 0, price: 1_850_000, imageUrl: null },
  { id: 'p2', name: 'ماوس گیمینگ لاجیتک', stock: 2, price: 920_000, imageUrl: null },
  { id: 'p3', name: 'هدفون بلوتوث سونی', stock: 4, price: 2_100_000, imageUrl: null },
  { id: 'p4', name: 'مانیتور ۲۴ اینچ ال‌جی', stock: 5, price: 8_400_000, imageUrl: null },
];

/** The same list plus two healthy products, to show the filter actually filters. */
const MIXED_ITEMS: DashboardLowStockItem[] = [
  ...ITEMS,
  { id: 'p5', name: 'شارژر سریع ۶۵ وات', stock: 18, price: 640_000, imageUrl: null },
  { id: 'p6', name: 'هارد اکسترنال ۲ ترابایت', stock: 40, price: 4_300_000, imageUrl: null },
];

// ─── meta ────────────────────────────────────────────────────────────────────

const meta: Meta<LowStock> = {
  title: 'Features/Dashboard/LowStock',
  component: LowStock,
  tags: ['autodocs'],
  decorators: [
    // The «مشاهده همه» link is a real `routerLink`; without a router the story
    // throws on render rather than showing a dead link.
    applicationConfig({
      providers: [provideRouter([])],
    }),
  ],
  args: {
    items: ITEMS,
    threshold: 5,
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        component: [
          'Low-stock widget (BO-E05). Lists the products at or below the stock threshold, lowest',
          'first, with a red «ناموجود» badge at zero and a yellow «n عدد» badge below the threshold.',
          'The pencil emits the product id and the page navigates; «مشاهده همه» goes to the products',
          'list.',
          '',
          '**BO-E07 — one `state()` for all four outcomes.** The card reads a single `state()`',
          'computed resolving to `loading | error | empty | data` (tc 7). Priority: `error` wins over',
          'everything — a dead request must NEVER look like the green «موجودی انبار در وضعیت سالم است»',
          'block, which is the genuine `empty` answer — then `loading` / a `null` payload (skeleton),',
          'then a real `[]` (`empty`, the good-news check), then `data`. On `error` the card renders',
          'the SAME `<app-error-state>` the page and the other widgets draw (tc 8); «تلاش دوباره» emits',
          '`retry`, and the page re-runs the low-stock request.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<LowStock>;

// ─── stories ─────────────────────────────────────────────────────────────────

/** Four products at or below `threshold=5`, sorted by lowest stock first. */
export const Default: Story = {};

/**
 * The filter at work: six products in, four rows out.
 *
 * The two healthy rows (stock 18 and 40) are fetched and then dropped by
 * `filteredItems()` — the same thing that happens if the API ignores the
 * `?threshold=` parameter.
 */
export const Filtered: Story = {
  args: { items: MIXED_ITEMS },
};

/** The skeleton: no response yet. Four placeholder rows, no count badge. */
export const Loading: Story = {
  args: { items: null, loading: false },
};

/**
 * The low-stock request rejected (BO-E07 tc 2 / tc 8).
 *
 * `error` is non-null, so `state()` resolves to `'error'` BEFORE the `null`
 * payload could fall through to the skeleton OR the green «انبار سالم است»
 * block — a dead request must never look like a healthy warehouse. The retry
 * block is the SAME `<app-error-state>` the page and the other widgets draw.
 */
export const Error: Story = {
  args: {
    items: null,
    loading: false,
    error: 'دریافت کالاهای کم‌موجودی ناموفق بود',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The card hands the message to `<app-error-state>`: a red alert with `role="alert"`, the ' +
          'text «دریافت کالاهای کم‌موجودی ناموفق بود», and a «تلاش دوباره» button whose only job is `retry.emit()`.',
      },
    },
  },
};

/**
 * A re-resolve in flight (`loading` is the page's own flag) — identical to
 * `Loading`, and kept as its own story because the two inputs come from
 * different places: `items: null` is "never answered", `loading` is "asking
 * again".
 */
export const Refreshing: Story = {
  args: { items: ITEMS, loading: true },
};

/**
 * Healthy shelves: the green check, not a warning.
 *
 * This is the one empty state in the panel that is good news.
 */
export const HealthyStock: Story = {
  args: { items: [] },
};

/** Everything is out of stock: every badge red, every label «ناموجود». */
export const OutOfStock: Story = {
  args: {
    items: [
      { id: 'p1', name: 'کیبورد مکانیکی', stock: 0, price: 1_850_000, imageUrl: null },
      { id: 'p2', name: 'ماوس گیمینگ', stock: 0, price: 920_000, imageUrl: null },
    ],
  },
};

/**
 * A tighter threshold (`2`): only the stock-0 and stock-2 rows survive.
 *
 * Shows why the number is an input: the same response renders differently
 * when a store decides that "low" means 2 rather than 5.
 */
export const CustomThreshold: Story = {
  args: { threshold: 2 },
};
