import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '@core/services/api';
import { interval, map } from 'rxjs';

const POLL_MS = 60_000;

/**
 * The unread-ticket badge (BO-O06).
 *
 * Lives in `core/` because the SIDEBAR renders it: a layout component importing
 * a feature service would break the one-way dependency rule, so this service
 * talks to `/tickets/unread-count` through `ApiService` instead. The tickets
 * module refreshes it after opening, replying or closing a ticket.
 *
 * Polling, not websockets: one small request a minute is enough for a support
 * queue, and it keeps the mock honest. The poll skips a hidden tab (tc 9) and a
 * `visibilitychange` listener refreshes the moment the tab comes back, so a
 * returning user never reads a stale number.
 */
@Injectable({ providedIn: 'root' })
export class TicketUnread {
  private readonly api = inject(ApiService);

  private readonly destroyRef = inject(DestroyRef);

  readonly count = signal(0);

  constructor() {
    this.refresh();

    interval(POLL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!document.hidden) {
          this.refresh();
        }
      });

    const onVisible = (): void => {
      if (!document.hidden) {
        this.refresh();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    this.destroyRef.onDestroy(() => document.removeEventListener('visibilitychange', onVisible));
  }

  /** Re-read the count after any action that changes it (open, reply, status). */
  refresh(): void {
    this.api
      .get<{ count: number }>('/tickets/unread-count')
      .pipe(
        map((answer) => answer.count),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (count) => this.count.set(count),
        // A badge is decoration; a failed poll must not toast or break the shell.
        error: () => undefined,
      });
  }
}
