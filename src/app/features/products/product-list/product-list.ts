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
import { PERMISSIONS } from '@core/auth/permissions.token';
import { ConfirmService } from '@core/services/confirm';
import { ToastService } from '@core/services/toast';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorState } from '@shared/components/error-state/error-state';
import { PageHeader } from '@shared/components/page-header/page-header';
import type { EntityId, Page, SelectOption, SortOrder } from '@shared/models';
import { PersianDatePipe } from '@shared/pipes/persian-date.pipe';
import { formatDigits, PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { TomanPipe } from '@shared/pipes/toman.pipe';
import type { MenuItem } from 'primeng/api';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { Menu } from 'primeng/menu';
import { Select } from 'primeng/select';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  switchMap,
  take,
  tap,
} from 'rxjs';

import type {
  ProductBrandOption,
  ProductCategoryOption,
  ProductColumn,
  ProductListItem,
  ProductStatus,
} from '../models/product.model';
import { ProductsService } from '../services/products.service';

import {
  EMPTY_FILTERS,
  filtersEqual,
  filtersFromParams,
  filtersToQuery,
  filtersToQueryParams,
  hasActiveFilters,
  isProductStatus,
} from './product-filters';
import type { ProductFilters } from './product-filters';
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
} from './product-paging';
import type { PageSize, ProductPaging } from './product-paging';

/**
 * The four outcomes a list fetch can have (BO-E07's vocabulary).
 *
 * Deliberately NOT imported from the dashboard: a feature must not reach into
 * another feature's internals. The strings are identical so the behaviour is,
 * but each module owns its own type — and because it is a type, the bundler
 * erases it and there is no cross-chunk value at runtime.
 */
type ProductListState = 'loading' | 'error' | 'empty' | 'data';

/**
 * One atomic snapshot of the list state: filters (BO-F03) plus paging/sort
 * (BO-F04).
 *
 * They live in ONE `BehaviorSubject` so a filter change that also resets the
 * page emits once. Two separate subjects would make `combineLatest` emit twice
 * (old page + new filter, then new page), and the first HTTP request would be
 * cancelled after it had already been sent.
 */
interface ProductListQuery {
  readonly filters: ProductFilters;
  readonly paging: ProductPaging;
}

/**
 * The table's columns, in render order (F02's «ستون‌ها را در یک آرایهٔ cols …»).
 *
 * WHY THIS ARRAY IS NOT IN `models/product.model.ts`:
 * a runtime value in a `models/` file can read back `undefined` when the module
 * is reachable from both the eager test bundle and the lazy `products-routes`
 * chunk (see AGENTS.md and the `RECENT_ORDER_COLS` note in recent-orders.ts).
 * The model file stays types-only; the columns live here, next to the template
 * that reads them.
 *
 * `sortable` is consumed by BO-F04's header click; only name, price and
 * createdAt are clickable (tc 3/4/10). `width` keeps the numeric columns from
 * collapsing on a wide screen. `class` carries the responsive hiding that makes
 * the table usable on a phone (BO-F02 tc 6).
 */
const COLUMNS: readonly ProductColumn[] = [
  { field: 'name', header: 'نام محصول', width: '30%', sortable: true },
  { field: 'categoryName', header: 'دسته', class: 'hidden sm:table-cell' },
  { field: 'brandName', header: 'برند', class: 'hidden lg:table-cell' },
  { field: 'price', header: 'قیمت', class: 'tabular-nums', sortable: true },
  { field: 'stock', header: 'موجودی', class: 'tabular-nums' },
  { field: 'status', header: 'وضعیت' },
  { field: 'createdAt', header: 'تاریخ ثبت', class: 'hidden md:table-cell', sortable: true },
  { field: 'actions', header: 'عملیات' },
];

/**
 * Status → label and pill colours, in one place (BO-F02 tc 4).
 *
 * The same table feeds the status filter's options (BO-F03), so the select and
 * the pills cannot disagree about what «پیش‌نویس» is called.
 */
const PRODUCT_STATUS_META: Record<
  ProductStatus,
  { readonly label: string; readonly badgeClass: string }
> = {
  published: {
    label: 'منتشر شده',
    badgeClass: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
  },
  draft: {
    label: 'پیش‌نویس',
    badgeClass: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  },
  inactive: {
    label: 'غیرفعال',
    badgeClass: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400',
  },
};

