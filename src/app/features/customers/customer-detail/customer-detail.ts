import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorState } from '@shared/components/error-state/error-state';
import { PageHeader } from '@shared/components/page-header/page-header';
import { ORDER_STATUS_META } from '@shared/models/status-badge.model';
import type { BadgeSeverity } from '@shared/models/status-badge.model';
import type { OrderStatus } from '@shared/models/status-badge.model';
import { formatPersianDate, PersianDatePipe } from '@shared/pipes/persian-date.pipe';
import { PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { TomanPipe } from '@shared/pipes/toman.pipe';
import { Tag } from 'primeng/tag';

import { customerStatusBadgeClass, customerStatusLabel } from '../customer-status';
import type { Customer, CustomerOrderSummary, CustomerStatus } from '../models/customer.model';

import type { CustomerDetailResult } from './customer-detail.resolver';

/**
 * Customer profile — `/customers/:id` (BO-I02).
 *
 * The resolver hands the page the customer AND their latest orders, so the
 * first paint is complete: no card fills in after the heading, and the order
 * table never shows "no orders" for a second before the rows arrive.
 *
 * Three states, one wrapper input: `{ customer, orders }` renders the cards,
 * `{ error }` renders the retry block, and a 404 never reaches this component
 * (the resolver redirects to `/404`).
 *
 * The empty-orders branch is the detail half of BO-I05: a customer who has not
 * bought yet is a valid profile, not a broken page.
 */
@Component({
  selector: 'app-customer-detail',
  imports: [
    PageHeader,
    RouterLink,
    PersianDatePipe,
    PersianDigitsPipe,
    TomanPipe,
    Tag,
    ErrorState,
    EmptyState,
  ],
  templateUrl: './customer-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDetail {
  private readonly router = inject(Router);

  /** Bound by `withComponentInputBinding()` from `resolve: { detail: … }`. */
  readonly detail = input<CustomerDetailResult | null>(null);

  readonly customer = computed<Customer | null>(() => {
    const result = this.detail();

    return result && 'customer' in result ? result.customer : null;
  });

  readonly orders = computed<readonly CustomerOrderSummary[]>(() => {
    const result = this.detail();

    return result && 'orders' in result ? result.orders : [];
  });

  readonly loadError = computed<string | null>(() => {
    const result = this.detail();

    return result && 'error' in result ? result.error : null;
  });

  /** «عضو از ۱ مهر ۱۴۰۴» under the name; absent while the load failed. */
  readonly pageDescription = computed<string | undefined>(() => {
    const customer = this.customer();

    return customer ? `عضو از ${formatPersianDate(customer.createdAt, 'long')}` : undefined;
  });

  statusLabel(status: CustomerStatus): string {
    return customerStatusLabel(status);
  }

  statusBadgeClass(status: CustomerStatus): string {
    return customerStatusBadgeClass(status);
  }

  /** The shared order vocabulary — the profile must not invent its own words. */
  orderStatusLabel(status: OrderStatus): string {
    return ORDER_STATUS_META[status]?.label ?? 'نامشخص';
  }

  orderStatusSeverity(status: OrderStatus): BadgeSeverity {
    return ORDER_STATUS_META[status]?.severity ?? 'secondary';
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
