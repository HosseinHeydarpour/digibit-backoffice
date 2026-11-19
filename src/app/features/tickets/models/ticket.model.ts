import type { TicketStatus } from '@shared/models';

export type TicketPriority = 'normal' | 'high';

/** One row of the support queue (BO-O01). */
export interface TicketListItem {
  readonly id: string;
  readonly code: string;
  readonly userName: string;
  readonly subject: string;
  readonly status: TicketStatus;
  readonly priority: TicketPriority;
  readonly unread: boolean;
  readonly lastMessageAt: number;
}

export interface TicketQuery {
  readonly status: TicketStatus | '';
  readonly priority: TicketPriority | '';
  readonly query: string;
  readonly page: number;
  readonly pageSize: number;
}
