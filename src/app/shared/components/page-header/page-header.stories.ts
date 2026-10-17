import { Component, signal } from '@angular/core';
import { BreadcrumbService } from '@core/services/breadcrumb';
import type { BreadcrumbItem } from '@shared/models';
import { Meta, StoryObj, moduleMetadata } from '@storybook/angular';

import { PageHeader } from './page-header';

const SAMPLE_CRUMBS: readonly BreadcrumbItem[] = [
  { label: 'پیشخوان', url: '/' },
  { label: 'محصولات', url: '/products' },
];

/**
 * A breadcrumb trail for the stories. The real service reads the active route
 * hierarchy, which Storybook has no equivalent of.
 */
const breadcrumbStub = {
  provide: BreadcrumbService,
  useValue: { crumbs: signal(SAMPLE_CRUMBS) } as unknown as BreadcrumbService,
};

/** No crumbs at all — the case a one-level page hits. */
const emptyBreadcrumbStub = {
  provide: BreadcrumbService,
  useValue: { crumbs: signal<readonly BreadcrumbItem[]>([]) } as unknown as BreadcrumbService,
};

/**
 * A realistic page header with its action buttons in the slot.
 *
 * The buttons carry the `page-header-actions` attribute — that is the whole
 * contract of the slot.
 */
@Component({
  selector: 'app-page-header-story',
  imports: [PageHeader],
  template: `
    <app-page-header title="محصولات" description="مدیریت کالاهای فروشگاه">
      <button
        type="button"
        page-header-actions
        class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
      >
        افزودن محصول
      </button>
      <button
        type="button"
        page-header-actions
        class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200"
      >
        چاپ فاکتور
      </button>
    </app-page-header>
  `,
})
class PageHeaderStory {}

const meta: Meta<PageHeader> = {
  title: 'Shared/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ providers: [breadcrumbStub] })],
  parameters: {
    docs: {
      description: {
        component: [
          'The uniform header every page starts with: an optional breadcrumb trail, the page title,',
          'an optional one-line description, and a slot for the page\u2019s primary actions.',
          '',
          '**Use case** — every list and detail page. Reach for it rather than writing the row by',
          'hand: copy-pasting «محصولات» on the right and «افزودن محصول» on the left into fifteen',
          'pages guarantees fifteen slightly different headers, and one place to change the spacing',
          'becomes fifteen.',
          '',
          '**How to use** — `title` is required and everything else is optional. Actions are',
          '**projected**, and only elements carrying the `page-header-actions` attribute are rendered:',
          '',
          '```html',
          '<app-page-header title="محصولات" description="مدیریت کالاهای فروشگاه">',
          '  <button type="button" page-header-actions class="…">افزودن محصول</button>',
          '</app-page-header>',
          '```',
          '',
          'An element **without** the attribute is silently dropped — that is the point: the header',
          'decides where actions go and the `select` is the contract. Several elements may carry it',
          'and they render in source order.',
          '',
          '**Logic** — the trail is a real import rather than a second slot, because the breadcrumb is',
          'part of what a header *is*, not something a caller supplies. `showBreadcrumb` exists as a',
          'manual override, not a requirement: even when it is `true`, a route that declares no',
          '`data.breadcrumb` produces an empty trail and `Breadcrumb` renders nothing on its own.',
          '',
          'In RTL the title sits at the inline-start edge — the right — and the actions at the',
          'inline-end — the left — with no `flex-row-reverse`: DOM order already produces that once',
          'the document is `dir="rtl"`. Below `sm` the row stacks, because squeezing both into one',
          'line at 320px is what truncates titles to «محصو…».',
          '',
          '`min-w-0` on the title column is load-bearing rather than decorative: a flex item defaults',
          'to `min-width: auto`, which refuses to shrink below its content, so a long title would push',
          'the actions off-screen instead of ellipsising.',
          '',
          '`input.required<string>()` on `title` is a real guardrail: a page that forgets it fails to',
          '**compile** instead of rendering an empty `<h1>` — a bug otherwise only visible by eye.',
        ].join('\n'),
      },
    },
  },
};
export default meta;
type Story = StoryObj<PageHeader>;

