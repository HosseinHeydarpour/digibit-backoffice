import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { ToastService } from '@core/services/toast';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorState } from '@shared/components/error-state/error-state';
import { PageHeader } from '@shared/components/page-header/page-header';
import type { EntityId, Page, SelectOption } from '@shared/models';
import { PersianDatePipe } from '@shared/pipes/persian-date.pipe';
import { formatDigits, PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { TomanPipe } from '@shared/pipes/toman.pipe';
import { ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { BehaviorSubject, catchError, combineLatest, of, switchMap, tap } from 'rxjs';

import { CouponForm } from '../coupon-form/coupon-form';
import {
  couponStatus,
  couponStatusBadgeClass,
  couponStatusLabel,
  couponTypeLabel,
  usagePercent,
} from '../coupon-status';
import type { Coupon, CouponStatus } from '../models/coupon.model';
import { CouponsService } from '../services/coupons.service';

import {
  DEFAULT_COUPON_STATE,
  PAGE_SIZE_OPTIONS,
  isPageSize,
  pageWindow as buildPageWindow,
  stateEqual,
  stateToQuery,
  totalPages as getTotalPages,
} from './coupon-paging';
import type { CouponListState, PageSize } from './coupon-paging';

type CouponListView = 'loading' | 'error' | 'empty' | 'data';

/**
 * Coupons list — `/coupons` (BO-J01).
 *
 * The table shows the code (mono + copy), the type badge, the value, the
 * validity window in Jalali, the usage ratio and the derived status. The filter
 * and paging live in component signals, not the URL: there is one select and
 * one page number, and a shareable coupon filter is not a requirement (the
 * products list needed it; a CRUD list does not).
 *
 * TRACE — filtering by «منقضی»:
 *   1. `onStatusChange('expired')` writes the state and resets to page 1.
 *   2. `state$` emits once; `switchMap` cancels any in-flight list request.
 *   3. `GET /coupons?status=expired&page=1&pageSize=10`.
 *   4. The mock derives the status from `to < now` per row and answers the
 *      envelope; the template prints the red «منقضی» pill and the range.
 */
@Component({
  selector: 'app-coupon-list',
  imports: [
    PageHeader,
    FormsModule,
    Select,
    Tag,
    Dialog,
    ButtonDirective,
    CouponForm,
    PersianDatePipe,
    PersianDigitsPipe,
    TomanPipe,
    ErrorState,
    EmptyState,
  ],
  templateUrl: './coupon-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CouponList {
  private readonly coupons = inject(CouponsService);

  private readonly toast = inject(ToastService);

  private readonly permissions = inject(PERMISSIONS);

  private readonly reload$ = new BehaviorSubject<void>(undefined);

  private readonly state$ = new BehaviorSubject<CouponListState>(DEFAULT_COUPON_STATE);

  readonly listError = signal<string | null>(null);

  readonly isFetching = signal(false);

  /** The UI mirror of `state$`. */
  readonly listState = signal<CouponListState>(this.state$.value);

  /** The id whose code was just copied; drives the check icon for 1.5s. */
  readonly copied = signal<EntityId | null>(null);

  /** The create/edit dialog and the record being edited (`null` = create). */
  readonly dialogOpen = signal(false);

  readonly editing = signal<Coupon | null>(null);

  /** Whether the signed-in admin may create or edit a coupon (BO-J02). */
  readonly canManage = computed(() => this.permissions().includes('coupons.manage'));

  readonly pageResult = toSignal<Page<Coupon> | null>(
    combineLatest([this.reload$, this.state$]).pipe(
      tap(() => {
        this.listError.set(null);
        this.isFetching.set(true);
      }),
      switchMap(([, state]) =>
        this.coupons.list(stateToQuery(state)).pipe(
          tap({
            next: () => {
              this.listError.set(null);
              this.isFetching.set(false);
            },
            error: () => {
              this.listError.set('دریافت کوپن‌ها ناموفق بود');
              this.isFetching.set(false);
            },
          }),
          catchError(() => of(null)),
        ),
      ),
    ),
    { initialValue: null },
  );

  readonly items = computed<readonly Coupon[] | null>(() => this.pageResult()?.items ?? null);

  readonly viewState = computed<CouponListView>(() => {
    if (this.listError()) {
      return 'error';
    }

    const items = this.items();

    if (items === null) {
      return 'loading';
    }

    return items.length === 0 ? 'empty' : 'data';
  });

  readonly total = computed(() => this.pageResult()?.total ?? 0);

  readonly totalPages = computed(() => getTotalPages(this.total(), this.listState().pageSize));

  readonly pageWindow = computed(() => buildPageWindow(this.listState().page, this.totalPages()));

  get statusSelectOptions(): SelectOption<CouponStatus | ''>[] {
    return [
      { label: 'همه', value: '' },
      { label: 'فعال', value: 'active' },
      { label: 'غیرفعال', value: 'inactive' },
      { label: 'منقضی', value: 'expired' },
      { label: 'تمام‌شده', value: 'exhausted' },
    ];
  }

  get pageSizeOptions(): readonly PageSize[] {
    return PAGE_SIZE_OPTIONS;
  }

  get pageSizeSelectOptions(): SelectOption<PageSize>[] {
    return PAGE_SIZE_OPTIONS.map((size) => ({ label: formatDigits(size), value: size }));
  }

  status(coupon: Coupon): CouponStatus {
    return couponStatus(coupon);
  }

  statusLabel(coupon: Coupon): string {
    return couponStatusLabel(this.status(coupon));
  }

  statusBadgeClass(coupon: Coupon): string {
    return couponStatusBadgeClass(this.status(coupon));
  }

  typeLabel(coupon: Coupon): string {
    return couponTypeLabel(coupon.type);
  }

  usage(coupon: Coupon): number {
    return usagePercent(coupon.usedCount, coupon.maxUses);
  }

  /** An expired or exhausted coupon cannot be re-enabled (BO-J04 tc 10). */
  isClosed(coupon: Coupon): boolean {
    const status = this.status(coupon);

    return status === 'expired' || status === 'exhausted';
  }

  onStatusChange(status: CouponStatus | ''): void {
    this.applyState({ ...this.listState(), status, page: 1 });
  }

  onPageChange(page: number): void {
    const next = Math.min(Math.max(1, page), this.totalPages());

    if (next === this.listState().page) {
      return;
    }

    this.applyState({ ...this.listState(), page: next });
  }

  onPageSizeChange(size: number): void {
    if (!isPageSize(size)) {
      return;
    }

    this.applyState({ ...this.listState(), page: 1, pageSize: size });
  }

  /** The empty state's way back when a stale page number is out of range. */
  goToFirstPage(): void {
    this.onPageChange(1);
  }

  retry(): void {
    this.reload$.next();
  }

  /**
   * Copy the code (BO-J01 tc 2).
   *
   * `navigator.clipboard` may be missing (insecure context, older browser) or
   * blocked; the button then simply does not flip to a check. No error toast
   * for a convenience action.
   */
  copyCode(coupon: Coupon): void {
    const clipboard = navigator.clipboard;

    if (!clipboard?.writeText) {
      return;
    }

    void clipboard.writeText(coupon.code).then(() => {
      this.copied.set(coupon.id);

      window.setTimeout(() => {
        if (this.copied() === coupon.id) {
          this.copied.set(null);
        }
      }, 1500);
    });
  }

  private applyState(next: CouponListState): void {
    if (stateEqual(next, this.listState())) {
      return;
    }

    this.listState.set(next);
    this.state$.next(next);
  }

  /** «ایجاد کوپن»: a fresh form every time the dialog opens. */
  openCreate(): void {
    if (!this.canManage()) {
      return;
    }

    this.editing.set(null);
    this.dialogOpen.set(true);
  }

  /** The row's edit action. */
  openEdit(coupon: Coupon): void {
    if (!this.canManage()) {
      return;
    }

    this.editing.set(coupon);
    this.dialogOpen.set(true);
  }

  /** `[visible]` must handle `visibleChange`, or Escape leaves it stuck open. */
  onDialogVisibility(visible: boolean): void {
    this.dialogOpen.set(visible);

    if (!visible) {
      this.editing.set(null);
    }
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
    this.editing.set(null);
  }

  /** The form saved: toast, close, and refetch so the row reflects the write. */
  onSaved(coupon: Coupon): void {
    this.toast.success(this.editing() ? 'کوپن ذخیره شد.' : `کوپن «${coupon.code}» ایجاد شد.`);
    this.closeDialog();
    this.reload$.next();
  }
}
