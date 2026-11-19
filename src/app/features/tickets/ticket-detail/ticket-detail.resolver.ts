import { inject } from '@angular/core';
import { RedirectCommand, Router, type ResolveFn } from '@angular/router';
import { ApiError } from '@shared/models';
import { firstValueFrom } from 'rxjs';

import type { TicketDetail } from '../models/ticket.model';
import { TicketsService } from '../services/tickets.service';

/** The page's input: a loaded ticket, or the sentence for its retry block. */
export type TicketDetailResult = { readonly ticket: TicketDetail } | { readonly error: string };

export const TICKET_DETAIL_ERROR = 'دریافت تیکت ناموفق بود.';

/**
 * Loads one ticket before the page paints (BO-O02).
 *
 * A 404 redirects to `/404` — an id that does not exist is a wrong URL, not a
 * retryable failure. Anything else returns `{ error }` so the page can render a
 * retry; a rejected resolver would cancel the navigation and leave a blank
 * screen. The GET also marks the ticket read on the server, which is what makes
 * the sidebar badge drop (BO-O06 tc 3).
 */
export const ticketDetailResolver: ResolveFn<TicketDetailResult> = async (route) => {
  const tickets = inject(TicketsService);
  const router = inject(Router);

  try {
    return { ticket: await firstValueFrom(tickets.get(route.paramMap.get('id') ?? '')) };
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) {
      return new RedirectCommand(router.parseUrl('/404'));
    }

    return { error: TICKET_DETAIL_ERROR };
  }
};
