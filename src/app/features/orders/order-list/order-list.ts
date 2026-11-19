import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorState } from '@shared/components/error-state/error-state';
import { JalaliDatepicker } from '@shared/components/jalali-datepicker/jalali-datepicker';
import { PageHeader } from '@shared/components/page-header/page-header';
import { LoadingDirective } from '@shared/directives/loading.directive';
import type { EntityId, Page, SelectOption, SortOrder } from '@shared/models';
import type { OrderStatus } from '@shared/models/status-badge.model';
import { PersianDatePipe } from '@shared/pipes/persian-date.pipe';
import { formatDigits, PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { TomanPipe } from '@shared/pipes/toman.pipe';
import { ButtonDirective } from 'primeng/button';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  of,
  switchMap,
  tap,
} from 'rxjs';

import type { OrderColumn, OrderListItem } from '../models/order.model';
import { buildOrdersCsv, downloadCsv } from '../order-csv';
import { orderStatusBadgeClass, orderStatusLabel } from '../order-status';
import { OrdersService } from '../services/orders.service';

import {
  EMPTY_FILTERS,
  dateRangeInvalid,
  filtersEqual,
  filtersFromParams,
  filtersToQuery,
  filtersToQueryParams,
  hasActiveFilters,
} from './order-filters';
import type { OrderFilters } from './order-filters';
import {
  PAGE_SIZE_OPTIONS,
  isPageSize,
  isSortField,
  pageWindow as buildPageWindow,
  pagingEqual,
  pagingFromParams,
  pagingToQuery,
  pagingToQueryParams,
  totalPages as getTotalPages,
} from './order-paging';
import type { PageSize, OrderPaging } from './order-paging';

/**
 * The four outcomes a list fetch can have (BO-E07's vocabulary, owned per
 * feature — a type import across features would still be erased, but the rule
 * is simpler to enforce when each module declares its own).
 */
type OrderListState = 'loading' | 'error' | 'empty' | 'data';

/**
 * The table's columns, in render order.
 *
 * Runtime value, so it lives HERE and not in `models/order.model.ts` (the
 * types-only rule: a const reachable from both the eager test bundle and the
 * lazy `orders-routes` chunk can read back `undefined` in a field initialiser).
 *
 * `class` carries the responsive hiding that keeps the table usable on a phone
 * (BO-H01 tc 9): item count goes below `sm`, the date below `md` — code,
 * customer, total, status and the action stay at every width.
 */
const COLUMNS: readonly OrderColumn[] = [
  { field: 'code', header: 'کد سفارش' },
  { field: 'customerName', header: 'مشتری' },
  { field: 'itemCount', header: 'تعداد اقلام', class: 'hidden sm:table-cell tabular-nums' },
  { field: 'total', header: 'مبلغ کل', class: 'tabular-nums', sortable: true },
  { field: 'status', header: 'وضعیت' },
  { field: 'createdAt', header: 'تاریخ ثبت', class: 'hidden md:table-cell', sortable: true },
  { field: 'actions', header: 'عملیات' },
];

/**
 * Orders list page — `/orders` (BO-H01).
 *
 * The Arino table with paging/sort in the URL:
 *
 *   /orders?page=2&size=10&sort=total&dir=desc
 *
 * so a refresh or a shared link restores exactly what the sender saw. BO-H02
 * adds the filter bar (query/status/Jalali range) on top of the same state
 * stream; this task deliberately ships the table, not a disabled filter shell.
 *
 * TRACE — one interaction, end to end:
 *
 *   1. Click «۲» → `onPageChange(2)` clamps to `totalPages()` → `applyPaging`.
 *   2. `writeState` pushes `state$` once and navigates with `replaceUrl: true`
 *      (no history spam) and `queryParamsHandling: 'merge'` (keeps H02's future
 *      filters).
 *   3. `combineLatest(reload$, state$)` → `switchMap` cancels any in-flight
 *      request → `list({ page: 2, pageSize: 20 })`.
 *   4. The mock slices rows 20–27 and returns `{ items, total: 28, … }`;
 *      `rangeStart()` prints ۲۱, `rangeEnd()` ۲۸.
 *   5. Clicking «مبلغ کل» calls `sortBy('total')`: new field starts `asc` and
 *      resets to page 1; a second click flips to `desc`. The mock sorts the
 *      amount as a NUMBER before slicing.
 *   6. Clicking a row navigates to `/orders/:id` (tc 10). The «جزئیات» link
 *      inside the row stops propagation, so one click is one navigation.
 *
 * The four fetch outcomes are one `state()` (BO-E07): error > loading > empty >
 * data. `isFetching` drives the thin progress bar during a page/sort change,
 * when the previous rows stay visible.
 */
