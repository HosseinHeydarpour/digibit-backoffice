import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { CURRENT_USER } from '@core/auth/current-user.token';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { ConfirmService } from '@core/services/confirm';
import { TicketUnread } from '@core/services/ticket-unread';
import { ToastService } from '@core/services/toast';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { of } from 'rxjs';

import type { TicketDetail } from '../models/ticket.model';
import { TicketsService } from '../services/tickets.service';

import { TicketDetailPage } from './ticket-detail';

const TICKET: TicketDetail = {
  id: '1',
  code: 'TK-2400',
  userId: 'c1',
  userName: 'زهرا محمدی',
  subject: 'پیگیری سفارش شماره ۱۴۰۰۰',
  status: 'open',
  priority: 'high',
  unread: false,
  lastMessageAt: 1_728_000_000_000,
  assigneeId: 'u1',
  assigneeName: 'نگار شریفی',
  messages: [
    {
      id: 'm1',
      author: 'customer',
      authorName: 'زهرا محمدی',
      body: 'سلام، سفارش من هنوز نرسیده. کد رهگیری هم کار نمی‌کند.',
      createdAt: 1_727_990_000_000,
      attachments: [{ name: 'رسید.png', url: '/mock/receipt.png', size: 84_000 }],
    },
    {
      id: 'm2',
      author: 'agent',
      authorName: 'نگار شریفی',
      body: 'سلام، با پست تماس گرفتم؛ بسته فردا تحویل می‌شود.',
      createdAt: 1_727_996_000_000,
      attachments: [],
    },
  ],
  statusHistory: [],
};

class TicketsServiceStub {
  get() {
    return of(TICKET);
  }

  agents() {
    return of([{ id: 'u1', name: 'نگار شریفی' }]);
  }

  reply() {
    return of(TICKET);
  }

  changeStatus() {
    return of(TICKET);
  }

  assign() {
    return of(TICKET);
  }
}

const meta: Meta<TicketDetailPage> = {
  title: 'Features/Tickets/Detail',
  component: TicketDetailPage,
  decorators: [
    applicationConfig({
      providers: [
        provideRouter([]),
        { provide: ToastService, useValue: { success: () => undefined } },
        { provide: ConfirmService, useValue: { confirm: async () => true } },
        { provide: TicketUnread, useValue: { refresh: () => undefined, count: signal(0) } },
        { provide: PERMISSIONS, useValue: signal(['tickets.view', 'tickets.manage']) },
        {
          provide: CURRENT_USER,
          useValue: signal({ id: 'u1', fullName: 'نگار شریفی', email: null, avatarUrl: null }),
        },
      ],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'One ticket and its thread (BO-O02..O05): customer messages right, agent replies left,',
          'an attachment link, a composer where Enter sends and Shift+Enter adds a line, and the',
          'assignee/status controls on the header.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<TicketDetailPage>;

/** A ticket with one customer message and one agent reply. */
export const Default: Story = {
  render: () => ({
    template: '<app-ticket-detail [detail]="detail" />',
    props: { detail: { ticket: TICKET } },
    moduleMetadata: {
      providers: [{ provide: TicketsService, useValue: new TicketsServiceStub() }],
    },
  }),
};
