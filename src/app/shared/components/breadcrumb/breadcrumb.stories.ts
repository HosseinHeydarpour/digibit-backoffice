import { signal } from '@angular/core';
import { BreadcrumbService } from '@core/services/breadcrumb';
import type { BreadcrumbItem } from '@shared/models';
import { Meta, StoryObj, moduleMetadata } from '@storybook/angular';

import { Breadcrumb } from './breadcrumb';

/**
 * The trail a story hands to the component.
 *
 * The real `BreadcrumbService` walks the active route hierarchy, which
 * Storybook has no equivalent of — so each story supplies a literal trail. That
 * is also the clearest way to see what the service produces.
 */
const withCrumbs = (crumbs: readonly BreadcrumbItem[]) => ({
  provide: BreadcrumbService,
  useValue: { crumbs: signal(crumbs) } as unknown as BreadcrumbService,
});

const TWO_LEVELS: readonly BreadcrumbItem[] = [
  { label: 'پیشخوان', url: '/' },
  { label: 'محصولات', url: '/products' },
];

const THREE_LEVELS: readonly BreadcrumbItem[] = [
  { label: 'پیشخوان', url: '/' },
  { label: 'محصولات', url: '/products' },
  { label: 'ویرایش محصول ۱۲', url: '/products/12' },
];

const ONE_LEVEL: readonly BreadcrumbItem[] = [{ label: 'پیشخوان', url: '/dashboard' }];

const meta: Meta<Breadcrumb> = {
  title: 'Shared/Breadcrumb',
  component: Breadcrumb,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'The breadcrumb trail for the current page, built from the route hierarchy.',
          '',
          '**Use case** — you almost never mount it directly. `PageHeader` imports it, and the',
          'header is what a page uses. Mount it on its own only where a page needs a trail but not',
          'a title row.',
          '',
          '**How to use** — it takes **no inputs**. It injects `BreadcrumbService` and renders',
          'whatever `crumbs` holds; a page declares its crumbs in the **route**:',
          '',
          '```ts',
          "{ path: 'products', data: { breadcrumb: 'محصولات' } }",
          '```',
          '',
          '**Logic** — the component is deliberately dumb. It owns no route logic, which is the same',
          'split as `Topbar` (presentation) against `PageTitleService` (state). A component that also',
          'walked the router would be untestable without a router harness, and there would be two',
          'places that know the trail\u2019s shape.',
          '',
          'Every step but the last renders as a `<a routerLink>`; the last step is the current page',
          'and renders as plain text carrying `aria-current="page"`, so a screen reader announces it',
          'as the destination rather than as another link.',
          '',
          'An **empty trail renders nothing at all** — no `<nav>`, no chips. A 404 has no place in a',
          'trail, and a synthetic «خانه» chip would link to a route that may not exist. That is also',
          'what makes `PageHeader`\u2019s `showBreadcrumb` an override rather than a requirement.',
          '',
          '> **Template note.** `@for`/`@if` do not unwrap signals, so the component calls `crumbs()`.',
          '> Only interpolations `{{ }}` unwrap automatically.',
        ].join('\n'),
      },
    },
  },
};
export default meta;
type Story = StoryObj<Breadcrumb>;

/** The typical case: a two-level page under the dashboard. */
export const Default: Story = {
  decorators: [moduleMetadata({ providers: [withCrumbs(TWO_LEVELS)] })],
  parameters: {
    docs: {
      description: {
        story:
          '«پیشخوان» is a link, «محصولات» is the current page — plain text, bold, with ' +
          '`aria-current="page"`. The chevron between them is `pi pi-chevron-left`, which points ' +
          'the correct way in RTL and is `aria-hidden` because it is decoration.',
      },
    },
  },
};

/** A deep route: two links and a current page. */
export const ThreeLevels: Story = {
  decorators: [moduleMetadata({ providers: [withCrumbs(THREE_LEVELS)] })],
  parameters: {
    docs: {
      description: {
        story:
          'The third crumb names the record, which is why `data.breadcrumb` accepts a function — ' +
          'see [BreadcrumbService](/docs/core-breadcrumbservice--docs).',
      },
    },
  },
};

/** A flat page — a lone crumb, rendered as plain text because there is nowhere to go back to. */
export const SingleCrumb: Story = {
  decorators: [moduleMetadata({ providers: [withCrumbs(ONE_LEVEL)] })],
  parameters: {
    docs: {
      description: {
        story:
          'One crumb is the whole trail. Worth having as a story because it is the shape the ' +
          'dashboard produces, and the `$last` branch is the only one that renders.',
      },
    },
  },
};

/**
 * An empty trail — the component renders **nothing**.
 *
 * Not an empty `<nav>`, not a stray margin. The frame around this story is the
 * only thing on screen.
 */
export const Empty: Story = {
  decorators: [moduleMetadata({ providers: [withCrumbs([])] })],
  parameters: {
    docs: {
      description: {
        story:
          'What a route with no `data.breadcrumb` produces, including the 404 wildcard. The ' +
          'silence is the feature — see the component description.',
      },
    },
  },
};

/** A long trail, to check it scrolls rather than wrapping. */
export const LongTrail: Story = {
  decorators: [
    moduleMetadata({
      providers: [
        withCrumbs([
          { label: 'پیشخوان', url: '/' },
          { label: 'فروشگاه', url: '/shop' },
          { label: 'محصولات', url: '/shop/products' },
          { label: 'دسته‌بندی‌ها', url: '/shop/products/categories' },
          { label: 'لوازم جانبی', url: '/shop/products/categories/accessories' },
          { label: 'ویرایش دسته‌بندی', url: '/shop/products/categories/accessories/edit' },
        ]),
      ],
    }),
  ],
  parameters: {
    docs: {
      description: {
        story:
          'The list is `overflow-x-auto whitespace-nowrap`, so a deep trail scrolls horizontally ' +
          'instead of wrapping onto several lines and pushing the title down. No route here nests ' +
          'this deep — it is a boundary check.',
      },
    },
  },
};
