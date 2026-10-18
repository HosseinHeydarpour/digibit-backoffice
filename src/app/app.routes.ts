import { Routes } from '@angular/router';
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
 * Routes are currently **component-less**: the feature folders under
 * `src/app/features/*` are still empty, and each page arrives in a later task
 * (BO-F*, BO-H*, …). A component-less route still matches and still resolves
 * `data.title`, so the topbar heading switches correctly the moment navigation
 * happens — but the routed area renders nothing until the page components land.
 */
export const routes: Routes = [
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

      // feature routes land here from queue C onward
      {
        path: 'dashboard',
        data: { title: 'پیشخوان', breadcrumb: 'پیشخوان' },
        title: 'پیشخوان',
        children: [],
      },
      {
        path: 'products',
        data: { title: 'محصولات', breadcrumb: 'محصولات' },
        title: 'محصولات',
        children: [],
      },
      {
        path: 'categories',
        data: { title: 'دسته‌بندی‌ها', breadcrumb: 'دسته‌بندی‌ها' },
        title: 'دسته‌بندی‌ها',
        children: [],
      },
      {
        path: 'brands',
        data: { title: 'برندها', breadcrumb: 'برندها' },
        title: 'برندها',
        children: [],
      },
      {
        path: 'orders',
        data: { title: 'سفارش‌ها', breadcrumb: 'سفارش‌ها' },
        title: 'سفارش‌ها',
        children: [],
      },
      {
        path: 'customers',
        data: { title: 'مشتریان', breadcrumb: 'مشتریان' },
        title: 'مشتریان',
        children: [],
      },
      {
        path: 'coupons',
        data: { title: 'کوپن تخفیف', breadcrumb: 'کوپن تخفیف' },
        title: 'کوپن تخفیف',
        children: [],
      },
      {
        path: 'shipping',
        data: { title: 'روش‌های ارسال', breadcrumb: 'روش‌های ارسال' },
        title: 'روش‌های ارسال',
        children: [],
      },
      {
        path: 'banners',
        data: { title: 'بنر و محتوا', breadcrumb: 'بنر و محتوا' },
        title: 'بنر و محتوا',
        children: [],
      },
      {
        path: 'comments',
        data: { title: 'نظرات', breadcrumb: 'نظرات' },
        title: 'نظرات',
        children: [],
      },
      {
        path: 'tickets',
        data: { title: 'پشتیبانی', breadcrumb: 'پشتیبانی' },
        title: 'پشتیبانی',
        children: [],
      },
      {
        path: 'settings',
        data: { title: 'تنظیمات', breadcrumb: 'تنظیمات' },
        title: 'تنظیمات',
        children: [],
      },

      // 403 — where BO-D07's role guard will send a user who lacks a permission.
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

      // Catch-all: an unknown URL renders the 404 page (tc 1).
      //
      // The `children: []` that used to live here is gone — it only existed to
      // make a component-less route valid (NG04014). A route with a `component`
      // is valid on its own.
      //
      // Still no `breadcrumb`, so the 404 shows no chips (BO-B08 tc 9).
      {
        path: '**',
        component: ErrorPage,
        data: { title: 'صفحه یافت نشد', code: 404 },
        title: 'صفحه یافت نشد',
      },
    ],
  },
];
