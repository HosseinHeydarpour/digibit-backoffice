// src/app/features/customers/customers.routes.ts
//
// The customers module's routes, owned by the module (the `loadChildren`
// contract the dashboard, products and orders established). BO-I01 ships the
// list; BO-I02 adds `:id` to the same file.
//
// The route declares `permission: 'customers.view'` — the same string the
// sidebar item carries. The guard reads it (BO-I06), so the menu and the URL
// cannot disagree about who may open the module.

import { Routes } from '@angular/router';
import { permissionGuard } from '@core/guards/permission.guard';

import { CustomerList } from './customer-list/customer-list';

export const CUSTOMERS_ROUTES: Routes = [
  {
    path: '',
    component: CustomerList,
    title: 'مشتریان',
    canActivate: [permissionGuard],
    data: {
      title: 'مشتریان',
      breadcrumb: 'مشتریان',
      permission: 'customers.view',
    },
  },
];
