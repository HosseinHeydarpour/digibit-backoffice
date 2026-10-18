import { Component } from '@angular/core';
import { Meta, StoryObj } from '@storybook/angular';

import { PersianDatePipe } from './persian-date.pipe';
import { PersianDigitsPipe } from './persian-digits.pipe';
import { TomanPipe } from './toman.pipe';

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
          </tr>
        </thead>
        <tbody>
          @for (row of rows; track row.value) {
            <tr class="${ROW}">
              <td class="${TD} font-mono text-xs">{{ row.label }}</td>
              <td class="${TD}">{{ row.value | persianDate }}</td>
              <td class="${TD}">{{ row.value | persianDate: 'long' }}</td>
              <td class="${TD}">{{ row.value | persianDate: 'monthYear' }}</td>
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
          </tr>
        </thead>
        <tbody>
          @for (row of rows; track row.label) {
            <tr class="${ROW}">
              <td class="${TD} font-mono text-xs">{{ row.label }}</td>
              <td class="${TD}">{{ row.value | toman }}</td>
              <td class="${TD}">{{ row.value | toman: noUnit }}</td>
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
        ].join('\n'),
      },
    },
  },
};
export default meta;
type Story = StoryObj;

/** Gregorian -> Jalali in all three styles, plus the empty and invalid cases. */
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
          'order for the year+month skeleton, not a mistake.',
      },
    },
  },
};

/** Amounts as Toman, with grouping, zero, negatives and a Rial source. */
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
          'column whose header already says «مبلغ (تومان)».',
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
