import { Routes } from '@angular/router';
import { MainLayout } from '@layout/index';

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

      // Catch-all so an unknown URL resolves to a fallback title instead of
      // throwing NG04002 ("Cannot match any routes"). BO-B05 tc 6 wants a
      // sensible heading on a 404; a dedicated NotFound page is a later task,
      // at which point this entry gains a component.
      //
      // A wildcard needs `children` to be valid at all (NG04014) — `data` and
      // `title` alone are not enough. The empty child keeps it component-less
      // while still letting `readDeepestTitle()` find this node's title.
      {
        path: '**',
        // No `breadcrumb` here on purpose — see the note above.
        data: { title: 'صفحه یافت نشد' },
        title: 'صفحه یافت نشد',
        children: [],
      },
    ],
  },
];
