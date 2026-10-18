// src/app/core/services/page-title.spec.ts
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { routes as APP_ROUTES } from '../../app.routes';

import { PageTitleService } from './page-title';

@Component({ selector: 'app-blank', template: '' })
class Blank {}

/** A synthetic config, for cases the real app routes cannot express. */
const ROUTES = [
  {
    path: '',
    component: Blank,
    children: [
      { path: 'products', title: 'محصولات', data: { title: 'محصولات' }, children: [] },
      { path: 'orders/:id', data: { title: 'جزئیات سفارش' }, children: [] },
      { path: 'untitled', children: [] },
    ],
  },
  { path: '**', children: [] },
];

describe('PageTitleService', () => {
  let service: PageTitleService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(ROUTES)],
    });
    service = TestBed.inject(PageTitleService);
    router = TestBed.inject(Router);
  });

  it('starts on the default title before any navigation (tc 9)', () => {
    expect(service.title()).toBe('پنل مدیریت');
  });

  it('reads the title from the deepest matched route (tc 1, tc 10)', async () => {
    await router.navigateByUrl('/products');
    expect(service.title()).toBe('محصولات');
  });

  it('updates when the route changes (tc 1, tc 7)', async () => {
    await router.navigateByUrl('/products');
    expect(service.title()).toBe('محصولات');

    await router.navigateByUrl('/orders/42');
    expect(service.title()).toBe('جزئیات سفارش');
  });

  it('falls back to the default for a route with no data.title (tc 9)', async () => {
    await router.navigateByUrl('/untitled');
    expect(service.title()).toBe('پنل مدیریت');
  });

  it('builds the title for a parameterised route (tc 5)', async () => {
    await router.navigateByUrl('/orders/42');
    expect(service.title()).toBe('جزئیات سفارش');
  });
});

/**
 * The suite above proves the *service* works, but it drives a synthetic route
 * config — so it would happily pass while `app.routes.ts` itself was broken.
 *
 * That is exactly what happened: `app.routes.ts` had no redirect for `''` and
 * no wildcard, so in the running app the topbar was stuck on «پنل مدیریت» and
 * every one of the tests above still passed.
 *
 * These cases navigate the **real** config instead. They are deliberately
 * factored so that if a route is renamed or its title retyped, they fail here.
 */
describe('PageTitleService against the real app routes (integration)', () => {
  let service: PageTitleService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(APP_ROUTES)],
    });
    service = TestBed.inject(PageTitleService);
    router = TestBed.inject(Router);
  });

  it('redirects the empty path to the dashboard and titles it (tc 6)', async () => {
    await router.navigateByUrl('/');
    expect(router.url).toBe('/dashboard');
    expect(service.title()).toBe('پیشخوان');
  });

  it('titles a real feature route (tc 1)', async () => {
    await router.navigateByUrl('/products');
    expect(service.title()).toBe('محصولات');
  });

  it('titles a real feature route after another (tc 7)', async () => {
    await router.navigateByUrl('/products');
    expect(service.title()).toBe('محصولات');

    await router.navigateByUrl('/orders');
    expect(service.title()).toBe('سفارش‌ها');
  });

  it('titles an unknown URL via the wildcard instead of throwing (tc 6)', async () => {
    await router.navigateByUrl('/no-such-page');
    expect(service.title()).toBe('صفحه یافت نشد');
  });

  it('never leaves a routable URL showing the fallback heading', async () => {
    // Guards the original symptom: every route the app declares must resolve a
    // real title, or the topbar silently falls back to «پنل مدیریت».
    const paths = ['dashboard', 'products', 'categories', 'brands', 'orders'];

    for (const path of paths) {
      await router.navigateByUrl(`/${path}`);
      expect(service.title(), `route /${path} should declare a title`).not.toBe('پنل مدیریت');
    }
  });

  it('declares both data.title and title on every real feature route', () => {
    // data.title drives the in-app heading; title drives the browser tab. A
    // route missing one of them is a silent half-failure (see BO-B05 tc 2).
    //
    // A `loadChildren` route is exempt for the same reason it is exempt in
    // breadcrumb.spec.ts: its `data` and `title` live inside the feature's own
    // chunk, unreachable from here. The functional test above ("never leaves a
    // routable URL showing the fallback heading") still covers it, because it
    // navigates and reads what the service actually sees, and
    // `dashboard.spec.ts` pins the labels themselves.
    const layout = APP_ROUTES[0];
    const children = (layout.children ?? []).filter(
      (r) => r.redirectTo === undefined && r.loadChildren === undefined,
    );

    expect(children.length).toBeGreaterThan(0);
    for (const route of children) {
      expect(route.data?.['title'], `route "${route.path}" is missing data.title`).toBeTruthy();
      expect(route.title, `route "${route.path}" is missing title`).toBeTruthy();
    }
  });
});
