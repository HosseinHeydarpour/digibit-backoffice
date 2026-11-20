import { Routes } from '@angular/router';

import { Profile } from './profile';

export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    component: Profile,
    title: 'پروفایل من',
    data: { title: 'پروفایل من', breadcrumb: 'پروفایل من' },
  },
];
