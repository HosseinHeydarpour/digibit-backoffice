import { Routes } from '@angular/router';
import { MainLayout } from '@layout/index';

export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
    children: [
      // feature routes land here from queue C onward
      { path: 'dashboard', data: { title: 'پیشخوان' }, title: 'پیشخوان', children: [] },
      { path: 'products', data: { title: 'محصولات' }, title: 'محصولات', children: [] },
      { path: 'categories', data: { title: 'دستهبندیها' }, title: 'دستهبندیها', children: [] },
      { path: 'brands', data: { title: 'برندها' }, title: 'برندها', children: [] },
      { path: 'orders', data: { title: 'سفارشها' }, title: 'سفارشها', children: [] },
      { path: 'customers', data: { title: 'مشتریان' }, title: 'مشتریان', children: [] },
      { path: 'coupons', data: { title: 'کوپن تخفیف' }, title: 'کوپن تخفیف', children: [] },
      { path: 'shipping', data: { title: 'روشهای ارسال' }, title: 'روشهای ارسال', children: [] },
      { path: 'banners', data: { title: 'بنر و محتوا' }, title: 'بنر و محتوا', children: [] },
      { path: 'comments', data: { title: 'نظرات' }, title: 'نظرات', children: [] },
      { path: 'tickets', data: { title: 'پشتیبانی' }, title: 'پشتیبانی', children: [] },
      { path: 'settings', data: { title: 'تنظیمات' }, title: 'تنظیمات', children: [] },
    ],
  },
];