/**
 * The minimal call site — a title and nothing else.
 *
 * No description paragraph is rendered at all, so there is no stray margin, and
 * the breadcrumb is present because this route would have crumbs.
 */
export const TitleOnly: Story = {
  args: { title: 'پیشخوان' },
};

/** Title plus the one-line explanation that tells a new admin what the page is for. */
export const WithDescription: Story = {
  args: {
    title: 'محصولات',
    description: 'مدیریت کالاهای فروشگاه',
  },
};

/**
 * Two projected actions.
 *
 * Note they render at the inline-end — the left edge in this RTL app — in source
 * order, and the title column keeps the rest of the row.
 */
export const WithActions: Story = {
  render: () => ({
    template: `<app-page-header-story />`,
    moduleMetadata: { imports: [PageHeaderStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'A detail page would use the same slot with different labels — «چاپ فاکتور» and ' +
          '«لغو سفارش». The slot accepts as many actions as the page needs; `flex-wrap` lets three ' +
          'or more stack onto a second row on a narrow desktop instead of overflowing.',
      },
    },
  },
};

/**
 * `[showBreadcrumb]="false"`.
 *
 * For a page that already shows a trail elsewhere, or a one-level page where a
 * lone crumb adds nothing.
 */
export const WithoutBreadcrumb: Story = {
  args: {
    title: 'تنظیمات',
    showBreadcrumb: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          'The flag is a manual override. The automatic case is a route that declares no ' +
          '`data.breadcrumb` — see `NoRouteCrumbs`.',
      },
    },
  },
};

/**
 * A route that declares no crumb.
 *
 * `Breadcrumb` self-hides when the trail is empty, so the header renders exactly
 * as if `showBreadcrumb` were `false` — with no leftover gap. This is the case
 * that makes the flag optional rather than required.
 */
export const NoRouteCrumbs: Story = {
  args: {
    title: 'تنظیمات',
  },
  decorators: [moduleMetadata({ providers: [emptyBreadcrumbStub] })],
  parameters: {
    docs: {
      description: {
        story:
          'Compare with `WithoutBreadcrumb` — visually identical, but reached a different way. ' +
          'A 404 has no place in a trail, so the silence is deliberate rather than a missing crumb.',
      },
    },
  },
};

/**
 * A title longer than the available width, inside a 24rem column.
 *
 * `truncate` ellipsises it and the `nowrap` half means it never breaks onto a
 * second line. `min-w-0` on the column is what allows the shrink — remove it and
 * the title pushes the actions off-screen instead.
 */
export const LongTitleTruncates: Story = {
  args: {
    title: 'گزارش تفصیلی تراکنش‌های مالی فروشگاه در بازهٔ زمانی انتخاب‌شده',
    description: 'این توضیح هم طولانی است تا رفتار برش متن را نشان دهد.',
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="w-96 max-w-full">
        <app-page-header [title]="title" [description]="description" />
      </div>
    `,
    moduleMetadata: { imports: [PageHeader] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'Truncation is the reason the header must not be used where a full title has to be ' +
          'readable — a detail page should keep its title short.',
      },
    },
  },
};

/** The header on a real-looking page, with content underneath it. */
export const OnAPage: Story = {
  args: {},
  render: () => ({
    template: `
      <div class="bg-light p-6 dark:bg-background-dark">
        <app-page-header title="محصولات" description="مدیریت کالاهای فروشگاه">
          <button
            type="button"
            page-header-actions
            class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            افزودن محصول
          </button>
        </app-page-header>

        <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-md dark:border-gray-700 dark:bg-card-dark">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            ناحیهٔ محتوا — جدول محصولات اینجا قرار می‌گیرد.
          </p>
        </div>
      </div>
    `,
    moduleMetadata: { imports: [PageHeader] },
  }),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story:
          'The `mb-6` bottom margin is the header\u2019s own — a page does not add spacing below it. ' +
          'That is one of the things a shared header makes consistent.',
      },
    },
  },
};
