import { signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BreadcrumbService } from '@core/services/breadcrumb';
import { Meta, StoryObj, moduleMetadata } from '@storybook/angular';
import { EMPTY, of } from 'rxjs';

import { Dashboard } from './dashboard';
import { SUMMARY_DATA_KEY } from './dashboard.resolver';
import type { DashboardSummary } from './models/dashboard.model';

/**
 * The fixture the mock interceptor already serves for `dashboard/summary`
 * (`core/mock/fixtures/index.ts`), spelled out here so the story does not
 * import a module whose whole purpose is HTTP mocking.
 */
const STORY_SUMMARY: DashboardSummary = {
  totalSales: 1_284_500_000,
  pendingOrders: 23,
  customerCount: 187,
  productCount: 96,
  salesChangePercent: 12.4,
  lowStockCount: 7,
  newComments: 5,
};

/**
 * Stands in for the route the resolver has already filled.
 *
 * `data` is an Observable because that is what `ActivatedRoute.data` is — the
 * component calls `toSignal()` on it, and a plain object would never emit, so
 * the tiles would stay empty with no error to explain why.
 */
const routeWithSummary = {
  provide: ActivatedRoute,
  useValue: { data: of({ [SUMMARY_DATA_KEY]: STORY_SUMMARY }) },
};

/** What the router hands a component whose resolve returned `null`. */
const routeWithoutSummary = {
  provide: ActivatedRoute,
  useValue: { data: of({}) },
};

/**
 * The page calls `navigateByUrl(this.router.url)` on retry and subscribes to
 * router events for the skeleton. `EMPTY` means "no navigation is in flight",
 * which is the honest state for an isolated page.
 */
const routerStub = {
  provide: Router,
  useValue: { events: EMPTY, navigateByUrl: () => Promise.resolve(true), url: '/dashboard' },
};

/** Storybook has no route tree, so the trail is supplied (same trick as PageHeader's stories). */
const breadcrumbStub = {
  provide: BreadcrumbService,
  useValue: { crumbs: signal([{ label: 'پیشخوان', url: '/dashboard' }]) },
};

const meta: Meta<Dashboard> = {
  title: 'Features/Dashboard',
  component: Dashboard,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      providers: [routerStub, breadcrumbStub, routeWithSummary],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'The panel\u2019s landing page: four KPI tiles fed by the route\u2019s resolver, an error block',
          'with a retry when the resolve fails, and a skeleton while a re-resolve is in flight.',
          '',
          '**Use case** — mounted by the `/dashboard` route and by nothing else. It is the first',
          'page to show the pattern every feature page in this panel should follow: the route fetches',
          '(`summaryResolver`), the page renders. Do not add a service call to it, and do not copy it',
          'into another page — copy `features/dashboard/` and change what the resolver returns.',
          '',
          '**How to use** — it takes no inputs. Wiring it up means adding the route:',
          '',
          '```ts',
          "{ path: 'dashboard', loadChildren: () => import('./dashboard.routes').then((m) => m.DASHBOARD_ROUTES) }",
          '```',
          '',
          'The summary arrives in `ActivatedRoute.data[SUMMARY_DATA_KEY]`, which is why the component',
          'reads `toSignal(route.data)` rather than a snapshot: a retry replaces the snapshot, and a',
          'computed over the old one would keep the first visit\u2019s numbers forever.',
          '',
          '**Logic** — three states, decided in this order: `resolving` (a re-resolve in flight) beats',
          '`summary` (the tiles) beats "nothing" (the error block). The loading state is deliberately',
          'NOT reachable on first paint — a resolver blocks navigation, so the component does not exist',
          'until the data does. It exists for the second visit, where the user is already looking at',
          'the page. A first-paint progress bar belongs to the app shell (BO-C05), not here.',
          '',
          'The error block is not `EmptyState`. An empty list is a normal outcome and says «موردی',
          'برای نمایش وجود ندارد»; a failed resolve is not normal, and saying «no sales» for «the',
          'request failed» is the kind of lie a user then acts on. It is also `role="alert"` rather',
          'than `role="status"` for the same reason.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<Dashboard>;

/** The normal case: the resolver filled `data.summary`, so the four tiles print. */
export const Resolved: Story = {};

/**
 * The failure case: the resolve returned `null`, so the page offers a retry
 * instead of the tiles.
 */
export const ResolveFailed: Story = {
  decorators: [moduleMetadata({ providers: [routeWithoutSummary] })],
  parameters: {
    docs: {
      description: {
        story:
          'The resolve returned null — see `resolveSummary`\u2019s `catchError`. The toast that ' +
          'reports WHY (BO-C04) is separate from this block, which says what to do about it.',
      },
    },
  },
};
