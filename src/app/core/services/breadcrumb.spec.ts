// src/app/core/services/breadcrumb.spec.ts
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Params, Router, provideRouter } from '@angular/router';

import { routes as APP_ROUTES } from '../../app.routes';

import { BreadcrumbService } from './breadcrumb';

@Component({ selector: 'app-blank', template: '' })
class Blank {}

/**
 * A synthetic config, for shapes the real app routes do not have yet (nested
 * feature routes arrive with BO-F*). Note the three label forms:
 * a string, a `(params) => string` function, and — on `orders/:id/edit` — a
 * parent declaring a crumb while its child declares none.
 */
const ROUTES = [
  {
    path: '',
    component: Blank,
    children: [
      { path: 'dashboard', data: { breadcrumb: 'پیشخوان' }, children: [] },
      {
        path: 'products',
        data: { breadcrumb: 'محصولات' },
        children: [
          {
            path: ':id',
            data: { breadcrumb: (params: Params) => `ویرایش محصول ${params['id']}` },
            children: [],
          },
        ],
      },
      {
        // Parent WITH a crumb, child WITHOUT one: the parent keeps its own
        // URL and the child adds no step of its own.
        path: 'orders/:id',
        data: { breadcrumb: 'سفارش‌ها' },
        children: [{ path: 'edit', children: [] }],
      },
      // Declares nothing at all.
      { path: 'plain', children: [] },
    ],
  },
  { path: '**', children: [] },
];

describe('BreadcrumbService (synthetic routes)', () => {
  let service: BreadcrumbService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(ROUTES)],
    });
    service = TestBed.inject(BreadcrumbService);
    router = TestBed.inject(Router);
  });

  it('starts with an empty trail before any navigation', () => {
    expect(service.crumbs()).toEqual([]);
  });

  it('gives exactly one crumb on a flat route (tc 1)', async () => {
    await router.navigateByUrl('/dashboard');

    expect(service.crumbs()).toEqual([{ label: 'پیشخوان', url: '/dashboard' }]);
  });

  it('builds a two-step trail on a nested route (tc 2)', async () => {
    await router.navigateByUrl('/products/12');

    expect(service.crumbs().map((c) => c.label)).toEqual(['محصولات', 'ویرایش محصول 12']);
  });

  it("builds the dynamic label from THIS navigation's params (tc 3)", async () => {
    // A different id than the test above: if the label were captured from the
    // first navigation (the classic stale-closure bug), this reads «12».
    await router.navigateByUrl('/products/7');

    expect(service.crumbs().at(1)?.label).toBe('ویرایش محصول 7');
  });

  it('gives every step its own cumulative URL (tc 4)', async () => {
    await router.navigateByUrl('/products/12');

    expect(service.crumbs().map((c) => c.url)).toEqual(['/products', '/products/12']);
  });

  it('lets a child inherit its parent crumb — Angular route-data inheritance', async () => {
    await router.navigateByUrl('/orders/42/edit');

    // Angular merges a parent's `data` into any child that declares none —
    // the same inheritance `data.title` enjoys, and the same reason
    // PageTitleService reads snapshot data. So the `edit` node carries
    // «سفارش‌ها» under its own URL. A level that should read differently
    // simply declares its own `data.breadcrumb`, as the `:id` function does.
    expect(service.crumbs()).toEqual([
      { label: 'سفارش‌ها', url: '/orders/42' },
      { label: 'سفارش‌ها', url: '/orders/42/edit' },
    ]);
  });

  it('returns an empty trail for a route that declares no crumbs (tc 9)', async () => {
    await router.navigateByUrl('/plain');

    expect(service.crumbs()).toEqual([]);
  });

  it('returns an empty trail for an unknown URL (tc 9)', async () => {
    await router.navigateByUrl('/no-such-page');

    expect(service.crumbs()).toEqual([]);
  });

  it('rebuilds the trail on every navigation, leaving no stale step (tc 4)', async () => {
    await router.navigateByUrl('/products/12');
    await router.navigateByUrl('/dashboard');

    // Without the NavigationEnd rebuild, «محصولات» would linger here.
    expect(service.crumbs()).toEqual([{ label: 'پیشخوان', url: '/dashboard' }]);
  });
});

/**
 * The suite above proves the *service* works, but it drives a synthetic
 * config — so it would happily pass while `app.routes.ts` itself declared no
 * breadcrumb data. That is exactly the class of bug the page-title spec's
 * integration block was added for (see the long comment in
 * `page-title.spec.ts`), so we repeat the pattern.
 *
 * These tests apply to the routes you edit in step 5. Until you add
 * `breadcrumb` to the feature routes, the first one FAILS — that is the
 * guardrail doing its job.
 */
describe('BreadcrumbService against the real app routes (integration)', () => {
  let service: BreadcrumbService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(APP_ROUTES)],
    });
    service = TestBed.inject(BreadcrumbService);
    router = TestBed.inject(Router);
  });

  it('gives a single crumb on the real dashboard', async () => {
    // '/' redirects to '/dashboard' (app.routes.ts), one crumb is all there is.
    await router.navigateByUrl('/');

    expect(service.crumbs()).toEqual([{ label: 'پیشخوان', url: '/dashboard' }]);
  });

  it('gives no crumbs on the real 404 (tc 9)', async () => {
    await router.navigateByUrl('/no-such-page');

    // The wildcard declares `title` (the topbar needs it) but deliberately no
    // `breadcrumb` — this test is what keeps it that way.
    expect(service.crumbs()).toEqual([]);
  });

  it('declares breadcrumb data on every real feature route', () => {
    // A missing label must fail a test, not silently drop a crumb.
    //
    // Error routes are exempt by construction: an error page is not a location
    // in the hierarchy, so a chip pointing at it would be a dead end. They are
    // recognised by `data.code` rather than by path, so a second one
    // (`maintenance`, `server-error`) is exempt the moment it is added — and a
    // feature route that forgets `breadcrumb` still fails here.
    //
    // LAZY routes are exempt too, and this is the trade BO-E01 bought: a
    // feature that owns its routes (`loadChildren`) keeps `data` inside its own
    // chunk, which this file cannot see. The label is pinned by the feature's
    // own spec instead (`dashboard.spec.ts` → "declares both title fields"),
    // and the crumb itself is asserted by the navigation test above.
    const layout = APP_ROUTES[0];
    const children = (layout.children ?? []).filter(
      (r) =>
        r.redirectTo === undefined &&
        r.path !== '**' &&
        r.data?.['code'] === undefined &&
        r.loadChildren === undefined,
    );

    expect(children.length).toBeGreaterThan(0);
    for (const route of children) {
      expect(
        route.data?.['breadcrumb'],
        `route "${route.path}" is missing data.breadcrumb`,
      ).toBeTruthy();
    }
  });
});