@Component({
  selector: 'app-order-list',
  imports: [
    PageHeader,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    Select,
    JalaliDatepicker,
    ButtonDirective,
    LoadingDirective,
    IconField,
    InputIcon,
    InputText,
    PersianDatePipe,
    PersianDigitsPipe,
    TomanPipe,
    ErrorState,
    EmptyState,
  ],
  templateUrl: './order-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderList {
  private readonly ordersService = inject(OrdersService);

  private readonly router = inject(Router);

  private readonly route = inject(ActivatedRoute);

  private readonly destroyRef = inject(DestroyRef);

  /**
   * The reload trigger: emits once at construction, so the first paint starts
   * the fetch immediately, and `next()` is what the retry button calls.
   */
  private readonly reload$ = new BehaviorSubject<void>(undefined);

  /**
   * Paging/sort, seeded from the URL so a refresh or a shared link restores it
   * before the first request; `writeState` pushes every change. BO-H02 grows
   * this into `{ filters, paging }` — the stream shape is ready for it.
   */
  private readonly state$ = new BehaviorSubject<OrderPaging>(
    pagingFromParams(this.route.snapshot.queryParamMap),
  );

  /** BO-H02's filter state, seeded from the same URL. */
  private readonly filters$ = new BehaviorSubject<OrderFilters>(
    filtersFromParams(this.route.snapshot.queryParamMap),
  );

  readonly filters = signal<OrderFilters>(this.filters$.value);

  readonly queryControl = new FormControl(this.filters().query, { nonNullable: true });

  readonly fromControl = new FormControl<string | null>(this.filters().from);

  readonly toControl = new FormControl<string | null>(this.filters().to);

  readonly exporting = signal(false);

  readonly exportError = signal<string | null>(null);

  /**
   * Non-null when the last fetch rejected (BO-E07 tc 2).
   *
   * Declared BEFORE `page` because `toSignal` subscribes synchronously and
   * `BehaviorSubject` emits synchronously: with a throwing service, `tap`'s
   * error handler runs during `page`'s own initialiser and must find a ready
   * signal to write to.
   */
  readonly itemsError = signal<string | null>(null);

  /** True while a request is in flight; drives the thin in-card progress bar. */
  readonly isFetching = signal(false);

  /** The UI mirror of `state$`. */
  readonly paging = signal<OrderPaging>(this.state$.value);

  /**
   * The current page, as a signal. `null` is "not answered yet" — the skeleton —
   * and is deliberately distinguishable from a page with `items: []`, which is
   * "no orders" (tc 7 vs tc 8). `switchMap` cancels the previous request when
   * the user clicks pages quickly, so a slow response for page 2 can never
   * overwrite page 3.
   */
  readonly page = toSignal<Page<OrderListItem> | null>(
    combineLatest([this.reload$, this.state$, this.filters$]).pipe(
      tap(() => {
        this.itemsError.set(null);
        this.isFetching.set(true);
      }),
      switchMap(([, paging, filters]) =>
        this.ordersService.list({ ...pagingToQuery(paging), ...filtersToQuery(filters) }).pipe(
          tap({
            next: () => {
              this.itemsError.set(null);
              this.isFetching.set(false);
            },
            error: () => {
              this.itemsError.set('دریافت سفارش‌ها ناموفق بود');
              this.isFetching.set(false);
            },
          }),
          catchError(() => of(null)),
        ),
      ),
    ),
    { initialValue: null },
  );

  /** The rows of the current page; `null` while the first request is in flight. */
  readonly items = computed<readonly OrderListItem[] | null>(() => this.page()?.items ?? null);

  /** The single branch condition for the template's `@switch` (BO-E07 tc 7). */
  readonly state = computed<OrderListState>(() => {
    if (this.itemsError()) {
      return 'error';
    }

    const items = this.items();

    if (items === null) {
      return 'loading';
    }

    return items.length === 0 ? 'empty' : 'data';
  });

  readonly cols: readonly OrderColumn[] = COLUMNS;

  /** Result count for the footer — the server's total, not the page length. */
  readonly total = computed(() => this.page()?.total ?? 0);

  /** Number of pages for the paginator; at least 1 so the control is never empty. */
  readonly totalPages = computed(() => getTotalPages(this.total(), this.paging().pageSize));

  /** First/last row numbers shown in the footer; 0–0 when the result is empty. */
  readonly rangeStart = computed(() =>
    this.total() === 0 ? 0 : (this.paging().page - 1) * this.paging().pageSize + 1,
  );

  readonly rangeEnd = computed(() =>
    this.total() === 0 ? 0 : Math.min(this.paging().page * this.paging().pageSize, this.total()),
  );

  /** The compact page list, with `null` for an ellipsis. */
  readonly pageWindow = computed(() => buildPageWindow(this.paging().page, this.totalPages()));

  /**
   * Getters, not fields: `PAGE_SIZE_OPTIONS` is a runtime import reachable from
   * both the eager spec bundle and the lazy chunk. A field initialiser can run
   * before that shared chunk is initialised (the `TOMAN_UNIT` hazard), which
   * would leave the select empty.
   */
  get pageSizeOptions(): readonly PageSize[] {
    return PAGE_SIZE_OPTIONS;
  }

  get pageSizeSelectOptions(): SelectOption<PageSize>[] {
    return PAGE_SIZE_OPTIONS.map((size) => ({ label: formatDigits(size), value: size }));
  }

  get statusSelectOptions(): SelectOption<OrderStatus | ''>[] {
    return [
      { label: 'همهٔ وضعیت‌ها', value: '' },
      { label: 'در انتظار پرداخت', value: 'pending' },
      { label: 'پرداخت‌شده', value: 'paid' },
      { label: 'در حال پردازش', value: 'processing' },
      { label: 'ارسال‌شده', value: 'shipped' },
      { label: 'تحویل‌شده', value: 'delivered' },
      { label: 'لغوشده', value: 'cancelled' },
      { label: 'مرجوع‌شده', value: 'returned' },
    ];
  }

  readonly hasFilters = computed(() => hasActiveFilters(this.filters()));

  readonly dateError = computed(() =>
    dateRangeInvalid(this.filters()) ? 'تاریخ پایان نمی‌تواند قبل از شروع باشد.' : null,
  );

  constructor() {
    // Back/forward (or a pasted URL) changes the parameters WITHOUT going
    // through `writeState`. Mirror that into both streams; our own navigation
    // is a no-op because the comparators already see the same values.
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const nextPaging = pagingFromParams(params);
      const nextFilters = filtersFromParams(params);

      if (!pagingEqual(nextPaging, this.paging())) {
        this.paging.set(nextPaging);
        this.state$.next(nextPaging);
      }

      if (!filtersEqual(nextFilters, this.filters())) {
        this.filters.set(nextFilters);
        this.filters$.next(nextFilters);
        this.syncFilterControls(nextFilters);
      }
    });

    this.queryControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.applyFilters({ ...this.filters(), query: value }));

    this.fromControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.applyFilters({ ...this.filters(), from: value }));

    this.toControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.applyFilters({ ...this.filters(), to: value }));
  }

  onStatusFilter(value: OrderStatus | ''): void {
    this.applyFilters({ ...this.filters(), status: value });
  }

  clearFilters(): void {
    this.applyFilters(EMPTY_FILTERS);
  }

  /**
   * Downloads every filtered row, not just the visible page (BO-H08).
   *
   * The request reuses the SAME filter/paging builders as the table, so the
   * file can never disagree with what the screen asked for; `pageSize: 1000`
   * is the contract's "all rows" page.
   */
  exportCsv(): void {
    if (this.exporting()) {
      return;
    }

    this.exporting.set(true);
    this.exportError.set(null);

    this.ordersService
      .list({
        ...pagingToQuery(this.paging()),
        ...filtersToQuery(this.filters()),
        page: 1,
        pageSize: 1000,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.exporting.set(false);
          downloadCsv(
            buildOrdersCsv(page.items),
            `orders-${new Date().toISOString().slice(0, 10)}.csv`,
          );
        },
        error: () => {
          this.exporting.set(false);
          this.exportError.set('خروجی CSV ناموفق بود؛ دوباره تلاش کن.');
        },
      });
  }

  /** Re-runs the fetch with the page/sort currently on screen (BO-E07 tc 3). */
  retry(): void {
    this.reload$.next();
  }

  /**
   * Header click: sort by `field`, or flip the direction when it is already the
   * active sort. A non-sortable column is ignored even if a caller reaches this
   * method directly.
   */
  sortBy(field: OrderColumn['field']): void {
    if (!isSortField(field)) {
      return;
    }

    const current = this.paging();
    const dir: SortOrder = current.sort === field && current.dir === 'asc' ? 'desc' : 'asc';

    this.applyPaging({ ...current, page: 1, sort: field, dir });
  }

  /** `aria-sort` for a sortable `<th>`; non-active columns report `none`. */
  ariaSort(field: OrderColumn['field']): 'ascending' | 'descending' | 'none' {
    if (this.paging().sort !== field) {
      return 'none';
    }

    return this.paging().dir === 'asc' ? 'ascending' : 'descending';
  }

  /** The sort chevron for a header; inactive columns show the neutral alt icon. */
  sortIconClass(field: OrderColumn['field']): string {
    if (this.paging().sort !== field) {
      return 'pi pi-sort-alt';
    }

    return this.paging().dir === 'asc' ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down-alt';
  }

  /** Paginator click; clamps to the available range and ignores a repeat click. */
  onPageChange(page: number): void {
    const next = Math.min(Math.max(1, page), this.totalPages());

    if (next === this.paging().page) {
      return;
    }

    this.applyPaging({ ...this.paging(), page: next });
  }

  /** Page-size select; the allowed sizes are the closed 10/20/50 union. */
  onPageSizeChange(size: number): void {
    if (!isPageSize(size)) {
      return;
    }

    this.applyPaging({ ...this.paging(), page: 1, pageSize: size });
  }

  /** The empty state's way back when a stale page number is out of range. */
  goToFirstPage(): void {
    this.onPageChange(1);
  }

  statusLabel(status: OrderStatus): string {
    return orderStatusLabel(status);
  }

  statusBadgeClass(status: OrderStatus): string {
    return orderStatusBadgeClass(status);
  }

  /**
   * Row click → the detail page (BO-H01 tc 10). The «جزئیات» link inside the row
   * is a real `routerLink` with `stopPropagation`, so it navigates exactly once
   * and ctrl/middle-click still opens a new tab.
   */
  openOrder(orderId: EntityId): void {
    void this.router.navigate(['/orders', orderId]);
  }

  /** Page/size/sort change: one atomic state update and one URL write. */
  private applyPaging(next: OrderPaging): void {
    if (pagingEqual(next, this.paging())) {
      return;
    }

    this.writeState(next, this.filters());
  }

  /** Filter change: resets to page 1 in the same emission (one request). */
  private applyFilters(next: OrderFilters): void {
    if (filtersEqual(next, this.filters())) {
      return;
    }

    this.writeState({ ...this.paging(), page: 1 }, next);
  }

  private syncFilterControls(filters: OrderFilters): void {
    if (this.queryControl.value !== filters.query) {
      this.queryControl.setValue(filters.query, { emitEvent: false });
    }

    if (this.fromControl.value !== filters.from) {
      this.fromControl.setValue(filters.from, { emitEvent: false });
    }

    if (this.toControl.value !== filters.to) {
      this.toControl.setValue(filters.to, { emitEvent: false });
    }
  }

  /**
   * Single write path: state → streams → URL.
   *
   * The whole query is written (`queryParamsHandling: ''`), not merged: a
   * cleared filter must disappear from the URL, and `merge` would leave
   * `?status=shipped` behind after the select returned to «همه». `replaceUrl`
   * keeps paging and typing out of history.
   */
  private writeState(paging: OrderPaging, filters: OrderFilters): void {
    const pagingChanged = !pagingEqual(paging, this.paging());
    const filtersChanged = !filtersEqual(filters, this.filters());

    this.paging.set(paging);
    this.filters.set(filters);

    // Each stream emits ONE request via `combineLatest`; pushing both when only
    // one changed would fetch the same page twice.
    if (pagingChanged) {
      this.state$.next(paging);
    }

    if (filtersChanged) {
      this.filters$.next(filters);
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        ...pagingToQueryParams(paging),
        ...filtersToQueryParams(filters),
      },
      queryParamsHandling: '',
      replaceUrl: true,
    });
  }
}
