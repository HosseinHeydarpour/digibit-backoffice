import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { guestGuard } from '@core/guards/guest.guard';
import { permissionMatchGuard } from '@core/guards/permission.guard';
import { MainLayout } from '@layout/index';
import { ErrorPage } from '@shared/components/error-page/error-page';

/**
 * Every feature route is a child of `MainLayout`, so the sidebar and topbar are
 * rendered once and only `<router-outlet>` swaps (BO-B05).
 *
 * Each route carries **two** title fields on purpose:
 * - `data.title` is read by `PageTitleService` for the in-app heading. Angular
 *   does not type this, so it is read through `route.snapshot.data['title']`.
 * - `title` is Angular's built-in document-title setter for the browser tab.
 *
 * The remaining routes are **component-less** placeholders (categories, brands,
 * orders, …): each still matches and still resolves `data.title`, so the topbar
 * heading switches the moment navigation happens — but the routed area renders
 * nothing until their page components land (BO-F*, BO-H*, …).
 *
 * BO-E01 is the exception that sets the pattern: `/dashboard` is a
 * `loadChildren` route that owns its definition in `features/dashboard/`, and
 * BO-F01 made `/products` the second one. From here on a feature brings its own
 * page, resolver and `data` with it, and this file stays a shell: the layout,
 * the error pages and one line per feature.
 */
