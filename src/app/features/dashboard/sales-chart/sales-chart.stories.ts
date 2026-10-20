// src/app/features/dashboard/sales-chart/sales-chart.stories.ts
import { Meta, StoryObj } from '@storybook/angular';

import type { SalesChartPoint } from '../models/dashboard.model';

import { SalesChart } from './sales-chart';

/**
 * One week, two metrics a day.
 *
 * `orders` is roughly `value / 1_800_000` — the same derivation the mock
 * fixtures use — so the two bars tell one story instead of contradicting each
 * other the way two hand-written series would.
 */
const SAMPLE_7_DAYS: SalesChartPoint[] = [
  { date: '2026-10-12', value: 14_000_000, orders: 8 },
  { date: '2026-10-13', value: 18_500_000, orders: 10 },
  { date: '2026-10-14', value: 22_000_000, orders: 12 },
  { date: '2026-10-15', value: 16_000_000, orders: 9 },
  { date: '2026-10-16', value: 29_000_000, orders: 16 },
  { date: '2026-10-17', value: 21_000_000, orders: 12 },
  { date: '2026-10-18', value: 35_000_000, orders: 19 },
];

const SAMPLE_30_DAYS: SalesChartPoint[] = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const dayStr = day < 10 ? `0${day}` : `${day}`;
  const value = 10_000_000 + ((i * 37) % 17) * 2_500_000;

  return {
    date: `2026-09-${dayStr}`,
    value,
    orders: Math.max(1, Math.round(value / 1_800_000)),
  };
});

const meta: Meta<SalesChart> = {
  title: 'Features/Dashboard/SalesChart',
  component: SalesChart,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'Sales Chart widget (BO-E03): a grouped bar chart of the last 7 or 30 days with **two',
          'bars per day** — order count on the left axis, revenue on the right — built on PrimeNG',
          'UIChart with Jalali date labels and RTL/FaNum formatting.',
          '',
          '**BO-E07 — one `state()` for all four outcomes.** The card reads a single `state()`',
          'computed resolving to `loading | error | empty | data` (tc 7). Priority: `error` wins',
          '(a rejected sales request shows the retry block, never a blank canvas), then the explicit',
          '`loading` flag (the chart’s OWN in-flight request), then a `null` OR `[]` payload',
          '(`empty` — a chart treats "no points" and "missing array" the same), then `data`. On',
          '`error` the card renders the SAME `<app-error-state>` the page and the other widgets draw',
          '(tc 8); «تلاش دوباره» emits `retry`, and the page re-runs the sales request for the same',
          'range.',
          '',
          '**Use case** — the dashboard\u2019s «آمار فروش» card, and nowhere else yet. Reach for it when',
          'two numbers share a period and have to be read against each other; do NOT reach for it',
          'when only one series exists — two axes for one metric is a chart that lies about its',
          'scale.',
          '',
          '**How to use** — one input carries both metrics:',
          '',
          '```html',
          '<app-sales-chart',
          '  [data]="points()"',
          '  [range]="range()"',
          '  [loading]="loading()"',
          '  (rangeChange)="onRangeChange($event)"',
          '/>',
          '```',
          '',
          '```ts',
          "// { date: '2026-10-18', value: 35_000_000, orders: 19 }",
          '//   value  — revenue in TOMAN (the axis divides by a million for its labels)',
          '//   orders — a count, on its own axis',
          '```',
          '',
          '**Logic** — the two metrics cannot share a scale: 14-35 million Toman against 8-25 orders',
          'would flatten the counts into the axis, so `orders` and `revenue` are separate scales and',
          'only ONE of them draws grid lines. The tooltip branches on `dataset.yAxisID`, so a count',
          'can never be printed with «تومان». Revenue stays in Toman in the dataset (not in millions)',
          'so the tooltip can print an exact amount; only the tick callback divides.',
          '',
          'The card fills its grid row (`h-full` + `flex-1` on the plot): it shares an `xl` row with',
          '«کالاهای کم‌موجودی», and a fixed height left the two ending at different lines.',
          '',
          '**Formatting (BO-E06)** — every label comes from the shared pipes\u2019 functions:',
          "`formatPersianDate(date, 'dayMonth')` for the x axis, `formatDigits` for the order ticks",
          'and the order tooltip, `formatToman` for the revenue ticks and tooltip, and `TOMAN_UNIT`',
          'for the currency word in the legend. A chart builds its labels in TypeScript, where a pipe',
          'cannot reach — so before this it had its own `Intl.DateTimeFormat` and called',
          "`toLocaleString('fa-IR')` three times, and the same amount could render one way in a",
          'table and another way in a tooltip. Do not add a formatter here; import the function.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<SalesChart>;

export const SevenDays: Story = {
  args: {
    data: SAMPLE_7_DAYS,
    range: 7,
    loading: false,
  },
};

export const ThirtyDays: Story = {
  args: {
    data: SAMPLE_30_DAYS,
    range: 30,
    loading: false,
  },
};

export const Loading: Story = {
  args: {
    data: null,
    range: 7,
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    data: [],
    range: 7,
    loading: false,
  },
};

/**
 * The sales request rejected (BO-E07 tc 2 / tc 8).
 *
 * `error` is non-null, so `state()` resolves to `'error'` BEFORE the `null`
 * payload could fall through to `'empty'` — the chart area shows the retry
 * block, never a blank canvas or a stray axis. «تلاش دوباره» emits `retry` for
 * the same `range`.
 */
export const Error: Story = {
  args: {
    data: null,
    range: 7,
    loading: false,
    error: 'دریافت نمودار فروش ناموفق بود',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The card hands the message to `<app-error-state>`: a red alert with `role="alert"`, the ' +
          'text «دریافت نمودار فروش ناموفق بود», and a «تلاش دوباره» button whose only job is `retry.emit()`.',
      },
    },
  },
};
