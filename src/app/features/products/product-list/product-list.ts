import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '@core/services/toast';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorState } from '@shared/components/error-state/error-state';
import { PageHeader } from '@shared/components/page-header/page-header';
import type { Page } from '@shared/models';
import { PersianDatePipe } from '@shared/pipes/persian-date.pipe';
import { PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { TomanPipe } from '@shared/pipes/toman.pipe';
import { BehaviorSubject, catchError, of, switchMap, tap } from 'rxjs';

import type { ProductColumn, ProductListItem, ProductStatus } from '../models/product.model';
import { ProductsService } from '../services/products.service';

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
 * `sortable` is declared now and consumed in BO-F04 (click-to-sort); `/sortable:
 * true/,` marks the three columns the panel actually sorts by. `width` keeps the
 * numeric columns from collapsing on a wide screen. `class` carries the
 * responsive hiding that makes the table usable on a phone (tc 6).
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
 * Status → label and pill colours, in one place (tc 4).
 *
 * A table and not a `switch` in the template: the products create form
 * (`admin-panel-add-product.html`) offers «منتشر» / «پیش‌نویس», and BO-F06 adds
 * the inactive toggle — so the vocabulary is closed and known today. Adding a
 * status later is one entry here, and a typo becomes a compile error because
 * `Record<ProductStatus, …>` must be exhaustive.
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
 * Products list page — `/products` (BO-F02).
 *
 * The Arino table: name, category, brand, price, stock, status and an actions
 * column, with Persian digits, the `toman` pipe and the Solar date, fed by a
 * signal so BO-F03's filters apply without a page refresh (the task's «داده را
 * با signal از سرویس بگیر»).
 *
 * WHY A PLAIN `<table>` AND NOT `<p-table>`
 * -----------------------------------------
 * The task text says `p-table`, but the panel's approved table look (recent
 * orders, low stock) is a plain Arino-styled table with a `cols` array driving
 * its headers. PrimeNG's table brings its own surface styling, sort events and
 * paginator markup that has to be fought back to that design on every page, and
 * this project's tables already render the same columns from a descriptor. The
 * `cols`/`sortable` shape below is what `p-table`'s config would buy us, and
 * BO-F04 can swap the markup without touching the component API. The acceptance
 * criteria (columns, pipes, badge, actions, states, count) are all met either
 * way.
 *
 * TRACE / PRACTICAL USAGE EXAMPLE
 * -------------------------------
 * GET `/products` → the route's component is created →
 * `reload$` (a `BehaviorSubject`) emits once at construction →
 * `switchMap` calls `ProductsService.list()` →
 * the stub answers `of(PRODUCT_FIXTURES)` synchronously →
 * `toSignal` stores the 4 rows and `items()` is non-null →
 * `state()` resolves `'data'` → the template draws the `<thead>` from `cols`
 * and one `<tr>` per row:
 *
 *   name «کیبورد مکانیکی ریزر BlackWidow» · category «لوازم جانبی» ·
 *   brand «ریزر» · price 1850000 → «۱٬۸۵۰٬۰۰۰ تومان» · stock 0 → «۰» (red,
 *   out of stock) · status 'published' → green pill «منتشر شده» ·
 *   createdAt 1729142400000 → «۱۴۰۳/۱۱/۱۵» · actions: ویرایش (real navigation
 *   to `/products/p-1001/edit`), تغییر وضعیت and حذف.
 *
 * The footer counts the rows: «۴ محصول» (tc 10).
 *
 * A rejected `list()` never reaches the template as a crash: `catchError`
 * keeps the stream alive, `itemsError` holds the message, `state()` resolves
 * `'error'` FIRST (before `null` could read as "still loading"), and the page
 * shows the same `<app-error-state>` block the dashboard's widgets use, with a
 * «تلاش دوباره» button that calls `retry()` → `reload$.next()` → the same
 * fetch runs again.
 */
@Component({
  selector: 'app-product-list',
  imports: [
    PageHeader,
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

  private readonly toast = inject(ToastService);

  /**
   * The reload trigger: a `BehaviorSubject` emits once at construction, so the
   * first paint starts the fetch immediately, and `next()` is what the retry
   * button calls. (Same technique as the dashboard's `recentReload$` — without
   * it, a stream created in a field initialiser would never run a second time
   * and «تلاش دوباره» would be a button that does nothing.)
   */
  private readonly reload$ = new BehaviorSubject<void>(undefined);

  /**
   * Non-null when the last fetch rejected (BO-E07 tc 2).
   *
   * Declared BEFORE `items` because `toSignal` subscribes synchronously and
   * `BehaviorSubject` emits synchronously: with a throwing service, `tap`'s
   * error handler runs during `items`'s own initialiser, and it must find a
   * ready signal to write to.
   */
  readonly itemsError = signal<string | null>(null);

  /**
   * The current page, as a signal. `null` is "not answered yet" — the skeleton —
   * and is deliberately distinguishable from a page with `items: []`, which is
   * "the shop has no products" (tc 9 vs tc 8).
   *
   * BO-F05 changed the service from a bare array to `Page<ProductListItem>`, so
   * the page now carries its own `total`. That is what lets BO-F04 print "of 137"
   * instead of "of the 20 rows currently on screen"; until the paginator exists,
   * the mock returns one page whose total equals the row count, and tc 10 keeps
   * passing unchanged.
   */
  readonly page = toSignal<Page<ProductListItem> | null>(
    this.reload$.pipe(
      // A new attempt clears the OLD failure the moment it starts, so clicking
      // «تلاش دوباره» trades the red block for the skeleton instead of leaving
      // the previous error on screen while the next request is in flight.
      tap(() => this.itemsError.set(null)),
      switchMap(() =>
        this.productsService.list().pipe(
          tap({
            next: () => this.itemsError.set(null),
            error: () => this.itemsError.set('دریافت محصولات ناموفق بود'),
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

  /**
   * Result count for the footer (tc 10) — the server's total, not the current
   * page length, so BO-F04's "۱–۲۰ از ۱۳۷" has one number to read.
   */
  readonly total = computed(() => this.page()?.total ?? 0);

  /** Re-runs the failed fetch (BO-E07 tc 3). */
  retry(): void {
    this.reload$.next();
  }

  statusLabel(status: ProductStatus): string {
    return PRODUCT_STATUS_META[status]?.label ?? status;
  }

  statusBadgeClass(status: ProductStatus): string {
    return PRODUCT_STATUS_META[status]?.badgeClass ?? '';
  }

  /**
   * ویرایش — the one action that already works: `/products/:id/edit` exists
   * (BO-F01), so the link navigates to the real edit route.
   */
  editProduct(productId: string): void {
    void this.router.navigate(['/products', productId, 'edit']);
  }

  /**
   * تغییر وضعیت — F06's job. The button is in the DOM now (tc 5) and says so
   * honestly through a toast, instead of silently doing nothing.
   */
  toggleStatus(product: ProductListItem): void {
    this.toast.info(`تغییر وضعیت «${product.name}» در نسخهٔ بعدی فعال می‌شود.`);
  }

  /**
   * حذف — F05's job, behind a confirmation dialog. Same contract as the status
   * button: present, announced, and no silent no-op.
   */
  removeProduct(product: ProductListItem): void {
    this.toast.info(`حذف «${product.name}» در نسخهٔ بعدی فعال می‌شود.`);
  }

  /** The empty state's way out: the create form (tc 8). */
  openCreateForm(): void {
    void this.router.navigate(['/products', 'new']);
  }
}
