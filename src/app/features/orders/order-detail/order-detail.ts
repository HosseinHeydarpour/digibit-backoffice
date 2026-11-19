import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ErrorState } from '@shared/components/error-state/error-state';
import { PageHeader } from '@shared/components/page-header/page-header';
import type { OrderStatus } from '@shared/models/status-badge.model';
import { formatPersianDate, PersianDatePipe } from '@shared/pipes/persian-date.pipe';
import { PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { TomanPipe } from '@shared/pipes/toman.pipe';

import type { Order } from '../models/order.model';
import { orderStatusBadgeClass, orderStatusLabel } from '../order-status';

import type { OrderDetailResult } from './order-detail.resolver';

/**
 * Order detail page — `/orders/:id` (BO-H01 tc 10's destination).
 *
 * The resolver hands the page a COMPLETE order, so the first paint is already
 * the data — no empty cards filling in later. Three states, one wrapper input:
 * `{ order }` renders the cards, `{ error }` renders the retry block, and a 404
 * never reaches this component at all (the resolver redirects to `/404`).
 *
 * This is the read-only core BO-H03 extends: BO-H04 adds the status-change
 * action, BO-H05 replaces the plain history list with the timeline component,
 * BO-H06 adds the invoice button. Nothing here pretends those exist.
 *
 * TRACE — retry after the server was down:
 *   1. The resolver returned `{ error }`; the retry block is on screen.
 *   2. «تلاش دوباره» calls `reload()` → `navigateByUrl(router.url,
 *      { onSameUrlNavigation: 'reload' })`.
 *   3. The route's `runGuardsAndResolvers: 'always'` re-runs the resolver; a
 *      200 swaps the input to `{ order }` and the cards appear.
 */
@Component({
  selector: 'app-order-detail',
  imports: [PageHeader, RouterLink, PersianDatePipe, PersianDigitsPipe, TomanPipe, ErrorState],
  templateUrl: './order-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetail {
  private readonly router = inject(Router);

  /** Bound by `withComponentInputBinding()` from `resolve: { detail: … }`. */
  readonly detail = input<OrderDetailResult | null>(null);

  /** The loaded order, or null when the resolver failed. */
  readonly order = computed<Order | null>(() => {
    const result = this.detail();

    return result && 'order' in result ? result.order : null;
  });

  /** The sentence the error block prints when the resolver could not load. */
  readonly loadError = computed<string | null>(() => {
    const result = this.detail();

    return result && 'error' in result ? result.error : null;
  });

  /** «ثبت‌شده در ۱ مهر ۱۴۰۴» under the heading; absent while the load failed. */
  readonly pageDescription = computed<string | undefined>(() => {
    const order = this.order();

    return order ? `ثبت‌شده در ${formatPersianDate(order.createdAt, 'long')}` : undefined;
  });

  statusLabel(status: OrderStatus): string {
    return orderStatusLabel(status);
  }

  statusBadgeClass(status: OrderStatus): string {
    return orderStatusBadgeClass(status);
  }

  /**
   * Retry: re-run the resolver on the SAME url. Both halves are required —
   * `onSameUrlNavigation: 'reload'` here and `runGuardsAndResolvers: 'always'`
   * on the route — or the router replays the cached `{ error }` forever.
   */
  reload(): void {
    void this.router.navigateByUrl(this.router.url, { onSameUrlNavigation: 'reload' });
  }
}
