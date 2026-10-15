import type { MenuGroup, Permission } from './menu.model';

/**
 * The complete menu, before permission filtering.
 *
 * `filterMenu()` derives what a given user actually sees. This constant is the
 * single source of truth and must never be mutated — it is module-level and
 * shared, so an in-place filter would corrupt every later call.
 *
 * Permission mapping follows the role scopes in ARCHITECTURE.md §6:
 * SuperAdmin, ProductManager, OrderManager, Support, Accountant.
 */
export const MENU: readonly MenuGroup[] = [
  {
    label: 'فروشگاه',
    items: [
      // No permission: the dashboard is the landing page for every signed-in
      // user, including one whose grants are empty.
      { label: 'پیشخوان', icon: 'pi pi-home', routerLink: '/dashboard' },
      {
        label: 'محصولات',
        icon: 'pi pi-box',
        routerLink: '/products',
        permission: 'products.view',
      },
      {
        label: 'دسته‌بندی‌ها',
        icon: 'pi pi-sitemap',
        routerLink: '/categories',
        permission: 'products.view',
      },
      {
        label: 'برندها',
        icon: 'pi pi-tags',
        routerLink: '/brands',
        permission: 'products.view',
      },
    ],
  },
  {
    label: 'سفارش‌ها',
    items: [
      {
        label: 'سفارش‌ها',
        icon: 'pi pi-shopping-cart',
        routerLink: '/orders',
        permission: 'orders.view',
      },
      {
        label: 'مشتریان',
        icon: 'pi pi-users',
        routerLink: '/customers',
        permission: 'customers.view',
      },
      {
        label: 'کوپن تخفیف',
        icon: 'pi pi-ticket',
        routerLink: '/coupons',
        permission: 'orders.view',
      },
      {
        label: 'روش‌های ارسال',
        icon: 'pi pi-truck',
        routerLink: '/shipping',
        permission: 'orders.view',
      },
    ],
  },
  {
    label: 'محتوا',
    items: [
      {
        label: 'بنر و محتوا',
        icon: 'pi pi-images',
        routerLink: '/banners',
        permission: 'content.view',
      },
      {
        label: 'نظرات',
        icon: 'pi pi-comments',
        routerLink: '/comments',
        permission: 'comments.view',
      },
    ],
  },
  {
    label: 'سیستم',
    items: [
      {
        label: 'پشتیبانی',
        icon: 'pi pi-inbox',
        routerLink: '/tickets',
        permission: 'tickets.view',
      },
      {
        label: 'تنظیمات',
        icon: 'pi pi-cog',
        routerLink: '/settings',
        permission: 'settings.write',
      },
    ],
  },
];

/** Every permission referenced by MENU — handy for tests and local seeding. */
export const MENU_PERMISSIONS: readonly Permission[] = Array.from(
  new Set(
    MENU.flatMap((group) =>
      group.items.map((item) => item.permission).filter((p): p is Permission => p !== undefined),
    ),
  ),
);
