import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '@core/services/toast';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorState } from '@shared/components/error-state/error-state';
import { PageHeader } from '@shared/components/page-header/page-header';
import type { Page } from '@shared/models';
import { PersianDatePipe } from '@shared/pipes/persian-date.pipe';
import { PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { TomanPipe } from '@shared/pipes/toman.pipe';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  switchMap,
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
 * The table's columns, in render order (F02's «ستون‌ها را در یک آرایهٔ cols …»).
 *
 * WHY THIS ARRAY IS NOT IN `models/product.model.ts`:
 * a runtime value in a `models/` file can read back `undefined` when the module
 * is reachable from both the eager test bundle and the lazy `products-routes`
 * chunk (see AGENTS.md and the `RECENT_ORDER_COLS` note in recent-orders.ts).
 * The model file stays types-only; the columns live here, next to the template
 * that reads them.
 *
 * `sortable` is declared now and consumed by BO-F04 (click-to-sort); `width`
 * keeps the numeric columns from collapsing on a wide screen. `class` carries
 * the responsive hiding that makes the table usable on a phone (BO-F02 tc 6).
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
 * The same table now feeds the status filter's options (BO-F03), so the select
 * and the pills cannot disagree about what «پیش‌نویس» is called.
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

/** Read the selected value out of a native `<select>` change event. */
function selectValue(event: Event): string {
  return (event.target as HTMLSelectElement).value;
}

/**
 * Products list page — `/products` (BO-F02 + BO-F03).
 *
 * The Arino table plus the filter bar: a text search over name/SKU, category,
 * brand and status. The filters live in the URL (`?query=&category=&brand=&status=`)
 * rather than only in component state, so a refresh or a shared link restores
 * exactly what the sender saw.
 *
 * TRACE — one filter interaction, end to end:
 *
 *   1. The user types «سونی» in `#product-search`. The native input event updates
 *      `searchControl`.
 *   2. `valueChanges` goes through `debounceTime(300)`; a second keystroke
 *      cancels the first timer, so only the last value reaches the URL.
 *   3. `applyFilters({ ...filters, query: 'سونی' })` updates `filters$` and calls
 *      `Router.navigate([], { queryParams: { query: 'سونی', category: null, … },
 *      queryParamsHandling: 'merge', replaceUrl: true })`.
 *   4. `filters$` emits into `combineLatest(reload$, filters$)`; `switchMap`
 *      cancels any in-flight request and calls
 *      `ProductsService.list(filtersToQuery(filters))`.
 *   5. `filtersToQuery` maps the URL names to the API names:
 *      `{ query: 'سونی', categoryId: null, brandId: null, status: null }`.
 *   6. `buildQuery` drops the nulls, so the mock sees `?query=سونی`, filters the
 *      fixture by name + slug + SKU, and returns a `Page`.
 *   7. `page()` updates; `items()` redraws the rows and `total()` updates the
 *      footer. No full page reload.
 *   8. Picking a category repeats steps 3–7 with `categoryId: '3'` and the URL
 *      becomes `?query=سونی&category=3`; the two filters combine.
 *   9. «پاک کردن فیلترها» writes `{ query: null, category: null, brand: null,
 *      status: null }`, which removes the four keys while `merge` preserves
 *      BO-F04's future `page`/`sort` parameters.
 *  10. A refresh (or a shared URL) starts at `route.snapshot.queryParamMap`, so
 *      the first `filters$` value is already the restored state — the first
 *      fetch is the filtered one.
 *
 * Back/forward is handled by the `route.queryParamMap` subscription: an external
 * URL change updates `filters` and `filters$` without re-navigating. Our own
 * navigation is ignored because `filtersEqual` sees the same state.
 *
 * The four fetch outcomes are still one `state()` (BO-E07): error > loading >
 * empty > data. `isFetching` is a lighter signal used only for the in-card
 * progress bar during a filter change, when the previous rows stay visible.
 */
