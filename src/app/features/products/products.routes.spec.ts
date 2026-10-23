// src/app/features/products/products.routes.spec.ts
//
// BO-F01 is a wiring task, so the spec drives the REAL route tree the way
// `app.routes.ts` mounts it (same pattern as `dashboard.spec.ts`): a host with a
// `<router-outlet>` and `provideRouter`. The interesting behaviour is not on a
// component — it is that the module is lazy, the paths resolve to the right
// page, and each route carries the metadata the topbar/breadcrumb/permission
// services read.

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet, type Route, type Routes } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { routes as APP_ROUTES } from '../../app.routes';

import { ProductCreate } from './product-create/product-create';
import { ProductDetail } from './product-detail/product-detail';
import { ProductEdit } from './product-edit/product-edit';
import { ProductList } from './product-list/product-list';
import { PRODUCTS_ROUTES } from './products.routes';

/** A stand-in for the shell: the pages are rendered by the router, as in the app. */
@Component({
  selector: 'app-products-host',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
class Host {}

/** The products module mounted under its `/products` parent, as `app.routes.ts` does. */
const ROUTES: Routes = [{ path: '', children: [{ path: 'products', children: PRODUCTS_ROUTES }] }];

function setup(): { fixture: ReturnType<typeof TestBed.createComponent<Host>>; router: Router } {
  TestBed.configureTestingModule({
    imports: [Host],
    // `MessageService` because `ProductList` (BO-F02) injects `ToastService`,
    // which is root-provided but is not itself a root provider of PrimeNG's
    // message bus. Same provider `app.config.ts` registers.
    providers: [
      provideRouter(ROUTES),
      provideHttpClient(),
      provideHttpClientTesting(),
      MessageService,
      ConfirmationService,
    ],
  });

  const fixture = TestBed.createComponent(Host);
  const router = TestBed.inject(Router);

  return { fixture, router };
}

async function goto(
  fixture: ReturnType<typeof TestBed.createComponent<Host>>,
  router: Router,
  url: string,
): Promise<void> {
  await router.navigateByUrl(url);
  await fixture.whenStable();
  fixture.detectChanges();
}

/** The products route node as `app.routes.ts` declares it (inside MainLayout). */
function productsAppRoute(): Route {
  const layout = APP_ROUTES.at(0);
  const products = layout?.children?.find((route) => route.path === 'products');
  expect(products, 'products route exists in app.routes.ts').toBeDefined();
  return products as Route;
}

describe('Products routes (BO-F01)', () => {
  it('mounts the module lazily in app.routes.ts (tc 1, tc 7)', async () => {
    const products = productsAppRoute();
    const loader = products.loadChildren;

    // A `loadChildren` function, not a static import — this is what puts the
    // module in its own chunk so a visitor who never opens «محصولات» never
    // downloads it.
    expect(typeof loader).toBe('function');

    const loaded = await (loader as () => Promise<Routes>)();
    expect(loaded).toBe(PRODUCTS_ROUTES);
    expect(loaded.map((r) => r.component)).toEqual([
      ProductList,
      ProductCreate,
      ProductEdit,
      ProductDetail,
    ]);
  });

  it('navigates to /products and renders the list (tc 2)', async () => {
    const { fixture, router } = setup();
    await goto(fixture, router, '/products');

    expect(fixture.nativeElement.querySelector('app-product-list')).toBeTruthy();
  });

  it('declares the products.view permission on every route (tc 3)', () => {
    for (const route of PRODUCTS_ROUTES) {
      expect(route.data?.['permission'], `permission on ${route.path ?? 'index'}`).toBe(
        'products.view',
      );
    }
  });

  it('sets a page title on every route (tc 4)', () => {
    expect(PRODUCTS_ROUTES.map((r) => r.data?.['title'])).toEqual([
      'محصولات',
      'افزودن محصول',
      'ویرایش محصول',
      'جزئیات محصول',
    ]);
  });

  it('opens the create form at /products/new (tc 5)', async () => {
    const { fixture, router } = setup();
    await goto(fixture, router, '/products/new');

    // «new» must land on the create page, NOT be captured as a detail id.
    expect(fixture.nativeElement.querySelector('app-product-create')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-product-detail')).toBeNull();
  });

  it('opens the edit form at /products/:id/edit and reads the id (tc 6)', async () => {
    const { fixture, router } = setup();
    await goto(fixture, router, '/products/42/edit');

    expect(fixture.nativeElement.querySelector('app-product-edit')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('42');
  });

  it('resolves deep routes without falling through to the 404 (tc 10)', async () => {
    const { fixture, router } = setup();

    await goto(fixture, router, '/products/7');
    expect(fixture.nativeElement.querySelector('app-product-detail')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('7');
  });

  it('declares a breadcrumb on every page route (tc 9)', () => {
    for (const route of PRODUCTS_ROUTES) {
      expect(route.data?.['breadcrumb'], `breadcrumb on ${route.path ?? 'index'}`).toBeTruthy();
    }
  });

  it('wires the permission for the future BO-D07 guard (tc 8 — guard not built yet)', () => {
    // tc 8 («بدون مجوز، chunk لود نشود») needs a route guard. There is none yet
    // (BO-D07), so the greedy assertion is the CONTRACT: every route declares
    // `products.view`, which is the constant the guard will read. Enforcement
    // itself lands with BO-D07 and is out of scope for BO-F01.
    const permissions = PRODUCTS_ROUTES.map((r) => r.data?.['permission']);
    expect(permissions.every((p) => p === 'products.view')).toBe(true);
  });
});
