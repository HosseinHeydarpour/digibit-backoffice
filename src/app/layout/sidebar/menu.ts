import type { MenuGroup } from './menu.model';

export const MENU: readonly MenuGroup[] = [
  {
    label: 'فروشگاه',
    items: [
      { label: 'پیشخوان', icon: 'pi pi-home', routerLink: '/dashboard' },
      { label: 'محصولات', icon: 'pi pi-box', routerLink: '/products' },
      { label: 'دستهبندیها', icon: 'pi pi-sitemap', routerLink: '/categories' },
      { label: 'برندها', icon: 'pi pi-tags', routerLink: '/brands' },
    ],
  },
  {
    label: 'سفارشها',
    items: [
      { label: 'سفارشها', icon: 'pi pi-shopping-cart', routerLink: '/orders' },
      { label: 'مشتریان', icon: 'pi pi-users', routerLink: '/customers' },
      { label: 'کوپن تخفیف', icon: 'pi pi-ticket', routerLink: '/coupons' },
      { label: 'روشهای ارسال', icon: 'pi pi-truck', routerLink: '/shipping' },
    ],
  },
  {
    label: 'محتوا',
    items: [
      { label: 'بنر و محتوا', icon: 'pi pi-images', routerLink: '/banners' },
      { label: 'نظرات', icon: 'pi pi-comments', routerLink: '/comments' },
    ],
  },
  {
    label: 'سیستم',
    items: [
      { label: 'پشتیبانی', icon: 'pi pi-inbox', routerLink: '/tickets' },
      { label: 'تنظیمات', icon: 'pi pi-cog', routerLink: '/settings' },
    ],
  },
];
