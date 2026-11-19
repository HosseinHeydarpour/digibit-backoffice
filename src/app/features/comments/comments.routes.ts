import { Routes } from '@angular/router';
import { permissionGuard } from '@core/guards/permission.guard';

import { CommentList } from './comment-list/comment-list';

export const COMMENTS_ROUTES: Routes = [
  {
    path: '',
    component: CommentList,
    title: 'نظرات',
    canActivate: [permissionGuard],
    data: { title: 'نظرات', breadcrumb: 'نظرات', permission: 'comments.view' },
  },
];
