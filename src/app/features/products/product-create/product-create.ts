import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { AbstractControl } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastService } from '@core/services/toast';
import { PageHeader } from '@shared/components/page-header/page-header';
import { PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { catchError, of } from 'rxjs';

import type {
  ProductBrandOption,
  ProductCategoryOption,
  ProductStatus,
} from '../models/product.model';
import { ProductsService } from '../services/products.service';

import { slugify } from './product-slug';

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

const STATUS_OPTIONS: readonly { value: ProductStatus; label: string }[] = [
  { value: 'published', label: 'منتشر شده' },
  { value: 'draft', label: 'پیش‌نویس' },
  { value: 'inactive', label: 'غیرفعال' },
];

/** The short-description limit is shown in the counter and enforced by the validator. */
const SHORT_DESCRIPTION_MAX = 160;

/**
 * Products create page — `/products/new` (BO-F07).
 *
 * ONE FormGroup, FOUR TABS
 * ------------------------
 * Every tab binds to the SAME `form` object; switching a tab only changes the
 * `activeTab` signal, so a value entered in «اطلاعات اصلی» is still there after
 * a trip to «موجودی» (tc 3). The `variants` and `images` FormArrays are created
 * now even though BO-F10/F11 fill them, which is what lets the central group
 * "cover every tab" (tc 2).
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
 *   4. The variants/gallery tabs render placeholders; the inventory tab edits
 *      `stock` and `lowStockThreshold` on the same group (tc 2/3).
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
  imports: [PageHeader, ReactiveFormsModule, RouterLink, PersianDigitsPipe],
  templateUrl: './product-create.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCreate {
  private readonly productsService = inject(ProductsService);

  private readonly fb = inject(FormBuilder);

  private readonly toast = inject(ToastService);

  private readonly destroyRef = inject(DestroyRef);

  /**
   * The central form. The `variants`/`images` arrays are deliberately empty
   * until BO-F10/F11; they exist so the shape of the payload is stable now.
   */
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    sku: [''],
    categoryId: ['', Validators.required],
    brandId: [''],
    shortDescription: ['', Validators.maxLength(SHORT_DESCRIPTION_MAX)],
    description: [''],
    price: [0, [Validators.required, Validators.min(1)]],
    stock: [0, [Validators.min(0)]],
    lowStockThreshold: [5, [Validators.min(0)]],
    status: ['draft' as ProductStatus, Validators.required],
    variants: this.fb.array<FormGroup>([]),
    images: this.fb.array<FormGroup>([]),
  });

  /** Guarantees the FormArray is visible to the template and to BO-F10/F11. */
  get variants(): FormArray<FormGroup> {
    return this.form.controls.variants;
  }

  get images(): FormArray<FormGroup> {
    return this.form.controls.images;
  }

  readonly categories = toSignal(
    this.productsService
      .categories()
      .pipe(catchError(() => of<readonly ProductCategoryOption[]>([]))),
    { initialValue: [] as readonly ProductCategoryOption[] },
  );

  readonly brands = toSignal(
    this.productsService.brands().pipe(catchError(() => of<readonly ProductBrandOption[]>([]))),
    { initialValue: [] as readonly ProductBrandOption[] },
  );

  readonly tabs: readonly ProductTab[] = TABS;

  readonly activeTab = signal<ProductTabId>('main');

  readonly activeIndex = computed(() => this.tabs.findIndex((tab) => tab.id === this.activeTab()));

  readonly isLastTab = computed(() => this.activeIndex() === this.tabs.length - 1);

  readonly statusOptions = STATUS_OPTIONS;

  readonly shortDescriptionMax = SHORT_DESCRIPTION_MAX;

  /** True once the user edits the slug by hand; stops the name→slug sync. */
  private slugEdited = false;

  /**
   * A value-level dirty flag. `form.dirty` only turns on for user edits; an
   * edit page that seeds values programmatically, or a test that calls
   * `setValue`, needs the guard to see the change too.
   */
  private readonly hasChanges = signal(false);

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.hasChanges.set(true));

    this.form.controls.name.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((name) => {
        if (this.slugEdited) {
          return;
        }

        this.form.controls.slug.setValue(slugify(name), { emitEvent: false });
      });
  }

  /** A manual edit wins over the generated slug (tc 8). */
  onSlugInput(): void {
    this.slugEdited = true;
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
