// src/app/features/settings/settings.routes.ts
//
// Settings are SuperAdmin-only (BO-M07): the route declares `settings.write`,
// the same grant the sidebar item carries, and `permissionGuard` sends anyone
// else to `/forbidden`.

import { Routes } from '@angular/router';
import { permissionGuard } from '@core/guards/permission.guard';
import { unsavedChangesGuard } from '@core/guards/unsaved-changes.guard';

import { SettingsPage } from './settings-page/settings-page';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    component: SettingsPage,
    title: 'تنظیمات',
    canActivate: [permissionGuard],
    canDeactivate: [unsavedChangesGuard],
    data: {
      title: 'تنظیمات',
      breadcrumb: 'تنظیمات',
      permission: 'settings.write',
    },
  },
];
