// src/app/core/mock/fixtures/tickets.fixture.ts
//
// The support seed (BO-O01..O08): eight tickets, their threads and a small
// support team. The list row and the detail come from the SAME object, so a
// status changed in the detail cannot disagree with the queue.

import type { TicketStatus } from '@shared/models';

import { FIXTURE_NOW } from './products.fixture';

const HOUR = 3_600_000;

export interface MockTicketMessage {
  readonly id: string;
  readonly author: 'customer' | 'agent';
  readonly authorName: string;
  readonly body: string;
  readonly createdAt: number;
  readonly attachments: readonly { name: string; url: string; size: number }[];
}

export interface MockTicketStatusHistory {
  readonly id: string;
  readonly status: TicketStatus;
  readonly note: string | null;
  readonly createdAt: number;
}

export interface MockTicket {
  readonly id: string;
  readonly code: string;
  readonly userId: string;
  readonly userName: string;
  readonly subject: string;
  readonly status: TicketStatus;
  readonly priority: 'normal' | 'high';
  readonly unread: boolean;
  readonly lastMessageAt: number;
  readonly assigneeId: string | null;
  readonly assigneeName: string | null;
  readonly messages: readonly MockTicketMessage[];
  readonly statusHistory: readonly MockTicketStatusHistory[];
}

export const SUPPORT_AGENTS = [
  { id: 'u1', name: 'نگار شریفی' },
  { id: 'u2', name: 'امیر صادقی' },
  { id: 'u3', name: 'سارا احمدی' },
] as const;

const SUBJECTS = [
  'پیگیری سفارش شماره ۱۴۰۰۰',
  'سوال دربارهٔ گارانتی',
  'مرجوعی کالای آسیب‌دیده',
  'تغییر آدرس ارسال',
  'کد تخفیف اعمال نشد',
  'زمان تحویل سفارش',
  'قطعهٔ گم‌شده در بسته',
  'درخواست فاکتور رسمی',
];

const CUSTOMER_NAMES = [
  'زهرا محمدی',
  'علی رضایی',
  'مریم حسینی',
  'رضا کریمی',
  'سارا احمدی',
  'محمد نوری',
  'نگار شریفی',
  'امیر صادقی',
];

function message(
  ticketIndex: number,
  turn: number,
  author: 'customer' | 'agent',
  body: string,
  at: number,
): MockTicketMessage {
  return {
    id: `${ticketIndex + 1}-m${turn}`,
    author,
    authorName:
      author === 'customer' ? CUSTOMER_NAMES[ticketIndex] : SUPPORT_AGENTS[ticketIndex % 3].name,
    body,
    createdAt: at,
    // One image in the first customer message of every third ticket, so the
    // attachment layout is reachable in the demo (BO-O02 tc 7).
    attachments:
      turn === 1 && ticketIndex % 3 === 0
        ? [{ name: 'رسید.png', url: '/mock/receipt.png', size: 84_000 }]
        : [],
  };
}

/** Three turns per ticket, ending at `lastMessageAt`. */
function threadFor(index: number, lastMessageAt: number): MockTicketMessage[] {
  const subject = SUBJECTS[index];

  return [
    message(index, 1, 'customer', `${subject} — لطفاً بررسی کنید.`, lastMessageAt - 2 * HOUR),
    message(
      index,
      2,
      'agent',
      'سلام، در حال بررسی هستم. نتیجه را اطلاع می‌دهم.',
      lastMessageAt - HOUR,
    ),
    message(index, 3, 'customer', 'ممنون، منتظر پاسخ هستم.', lastMessageAt),
  ];
}

export const MOCK_TICKET_DETAILS: readonly MockTicket[] = Array.from({ length: 8 }, (_, i) => {
  const id = String(i + 1);
  const lastMessageAt = FIXTURE_NOW - i * 7_200_000;
  const status: TicketStatus = (['open', 'pending', 'closed'] as const)[i % 3];
  const assignee = i % 3 === 2 ? null : SUPPORT_AGENTS[i % 3];

  return {
    id,
    code: `TK-${2400 + i}`,
    userId: String((i % 8) + 1),
    userName: CUSTOMER_NAMES[i],
    subject: SUBJECTS[i],
    status,
    priority: i % 3 === 0 ? 'high' : 'normal',
    unread: i % 4 === 0,
    lastMessageAt,
    assigneeId: assignee?.id ?? null,
    assigneeName: assignee?.name ?? null,
    messages: threadFor(i, lastMessageAt),
    statusHistory: [
      { id: `${id}-h1`, status: 'open', note: null, createdAt: lastMessageAt - 2 * HOUR },
      ...(status === 'pending'
        ? [
            {
              id: `${id}-h2`,
              status: 'pending' as const,
              note: null,
              createdAt: lastMessageAt - HOUR,
            },
          ]
        : []),
      ...(status === 'closed'
        ? [
            {
              id: `${id}-h2`,
              status: 'closed' as const,
              note: 'پاسخ داده شد',
              createdAt: lastMessageAt - HOUR,
            },
          ]
        : []),
    ],
  };
});

/** The queue rows: the detail minus the thread. */
export const MOCK_TICKETS = MOCK_TICKET_DETAILS.map((ticket) => ({
  id: ticket.id,
  code: ticket.code,
  userId: ticket.userId,
  userName: ticket.userName,
  subject: ticket.subject,
  status: ticket.status,
  priority: ticket.priority,
  unread: ticket.unread,
  lastMessageAt: ticket.lastMessageAt,
  assigneeId: ticket.assigneeId,
  assigneeName: ticket.assigneeName,
}));
