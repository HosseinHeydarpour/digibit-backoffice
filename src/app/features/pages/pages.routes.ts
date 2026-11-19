// src/app/features/pages/pages.routes.ts
//
// The fixed content pages route (BO-L08). The route needs `content.view`; the
// edit control needs `content.manage`.

import { Routes } from '@angular/router';
import { permissionGuard } from '@core/guards/permission.guard';

import { ContentPageList } from './content-page-list/content-page-list';

export const PAGES_ROUTES: Routes = [
  {
    path: '',
    component: ContentPageList,
    title: 'صفحات',
    canActivate: [permissionGuard],
    data: {
      title: 'صفحات',
      breadcrumb: 'صفحات',
      permission: 'content.view',
    },
  },
];
