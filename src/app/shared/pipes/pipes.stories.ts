import { Component } from '@angular/core';
import { Meta, StoryObj } from '@storybook/angular';

import { formatPersianDate, PersianDatePipe } from './persian-date.pipe';
import { formatDigits, PersianDigitsPipe } from './persian-digits.pipe';
import { formatToman, TOMAN_UNIT, TomanPipe } from './toman.pipe';

/**
 * The three pipes have no inputs, so there is nothing for a Controls panel to
 * drive and `autodocs` would generate an empty args table. These stories do the
 * only thing that is useful for a formatter instead: they SHOW the mapping —
 * input on one side, exact output on the other — including the awkward cases
 * (null, zero, negative, invalid) that a reader would otherwise have to guess at.
 *
 * Each story is its own host with hardcoded data rather than one host driven by
 * args, because there is no component to configure and a shared host would only
 * add indirection.
 *
 * The rows are the SAME cases the specs assert, so the canvas and the test suite
 * cannot drift apart silently.
 *
 * BO-E06 adds the second half of the contract: each pipe is a wrapper over an
 * exported function (`formatPersianDate` / `formatToman` / `formatDigits`), so
 * TypeScript callers — the sales chart's axes and tooltip — can format without a
 * template. The `ChartLabels` story below renders the chart's strings from those
 * functions, next to the pipe's output for the same value, so a divergence
 * between the two would be visible in the catalogue.
 */

/** Shared chrome so the three tables read as one family. */
const CARD =
  'overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800';
const TH = 'px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400';
const TD = 'px-4 py-3 text-sm text-dark dark:text-light';
const ROW = 'border-t border-gray-100 dark:border-gray-700';

