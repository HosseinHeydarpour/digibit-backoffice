// src/app/features/categories/categories.routes.ts
//
// The categories module owns its definitions, the same contract BO-E01 set for
// the dashboard and BO-F01 for the products module: one `loadChildren` line in
// `app.routes.ts`, everything else here.

import type { Routes } from '@angular/router';

import { CategoryTree } from './category-tree/category-tree';

const CATEGORIES_PERMISSION = 'categories.view';

export const CATEGORIES_ROUTES: Routes = [
  {
    path: '',
    component: CategoryTree,
    title: 'دسته‌بندی‌ها',
    data: {
      title: 'دسته‌بندی‌ها',
      breadcrumb: 'دسته‌بندی‌ها',
      permission: CATEGORIES_PERMISSION,
    },
  },
];
