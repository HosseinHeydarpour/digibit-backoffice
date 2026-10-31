// src/app/features/brands/brands.routes.ts
//
// The brands module owns its definition, the same contract BO-E01 set: one
// `loadChildren` line in `app.routes.ts`, everything else here.

import type { Routes } from '@angular/router';

import { BrandList } from './brand-list/brand-list';

export const BRANDS_ROUTES: Routes = [
  {
    path: '',
    component: BrandList,
    title: 'برندها',
    data: {
      title: 'برندها',
      breadcrumb: 'برندها',
      // The menu grants brands under the products umbrella (menu.ts), so the
      // page gates its actions with the same string instead of inventing a new
      // permission the backend does not have yet.
      permission: 'products.view',
    },
  },
];
