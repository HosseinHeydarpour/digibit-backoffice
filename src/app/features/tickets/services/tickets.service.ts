import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/services/api';
import type { Page } from '@shared/models';
import { Observable, map } from 'rxjs';

import type {
  TicketAgent,
  TicketAssign,
  TicketDetail,
  TicketListItem,
  TicketQuery,
  TicketReply,
  TicketStatusChange,
} from '../models/ticket.model';

const TICKETS_PATH = '/tickets';

/**
 * The support API (BO-O01..O08).
 *
 * TRACE — a reply from the detail page:
 *   1. `reply('1', 'سلام، بررسی شد.')` → `POST /tickets/1/reply`.
 *   2. The mock appends an agent message, sets `lastMessageAt` and moves the
 *      ticket to `pending` (waiting for the customer), then returns the detail.
 *   3. The page swaps its signal with that answer; `TicketUnread` is refreshed
 *      separately, because the queue badge is a different request.
 */
@Injectable({ providedIn: 'root' })
export class TicketsService {
  private readonly api = inject(ApiService);

  list(query: TicketQuery): Observable<Page<TicketListItem>> {
    return this.api.getPage<TicketListItem>(TICKETS_PATH, {
      status: query.status,
      priority: query.priority,
      query: query.query.trim(),
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  get(id: string): Observable<TicketDetail> {
    return this.api.get<TicketDetail>(`${TICKETS_PATH}/${encodeURIComponent(id)}`);
  }

  reply(id: string, input: TicketReply): Observable<TicketDetail> {
    return this.api.post<TicketDetail>(`${TICKETS_PATH}/${encodeURIComponent(id)}/reply`, input);
  }

  changeStatus(id: string, input: TicketStatusChange): Observable<TicketDetail> {
    return this.api.patch<TicketDetail>(`${TICKETS_PATH}/${encodeURIComponent(id)}/status`, input);
  }

  assign(id: string, input: TicketAssign): Observable<TicketDetail> {
    return this.api.patch<TicketDetail>(`${TICKETS_PATH}/${encodeURIComponent(id)}/assign`, input);
  }

  unreadCount(): Observable<number> {
    return this.api
      .get<{ count: number }>(`${TICKETS_PATH}/unread-count`)
      .pipe(map((answer) => answer.count));
  }

  agents(): Observable<TicketAgent[]> {
    return this.api.get<TicketAgent[]>('/users', { role: 'support' });
  }
}