@Component({
  selector: 'app-product-list',
  imports: [
    PageHeader,
    ReactiveFormsModule,
    RouterLink,
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

  private readonly destroyRef = inject(DestroyRef);

  /**
   * The reload trigger: a `BehaviorSubject` emits once at construction, so the
   * first paint starts the fetch immediately, and `next()` is what the retry
   * button calls. The filter stream is combined with it, so a retry reuses the
   * filters currently on screen.
   */
  private readonly reload$ = new BehaviorSubject<void>(undefined);

  /**
   * The filter state as a stream. Seeded from the URL so a refresh/shared link
   * restores it before the first request; `applyFilters` pushes every change.
   * A `BehaviorSubject` (not just the signal) because the fetch pipeline needs
   * an initial synchronous emission.
   */
  private readonly filters$ = new BehaviorSubject<ProductFilters>(
    filtersFromParams(this.route.snapshot.queryParamMap),
  );

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

  /** The UI mirror of `filters$` — the template reads this signal. */
  readonly filters = signal<ProductFilters>(this.filters$.value);

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
   * The pipeline combines the retry trigger with the filter stream. `switchMap`
   * cancels the previous request when the user changes a filter quickly, so a
   * slow response for «س» can never overwrite the answer for «سونی».
   */
  readonly page = toSignal<Page<ProductListItem> | null>(
    combineLatest([this.reload$, this.filters$]).pipe(
      tap(() => {
        this.itemsError.set(null);
        this.isFetching.set(true);
      }),
      switchMap(([, filters]) =>
        this.productsService.list(filtersToQuery(filters)).pipe(
          tap({
            next: () => {
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

  /** The rows of the current page; `null` while the first request is in flight. */
  readonly items = computed<readonly ProductListItem[] | null>(() => this.page()?.items ?? null);

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
   * Result count for the footer (tc 10) — the server's total, not the current
   * page length, so BO-F04's "۱–۲۰ از ۱۳۷" has one number to read.
   */
  readonly total = computed(() => this.page()?.total ?? 0);

  /** Whether the clear button should be enabled and the empty copy should mention filters. */
  readonly hasFilters = computed(() => hasActiveFilters(this.filters()));

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => this.applyFilters({ ...this.filters(), query }));

    // Back/forward (or a pasted URL) changes the parameters WITHOUT going
    // through `applyFilters`. Mirror that into the state. Our own navigation is
    // a no-op here because `filtersEqual` already sees the same values.
    this.route.queryParamMap
      .pipe(
        map((params) => filtersFromParams(params)),
        distinctUntilChanged(filtersEqual),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((filters) => {
        if (filtersEqual(filters, this.filters())) {
          return;
        }

        this.filters.set(filters);
        this.filters$.next(filters);
        this.searchControl.setValue(filters.query, { emitEvent: false });
      });
  }

  /** Re-runs the fetch with the filters currently on screen (BO-E07 tc 3). */
  retry(): void {
    this.reload$.next();
  }

  /** Category select → apply immediately (no debounce; one deliberate choice). */
  setCategory(event: Event): void {
    this.applyFilters({ ...this.filters(), category: selectValue(event) });
  }

  /** Brand select → apply immediately. */
  setBrand(event: Event): void {
    this.applyFilters({ ...this.filters(), brand: selectValue(event) });
  }

  /** Status select → apply immediately, ignoring an unexpected value. */
  setStatus(event: Event): void {
    const status = selectValue(event);

    if (status === '' || isProductStatus(status)) {
      this.applyFilters({ ...this.filters(), status });
    }
  }

  /** Reset all four filters and remove their keys from the URL (tc 7). */
  clearFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.applyFilters(EMPTY_FILTERS);
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
   * تغییر وضعیت — F06's job. The button is in the DOM now (F02 tc 5) and says so
   * honestly through a toast, instead of silently doing nothing.
   */
  toggleStatus(product: ProductListItem): void {
    this.toast.info(`تغییر وضعیت «${product.name}» در نسخهٔ بعدی فعال می‌شود.`);
  }

  /**
   * حذف — F06/F15's job, behind a confirmation dialog. Same contract as the
   * status button: present, announced, and no silent no-op.
   */
  removeProduct(product: ProductListItem): void {
    this.toast.info(`حذف «${product.name}» در نسخهٔ بعدی فعال می‌شود.`);
  }

  /** The empty state's way out: the create form (BO-F02 tc 8). */
  openCreateForm(): void {
    void this.router.navigate(['/products', 'new']);
  }

  /**
   * Single write path for every filter: state → stream → URL.
   *
   * `replaceUrl` keeps the browser history clean while typing; `merge` preserves
   * parameters owned by later tasks (`page`, `sort`). `filtersEqual` skips a
   * redundant request when the user re-selects the option already active.
   */
  private applyFilters(next: ProductFilters): void {
    if (filtersEqual(next, this.filters())) {
      return;
    }

    this.filters.set(next);
    this.filters$.next(next);

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: filtersToQueryParams(next),
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