@Component({
  selector: 'app-persian-date-story',
  imports: [PersianDatePipe],
  template: `
    <div class="${CARD}">
      <table class="w-full">
        <thead>
          <tr class="bg-gray-50 dark:bg-gray-900">
            <th class="${TH}">ورودی</th>
            <th class="${TH}">short</th>
            <th class="${TH}">long</th>
            <th class="${TH}">monthYear</th>
            <th class="${TH}">dayMonth</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows; track row.value) {
            <tr class="${ROW}">
              <td class="${TD} font-mono text-xs">{{ row.label }}</td>
              <td class="${TD}">{{ row.value | persianDate }}</td>
              <td class="${TD}">{{ row.value | persianDate: 'long' }}</td>
              <td class="${TD}">{{ row.value | persianDate: 'monthYear' }}</td>
              <td class="${TD}">{{ row.value | persianDate: 'dayMonth' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
class PersianDateStory {
  protected readonly rows = [
    { label: "'2025-09-23'", value: '2025-09-23' },
    { label: "'2026-03-21'", value: '2026-03-21' },
    { label: "'2025-03-20'", value: '2025-03-20' },
    { label: "'2024-12-31'", value: '2024-12-31' },
    { label: 'null', value: null },
    { label: "'not-a-date'", value: 'not-a-date' },
    { label: "'2025-02-31'", value: '2025-02-31' },
  ] as { label: string; value: string | null }[];
}

@Component({
  selector: 'app-toman-story',
  imports: [TomanPipe],
  template: `
    <div class="${CARD}">
      <table class="w-full">
        <thead>
          <tr class="bg-gray-50 dark:bg-gray-900">
            <th class="${TH}">ورودی</th>
            <th class="${TH}">پیش‌فرض</th>
            <th class="${TH}">unit: false</th>
            <th class="${TH}">محور نمودار (میلیون)</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows; track row.label) {
            <tr class="${ROW}">
              <td class="${TD} font-mono text-xs">{{ row.label }}</td>
              <td class="${TD}">{{ row.value | toman }}</td>
              <td class="${TD}">{{ row.value | toman: noUnit }}</td>
              <td class="${TD}">{{ axis(row.value) }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
class TomanStory {
  /**
   * A STABLE object, not `{ unit: false }` inline.
   *
   * A pure pipe re-runs whenever its argument changes identity, and an object
   * literal in a template is a new object on every change detection pass — so
   * `| toman: { unit: false }` would re-format every row every time, throwing
   * away the memoisation that makes the pipe pure in the first place. Hold the
   * options on the component and pass the reference.
   */
  protected readonly noUnit = { unit: false };

  /**
   * The last column: what the sales chart's right-hand axis prints.
   *
   * It goes through `formatToman` — the function the pipe wraps — not through a
   * second formatter, which is the whole point of BO-E06. The division by a
   * million happens here because only the LABEL is in millions; the dataset
   * stays in exact Toman so the tooltip can print the full amount.
   */
  protected axis(value: number | string | null): string {
    if (value === null) {
      return '';
    }

    return formatToman(Number(value) / 1_000_000, { unit: false });
  }

  protected readonly rows = [
    { label: '1250000', value: 1250000 },
    { label: '999', value: 999 },
    { label: '0', value: 0 },
    { label: '-45000', value: -45000 },
    { label: "'1250000'", value: '1250000' },
    { label: 'null', value: null },
    { label: "'abc'", value: 'abc' },
  ] as { label: string; value: number | string | null }[];
}

@Component({
  selector: 'app-persian-digits-story',
  imports: [PersianDigitsPipe],
  template: `
    <div class="${CARD}">
      <table class="w-full">
        <thead>
          <tr class="bg-gray-50 dark:bg-gray-900">
            <th class="${TH}">ورودی</th>
            <th class="${TH}">خروجی</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows; track row.label) {
            <tr class="${ROW}">
              <td class="${TD} font-mono text-xs">{{ row.label }}</td>
              <td class="${TD}">{{ row.value | persianDigits }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
class PersianDigitsStory {
  protected readonly rows = [
    { label: "'1234567890'", value: '1234567890' },
    { label: '0', value: 0 },
    { label: "'سفارش 42 از 100'", value: 'سفارش 42 از 100' },
    { label: "'۱۴۰۴' (already Persian)", value: '۱۴۰۴' },
    { label: 'null', value: null },
  ] as { label: string; value: string | number | null }[];
}

/**
 * All three together, in the shape they will actually be used: an order table.
 *
 * This is the composition BO-B17 reviews — a Jalali date, a grouped Toman
 * amount and a Persian order code in one row — so a visual regression in any of
 * them is visible here first.
 */
@Component({
  selector: 'app-pipes-context-story',
  imports: [PersianDatePipe, PersianDigitsPipe, TomanPipe],
  template: `
    <div class="mx-auto w-full max-w-3xl ${CARD}">
      <table class="w-full">
        <thead>
          <tr class="bg-gray-50 dark:bg-gray-900">
            <th class="${TH}">کد سفارش</th>
            <th class="${TH}">تاریخ</th>
            <th class="${TH}">مبلغ (تومان)</th>
          </tr>
        </thead>
        <tbody>
          @for (order of orders; track order.code) {
            <tr class="${ROW}">
              <td class="${TD}">{{ order.code | persianDigits }}</td>
              <td class="${TD}">{{ order.createdAt | persianDate }}</td>
              <td class="${TD}">{{ order.total | toman: noUnit }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
class PipesContextStory {
  /** Stable options object — see the note on `TomanStory.noUnit`. */
  protected readonly noUnit = { unit: false };

  protected readonly orders = [
    { code: '1042', createdAt: '2025-09-23', total: 1250000 },
    { code: '1043', createdAt: '2025-09-24', total: 860000 },
    { code: '1044', createdAt: '2026-03-21', total: 15400000 },
    { code: '1045', createdAt: '2025-02-31', total: 0 },
  ];
}

/**
 * The strings the sales chart prints, built by the SAME functions the pipes wrap.
 *
 * A chart cannot use a pipe: its axis labels and tooltip lines are properties of
 * a Chart.js options object, constructed in TypeScript. Before BO-E06 the chart
 * therefore had its own `Intl.DateTimeFormat` and called `toLocaleString('fa-IR')`
 * three times, so the same amount could render one way in a table and another way
 * in a tooltip. This story is the visual proof that there is one formatter: every
 * cell below comes from `formatPersianDate` / `formatToman` / `formatDigits`.
 */
@Component({
  selector: 'app-chart-labels-story',
  template: `
    <div class="flex flex-col gap-4">
      <div class="${CARD}">
        <table class="w-full">
          <thead>
            <tr class="bg-gray-50 dark:bg-gray-900">
              <th class="${TH}">تاریخ (API)</th>
              <th class="${TH}">برچسب محور x</th>
              <th class="${TH}">tooltip — سفارشات</th>
              <th class="${TH}">tooltip — درآمد</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows; track row.date) {
              <tr class="${ROW}">
                <td class="${TD} font-mono text-xs">{{ row.date }}</td>
                <td class="${TD}">{{ row.label }}</td>
                <td class="${TD}">{{ row.ordersLine }}</td>
                <td class="${TD}">{{ row.revenueLine }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="${CARD} p-4">
          <p class="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            محور درآمد (میلیون) — {{ revenueTitle }}
          </p>
          <div class="flex flex-wrap gap-2">
            @for (tick of revenueTicks; track tick) {
              <span class="rounded bg-gray-100 px-2 py-1 text-sm dark:bg-gray-700">{{ tick }}</span>
            }
          </div>
        </div>

        <div class="${CARD} p-4">
          <p class="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            محور سفارشات — {{ ordersTitle }}
          </p>
          <div class="flex flex-wrap gap-2">
            @for (tick of orderTicks; track tick) {
              <span class="rounded bg-gray-100 px-2 py-1 text-sm dark:bg-gray-700">{{ tick }}</span>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
class ChartLabelsStory {
  /** Seven days, in the shape `SalesChartPoint` has after BO-E03. */
  private readonly points = [
    { date: '2026-10-12', value: 29_600_000, orders: 16 },
    { date: '2026-10-13', value: 34_800_000, orders: 19 },
    { date: '2026-10-14', value: 31_500_000, orders: 18 },
    { date: '2026-10-15', value: 36_200_000, orders: 20 },
    { date: '2026-10-16', value: 33_900_000, orders: 19 },
    { date: '2026-10-17', value: 37_400_000, orders: 21 },
    { date: '2026-10-18', value: 42_000_000, orders: 23 },
  ];

  /** Legend and axis title — the same string, from the one currency constant. */
  protected readonly revenueTitle = `درآمد (میلیون ${TOMAN_UNIT})`;
  protected readonly ordersTitle = 'تعداد سفارشات';

  protected readonly rows = this.points.map((p) => ({
    date: p.date,
    label: formatPersianDate(p.date, 'dayMonth'),
    ordersLine: `سفارشات: ${formatDigits(p.orders)}`,
    revenueLine: `درآمد: ${formatToman(p.value)}`,
  }));

  /** The right axis divides by a million for the LABEL only, and drops the unit. */
  protected readonly revenueTicks = [0, 10_000_000, 20_000_000, 30_000_000].map((v) =>
    formatToman(v / 1_000_000, { unit: false }),
  );

  /** The left axis is a count — `formatDigits`, never `formatToman`. */
  protected readonly orderTicks = [0, 5, 10, 15, 20].map((v) => formatDigits(v));
}

const meta: Meta = {
  title: 'Shared/PersianPipes',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: [
          'Three pure pipes that make Persian the default rather than a per-page decision:',
          '`persianDate` (Gregorian -> Jalali), `toman` (amount -> grouped digits + unit) and',
          '`persianDigits` (Latin -> Persian numerals).',
          '',
          'Each story is a mapping table: the input on the left, the exact output on the right,',
          'including the awkward cases. The rows are the same cases the specs assert, so the canvas',
          'and the test suite cannot drift apart.',
          '',
          'Each pipe is also a thin wrapper over an exported function — `formatPersianDate`,',
          '`formatToman`, `formatDigits` — because a chart labels its axes from TypeScript, where a',
          'pipe cannot reach. Call the function from `.ts`, the pipe from `.html`; never write a',
          'third formatter. `ChartLabels` shows both sides agreeing on the same values.',
        ].join('\n'),
      },
    },
  },
};
export default meta;
type Story = StoryObj;

/** Gregorian -> Jalali in all four styles, plus the empty and invalid cases. */
export const Dates: Story = {
  render: () => ({
    template: `<app-persian-date-story />`,
    moduleMetadata: { imports: [PersianDateStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'A date-only string is parsed as a LOCAL calendar date, so the day never shifts with ' +
          'the viewer’s timezone — `2025-09-23` is `۱۴۰۴/۰۷/۰۱` everywhere. `null` renders ' +
          'nothing; an unparseable value renders «—», so absent and broken look different. ' +
          '`2025-02-31` is in the table because `new Date()` silently rolls it to 3 March; the ' +
          'pipe rejects it instead. Note that `monthYear` puts the year first — that is CLDR’s ' +
          'order for the year+month skeleton, not a mistake. `dayMonth` is the sales chart’s x ' +
          'axis: the year is the same for every bar, so printing it seven times would be noise, ' +
          'and `short` would read `۱۴۰۵/۰۷/۲۶` — a date, not a label.',
      },
    },
  },
};

/** Amounts as Toman, with grouping, zero, negatives and the chart's axis form. */
export const Prices: Story = {
  render: () => ({
    template: `<app-toman-story />`,
    moduleMetadata: { imports: [TomanStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'The separator is U+066C (٬), which `Intl` supplies — not a Latin comma. The unit is ' +
          'joined with a no-break space so «تومان» cannot orphan onto the next line in a narrow ' +
          'cell. A negative amount keeps the invisible LRM that CLDR inserts, because without it ' +
          'the minus renders on the wrong side inside an RTL paragraph. `unit: false` is for a ' +
          'column whose header already says «مبلغ (تومان)». The last column is the sales chart’s ' +
          'right-hand axis: it divides by a million and drops the unit because the axis title ' +
          'already carries it — and it does that through `formatToman`, not a second formatter.',
      },
    },
  },
};

/** Latin digits -> Persian, for values that are not numbers. */
export const Digits: Story = {
  render: () => ({
    template: `<app-persian-digits-story />`,
    moduleMetadata: { imports: [PersianDigitsStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'Character-by-character, so words and punctuation survive: `سفارش 42 از 100` keeps its ' +
          'text and only the numerals change. Zero becomes «۰» and not an empty string — the ' +
          'classic falsy-value bug. This pipe is for order codes, phone numbers and counts; ' +
          'anything that needs grouping belongs in `toman`, which already emits Persian digits.',
      },
    },
  },
};

/** All three in the layout they are built for: an order table. */
export const InContext: Story = {
  render: () => ({
    template: `<app-pipes-context-story />`,
    moduleMetadata: { imports: [PipesContextStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'The composition BO-B17 reviews: a Persian order code, a Jalali date and a grouped ' +
          'amount in one row. The unit lives in the column header rather than on every row, which ' +
          'is why the price cell passes `{ unit: false }`. The last row carries an invalid date ' +
          'and a zero total on purpose — that is what a half-broken API response looks like, and ' +
          'it should degrade to «—» and «۰» rather than blank cells.',
      },
    },
  },
};

/** The chart's axis labels and tooltip lines — the TypeScript side of the contract. */
export const ChartLabels: Story = {
  render: () => ({
    template: `<app-chart-labels-story />`,
    moduleMetadata: { imports: [ChartLabelsStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'The sales chart cannot use a pipe: its labels are Chart.js options built in TypeScript. ' +
          'Before BO-E06 it had its own `Intl.DateTimeFormat` and called `toLocaleString(’fa-IR’)` ' +
          'three times, so the same amount could render one way in a table and another in a ' +
          'tooltip. Every cell here comes from `formatPersianDate` / `formatToman` / ' +
          '`formatDigits` — the functions the pipes wrap — and the legend title is built from ' +
          '`TOMAN_UNIT`, so the currency word is spelled once in the whole app.',
      },
    },
  },
};
