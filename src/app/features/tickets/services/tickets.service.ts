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

type TicketListRaw = Omit<TicketListItem, 'lastMessageAt'> & { lastMessageAt: string | number };

type TicketDetailRaw = Omit<TicketDetail, 'lastMessageAt' | 'messages' | 'statusHistory'> & {
  lastMessageAt: string | number;
  messages: (Omit<TicketDetail['messages'][number], 'createdAt'> & {
    createdAt: string | number;
  })[];
  statusHistory: (Omit<TicketDetail['statusHistory'][number], 'createdAt'> & {
    createdAt: string | number;
  })[];
};

function millis(value: string | number): number {
  return typeof value === 'number' ? value : Date.parse(value) || 0;
}

function mapListItem(raw: TicketListRaw): TicketListItem {
  return { ...raw, lastMessageAt: millis(raw.lastMessageAt) };
}

function mapDetail(raw: TicketDetailRaw): TicketDetail {
  return {
    ...mapListItem(raw),
    messages: raw.messages.map((message) => ({
      ...message,
      createdAt: millis(message.createdAt),
    })),
    statusHistory: raw.statusHistory.map((entry) => ({
      ...entry,
      createdAt: millis(entry.createdAt),
    })),
  };
}

/**
 * The support API (BO-O01..O08).
 *
 * The server speaks ISO dates and calls a reply a `message`; both differences
 * are absorbed here so the queue and the thread bind one model.
 */
@Injectable({ providedIn: 'root' })
export class TicketsService {
  private readonly api = inject(ApiService);

  list(query: TicketQuery): Observable<Page<TicketListItem>> {
    return this.api
      .getPage<TicketListRaw>(TICKETS_PATH, {
        status: query.status,
        priority: query.priority,
        query: query.query.trim(),
        page: query.page,
        pageSize: query.pageSize,
      })
      .pipe(map((page) => ({ ...page, items: page.items.map(mapListItem) })));
  }

  get(id: string): Observable<TicketDetail> {
    return this.api
      .get<TicketDetailRaw>(`${TICKETS_PATH}/${encodeURIComponent(id)}`)
      .pipe(map(mapDetail));
  }

  reply(id: string, input: TicketReply): Observable<TicketDetail> {
    return this.api
      .post<TicketDetailRaw>(`${TICKETS_PATH}/${encodeURIComponent(id)}/messages`, input)
      .pipe(map(mapDetail));
  }

  changeStatus(id: string, input: TicketStatusChange): Observable<TicketDetail> {
    return this.api
      .patch<TicketDetailRaw>(`${TICKETS_PATH}/${encodeURIComponent(id)}/status`, input)
      .pipe(map(mapDetail));
  }

  assign(id: string, input: TicketAssign): Observable<TicketDetail> {
    return this.api
      .patch<TicketDetailRaw>(`${TICKETS_PATH}/${encodeURIComponent(id)}/assign`, input)
      .pipe(map(mapDetail));
  }

  unreadCount(): Observable<number> {
    return this.api
      .get<{ count: number }>(`${TICKETS_PATH}/unread-count`)
      .pipe(map((answer) => answer.count));
  }

  agents(): Observable<TicketAgent[]> {
    return this.api
      .get<{ id: string; fullName: string; isActive?: boolean }[]>('/admin/users')
      .pipe(
        map((rows) =>
          rows
            .filter((user) => user.isActive !== false)
            .map((user) => ({ id: user.id, name: user.fullName })),
        ),
      );
  }
}