/**
 * Products list page — `/products` (BO-F02 + BO-F03 + BO-F04).
 *
 * The Arino table, the filter bar, and the pagination/sort controls. Filters
 * (BO-F03) and paging/sort (BO-F04) both live in the URL:
 *
 *   /products?query=سونی&category=3&status=draft&page=2&size=10&sort=price&dir=desc
 *
 * so a refresh or a shared link restores exactly what the sender saw.
 *
 * TRACE — one page/sort interaction, end to end:
 *
 *   1. The user clicks «۲» in the paginator. `onPageChange(2)` clamps the number
 *      to `totalPages()` and calls `applyPaging({ page: 2, … })`.
 *   2. `writeState` updates `state$` once and navigates with
 *      `queryParams: { page: '2', size: null, sort: null, dir: null, …filters }`
 *      and `replaceUrl: true` (no history spam).
 *   3. `combineLatest(reload$, state$)` → `switchMap` cancels any in-flight
 *      request → `list({ ...filtersToQuery(filters), page: 2, pageSize: 20 })`.
 *   4. `buildQuery` writes `?page=2&pageSize=20`; the mock slices rows 20–39 and
 *      returns `{ items, total, page: 2, pageSize: 20 }`.
 *   5. `page()` updates; `rangeStart()` prints 21, `rangeEnd()` 40, and the
 *      active page button carries `aria-current="page"`.
 *   6. Clicking «قیمت» calls `sortBy('price')`: a new field starts `asc` and
 *      resets to page 1; clicking it again flips to `desc`. The URL becomes
 *      `?sort=price&dir=desc`; the mock sorts `price` as a NUMBER (never as a
 *      string) before slicing.
 *   7. Changing «تعداد در صفحه» to 10 calls `onPageSizeChange`: page resets to 1,
 *      `size=10` enters the URL, and `pageWindow` is recomputed.
 *   8. A refresh starts at `route.snapshot.queryParamMap`; `pagingFromParams`
 *      restores page/size/sort before the first request. Back/Forward is handled
 *      by the `queryParamMap` subscription, which updates the state only when
 *      the URL differs.
 *
 * The four fetch outcomes are still one `state()` (BO-E07): error > loading >
 * empty > data. `isFetching` drives the thin progress bar during a page/filter
 * change, when the previous rows stay visible.
 */
