import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '@core/services/toast';
import { ErrorState } from '@shared/components/error-state/error-state';
import { PageHeader } from '@shared/components/page-header/page-header';
import { LoadingDirective } from '@shared/directives/loading.directive';
import type { OrderStatus } from '@shared/models/status-badge.model';
import { AssetUrlPipe } from '@shared/pipes/asset-url.pipe';
import { formatPersianDate, PersianDatePipe } from '@shared/pipes/persian-date.pipe';
import { PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { TomanPipe } from '@shared/pipes/toman.pipe';
import { ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';

import type { Order } from '../models/order.model';
import { OrderInvoice } from '../order-invoice/order-invoice';
import {
  CANCELLABLE,
  CANCEL_REASONS,
  ORDER_TRANSITIONS,
  orderStatusBadgeClass,
  orderStatusLabel,
} from '../order-status';
import { OrderTimeline } from '../order-timeline/order-timeline';
import { OrdersService } from '../services/orders.service';

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
  imports: [
    AssetUrlPipe,
    PageHeader,
    RouterLink,
    ReactiveFormsModule,
    OrderTimeline,
    OrderInvoice,
    PersianDatePipe,
    PersianDigitsPipe,
    TomanPipe,
    ErrorState,
    ButtonDirective,
    LoadingDirective,
    Dialog,
    Select,
    Textarea,
  ],
  templateUrl: './order-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetail {
  private readonly router = inject(Router);

  private readonly ordersService = inject(OrdersService);

  private readonly toast = inject(ToastService);

  private readonly destroyRef = inject(DestroyRef);

  /** Bound by `withComponentInputBinding()` from `resolve: { detail: … }`. */
  readonly detail = input<OrderDetailResult | null>(null);

  /** The order after a successful mutation; the resolver stays the baseline. */
  private readonly liveOrder = signal<Order | null>(null);

  /** The loaded order, or null when the resolver failed. */
  readonly order = computed<Order | null>(() => {
    const live = this.liveOrder();

    if (live) {
      return live;
    }

    const result = this.detail();

    return result && 'order' in result ? result.order : null;
  });

  /** The next statuses the graph allows; empty for terminal orders. */
  readonly nextStatuses = computed(() => {
    const order = this.order();

    return order === null ? [] : ORDER_TRANSITIONS[order.status];
  });

  readonly canCancel = computed(() => {
    const order = this.order();

    return order !== null && CANCELLABLE.includes(order.status);
  });

  readonly statusDialog = signal(false);

  readonly cancelDialog = signal(false);

  readonly invoiceOpen = signal(false);

  readonly saving = signal(false);

  readonly actionError = signal<string | null>(null);

  readonly statusTarget = new FormControl<OrderStatus | null>(null);

  readonly statusNote = new FormControl('', { nonNullable: true });

  readonly cancelReason = new FormControl('', { nonNullable: true });

  readonly cancelOther = new FormControl('', { nonNullable: true });

  get cancelReasons(): string[] {
    return [...CANCEL_REASONS];
  }

  readonly needsCancelText = computed(() => this.cancelReason.value === 'سایر');

  readonly statusNeedsNote = computed(() => this.statusTarget.value === 'returned');

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

  readonly statusOptions = computed(() =>
    this.nextStatuses().map((status) => ({ label: orderStatusLabel(status), value: status })),
  );

  statusLabel(status: OrderStatus): string {
    return orderStatusLabel(status);
  }

  /** Copy the order code; a blocked or missing clipboard stays quiet. */
  copyCode(code: string): void {
    const clipboard = navigator.clipboard;

    if (!clipboard?.writeText) {
      return;
    }

    void clipboard.writeText(code).then(
      () => this.toast.success('کد سفارش کپی شد.'),
      () => undefined,
    );
  }

  statusBadgeClass(status: OrderStatus): string {
    return orderStatusBadgeClass(status);
  }

  openStatusDialog(): void {
    this.actionError.set(null);
    this.statusTarget.setValue(this.nextStatuses()[0] ?? null);
    this.statusNote.setValue('');
    this.statusDialog.set(true);
  }

  onStatusDialogVisibility(open: boolean): void {
    if (!open) {
      this.statusDialog.set(false);
    }
  }

  /**
   * Applies the chosen transition (BO-H04).
   *
   * The dialog itself is the confirmation: it names the current and next status,
   * and the submit button is the only way forward. A `returned` transition
   * without a note is refused here AND by the server, because "why was it sent
   * back" is the whole point of the entry.
   */
  applyStatus(): void {
    const order = this.order();
    const target = this.statusTarget.value;

    if (!order || target === null || this.saving()) {
      return;
    }

    if (!this.nextStatuses().includes(target)) {
      this.actionError.set('این گذار وضعیت مجاز نیست.');
      return;
    }

    if (target === 'returned' && this.statusNote.value.trim() === '') {
      this.actionError.set('برای مرجوعی، دلیل را بنویس.');
      return;
    }

    this.saving.set(true);
    this.actionError.set(null);

    this.ordersService
      .changeStatus(order.id, { status: target, note: this.statusNote.value.trim() || undefined })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.liveOrder.set(updated);
          this.statusDialog.set(false);
          this.toast.success('وضعیت سفارش به‌روز شد.');
        },
        error: () => {
          this.saving.set(false);
          this.actionError.set('تغییر وضعیت ناموفق بود؛ وضعیت فعلی حفظ شد.');
        },
      });
  }

  openCancelDialog(): void {
    this.actionError.set(null);
    this.cancelReason.setValue('');
    this.cancelOther.setValue('');
    this.cancelDialog.set(true);
  }

  onCancelDialogVisibility(open: boolean): void {
    if (!open) {
      this.cancelDialog.set(false);
    }
  }

  /** Cancels with a mandatory reason (BO-H07); shipped/delivered never get here. */
  confirmCancel(): void {
    const order = this.order();
    const reason =
      this.cancelReason.value === 'سایر'
        ? this.cancelOther.value.trim()
        : this.cancelReason.value.trim();

    if (!order || reason === '' || this.saving()) {
      this.actionError.set('دلیل لغو را انتخاب یا بنویس.');
      return;
    }

    this.saving.set(true);
    this.actionError.set(null);

    this.ordersService
      .cancel(order.id, { reason })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.liveOrder.set(updated);
          this.cancelDialog.set(false);
          this.toast.success('سفارش لغو شد.');
        },
        error: () => {
          this.saving.set(false);
          this.actionError.set('لغو سفارش ناموفق بود.');
        },
      });
  }

  openInvoice(): void {
    this.invoiceOpen.set(true);
  }

  onInvoiceVisibility(open: boolean): void {
    this.invoiceOpen.set(open);
  }

  printInvoice(): void {
    window.print();
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
