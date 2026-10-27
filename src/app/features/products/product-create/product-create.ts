import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { AbstractControl } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastService } from '@core/services/toast';
import { PageHeader } from '@shared/components/page-header/page-header';
import type { SelectOption } from '@shared/models';
import { PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { PrimeTemplate } from 'primeng/api';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';

import type { ProductBrandOption, ProductStatus } from '../models/product.model';
import { createImageArray, revokeImageUrl } from '../product-gallery/gallery-form';
import { ProductGalleryUploader } from '../product-gallery/product-gallery-uploader';
import { STOCK_LEVEL_META, stockLevel } from '../product-stock';
import { ProductVariantEditor } from '../product-variants/product-variant-editor';
import { createVariantArray, sumVariantStock } from '../product-variants/variant-form';
import { ProductLookupsService } from '../services/product-lookups.service';

import { buildCategoryOptions } from './category-options';
import type { CategoryOption } from './category-options';
import { slugify } from './product-slug';
import {
  SHORT_DESCRIPTION_MAX,
  fieldError,
  nonNegativeNumberValidator,
  positivePriceValidator,
  productNameValidator,
  productSlugValidator,
  shortDescriptionValidator,
} from './product-validators';
import type { ProductField } from './product-validators';

/** The four sections of the create form (BO-F07). */
type ProductTabId = 'main' | 'variants' | 'gallery' | 'inventory';

interface ProductTab {
  readonly id: ProductTabId;
  readonly label: string;
  readonly icon: string;
}

const TABS: readonly ProductTab[] = [
  { id: 'main', label: 'اطلاعات اصلی', icon: 'pi pi-info-circle' },
  { id: 'variants', label: 'واریانت‌ها', icon: 'pi pi-box' },
  { id: 'gallery', label: 'گالری تصاویر', icon: 'pi pi-images' },
  { id: 'inventory', label: 'موجودی', icon: 'pi pi-warehouse' },
];

// Mutable array: PrimeNG's `[options]` input is typed `any[]`, and a readonly
// one fails template type-checking (TS4104).
const STATUS_OPTIONS: SelectOption<ProductStatus>[] = [
  { value: 'published', label: 'منتشر شده' },
  { value: 'draft', label: 'پیش‌نویس' },
  { value: 'inactive', label: 'غیرفعال' },
];

/** The short-description limit is enforced by `shortDescriptionValidator`. */

/**
 * The inventory tab's numbers (BO-F12).
 *
 * `total` is what the form will send as `stock`, `threshold` is the warning line
 * the user edits, and `derived` says where `total` came from — the variant rows
 * or the manual field. The tab prints them together so the screen has ONE stock
 * number (tc 9) instead of a manual field that disagrees with the variant list.
 */
interface InventorySnapshot {
  readonly total: number;
  readonly threshold: number;
  readonly derived: boolean;
}

/**
 * Products create page — `/products/new` (BO-F07).
 *
 * ONE FormGroup, FOUR TABS
 * ------------------------
 * Every tab binds to the SAME `form` object; switching a tab only changes the
 * `activeTab` signal, so a value entered in «اطلاعات اصلی» is still there after
 * a trip to «موجودی» (tc 3). `variants` is the live BO-F10 array and `images`
 * the live BO-F11 gallery array. Both live on the central group, which is what
 * lets it "cover every tab" (tc 2).
 *
 * TRACE — a user creates «لپ‌تاپ ایسوس»:
 *
 *   1. `/products/new` mounts `ProductCreate`; `form` is pristine and the first
 *      tab is active.
 *   2. The user types the name. `name.valueChanges` calls `slugify`, which maps
 *      the Persian words through the dictionary and writes `laptop-asus` to the
 *      slug control (tc 8). Typing in the slug field sets `slugEdited`, so a
 *      later name edit no longer overwrites a manual slug.
 *   3. The user picks a category and a price. `next()` validates only the
 *      controls owned by the current tab; an empty name/price keeps the tab open
 *      and marks those controls touched (tc 4).
 *   4. The variants tab hosts the real BO-F10 editor and the gallery tab the
 *      real BO-F11 uploader — both receive THEIR array from this page and never
 *      build their own. The inventory tab edits `stock` and `lowStockThreshold`
 *      on the same group (tc 2/3).
 *   5. The back link or the sidebar triggers `unsavedProductChangesGuard`: if
 *      `form.dirty`, `ConfirmService` asks before leaving (tc 7). A browser
 *      refresh is covered by the `beforeunload` listener.
 *   6. «ذخیره» marks every control touched and, while the form is incomplete,
 *      reports the errors instead of navigating. The real POST is BO-F13.
 *
 * WHY NO `p-tabs`
 * ---------------
 * The Arino form is a card with its own strip, not PrimeNG's surface. A small
 * `role=tablist` built from the `TABS` array keeps the look and is testable
 * without a component harness; the panels are plain `@if` branches.
 */
@Component({
  selector: 'app-product-create',
  imports: [
    PageHeader,
    InputText,
    PersianDigitsPipe,
    ProductGalleryUploader,
    ProductVariantEditor,
    ReactiveFormsModule,
    RouterLink,
    Select,
    Textarea,
    PrimeTemplate,
  ],
  templateUrl: './product-create.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCreate {
  private readonly lookups = inject(ProductLookupsService);

  private readonly fb = inject(FormBuilder);

  private readonly toast = inject(ToastService);

  private readonly destroyRef = inject(DestroyRef);

  /**
   * The central form.
   *
   * `variants` is a real FormArray with the min-one validator (BO-F10) and
   * `images` a real one without any (a gallery is optional, BO-F11); each row
   * is its own FormGroup and the tab editors mutate these same arrays.
   */
  readonly form = this.fb.nonNullable.group({
    name: ['', productNameValidator],
    slug: ['', productSlugValidator],
    sku: [''],
    categoryId: ['', Validators.required],
    brandId: [''],
    shortDescription: ['', shortDescriptionValidator],
    description: [''],
    price: [0, positivePriceValidator],
    stock: [0, nonNegativeNumberValidator],
    lowStockThreshold: [5, nonNegativeNumberValidator],
    status: ['draft' as ProductStatus, Validators.required],
    variants: createVariantArray(this.fb),
    images: createImageArray(this.fb),
  });

  /** Guarantees the FormArray is visible to the template and to BO-F10/F11. */
  get variants(): FormArray<FormGroup> {
    return this.form.controls.variants;
  }

  get images(): FormArray<FormGroup> {
    return this.form.controls.images;
  }

  /**
   * Categories with their full path, built from the cached lookup (BO-F09).
   * Loading/error are separate signals so the field can show a spinner or a
   * retry without hiding the rest of the form.
   */
  readonly categoryOptions = computed<CategoryOption[]>(() => [
    ...buildCategoryOptions(this.lookups.categories()),
  ]);

  readonly categoriesLoading = this.lookups.categoriesLoading;

  readonly categoriesError = this.lookups.categoriesError;

  readonly brands = this.lookups.brands;

  /**
   * The brand select needs a real empty option, not a clear icon: the control is
   * non-nullable (`''` means "no brand"), and a clear icon would write `null`
   * into a non-nullable control. The sentinel keeps the value a string.
   */
  readonly brandOptions = computed<ProductBrandOption[]>(() => [
    { id: '', name: 'بدون برند', logo: null },
    ...this.lookups.brands(),
  ]);

  readonly brandsLoading = this.lookups.brandsLoading;

  readonly brandsError = this.lookups.brandsError;

  readonly tabs: readonly ProductTab[] = TABS;

  readonly activeTab = signal<ProductTabId>('main');

  readonly activeIndex = computed(() => this.tabs.findIndex((tab) => tab.id === this.activeTab()));

  readonly isLastTab = computed(() => this.activeIndex() === this.tabs.length - 1);

  readonly statusOptions = STATUS_OPTIONS;

  /**
   * The inventory tab's live snapshot (BO-F12).
   *
   * A signal rather than a computed because it reads `FormArray.controls`, which
   * is a plain mutable array — Angular does not track it. `syncInventory` is the
   * one writer, called on every form change and once at construction.
   */
  readonly inventory = signal<InventorySnapshot>({ total: 0, threshold: 0, derived: false });

  /** The level of the total against the threshold — the same rule the list uses. */
  readonly inventoryLevel = computed(() =>
    stockLevel(this.inventory().total, this.inventory().threshold),
  );

  /**
   * Persian label + pill class for `inventoryLevel` (tc 9).
   *
   * A computed, not a field: its body runs on first read, so `STOCK_LEVEL_META`
   * is initialised by then even when the bundler puts it in a shared chunk.
   */
  readonly inventoryStatus = computed(() => STOCK_LEVEL_META[this.inventoryLevel()]);

  /**
   * A getter, not a field: `SHORT_DESCRIPTION_MAX` is a runtime import shared
   * with the eager spec bundle; a field initialiser could run before that module
   * is ready (the same hazard as `TOMAN_UNIT`).
   */
  get shortDescriptionMax(): number {
    return SHORT_DESCRIPTION_MAX;
  }

  /** True once the user edits the slug by hand; stops the name→slug sync. */
  private slugEdited = false;

  /**
   * A value-level dirty flag. `form.dirty` only turns on for user edits; an
   * edit page that seeds values programmatically, or a test that calls
   * `setValue`, needs the guard to see the change too.
   */
  private readonly hasChanges = signal(false);

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.hasChanges.set(true);
      this.syncInventory();
    });

    this.form.controls.name.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((name) => {
        if (this.slugEdited) {
          return;
        }

        this.form.controls.slug.setValue(slugify(name), { emitEvent: false });
      });

    /**
     * The gallery rows point at `blob:` object URLs (BO-F11). The PAGE owns the
     * array, so the PAGE releases them: the gallery panel is an `@if`, and
     * revoking in the uploader's own destroy hook would kill live previews on
     * every tab switch. Only `blob:` strings are touched, so BO-F14's server
     * URLs pass through untouched.
     */
    this.destroyRef.onDestroy(() => {
      for (const group of this.images.controls) {
        revokeImageUrl(group);
      }
    });

    this.syncInventory();
  }

  /**
   * Keep `inventory` (and the `stock` control) in step with the variant rows.
   *
   * tc 4: once a product has variants, its total is the SUM of their stock — a
   * hand-typed product-level number would contradict the rows the user is looking
   * at. Writing the sum back into `stock` with `emitEvent: false` is what makes
   * BO-F13's payload correct without a second derivation, and it cannot loop: the
   * write emits no value change, and a repeat emit would only rewrite the same
   * number.
   *
   * Zero rows means the manual field is the source of truth again, so the value
   * the user typed survives adding and deleting the first variant row.
   *
   * TRACE — the user adds two rows («SONY-BLK» stock 4, «SONY-WHT» stock 6) to a
   * form whose threshold is 5:
   *
   *   1. The second `push` emits `form.valueChanges` (once per row).
   *   2. `derived` = true, `sumVariantStock` = 4 + 6 = 10.
   *   3. `stock` is 0, so it is written to 10 with `emitEvent: false` — no second
   *      value change, no dirty flag, no loop.
   *   4. `inventory` = `{ total: 10, threshold: 5, derived: true }`; the tab shows a
   *      read-only 10, «منبع موجودی: واریانت‌ها» and the «موجود» pill.
   *   5. Deleting both rows flips `derived` back to false and leaves 10 in the
   *      editable field, which is what F13 will send.
   */
  private syncInventory(): void {
    const derived = this.variants.length > 0;
    const total = derived ? sumVariantStock(this.variants) : this.form.controls.stock.value;

    if (derived && this.form.controls.stock.value !== total) {
      this.form.controls.stock.setValue(total, { emitEvent: false });
    }

    this.inventory.set({ total, threshold: this.form.controls.lowStockThreshold.value, derived });
  }

  /** A manual edit wins over the generated slug (tc 8). */
  onSlugInput(): void {
    this.slugEdited = true;
  }

  /** Retry the category lookup after a failed request (BO-F09 tc 9). */
  retryCategories(): void {
    this.lookups.reloadCategories();
  }

  /** Retry the brand lookup after a failed request. */
  retryBrands(): void {
    this.lookups.reloadBrands();
  }

  /**
   * Switch tabs. Moving FORWARD validates the current tab first; moving back is
   * always allowed so the user can return to a field they already touched.
   */
  selectTab(tab: ProductTabId): void {
    const next = this.tabs.findIndex((item) => item.id === tab);
    const current = this.activeIndex();

    if (next === current) {
      return;
    }

    if (next > current && !this.isTabValid(this.activeTab())) {
      this.touchTab(this.activeTab());
      return;
    }

    this.activeTab.set(tab);
  }

  next(): void {
    const index = this.activeIndex();

    if (index >= this.tabs.length - 1) {
      return;
    }

    if (!this.isTabValid(this.activeTab())) {
      this.touchTab(this.activeTab());
      return;
    }

    this.activeTab.set(this.tabs[index + 1].id);
  }

  previous(): void {
    const index = this.activeIndex();

    if (index > 0) {
      this.activeTab.set(this.tabs[index - 1].id);
    }
  }

  /**
   * BO-F13 owns the POST. Until it lands, the button still validates everything
   * and tells the user what is missing instead of silently doing nothing.
   */
  save(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      // The user may be on «اطلاعات اصلی» while the only problem is an empty
      // variants tab. Move them to the tab that actually blocks the save, but
      // never skip a broken main tab to do it.
      if (this.isTabValid('main') && this.form.controls.variants.invalid) {
        this.activeTab.set('variants');
      }

      this.toast.info('لطفاً خطاهای فرم را برطرف کنید.');
      return;
    }

    this.toast.info('ثبت محصول در BO-F13 فعال می‌شود.');
  }

  /** Read by the route's CanDeactivate guard (BO-F07 tc 7). */
  hasUnsavedChanges(): boolean {
    return this.hasChanges() || this.form.dirty;
  }

  /** Covers refresh/close; the guard covers in-app navigation. */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.hasUnsavedChanges()) {
      return;
    }

    event.preventDefault();
    event.returnValue = '';
  }

  /**
   * First visible message for a field (BO-F08). `fieldError` hides it until the
   * control is touched, so an untouched form is not a wall of red (tc 9).
   */
  errorFor(field: ProductField): string | null {
    return fieldError(field, this.form.controls[field]);
  }

  /**
   * Map a server validation envelope onto the form (tc 7).
   *
   * BO-F13 will call this with `ApiError.fields`: `{ slug: ['این نامک تکراری
   * است.'] }` puts the message under the slug input. Editing the control runs
   * the validators again, which replaces the `server` key (tc 10).
   */
  applyServerErrors(fields: Readonly<Record<string, readonly string[]>> | undefined): void {
    if (!fields) {
      return;
    }

    for (const [name, messages] of Object.entries(fields)) {
      const control = this.form.get(name);
      const message = messages[0];

      if (!control || !message) {
        continue;
      }

      control.setErrors({ ...(control.errors ?? {}), server: message });
      control.markAsTouched();
    }
  }

  private isTabValid(tab: ProductTabId): boolean {
    return this.controlsFor(tab).every((control) => control.valid);
  }

  private touchTab(tab: ProductTabId): void {
    this.controlsFor(tab).forEach((control) => control.markAsTouched());
  }

  private controlsFor(tab: ProductTabId): readonly AbstractControl[] {
    const controls = this.form.controls;

    switch (tab) {
      case 'main':
        return [controls.name, controls.slug, controls.categoryId, controls.price, controls.status];
      case 'variants':
        return [controls.variants];
      case 'gallery':
        return [controls.images];
      case 'inventory':
        return [controls.stock, controls.lowStockThreshold];
    }
  }
}
