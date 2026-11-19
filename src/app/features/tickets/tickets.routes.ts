import { Routes } from '@angular/router';
import { permissionGuard } from '@core/guards/permission.guard';

import { TicketList } from './ticket-list/ticket-list';

export const TICKETS_ROUTES: Routes = [
  {
    path: '',
    component: TicketList,
    title: 'پشتیبانی',
    canActivate: [permissionGuard],
    data: { title: 'پشتیبانی', breadcrumb: 'پشتیبانی', permission: 'tickets.view' },
  },
];
