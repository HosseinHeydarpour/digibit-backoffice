// src/app/features/banners/banners.routes.ts
//
// The banners module's routes, owned by the module (BO-L01). The route needs
// `content.view`, the string the sidebar item already carries.

import { Routes } from '@angular/router';
import { permissionGuard } from '@core/guards/permission.guard';

import { BannerList } from './banner-list/banner-list';

export const BANNERS_ROUTES: Routes = [
  {
    path: '',
    component: BannerList,
    title: 'بنر و محتوا',
    canActivate: [permissionGuard],
    data: {
      title: 'بنر و محتوا',
      breadcrumb: 'بنر و محتوا',
      permission: 'content.view',
    },
  },
];