export const routes: Routes = [
  // Outside the shell on purpose: a signed-out visitor must not download the
  // sidebar, and the page must render even while there is no session.
  {
    path: 'login',
    loadComponent: () => import('@features/auth/login/login').then((m) => m.Login),
    canMatch: [guestGuard],
    title: 'ورود',
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('@features/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
    canMatch: [guestGuard],
    title: 'بازیابی رمز',
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('@features/auth/reset-password/reset-password').then((m) => m.ResetPassword),
    canMatch: [guestGuard],
    title: 'تعیین رمز جدید',
  },
  {
    path: '',
    component: MainLayout,
    children: [
      // '/' must not stay on the layout itself: the layout node carries no
      // `data.title`, so a bare '/' would show the fallback «پنل مدیریت»
      // instead of a real page name.
      //
      // `pathMatch: 'full'` matters — without it the empty path also matches
      // every child URL, so the redirect would shadow the whole app.
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

      // `data.breadcrumb` is the trail label read by `BreadcrumbService`
      // (BO-B08) — the same walk as `data.title`, but a separate field, so a
      // page can later title itself «جزئیات سفارش 42» while its crumb stays
      // «سفارش 42». Every feature route below declares one; the wildcard
      // deliberately does not, so the 404 page shows no chips (BO-B08 tc 9).

      // The dashboard is the first FEATURE page (BO-E01), so it is also the
      // first route that owns its own definition: the page, its resolver, its
      // service and its models all live in `features/dashboard/` and arrive as
      // one lazy chunk. Statically importing a resolver here would hoist the
      // whole data layer into the main bundle — see the note in
      // `features/dashboard/dashboard.routes.ts`.
      //
      // `data`/`title` live on the inner route for the same reason: they belong
      // to the page that reads them.
      {
        path: 'dashboard',
        canMatch: [authGuard],
        loadChildren: () =>
          import('@features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },

      // Products is the second module to own its routes this way (BO-F01). Same
      // contract as the dashboard — the route here is a single pointer, and the
      // pages (list / new / :id / :id/edit) plus their `data` live in
      // `features/products/products.routes.ts` and arrive as one lazy chunk.
      {
        path: 'products',
        canMatch: [authGuard, permissionMatchGuard],
        data: { permission: 'products.view' },
        loadChildren: () =>
          import('@features/products/products.routes').then((m) => m.PRODUCTS_ROUTES),
      },
      {
        path: 'categories',
        canMatch: [authGuard, permissionMatchGuard],
        data: {
          title: 'دسته‌بندی‌ها',
          breadcrumb: 'دسته‌بندی‌ها',
          permission: 'products.view',
        },
        title: 'دسته‌بندی‌ها',
        loadChildren: () =>
          import('@features/categories/categories.routes').then((m) => m.CATEGORIES_ROUTES),
      },
      {
        path: 'brands',
        canMatch: [authGuard, permissionMatchGuard],
        data: { title: 'برندها', breadcrumb: 'برندها', permission: 'products.view' },
        title: 'برندها',
        loadChildren: () => import('@features/brands/brands.routes').then((m) => m.BRANDS_ROUTES),
      },
      // Orders owns its routes the same way (BO-H01): the list and the detail
      // page (plus resolver and `data`) live in `features/orders/` and arrive
      // as one lazy chunk.
      {
        path: 'orders',
        canMatch: [authGuard, permissionMatchGuard],
        data: { title: 'سفارش‌ها', breadcrumb: 'سفارش‌ها', permission: 'orders.view' },
        title: 'سفارش‌ها',
        loadChildren: () => import('@features/orders/orders.routes').then((m) => m.ORDERS_ROUTES),
      },
      // Customers owns its routes the same way (BO-I01): the list arrives as
      // its own lazy chunk, and BO-I02 adds the profile under `:id`. The parent
      // crumb is what lets the profile show «مشتریان / پروفایل مشتری».
      {
        path: 'customers',
        canMatch: [authGuard, permissionMatchGuard],
        data: { title: 'مشتریان', breadcrumb: 'مشتریان', permission: 'customers.view' },
        title: 'مشتریان',
        loadChildren: () =>
          import('@features/customers/customers.routes').then((m) => m.CUSTOMERS_ROUTES),
      },
      // Coupons owns its routes the same way (BO-J01): the list, and later the
      // create/edit dialog, arrive as their own lazy chunk.
      {
        path: 'coupons',
        canMatch: [authGuard, permissionMatchGuard],
        data: { permission: 'coupons.view' },
        loadChildren: () =>
          import('@features/coupons/coupons.routes').then((m) => m.COUPONS_ROUTES),
      },
      // Shipping owns its routes (BO-K01): the method list arrives as its own
      // lazy chunk and edits ship in the same module.
      {
        path: 'shipping',
        canMatch: [authGuard, permissionMatchGuard],
        data: { permission: 'shipping.view' },
        loadChildren: () =>
          import('@features/shipping/shipping.routes').then((m) => m.SHIPPING_ROUTES),
      },
      // Banners owns its routes (BO-L01): the card grid arrives as its own lazy
      // chunk; BO-L02..L07 add upload, edit, reorder and delete on top.
      {
        path: 'banners',
        canMatch: [authGuard, permissionMatchGuard],
        data: { permission: 'content.view' },
        loadChildren: () =>
          import('@features/banners/banners.routes').then((m) => m.BANNERS_ROUTES),
      },
      // Content pages own their route (BO-L08): the four fixed slugs, edited in
      // a dialog; no create/delete.
      {
        path: 'pages',
        canMatch: [authGuard, permissionMatchGuard],
        data: { permission: 'content.view' },
        loadChildren: () => import('@features/pages/pages.routes').then((m) => m.PAGES_ROUTES),
      },
      {
        path: 'comments',
        canMatch: [authGuard, permissionMatchGuard],
        data: { permission: 'comments.view' },
        loadChildren: () =>
          import('@features/comments/comments.routes').then((m) => m.COMMENTS_ROUTES),
      },
      {
        path: 'tickets',
        canMatch: [authGuard, permissionMatchGuard],
        data: { permission: 'tickets.view' },
        loadChildren: () =>
          import('@features/tickets/tickets.routes').then((m) => m.TICKETS_ROUTES),
      },
      {
        path: 'settings',
        canMatch: [authGuard, permissionMatchGuard],
        data: { permission: 'settings.write' },
        loadChildren: () =>
          import('@features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
      },
      // The profile page the topbar's dropdown links to, and the destination of
      // the change-password form. It owns its route like every feature (BO-D12).
      {
        path: 'profile',
        canMatch: [authGuard],
        loadChildren: () =>
          import('@features/profile/profile.routes').then((m) => m.PROFILE_ROUTES),
      },

      // 403 — where the permission guards send a user who lacks a grant.
      // `router.navigate(['/forbidden'])` beats a raw error, and the page is
      // reachable directly as well (tc 6), so the guard needs no special case.
      //
      // No `breadcrumb` here either: an error page is not a location in the
      // hierarchy, and a chip pointing at it would be a dead end.
      {
        path: 'forbidden',
        component: ErrorPage,
        data: { title: 'دسترسی غیرمجاز', code: 403 },
        title: 'دسترسی غیرمجاز',
      },
    ],
  },

  // Public catch-all: an unknown URL renders the 404 page even for a signed-out
  // visitor (BO-D06 tc 6). It sits OUTSIDE MainLayout because the layout route
  // is guarded; an authenticated user sees the same page without the shell.
  //
  // No `breadcrumb`, so the 404 shows no chips (BO-B08 tc 9).
  {
    path: '**',
    component: ErrorPage,
    data: { title: 'صفحه یافت نشد', code: 404 },
    title: 'صفحه یافت نشد',
  },
];
