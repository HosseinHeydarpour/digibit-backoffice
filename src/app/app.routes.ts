import { Routes } from '@angular/router';
import { MainLayout } from '@layout/index';

export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
    children: [
      // feature routes land here from queue C onward
    ],
  },
];
