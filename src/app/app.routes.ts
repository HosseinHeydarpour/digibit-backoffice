import { Routes } from '@angular/router';
import { MainLayout } from '@layout/index';

export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
    children: [
      // feature routes land here from queue C onward
      { path: 'dashboard', children: [] },
      { path: 'products', children: [] },
      { path: 'categories', children: [] },
      { path: 'brands', children: [] },
      { path: 'orders', children: [] },
      { path: 'customers', children: [] },
      { path: 'coupons', children: [] },
      { path: 'shipping', children: [] },
      { path: 'banners', children: [] },
      { path: 'comments', children: [] },
      { path: 'tickets', children: [] },
      { path: 'settings', children: [] },
    ],
  },
];
