// src/app/features/shipping/shipping.routes.ts
//
// The shipping module's routes, owned by the module (BO-K01). The guard reads
// `data.permission: 'shipping.view'`, the same string the sidebar item carries.

import { Routes } from '@angular/router';
import { permissionGuard } from '@core/guards/permission.guard';

import { ShippingList } from './shipping-list/shipping-list';

export const SHIPPING_ROUTES: Routes = [
  {
    path: '',
    component: ShippingList,
    title: 'روش‌های ارسال',
    canActivate: [permissionGuard],
    data: {
      title: 'روش‌های ارسال',
      breadcrumb: 'روش‌های ارسال',
      permission: 'shipping.view',
    },
  },
];
