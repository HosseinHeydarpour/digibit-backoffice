import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { ConfirmService } from '@core/services/confirm';
import { ToastService } from '@core/services/toast';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorState } from '@shared/components/error-state/error-state';
import { PageHeader } from '@shared/components/page-header/page-header';
import type { EntityId, Page, SelectOption, SortOrder } from '@shared/models';
import { toInitials } from '@shared/models/session.model';
import { PersianDatePipe } from '@shared/pipes/persian-date.pipe';
import { formatDigits, PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { isOnline, OFFLINE_MESSAGE } from '@shared/utils/connectivity';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import {
  BehaviorSubject,
  Subject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';

import { customerStatusBadgeClass, customerStatusLabel } from '../customer-status';
import type { CustomerListItem, CustomerStatus } from '../models/customer.model';
import { CustomersService } from '../services/customers.service';

import {
  DEFAULT_CUSTOMER_STATE,
  PAGE_SIZE_OPTIONS,
  hasActiveFilters,
  isPageSize,
  pageWindow as buildPageWindow,
  stateEqual,
  stateFromParams,
  stateToParams,
  stateToQuery,
  totalPages as getTotalPages,
} from './customer-paging';
import type { CustomerListState, PageSize } from './customer-paging';

/** The four outcomes a list fetch can have (BO-E07's vocabulary). */
type CustomerListView = 'loading' | 'error' | 'empty' | 'data';

/**
 * One table column. `field` names the model key the template reads; `customer`
 * is the composite cell (initials + name), so the union stays honest instead of
 * pretending an avatar is a model field.
 */
interface CustomerColumn {
  readonly field: keyof CustomerListItem | 'customer' | 'actions';
  readonly header: string;
  readonly class?: string;
  readonly sortable?: boolean;
}

/**
 * The columns in render order (BO-I01 tc 2, tc 10).
 *
 * Mobile hides the light ones: email below `lg`, mobile and signup date below
 * `md`, order count below `sm`. Name, status and the (later) action stay at
 * every width, which is the row a support agent actually needs on a phone.
 */
const COLUMNS: readonly CustomerColumn[] = [
  { field: 'customer', header: 'مشتری' },
  { field: 'phone', header: 'موبایل', class: 'hidden md:table-cell' },
  { field: 'email', header: 'ایمیل', class: 'hidden lg:table-cell' },
  { field: 'orderCount', header: 'تعداد سفارش', class: 'hidden sm:table-cell tabular-nums' },
  { field: 'status', header: 'وضعیت' },
  { field: 'createdAt', header: 'تاریخ عضویت', class: 'hidden md:table-cell', sortable: true },
  { field: 'actions', header: 'عملیات' },
];

/**
 * Customers list — `/customers` (BO-I01).
 *
 * Search, status filter and paging all live in the URL:
 *
 *   /customers?query=مریم&status=blocked&page=2&size=10&sort=createdAt&dir=desc
 *
 * so a refresh or a shared link restores exactly what the sender saw.
 *
 * TRACE — typing «مریم» into the search box:
 *
 *   1. `onSearchInput` sets the input's own signal (so the letters appear at
 *      once) and pushes the value into `searchInput$`.
 *   2. `debounceTime(300)` waits for the typing to stop; `distinctUntilChanged`
 *      drops a repeated value.
 *   3. `applyState({ query: 'مریم', page: 1 })` resets to page 1 — a filter
 *      change must not stay on page 4 of the OLD result set.
 *   4. `writeState` pushes `state$` once and navigates. Typing uses
 *      `replaceUrl: true` so it does not fill history; paging pushes a real
 *      entry so Back returns to the previous page. `merge` keeps future keys.
 *   5. `combineLatest(reload$, state$)` → `switchMap` cancels the previous
 *      request → `GET /customers?query=مریم&page=1&pageSize=20`.
 *   6. The mock filters name/email/phone and answers page 1; the footer prints
 *      «۱ تا N از N».
 */
@Component({
  selector: 'app-customer-list',
  imports: [
    PageHeader,
    FormsModule,
    RouterLink,
    IconField,
    InputIcon,
    InputText,
    Select,
    ToggleSwitch,
    PersianDatePipe,
    PersianDigitsPipe,
    ErrorState,
    EmptyState,
  ],
  templateUrl: './customer-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerList {
  private readonly customers = inject(CustomersService);

  private readonly router = inject(Router);

  private readonly route = inject(ActivatedRoute);

  private readonly destroyRef = inject(DestroyRef);

  private readonly confirm = inject(ConfirmService);

  private readonly toast = inject(ToastService);

  private readonly permissions = inject(PERMISSIONS);

  /** Emits once at construction (first paint) and on every retry. */
  private readonly reload$ = new BehaviorSubject<void>(undefined);

  /** The single write path's source of truth, seeded from the URL. */
  private readonly state$ = new BehaviorSubject<CustomerListState>(
    stateFromParams(this.route.snapshot.queryParamMap),
  );

  /** Typing waits 300 ms before it becomes a request. */
  private readonly searchInput$ = new Subject<string>();

  /** Non-null when the last fetch rejected (BO-E07 tc 2). */
  readonly listError = signal<string | null>(null);

  /** True while a request is in flight; drives the thin progress bar. */
  readonly isFetching = signal(false);

  /**
   * Optimistic status overlay (BO-I03). The server page stays the source of
   * truth; this map is applied on top until the fetch returns the same status,
   * at which point the entry is dropped. A failed toggle clears it — the
   * rollback is the absence of an override, so there is no second copy of the
   * row to keep in step.
   */
  private readonly statusOverrides = signal<ReadonlyMap<EntityId, CustomerStatus>>(new Map());

  /** Whether the signed-in admin may block or unblock an account. */
  readonly canBlock = computed(() => this.permissions().includes('customers.block'));

  /** The UI mirror of `state$`. */
  readonly listState = signal<CustomerListState>(this.state$.value);

  /** What the input shows; the URL may lag by the debounce window. */
  readonly search = signal(this.listState().query);

  /**
   * The current page, as a signal. `null` is "not answered yet" (the skeleton),
   * deliberately distinct from a page with `items: []` (no customers).
   */
  readonly page = toSignal<Page<CustomerListItem> | null>(
    combineLatest([this.reload$, this.state$]).pipe(
      tap(() => {
        this.listError.set(null);
        this.isFetching.set(true);
      }),
      switchMap(([, state]) =>
        this.customers.list(stateToQuery(state)).pipe(
          tap({
            next: () => {
              this.listError.set(null);
              this.isFetching.set(false);
              this.reconcileOverrides();
            },
            error: () => {
              this.listError.set('دریافت مشتریان ناموفق بود');
              this.isFetching.set(false);
            },
          }),
          catchError(() => of(null)),
        ),
      ),
    ),
    { initialValue: null },
  );

  readonly items = computed<readonly CustomerListItem[] | null>(() => {
    const rows = this.page()?.items ?? null;

    if (rows === null) {
      return null;
    }

    const overrides = this.statusOverrides();

    return overrides.size === 0
      ? rows
      : rows.map((row) => {
          const status = overrides.get(row.id);

          return status === undefined || status === row.status ? row : { ...row, status };
        });
  });

  /** The single branch condition for the template's `@switch`. */
  readonly viewState = computed<CustomerListView>(() => {
    if (this.listError()) {
      return 'error';
    }

    const items = this.items();

    if (items === null) {
      return 'loading';
    }

    return items.length === 0 ? 'empty' : 'data';
  });

  readonly cols: readonly CustomerColumn[] = COLUMNS;

  readonly total = computed(() => this.page()?.total ?? 0);

  readonly totalPages = computed(() => getTotalPages(this.total(), this.listState().pageSize));

  readonly rangeStart = computed(() =>
    this.total() === 0 ? 0 : (this.listState().page - 1) * this.listState().pageSize + 1,
  );

  readonly rangeEnd = computed(() =>
    this.total() === 0
      ? 0
      : Math.min(this.listState().page * this.listState().pageSize, this.total()),
  );

  readonly pageWindow = computed(() => buildPageWindow(this.listState().page, this.totalPages()));

  /**
   * True when the empty table is the RESULT of a search, not an empty shop
   * (BO-I05): the two states need different sentences and different ways out.
   */
  readonly hasFilters = computed(() => hasActiveFilters(this.listState()));

  /** «فعال» / «مسدود» / «همه» — a mutable array, as PrimeNG's `[options]` wants. */
  get statusSelectOptions(): SelectOption<CustomerStatus | ''>[] {
    return [
      { label: 'همه', value: '' },
      { label: 'فعال', value: 'active' },
      { label: 'مسدود', value: 'blocked' },
    ];
  }

  /** Getters, not fields: a runtime import must not run in a field initialiser. */
  get pageSizeOptions(): readonly PageSize[] {
    return PAGE_SIZE_OPTIONS;
  }

  get pageSizeSelectOptions(): SelectOption<PageSize>[] {
    return PAGE_SIZE_OPTIONS.map((size) => ({ label: formatDigits(size), value: size }));
  }

  constructor() {
    this.searchInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => {
        this.applyState({ ...this.listState(), query: query.trim(), page: 1 });
      });

    // Back/forward (or a pasted URL) changes the parameters WITHOUT going
    // through `writeState`. Mirror that into the state; our own navigation is a
    // no-op because the comparator already sees the same values.
    this.route.queryParamMap
      .pipe(
        map((params) => stateFromParams(params)),
        distinctUntilChanged(stateEqual),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((next) => {
        if (stateEqual(next, this.listState())) {
          return;
        }

        this.search.set(next.query);
        this.listState.set(next);
        this.state$.next(next);
      });
  }

  /** Typing: the input updates now, the request waits for the debounce. */
  onSearchInput(value: string): void {
    this.search.set(value);
    this.searchInput$.next(value);
  }

  /** The status select applies immediately, like every other select filter. */
  onStatusChange(status: CustomerStatus | ''): void {
    this.applyState({ ...this.listState(), status, page: 1 });
  }

  /** «پاک کردن فیلترها» — one click clears both, and returns to page 1. */
  clearFilters(): void {
    this.search.set('');
    this.applyState({
      ...DEFAULT_CUSTOMER_STATE,
      pageSize: this.listState().pageSize,
    });
  }

  /** Re-runs the fetch with the state currently on screen. */
  retry(): void {
    this.reload$.next();
  }

  /** Header click: the signup date is the only server-side sort. */
  sortBy(field: CustomerColumn['field']): void {
    if (field !== 'createdAt') {
      return;
    }

    const current = this.listState();
    const dir: SortOrder = current.sort === field && current.dir === 'asc' ? 'desc' : 'asc';

    this.applyState({ ...current, page: 1, sort: field, dir }, { replaceUrl: false });
  }

  /** `aria-sort` for the sortable `<th>`; an inactive column reports `none`. */
  ariaSort(field: CustomerColumn['field']): 'ascending' | 'descending' | 'none' {
    if (this.listState().sort !== field) {
      return 'none';
    }

    return this.listState().dir === 'asc' ? 'ascending' : 'descending';
  }

  /** The chevron for a header; inactive columns show the neutral icon. */
  sortIconClass(field: CustomerColumn['field']): string {
    if (this.listState().sort !== field) {
      return 'pi pi-sort-alt';
    }

    return this.listState().dir === 'asc'
      ? 'pi pi-sort-amount-up-alt'
      : 'pi pi-sort-amount-down-alt';
  }

  /** Paginator click; clamps to the range and ignores a repeat click. */
  onPageChange(page: number): void {
    const next = Math.min(Math.max(1, page), this.totalPages());

    if (next === this.listState().page) {
      return;
    }

    this.applyState({ ...this.listState(), page: next }, { replaceUrl: false });
  }

  /** Page-size select; the allowed sizes are the closed 10/20/50 union. */
  onPageSizeChange(size: number): void {
    if (!isPageSize(size)) {
      return;
    }

    this.applyState({ ...this.listState(), page: 1, pageSize: size }, { replaceUrl: false });
  }

  /** The empty state's way back when a stale page number is out of range. */
  goToFirstPage(): void {
    this.onPageChange(1);
  }

  statusLabel(status: CustomerStatus): string {
    return customerStatusLabel(status);
  }

  statusBadgeClass(status: CustomerStatus): string {
    return customerStatusBadgeClass(status);
  }

  /** «زهرا محمدی» → «زم» for the row avatar (the topbar's own helper). */
  initials(fullName: string): string {
    return toInitials(fullName);
  }

  /** Copy the mobile number; the row click still opens the profile. */
  copyPhone(phone: string): void {
    this.copy(phone, 'شماره موبایل کپی شد.');
  }

  /** Copy the email address; the row click still opens the profile. */
  copyEmail(email: string): void {
    this.copy(email, 'ایمیل کپی شد.');
  }

  /**
   * Clipboard may be missing (insecure context, older browser) or blocked; a
   * convenience action then fails quietly, like the order code's copy.
   */
  private copy(value: string, message: string): void {
    const clipboard = navigator.clipboard;

    if (!clipboard?.writeText) {
      return;
    }

    void clipboard.writeText(value).then(
      () => this.toast.success(message),
      () => undefined,
    );
  }

  /**
   * Block or unblock an account (BO-I03).
   *
   * The switch has already flipped visually, so every path that does NOT send a
   * request has to write the old value back: a cancel, an offline hint, or a
   * permission that went missing between renders. Success is optimistic — the
   * override paints the new pill before the answer — and a failure clears it,
   * which is the rollback. The error toast belongs to the interceptor; the
   * success toast is ours.
   */
  async toggleStatus(item: CustomerListItem, toggle: ToggleSwitch): Promise<void> {
    if (!this.canBlock()) {
      return;
    }

    const isActive = item.status === 'active';

    if (!isOnline()) {
      toggle.writeValue(isActive);
      this.toast.warning(OFFLINE_MESSAGE);
      return;
    }

    const blocked = isActive;
    const confirmed = await this.confirm.confirm({
      message: blocked
        ? `آیا حساب «${item.fullName}» مسدود شود؟ ورود این مشتری به فروشگاه متوقف می‌شود.`
        : `آیا حساب «${item.fullName}» دوباره فعال شود؟`,
      header: blocked ? 'مسدود کردن حساب' : 'فعال کردن حساب',
      acceptLabel: blocked ? 'مسدود کن' : 'فعال کن',
      danger: blocked,
    });

    if (!confirmed) {
      toggle.writeValue(isActive);
      return;
    }

    this.setOverride(item.id, blocked ? 'blocked' : 'active');

    this.customers.setStatus(item.id, blocked).subscribe({
      next: () => {
        this.toast.success(blocked ? 'حساب مشتری مسدود شد.' : 'حساب مشتری فعال شد.');
      },
      error: () => this.clearOverride(item.id),
    });
  }

  private setOverride(id: EntityId, status: CustomerStatus): void {
    this.statusOverrides.update((current) => new Map(current).set(id, status));
  }

  private clearOverride(id: EntityId): void {
    this.statusOverrides.update((current) => {
      const next = new Map(current);
      next.delete(id);

      return next;
    });
  }

  /** Drop an override once the server's own row carries that status. */
  private reconcileOverrides(): void {
    const current = this.statusOverrides();

    if (current.size === 0) {
      return;
    }

    const next = new Map(current);

    for (const row of this.page()?.items ?? []) {
      if (next.get(row.id) === row.status) {
        next.delete(row.id);
      }
    }

    if (next.size !== current.size) {
      this.statusOverrides.set(next);
    }
  }

  /**
   * Row click → the profile (BO-I02). The status switch is a row action, so a
   * click inside `[data-row-action]` must not navigate; the switch's own
   * handler already stops the bubbled click, and this guard covers the label's
   * 44px padding around it.
   */
  openCustomer(customerId: EntityId, event?: Event): void {
    const target = event?.target as HTMLElement | null;

    if (target?.closest('[data-row-action]')) {
      return;
    }

    void this.router.navigate(['/customers', customerId]);
  }

  /** One atomic state update and one URL write (never two navigations). */
  private applyState(next: CustomerListState, options: { replaceUrl?: boolean } = {}): void {
    if (stateEqual(next, this.listState())) {
      return;
    }

    this.writeState(next, options.replaceUrl ?? true);
  }

  /**
   * Single write path: state → stream → URL.
   *
   * Typing and filters replace the current entry so a search does not fill the
   * browser history. Paging and sorting pass `replaceUrl: false`: without a
   * pushed entry, Back from page 2 would leave the list instead of returning to
   * page 1. `merge` preserves keys this task does not own.
   */
  private writeState(next: CustomerListState, replaceUrl: boolean): void {
    this.listState.set(next);
    this.state$.next(next);

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: stateToParams(next),
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }
}
