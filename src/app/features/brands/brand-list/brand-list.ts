// src/app/features/brands/brand-list/brand-list.ts
//
// The brands screen — `/brands` (BO-G05).
//
// The shape is the products list's, without the URL-state machinery: a brand list
// has one search box and one page number, so component signals are the whole
// state. Everything that talks to the server goes through `BrandsService`, which
// is the only place that knows the endpoint.
//
// TRACE — «سامسونگ» is typed into the search box:
//
//   1. `onSearch('سامسونگ')` pushes the value into `search$`.
//   2. `debounceTime(300)` + `distinctUntilChanged` emit once, after typing stops.
//   3. `load()`: `page.set(1)` (a new search starts at the first page, tc 1) and
//      `brands.list({ query, page, pageSize })`.
//   4. `rows` gets the page's items; `total` gets the server's count, which is what
//      «صفحه ۱ از ۳» prints — counting the rows would only count this page.
//   5. The table re-renders; an empty answer shows the search empty state, not the
//      "no brands yet" one.

import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { ConfirmService } from '@core/services/confirm';
import { ToastService } from '@core/services/toast';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorState } from '@shared/components/error-state/error-state';
import { LoadingBlock } from '@shared/components/loading-block/loading-block';
import { PageHeader } from '@shared/components/page-header/page-header';
import { PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { Dialog } from 'primeng/dialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

import { BrandForm } from '../brand-form/brand-form';
import type { Brand, BrandListItem } from '../models/brand.model';
import { BrandsService } from '../services/brands.service';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-brand-list',
  imports: [
    BrandForm,
    Dialog,
    EmptyState,
    ErrorState,
    IconField,
    InputIcon,
    InputText,
    LoadingBlock,
    PageHeader,
    PersianDigitsPipe,
  ],
  templateUrl: './brand-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandList implements OnInit, OnDestroy {
  private readonly brands = inject(BrandsService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly permissions = inject(PERMISSIONS);

  /** `null` = no answer yet, `[]` = this query has no rows. */
  readonly rows = signal<readonly BrandListItem[] | null>(null);

  readonly total = signal(0);

  readonly failed = signal(false);

  readonly search = signal('');

  readonly page = signal(1);

  readonly pageSize = PAGE_SIZE;

  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));

  /** The row actions exist only for a signed-in user with the module grant. */
  readonly canManage = computed(() => this.permissions().includes('products.view'));

  readonly dialogOpen = signal(false);

  /** The brand being edited; `null` while the full record is not loaded yet. */
  readonly editing = signal<Brand | null>(null);

  private readonly search$ = new Subject<string>();

  /** Everything that must be torn down with the page (debounce + in-flight taps). */
  private readonly subscriptions = new Subscription();

  ngOnInit(): void {
    this.subscriptions.add(
      this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe((query) => {
        this.search.set(query);
        this.page.set(1);
        this.load();
      }),
    );

    this.load();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  load(): void {
    this.failed.set(false);

    this.subscriptions.add(
      this.brands
        .list({ query: this.search(), page: this.page(), pageSize: this.pageSize })
        .subscribe({
          next: (page) => {
            this.rows.set(page.items);
            this.total.set(page.total);
          },
          error: () => {
            this.rows.set(null);
            this.failed.set(true);
          },
        }),
    );
  }

  /** The search box is a real input; the debounce lives in `search$`. */
  onSearch(value: string): void {
    this.search$.next(value);
  }

  clearSearch(input: HTMLInputElement): void {
    input.value = '';
    this.onSearch('');
  }

  retry(): void {
    this.load();
  }

  goTo(page: number): void {
    const target = Math.min(Math.max(1, page), this.pageCount());

    if (target === this.page()) {
      return;
    }

    this.page.set(target);
    this.load();
  }

  openCreate(): void {
    this.editing.set(null);
    this.dialogOpen.set(true);
  }

  /**
   * The row carries the list shape; the form needs `description`, so the full
   * record is fetched first (one small request, and the dialog stays closed until
   * it arrives — an empty form would erase the description on save).
   */
  openEdit(item: BrandListItem): void {
    this.brands.get(item.id).subscribe({
      next: (brand) => {
        this.editing.set(brand);
        this.dialogOpen.set(true);
      },
      error: () => {
        // The interceptor already reported it.
      },
    });
  }

  onSaved(brand: Brand): void {
    this.dialogOpen.set(false);
    this.editing.set(null);
    this.toast.success(`برند «${brand.name}» ذخیره شد.`);
    this.load();
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
    this.editing.set(null);
  }

  /**
   * The switch flips first and the server is asked after (tc 6) — the same
   * optimistic rule the products list follows. A failure reloads the page, which
   * is the rollback, and the interceptor owns the error message (tc 3/4).
   */
  toggleStatus(item: BrandListItem): void {
    const next = !item.isActive;
    this.patchRow(item.id, next);

    this.brands.setActive(item.id, next).subscribe({
      next: (brand) => this.patchRow(brand.id, brand.isActive),
      error: () => this.load(),
    });
  }

  /**
   * Delete with a warning that counts the products (tc 7). Cancel is a no-op (tc 5).
   *
   * TRACE — «سامسونگ» (two products) is deleted:
   *
   *   1. The confirm message reads «… ۲ محصول با این برند وجود دارد؛ بدون برند
   *      می‌شوند.» — the number comes from the row the server sent, so it is right
   *      on any page of a search.
   *   2. «لغو» resolves false and returns here: no request, no toast, no reload.
   *   3. «حذف» calls `DELETE /brands/6`; the mock unbrands those two products and
   *      answers `{ movedProducts: 2 }`.
   *   4. Success toasts, steps the page back when the last row of page 2 is gone,
   *      and refetches — the row and its products' brand both leave the screen.
   */
  async removeBrand(item: BrandListItem): Promise<void> {
    const products =
      item.productCount > 0
        ? ` ${item.productCount} محصول با این برند وجود دارد؛ بدون برند می‌شوند.`
        : '';

    const confirmed = await this.confirm.confirm({
      message: `آیا از حذف «${item.name}» مطمئن هستید؟${products}`,
      header: 'حذف برند',
      acceptLabel: 'حذف',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    this.brands.remove(item.id).subscribe({
      next: () => {
        this.toast.success('برند حذف شد.');

        // A deleted last row leaves the page empty; step back instead of
        // showing «صفحه ۳ از ۲» (the products list learned this the hard way).
        if (this.rows()?.length === 1 && this.page() > 1) {
          this.page.update((page) => page - 1);
        }

        this.load();
      },
      error: () => this.load(),
    });
  }

  /** One row's badge changes without a refetch; everything else stays put. */
  private patchRow(id: BrandListItem['id'], isActive: boolean): void {
    this.rows.update((rows) =>
      rows === null
        ? rows
        : rows.map((row) => (String(row.id) === String(id) ? { ...row, isActive } : row)),
    );
  }
}
