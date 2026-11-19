// src/app/features/coupons/coupons.routes.ts
//
// The coupons module's routes, owned by the module (BO-J01). The guard reads
// `data.permission: 'coupons.view'`, the same string the sidebar item carries.

import { Routes } from '@angular/router';
import { permissionGuard } from '@core/guards/permission.guard';

import { CouponList } from './coupon-list/coupon-list';

export const COUPONS_ROUTES: Routes = [
  {
    path: '',
    component: CouponList,
    title: 'کوپن تخفیف',
    canActivate: [permissionGuard],
    data: {
      title: 'کوپن تخفیف',
      breadcrumb: 'کوپن تخفیف',
      permission: 'coupons.view',
    },
  },
];
