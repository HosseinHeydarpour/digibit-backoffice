import type { TicketStatus } from '@shared/models';

export type TicketPriority = 'normal' | 'high';

export type TicketAuthor = 'customer' | 'agent';

/** One row of the support queue (BO-O01). */
export interface TicketListItem {
  readonly id: string;
  readonly code: string;
  readonly userId: string;
  readonly userName: string;
  readonly subject: string;
  readonly status: TicketStatus;
  readonly priority: TicketPriority;
  readonly unread: boolean;
  readonly lastMessageAt: number;
  readonly assigneeId: string | null;
  readonly assigneeName: string | null;
}

export interface TicketAttachment {
  readonly name: string;
  readonly url: string;
  readonly size: number;
}

/** One message in the thread (BO-O02). */
export interface TicketMessage {
  readonly id: string;
  readonly author: TicketAuthor;
  readonly authorName: string;
  readonly body: string;
  readonly createdAt: number;
  readonly attachments: readonly TicketAttachment[];
}

/** One recorded status change (BO-O04). */
export interface TicketStatusHistory {
  readonly id: string;
  readonly status: TicketStatus;
  readonly note: string | null;
  readonly createdAt: number;
}

export interface TicketDetail extends TicketListItem {
  readonly messages: readonly TicketMessage[];
  readonly statusHistory: readonly TicketStatusHistory[];
}

export interface TicketQuery {
  readonly status: TicketStatus | '';
  readonly priority: TicketPriority | '';
  readonly query: string;
  readonly page: number;
  readonly pageSize: number;
}

/** `POST /tickets/:id/reply` (BO-O03). */
export interface TicketReply {
  readonly body: string;
}

/** `PATCH /tickets/:id/status` (BO-O04). */
export interface TicketStatusChange {
  readonly status: TicketStatus;
  readonly note?: string;
}

/** `PATCH /tickets/:id/assign` (BO-O05) — `null` unassigns. */
export interface TicketAssign {
  readonly userId: string | null;
}

/** A support agent for the assignee select. */
export interface TicketAgent {
  readonly id: string;
  readonly name: string;
}
