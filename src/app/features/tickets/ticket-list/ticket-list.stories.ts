import { provideRouter } from '@angular/router';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { NEVER, Observable, of } from 'rxjs';

import type { TicketListItem } from '../models/ticket.model';
import { TicketsService } from '../services/tickets.service';

import { TicketList } from './ticket-list';

const ROWS: TicketListItem[] = [
  {
    id: '1',
    code: 'TK-2400',
    userName: 'زهرا محمدی',
    subject: 'پیگیری سفارش شماره ۱۴۰۰۰',
    status: 'open',
    priority: 'high',
    unread: true,
    lastMessageAt: 1_728_000_000_000,
  },
  {
    id: '2',
    code: 'TK-2401',
    userName: 'علی رضایی',
    subject: 'سوال دربارهٔ گارانتی',
    status: 'pending',
    priority: 'normal',
    unread: false,
    lastMessageAt: 1_727_900_000_000,
  },
  {
    id: '3',
    code: 'TK-2402',
    userName: 'مریم حسینی',
    subject: 'مرجوعی کالای آسیب‌دیده',
    status: 'closed',
    priority: 'normal',
    unread: false,
    lastMessageAt: 1_727_800_000_000,
  },
];

class TicketsServiceStub {
  list(): Observable<{ items: TicketListItem[]; total: number; page: number; pageSize: number }> {
    return of({ items: ROWS, total: ROWS.length, page: 1, pageSize: 10 });
  }
}

const meta: Meta<TicketList> = {
  title: 'Features/Tickets',
  component: TicketList,
  decorators: [applicationConfig({ providers: [provideRouter([])] })],
  parameters: {
    docs: {
      description: {
        component: [
          'The support queue (BO-O01): status and priority filters plus a search, unread rows in',
          'bold with an envelope, and the LAST message date — the queue is about who is waiting now.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<TicketList>;

/** One row per status; the first is unread and urgent. */
export const Default: Story = {
  render: () => ({
    template: '<app-ticket-list />',
    moduleMetadata: {
      providers: [{ provide: TicketsService, useValue: new TicketsServiceStub() }],
    },
  }),
};

/** The first paint: five skeleton rows. */
export const Loading: Story = {
  render: () => ({
    template: '<app-ticket-list />',
    moduleMetadata: {
      providers: [{ provide: TicketsService, useValue: { list: () => NEVER } }],
    },
  }),
};