@Component({
  selector: 'app-product-list',
  imports: [
    PageHeader,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    IconField,
    InputIcon,
    Menu,
    Select,
    PersianDatePipe,
    PersianDigitsPipe,
    TomanPipe,
    ErrorState,
    EmptyState,
  ],
  templateUrl: './product-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductList {
  private readonly productsService = inject(ProductsService);

  private readonly router = inject(Router);

  private readonly route = inject(ActivatedRoute);

  private readonly toast = inject(ToastService);

  private readonly confirm = inject(ConfirmService);

  private readonly permissions = inject(PERMISSIONS);

  private readonly destroyRef = inject(DestroyRef);

  /**
   * The reload trigger: a `BehaviorSubject` emits once at construction, so the
   * first paint starts the fetch immediately, and `next()` is what the retry
   * button calls. The state stream is combined with it, so a retry reuses the
   * filters/page/sort currently on screen.
   */
  private readonly reload$ = new BehaviorSubject<void>(undefined);

  /**
   * Filters + paging as one atomic stream. Seeded from the URL so a refresh or a
   * shared link restores everything before the first request; `writeState`
   * pushes every change.
   */
  private readonly state$ = new BehaviorSubject<ProductListQuery>({
    filters: filtersFromParams(this.route.snapshot.queryParamMap),
    paging: pagingFromParams(this.route.snapshot.queryParamMap),
  });

  /**
   * Non-null when the last fetch rejected (BO-E07 tc 2).
   *
   * Declared BEFORE `page` because `toSignal` subscribes synchronously and
   * `BehaviorSubject` emits synchronously: with a throwing service, `tap`'s
   * error handler runs during `page`'s own initialiser, and it must find a
   * ready signal to write to.
   */
  readonly itemsError = signal<string | null>(null);

  /** True while a request is in flight; drives the thin in-card progress bar. */
  readonly isFetching = signal(false);

  /**
   * Optimistic overlays for BO-F06.
   *
   * The server response is the source of truth, but a status toggle or a delete
   * must be visible immediately. These maps are applied on top of `page().items`
   * and cleared when a successful refetch confirms the server agrees (or when
   * the request fails, which is the rollback).
   */
  private readonly statusOverrides = signal<ReadonlyMap<EntityId, ProductStatus>>(new Map());

  private readonly removedIds = signal<ReadonlySet<EntityId>>(new Set());

  /** The row whose mobile action menu is open; null when the menu is closed. */
  readonly selectedProduct = signal<ProductListItem | null>(null);

  /** Row actions require the module's view grant until D07/D08 split edit/delete. */
  readonly canManage = computed(() => this.permissions().includes('products.view'));

  /** The UI mirror of the filter half of `state$`. */
  readonly filters = signal<ProductFilters>(this.state$.value.filters);

  /** The UI mirror of the page/size/sort half of `state$`. */
  readonly paging = signal<ProductPaging>(this.state$.value.paging);

  /** The debounced search box; the only filter that is not applied on change. */
  readonly searchControl = new FormControl(this.filters().query, { nonNullable: true });

  /**
   * Category options for the filter. A failed lookup is an empty list, not a
   * page error: the table can still be browsed without the filter.
   */
  readonly categories = toSignal(
    this.productsService
      .categories()
      .pipe(catchError(() => of<readonly ProductCategoryOption[]>([]))),
    { initialValue: [] as readonly ProductCategoryOption[] },
  );

  /** Brand options for the filter (same failure rule as categories). */
  readonly brands = toSignal(
    this.productsService.brands().pipe(catchError(() => of<readonly ProductBrandOption[]>([]))),
    { initialValue: [] as readonly ProductBrandOption[] },
  );

  /**
   * The current page, as a signal. `null` is "not answered yet" — the skeleton —
   * and is deliberately distinguishable from a page with `items: []`, which is
   * "no products match" (tc 9 vs tc 8).
   *
   * The pipeline combines the retry trigger with filters + paging. `switchMap`
   * cancels the previous request when the user changes a filter or clicks pages
   * quickly, so a slow response for page 2 can never overwrite page 3.
   */
  readonly page = toSignal<Page<ProductListItem> | null>(
    combineLatest([this.reload$, this.state$]).pipe(
      tap(() => {
        this.itemsError.set(null);
        this.isFetching.set(true);
      }),
      switchMap(([, state]) =>
        this.productsService
          .list({
            ...filtersToQuery(state.filters),
            ...pagingToQuery(state.paging),
          })
          .pipe(
            tap({
              next: (result) => {
                this.reconcileOptimistic(result);
                this.itemsError.set(null);
                this.isFetching.set(false);
              },
              error: () => {
                this.itemsError.set('دریافت محصولات ناموفق بود');
                this.isFetching.set(false);
              },
            }),
            catchError(() => of(null)),
          ),
      ),
    ),
    { initialValue: null },
  );

  /**
   * The rows of the current page with the optimistic overlays applied; `null`
   * while the first request is in flight. A deleted row disappears immediately,
   * and a status toggle changes the pill before the server answers (BO-F06).
   */
  readonly items = computed<readonly ProductListItem[] | null>(() => {
    const page = this.page();

    if (!page) {
      return null;
    }

    const overrides = this.statusOverrides();
    const removed = this.removedIds();

    return page.items
      .filter((item) => !removed.has(item.id))
      .map((item) => {
        const status = overrides.get(item.id);
        return status && status !== item.status ? { ...item, status } : item;
      });
  });

  /** The single branch condition for the template's `@switch` (BO-E07 tc 7). */
  readonly state = computed<ProductListState>(() => {
    if (this.itemsError()) {
      return 'error';
    }

    if (this.items() === null) {
      return 'loading';
    }

    if (this.items()!.length === 0) {
      return 'empty';
    }

    return 'data';
  });

  readonly cols: readonly ProductColumn[] = COLUMNS;

  /** The status filter's options, derived from the same table as the pills. */
  readonly statusOptions: readonly { readonly value: ProductStatus; readonly label: string }[] = (
    Object.keys(PRODUCT_STATUS_META) as ProductStatus[]
  ).map((value) => ({ value, label: PRODUCT_STATUS_META[value].label }));

  /**
   * The `p-select` option lists for the filter bar. Each leads with an explicit
   * «همه …» row carrying value `''` — the same "everything" semantics the native
   * `<option value="">` had. (`showClear` is no substitute: its clear emits
   * `null`, and `filtersToQueryParams` drops empty strings, not nulls, by
   * contract.) Getters, not fields: they read signals and runtime imports, and
   * the lookup lists can arrive after construction.
   */
  get categoryFilterOptions(): SelectOption<string>[] {
    return [
      { label: 'همه دسته‌ها', value: '' },
      ...this.categories().map((category) => ({ label: category.name, value: category.id })),
    ];
  }

  get brandFilterOptions(): SelectOption<string>[] {
    return [
      { label: 'همه برندها', value: '' },
      ...this.brands().map((brand) => ({ label: brand.name, value: brand.id })),
    ];
  }

  get statusFilterOptions(): SelectOption<string>[] {
    return [{ label: 'همه وضعیت‌ها', value: '' }, ...this.statusOptions];
  }

  /**
   * The mobile row-action menu (BO-F06).
   *
   * PrimeNG's popup is appended to `<body>`, so the table's `overflow-x-auto`
   * cannot clip it on a phone (tc 10). The items are derived from the selected
   * row, so one menu instance serves every row instead of 20 hidden popups.
   */
  readonly actionItems = computed<MenuItem[]>(() => {
    const product = this.selectedProduct();

    if (!product || !this.canManage()) {
      return [];
    }

    const isPublished = product.status === 'published';

    return [
      {
        label: 'ویرایش',
        icon: 'pi pi-pencil',
        command: () => this.editProduct(product.id),
      },
      {
        label: isPublished ? 'غیرفعال کردن' : 'منتشر کردن',
        icon: 'pi pi-power-off',
        command: () => void this.toggleStatus(product),
      },
      { separator: true },
      {
        label: 'حذف',
        icon: 'pi pi-trash',
        styleClass: 'text-red-600',
        command: () => void this.removeProduct(product),
      },
    ];
  });

  /**
   * Result count for the footer (tc 10) — the server's total, not the current
   * page length, so "۲۱–۴۰ از ۱۳۷" has one number to read. Pending optimistic
   * deletes reduce it immediately; a failed delete restores it.
   */
  readonly total = computed(() => Math.max(0, (this.page()?.total ?? 0) - this.removedIds().size));

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
   * A getter, not a field: `PAGE_SIZE_OPTIONS` is a runtime import reachable
   * from both the eager spec bundle and the lazy `products-routes` chunk. A field
   * initialiser can run before that shared chunk is initialised (the same hazard
   * as `TOMAN_UNIT` in the dashboard), which would leave the select empty.
   */
  get pageSizeOptions(): readonly PageSize[] {
    return PAGE_SIZE_OPTIONS;
  }

  /**
   * The page-size select's options with Persian-digit labels. Same getter rule
   * as `pageSizeOptions`: `PAGE_SIZE_OPTIONS` is a runtime import reachable from
   * both the eager spec bundle and the lazy chunk, so a field initialiser is a
   * hazard.
   */
  get pageSizeSelectOptions(): SelectOption<PageSize>[] {
    return PAGE_SIZE_OPTIONS.map((size) => ({ label: formatDigits(size), value: size }));
  }

  /** Whether the clear button should be enabled and the empty copy should mention filters. */
  readonly hasFilters = computed(() => hasActiveFilters(this.filters()));

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => this.applyFilters({ ...this.filters(), query }));

    // Back/forward (or a pasted URL) changes the parameters WITHOUT going
    // through `writeState`. Mirror that into the state. Our own navigation is a
    // no-op here because the comparator already sees the same values.
    this.route.queryParamMap
      .pipe(
        map((params) => ({
          filters: filtersFromParams(params),
          paging: pagingFromParams(params),
        })),
        distinctUntilChanged(
          (previous, current) =>
            filtersEqual(previous.filters, current.filters) &&
            pagingEqual(previous.paging, current.paging),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((next) => {
        if (filtersEqual(next.filters, this.filters()) && pagingEqual(next.paging, this.paging())) {
          return;
        }

        this.filters.set(next.filters);
        this.paging.set(next.paging);
        this.state$.next(next);
        this.searchControl.setValue(next.filters.query, { emitEvent: false });
      });
  }

  /** Re-runs the fetch with the filters/page currently on screen (BO-E07 tc 3). */
  retry(): void {
    this.reload$.next();
  }

  /** Category select → apply immediately (no debounce; one deliberate choice). */
  setCategory(category: string): void {
    this.applyFilters({ ...this.filters(), category });
  }

  /** Brand select → apply immediately. */
  setBrand(brand: string): void {
    this.applyFilters({ ...this.filters(), brand });
  }

  /** Status select → apply immediately, ignoring an unexpected value. */
  setStatus(status: string): void {
    if (status === '' || isProductStatus(status)) {
      this.applyFilters({ ...this.filters(), status });
    }
  }

  /** Reset all four filters, keep the page size/sort, and return to page 1 (tc 7). */
  clearFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.writeState({
      filters: EMPTY_FILTERS,
      paging: { ...this.paging(), page: 1 },
    });
  }

  /**
   * Header click: sort by `field`, or flip the direction when it is already the
   * active sort. A non-sortable column is ignored (tc 10) even if a caller
   * reaches this method directly.
   */
  sortBy(field: ProductColumn['field']): void {
    if (!isSortField(field)) {
      return;
    }

    const current = this.paging();
    const dir: SortOrder = current.sort === field && current.dir === 'asc' ? 'desc' : 'asc';

    this.applyPaging({ ...current, page: 1, sort: field, dir });
  }

  /** `aria-sort` for a sortable `<th>`; non-active columns report `none`. */
  ariaSort(field: ProductColumn['field']): 'ascending' | 'descending' | 'none' {
    if (this.paging().sort !== field) {
      return 'none';
    }

    return this.paging().dir === 'asc' ? 'ascending' : 'descending';
  }

  /** The sort chevron for a header; inactive columns show the neutral alt icon. */
  sortIconClass(field: ProductColumn['field']): string {
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

  /** Page-size select; the allowed sizes are the closed 10/20/50 union (tc 2). */
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

  statusLabel(status: ProductStatus): string {
    return PRODUCT_STATUS_META[status]?.label ?? status;
  }

  statusBadgeClass(status: ProductStatus): string {
    return PRODUCT_STATUS_META[status]?.badgeClass ?? '';
  }

  /**
   * ویرایش — `/products/:id/edit` exists (BO-F01), so the link navigates to the
   * real edit route.
   */
  editProduct(productId: string): void {
    void this.router.navigate(['/products', productId, 'edit']);
  }

  /**
   * Open the mobile action menu for one row (BO-F06 tc 1).
   *
   * `Menu.toggle(event)` anchors the popup to the kebab button; the product is
   * stored so `actionItems` can build the three commands for that row.
   */
  openActions(product: ProductListItem, menu: Menu, event: Event): void {
    if (!this.canManage()) {
      return;
    }

    this.selectedProduct.set(product);
    menu.toggle(event);
  }

  /**
   * تغییر وضعیت — confirm, optimistically flip the pill, then persist.
   *
   * TRACE: a published product named «هدفون سونی».
   *   1. The row action calls `toggleStatus(product)`.
   *   2. `ConfirmService.confirm` asks `محصول «هدفون سونی» غیرفعال شود؟`.
   *   3. Cancel → return; no state change, no request, no toast (tc 3).
   *   4. Accept → `statusOverrides` maps the id to `inactive`; the table's pill
   *      turns grey immediately, before HTTP (tc 2, tc 7).
   *   5. `setStatus(id, 'inactive')` succeeds → a success toast fires and
   *      `reload$` refetches; `reconcileOptimistic` drops the overlay once the
   *      server returns the same status (tc 6).
   *   6. The request fails → the overlay is removed and the green pill returns
   *      (rollback, tc 7); the error interceptor has already shown the toast (tc 5).
   */
  async toggleStatus(product: ProductListItem): Promise<void> {
    if (!this.canManage()) {
      return;
    }

    const next: ProductStatus = product.status === 'published' ? 'inactive' : 'published';
    const confirmed = await this.confirm.confirm({
      message:
        next === 'inactive'
          ? `محصول «${product.name}» غیرفعال شود؟`
          : `محصول «${product.name}» منتشر شود؟`,
      header: 'تغییر وضعیت محصول',
      acceptLabel: next === 'inactive' ? 'غیرفعال کن' : 'منتشر کن',
    });

    if (!confirmed) {
      return;
    }

    this.setStatusOverride(product.id, next);

    this.productsService
      .setStatus(product.id, next)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('وضعیت محصول به‌روزرسانی شد.');
          this.reload$.next();
        },
        error: () => this.clearStatusOverride(product.id),
      });
  }

  /**
   * حذف — a dangerous confirm, an optimistic row removal, and a rollback.
   *
   * The row disappears and the footer total drops by one immediately; on error
   * the id is removed from the overlay and the row returns (tc 4, tc 7). The
   * confirm is `danger: true`, which routes it to the red dialog.
   */
  async removeProduct(product: ProductListItem): Promise<void> {
    if (!this.canManage()) {
      return;
    }

    const confirmed = await this.confirm.confirm({
      message: `محصول «${product.name}» حذف شود؟ این عمل قابل بازگشت نیست.`,
      header: 'حذف محصول',
      acceptLabel: 'حذف',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    this.removedIds.update((current) => new Set(current).add(product.id));

    this.productsService
      .remove(product.id)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('محصول حذف شد.');
          this.reload$.next();
        },
        error: () => this.restoreRemoved(product.id),
      });
  }

  /** The empty state's way out: the create form (BO-F02 tc 8). */
  openCreateForm(): void {
    void this.router.navigate(['/products', 'new']);
  }

  /** Put an optimistic status on one row, without mutating `page()`. */
  private setStatusOverride(id: EntityId, status: ProductStatus): void {
    this.statusOverrides.update((current) => {
      const next = new Map(current);
      next.set(id, status);
      return next;
    });
  }

  /** Rollback: remove the optimistic status so the server's value is shown again. */
  private clearStatusOverride(id: EntityId): void {
    this.statusOverrides.update((current) => {
      if (!current.has(id)) {
        return current;
      }

      const next = new Map(current);
      next.delete(id);
      return next;
    });
  }

  /** Rollback a failed delete: the row reappears and the total goes back up. */
  private restoreRemoved(id: EntityId): void {
    this.removedIds.update((current) => {
      if (!current.has(id)) {
        return current;
      }

      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  /**
   * Drop the overlays the server has caught up with.
   *
   * Called on every successful fetch. A status override is cleared only when the
   * SAME row comes back with the SAME status; a refetch that raced the mutation
   * still shows the old value, so the override stays and keeps the UI honest
   * until the next fetch. A removed id is cleared once the row is absent — the
   * server has confirmed the delete.
   */
  private reconcileOptimistic(page: Page<ProductListItem>): void {
    const byId = new Map(page.items.map((item) => [item.id, item]));

    if (this.statusOverrides().size > 0) {
      const overrides = new Map(this.statusOverrides());

      for (const [id, status] of overrides) {
        if (byId.get(id)?.status === status) {
          overrides.delete(id);
        }
      }

      this.statusOverrides.set(overrides);
    }

    if (this.removedIds().size > 0) {
      const removed = new Set(this.removedIds());

      for (const id of removed) {
        if (!byId.has(id)) {
          removed.delete(id);
        }
      }

      this.removedIds.set(removed);
    }
  }

  /**
   * Filter change: reset to page 1, because a filter that shrinks the result set
   * can leave the current page beyond the last one.
   */
  private applyFilters(next: ProductFilters): void {
    if (filtersEqual(next, this.filters())) {
      return;
    }

    this.writeState({
      filters: next,
      paging: { ...this.paging(), page: 1 },
    });
  }

  /** Page/size/sort change: one atomic state update and one URL write. */
  private applyPaging(next: ProductPaging): void {
    if (pagingEqual(next, this.paging())) {
      return;
    }

    this.writeState({ ...this.state$.value, paging: next });
  }

  /**
   * Single write path: state → stream → URL.
   *
   * `replaceUrl` keeps history clean while paging; `merge` preserves parameters
   * this task does not own. The caller has already checked equality, so a repeat
   * click on the current page does not create a duplicate navigation (tc 7).
   */
  private writeState(next: ProductListQuery): void {
    this.filters.set(next.filters);
    this.paging.set(next.paging);
    this.state$.next(next);

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        ...filtersToQueryParams(next.filters),
        ...pagingToQueryParams(next.paging),
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
