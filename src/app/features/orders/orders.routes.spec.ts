// src/app/features/orders/orders.routes.spec.ts
//
// BO-H01's wiring: the spec drives the REAL route tree the way `app.routes.ts`
// mounts it — a host with a `<router-outlet>` and `provideRouter`. The
// interesting behaviour is that the module is lazy, the paths resolve to the
// right page, the detail resolver binds its result into the page's input, and
// a missing order lands on the 404 instead of an empty detail.

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  RouterOutlet,
  withComponentInputBinding,
  type Route,
  type Routes,
} from '@angular/router';
import { MessageService } from 'primeng/api';

import { routes as APP_ROUTES } from '../../app.routes';

import type { Order } from './models/order.model';
import { OrderDetail } from './order-detail/order-detail';
import { OrderList } from './order-list/order-list';
import { ORDERS_ROUTES } from './orders.routes';

const ORDER: Order = {
  id: '7',
  code: 'ORD-14006',
  customerId: '3',
  customerName: 'مریم حسینی',
  status: 'paid',
  total: 1_745_000,
  itemCount: 2,
  createdAt: 1_729_152_000_000,
  items: [
    {
      id: '7-item-1',
      productId: 'p-1',
      productName: 'فلش مموری سندیسک',
      productImage: null,
      variantName: null,
      quantity: 2,
      unitPrice: 850_000,
      totalPrice: 1_700_000,
    },
  ],
  subtotal: 1_700_000,
  discount: 0,
  shippingCost: 45_000,
  shippingMethod: 'پست پیشتاز',
  address: {
    fullName: 'مریم حسینی',
    phone: '09121022222',
    province: 'تهران',
    city: 'تهران',
    postalCode: '1100000000',
    address: 'خیابان ولیعصر، پلاک ۱۲',
  },
  payment: {
    method: 'پرداخت آنلاین',
    gateway: 'زرین‌پال',
    trackingCode: '202600007919',
    paidAt: 1_729_152_600_000,
  },
  statusHistory: [
    { id: '7-h1', status: 'pending', note: null, createdAt: 1_729_152_000_000 },
    { id: '7-h2', status: 'paid', note: null, createdAt: 1_729_159_200_000 },
  ],
};

/** A stand-in for the shell: the pages are rendered by the router, as in the app. */
@Component({
  selector: 'app-orders-host',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
class Host {}

/** Where the resolver's `RedirectCommand('/404')` must land. */
@Component({ selector: 'app-not-found-marker', template: '<p>404 marker</p>' })
class NotFoundMarker {}

/** The orders module mounted under its `/orders` parent, plus the app's catch-all. */
const ROUTES: Routes = [
  {
    path: '',
    children: [
      { path: 'orders', children: ORDERS_ROUTES },
      { path: '**', component: NotFoundMarker },
    ],
  },
];

function setup(): { fixture: ReturnType<typeof TestBed.createComponent<Host>>; router: Router } {
  TestBed.configureTestingModule({
    imports: [Host],
    providers: [
      // `withComponentInputBinding()` writes `resolve.detail` into the page's
      // `detail` input; the app config enables it too.
      provideRouter(ROUTES, withComponentInputBinding()),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: MessageService, useValue: { add: vi.fn(), clear: vi.fn() } },
    ],
  });

  const fixture = TestBed.createComponent(Host);
  const router = TestBed.inject(Router);

  return { fixture, router };
}

/** The orders route node as `app.routes.ts` declares it (inside MainLayout). */
function ordersAppRoute(): Route {
  const layout = APP_ROUTES.find((route) => route.path === '');
  const orders = layout?.children?.find((route) => route.path === 'orders');
  expect(orders, 'orders route exists in app.routes.ts').toBeDefined();
  return orders as Route;
}

describe('Orders routes (BO-H01)', () => {
  it('mounts the module lazily in app.routes.ts', async () => {
    const orders = ordersAppRoute();
    const loader = orders.loadChildren;

    expect(typeof loader).toBe('function');

    const loaded = await (loader as () => Promise<Routes>)();
    expect(loaded).toBe(ORDERS_ROUTES);
    expect(loaded.map((r) => r.component)).toEqual([OrderList, OrderDetail]);
  });

  it('navigates to /orders and renders the list', async () => {
    const { fixture, router } = setup();
    const httpMock = TestBed.inject(HttpTestingController);

    const navigation = router.navigateByUrl('/orders');
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith('/orders'))
      .flush({ data: [], meta: { page: 1, pageSize: 20, total: 0 }, message: '' });

    await navigation;
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-order-list')).toBeTruthy();
  });

  it('opens the detail at /orders/:id and binds the resolved order', async () => {
    const { fixture, router } = setup();
    const httpMock = TestBed.inject(HttpTestingController);

    const navigation = router.navigateByUrl('/orders/7');
    // The router starts the navigation on a microtask; the resolver's request
    // only exists after it runs.
    await new Promise((resolve) => setTimeout(resolve));
    httpMock.expectOne((r) => r.url.endsWith('/orders/7')).flush({ data: ORDER, message: '' });

    await navigation;
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-order-detail')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('مریم حسینی');
    expect(fixture.nativeElement.textContent).toContain('ORD-14006');
  });

  it('an unknown order id lands on the 404 page, not an empty detail', async () => {
    const { fixture, router } = setup();
    const httpMock = TestBed.inject(HttpTestingController);

    const navigation = router.navigateByUrl('/orders/9999');
    await new Promise((resolve) => setTimeout(resolve));
    httpMock
      .expectOne((r) => r.url.endsWith('/orders/9999'))
      .flush(
        { error: { code: 'NOT_FOUND', message: 'موردی با این شناسه یافت نشد.' } },
        { status: 404, statusText: 'Not Found' },
      );

    await navigation;
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-not-found-marker')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-order-detail')).toBeNull();
  });

  it('declares the orders.view permission on every route', () => {
    for (const route of ORDERS_ROUTES) {
      expect(route.data?.['permission'], `permission on ${route.path ?? 'index'}`).toBe(
        'orders.view',
      );
    }
  });

  it('sets a page title and breadcrumb on every route', () => {
    expect(ORDERS_ROUTES.map((r) => r.data?.['title'])).toEqual(['سفارش‌ها', 'جزئیات سفارش']);
    for (const route of ORDERS_ROUTES) {
      expect(route.data?.['breadcrumb'], `breadcrumb on ${route.path ?? 'index'}`).toBeTruthy();
    }
  });

  it('the detail route re-runs its resolver so retry can recover', () => {
    const detail = ORDERS_ROUTES.find((route) => route.path === ':id');
    // Both halves of the retry contract: this flag here, and the page's
    // `navigateByUrl(url, { onSameUrlNavigation: 'reload' })`.
    expect(detail?.runGuardsAndResolvers).toBe('always');
    expect(detail?.resolve?.['detail']).toBeTruthy();
  });
});
