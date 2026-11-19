import { Routes } from '@angular/router';
import { permissionGuard } from '@core/guards/permission.guard';

import { TicketDetailPage } from './ticket-detail/ticket-detail';
import { ticketDetailResolver } from './ticket-detail/ticket-detail.resolver';
import { TicketList } from './ticket-list/ticket-list';

export const TICKETS_ROUTES: Routes = [
  {
    path: '',
    component: TicketList,
    title: 'پشتیبانی',
    canActivate: [permissionGuard],
    data: { title: 'پشتیبانی', breadcrumb: 'پشتیبانی', permission: 'tickets.view' },
  },
  {
    path: ':id',
    component: TicketDetailPage,
    title: 'تیکت پشتیبانی',
    canActivate: [permissionGuard],
    resolve: { detail: ticketDetailResolver },
    // Retry navigates to the SAME URL; without this the resolver replays its
    // cached `{ error }` and the retry button looks dead (BO-O02 tc 6).
    runGuardsAndResolvers: 'always',
    data: { title: 'تیکت پشتیبانی', breadcrumb: 'تیکت', permission: 'tickets.view' },
  },
];
