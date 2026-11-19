import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/services/api';
import type { Page } from '@shared/models';
import { Observable } from 'rxjs';

import type { TicketListItem, TicketQuery } from '../models/ticket.model';

/**
 * The support queue (BO-O01).
 *
 * TRACE — `list({ status: 'open', priority: 'high', query: 'سفارش', page: 1 })`:
 *   1. The query becomes `?status=open&priority=high&query=سفارش&page=1&pageSize=10`.
 *   2. The mock matches status and priority exactly, searches subject + user,
 *      sorts by LAST message (not creation), then paginates.
 *   3. `Page<TicketListItem>` gives the table its rows and its total.
 */
@Injectable({ providedIn: 'root' })
export class TicketsService {
  private readonly api = inject(ApiService);

  list(query: TicketQuery): Observable<Page<TicketListItem>> {
    return this.api.getPage<TicketListItem>('/tickets', {
      status: query.status,
      priority: query.priority,
      query: query.query.trim(),
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}
