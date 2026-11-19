import type { TicketStatus } from '@shared/models';

import type { TicketPriority } from './models/ticket.model';

/** Priority is not a status; it gets its own label pair (BO-O01). */
export const TICKET_PRIORITY_META: Record<
  TicketPriority,
  { label: string; severity: 'danger' | 'secondary' }
> = {
  normal: { label: 'عادی', severity: 'secondary' },
  high: { label: 'فوری', severity: 'danger' },
};

/** The status graph BO-O04 offers; closing and reopening are both allowed. */
export const TICKET_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  open: ['pending', 'closed'],
  pending: ['open', 'closed'],
  closed: ['open'],
};
