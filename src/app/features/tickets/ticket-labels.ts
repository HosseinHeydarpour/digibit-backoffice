import type { TicketPriority } from './models/ticket.model';

/** Priority is not a status; it gets its own label pair (BO-O01). */
export const TICKET_PRIORITY_META: Record<
  TicketPriority,
  { label: string; severity: 'danger' | 'secondary' }
> = {
  normal: { label: 'عادی', severity: 'secondary' },
  high: { label: 'فوری', severity: 'danger' },
};
