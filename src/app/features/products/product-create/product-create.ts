import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '@core/services/toast';
import { PageHeader } from '@shared/components/page-header/page-header';
import { LoadingDirective } from '@shared/directives/loading.directive';
import { ApiError } from '@shared/models';
import type { SelectOption } from '@shared/models';
import { PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { slugify } from '@shared/utils/slugify';
import { PrimeTemplate } from 'primeng/api';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import type { Observable } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap, take } from 'rxjs';

import type {
  Product,
  ProductBrandOption,
  ProductStatus,
  SlugCheck,
} from '../models/product.model';
import type { ProductEditResult } from '../product-edit/product-edit.resolver';
import {
  createImageArray,
  createImageGroup,
  revokeImageUrl,
} from '../product-gallery/gallery-form';
import { ProductGalleryUploader } from '../product-gallery/product-gallery-uploader';
import { STOCK_LEVEL_META, stockLevel } from '../product-stock';
import { ProductVariantEditor } from '../product-variants/product-variant-editor';
import {
  createVariantArray,
  createVariantGroup,
  sumVariantStock,
} from '../product-variants/variant-form';
import { ProductLookupsService } from '../services/product-lookups.service';
import { ProductsService } from '../services/products.service';

import { buildCategoryOptions } from './category-options';
import type { CategoryOption } from './category-options';
import { toCreateProductDto } from './product-payload';
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

/**
 * How long the slug field waits before asking the server about uniqueness
 * (BO-F16). 400 ms is longer than the 300 ms search debounce on the list: a slug
 * is typed in bursts, and every keystroke in it would otherwise be a request.
 */
const SLUG_DEBOUNCE_MS = 400;

/** How long «کپی شد» stays on the copy button before it becomes a copy icon again. */
const SLUG_COPY_FEEDBACK_MS = 1500;

/** What the slug field knows at the moment. */
type SlugStatus = 'idle' | 'checking' | 'free' | 'taken' | 'error';

/**
 * One answer from the uniqueness check.
 *
 * Three outcomes instead of `SlugCheck | null`, because `null` would have to
 * mean both "nothing to check" and "the check failed", and the field shows a
 * different sentence for each.
 */
type SlugCheckResult =
  | { readonly kind: 'skip' }
  | { readonly kind: 'error' }
  | { readonly kind: 'done'; readonly check: SlugCheck };

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
    LoadingDirective,
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

  private readonly products = inject(ProductsService);

  private readonly router = inject(Router);

  private readonly fb = inject(FormBuilder);

  private readonly toast = inject(ToastService);

  private readonly destroyRef = inject(DestroyRef);

  /**
   * The edit route's resolved data (BO-F14); `null` on `/products/new`.
   *
   * Bound from the router's `resolve: { edit: productEditResolver }` through
   * `withComponentInputBinding()`. It is a WRAPPER because the page has three
   * inputs to tell apart: create (null), a product to hydrate, and a load that
   * failed (tc 6).
   */
  readonly edit = input<ProductEditResult | null>(null);

  readonly isEdit = computed(() => this.edit() !== null);

  /** The product being edited, or null on the create route / after a failed load. */
  readonly editedProduct = computed<Product | null>(() => {
    const result = this.edit();

    return result && 'product' in result ? result.product : null;
  });

  /** The sentence the error block prints when the resolver could not load (tc 6). */
  readonly loadError = computed<string | null>(() => {
    const result = this.edit();

    return result && 'error' in result ? result.error : null;
  });

  readonly pageTitle = computed(() => (this.isEdit() ? 'ویرایش محصول' : 'افزودن محصول'));

  readonly pageDescription = computed(() =>
    this.isEdit() ? 'اطلاعات کالای انتخابی را تغییر دهید' : 'محصول جدید را به فروشگاه اضافه کنید',
  );

  readonly saveLabel = computed(() => (this.isEdit() ? 'ذخیره تغییرات' : 'ذخیره محصول'));

  /**
   * The live uniqueness state of the slug field (BO-F16).
   *
   * TRACE — the user types `sony-wh1000` which already exists:
   *
   *   1. `slug.valueChanges` → 400 ms of quiet → `verifySlug('sony-wh1000')`.
   *   2. `GET /products/slug-check?slug=sony-wh1000` (plus `excludeId` in edit
   *      mode) answers `{ available: false, suggestion: 'sony-wh1000-2' }`.
   *   3. `slugStatus` = `taken`, `slugSuggestion` = `'sony-wh1000-2'`; the field
   *      prints «این نامک قابل استفاده نیست» and a button with the suggestion.
   *   4. Clicking the button writes the suggestion into the control, which
   *      re-runs the check and ends at `free`.
   */
  readonly slugStatus = signal<SlugStatus>('idle');

  /** The server's alternative while the typed slug is taken; `null` otherwise. */
  readonly slugSuggestion = signal<string | null>(null);

  /** True for a moment after the copy button succeeds. */
  readonly slugCopied = signal(false);

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
   * True while the POST is in flight (BO-F13 tc 4).
   *
   * The submit buttons bind this through `pLoading`, which sets the native
   * `disabled` — a keyboard user must not be able to fire the same create twice.
   */
  readonly submitting = signal(false);

  /**
   * The message under the form when a save failed in a way the fields cannot
   * explain (tc 5). A validation failure fills the controls instead; this is the
   * network/server case, where «تلاش دوباره» is the only useful action.
   */
  readonly saveError = signal<string | null>(null);

  /**
   * Set once the POST answered. It switches the unsaved-changes guard OFF for
   * the navigation to the edit page (tc 2) — and only for that: a failed save
   * leaves it false, so a user who typed a lot is still protected (tc 7).
   */
  private readonly saved = signal(false);

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

        this.form.controls.slug.setValue(slugify(name));
      });

    /**
     * Slug uniqueness, debounced (BO-F16).
     *
     * `switchMap` cancels the previous request, so a fast typist can never be
     * told "free" by an answer that arrived for an older value.
     */
    this.form.controls.slug.valueChanges
      .pipe(
        debounceTime(SLUG_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((slug) => this.verifySlug(slug)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => this.applySlugCheck(result));

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

    /**
     * Hydrate once the route hands over a product (BO-F14).
     *
     * An effect, not constructor code: `edit` is an input, so its value is set
     * by the router AFTER construction. The guard `if (product)` makes it a
     * no-op on the create route and after a failed load.
     */
    effect(() => {
      const product = this.editedProduct();

      if (product) {
        this.hydrate(product);
      }
    });
  }

  /**
   * Fill every tab from one resolved product (tc 1-4).
   *
   * TRACE — the resolver returned `GET /products/7`:
   *
   *   1. `slugEdited = true` BEFORE touching the name: a saved slug is data. If
   *      the name→slug watcher were still armed, renaming the product would
   *      silently rewrite the URL and break every existing link.
   *   2. `patchValue` fills the main tab, price, status, stock and threshold.
   *   3. `variants.clear()` then one `createVariantGroup` per row with a seed —
   *      the same factory the «افزودن» button uses, so a hydrated row and a
   *      typed row cannot drift apart.
   *   4. `images.clear()` then one `createImageGroup` per server image. These
   *      URLs are http(s), not `blob:`, so the destroy hook leaves them alone.
   *   5. `syncInventory()` recomputes the tab's total from the rows, then the
   *      form is marked pristine and `hasChanges` cleared — otherwise the
   *      unsaved-changes guard would ask before letting the user leave a page
   *      they have not edited yet.
   */
  private hydrate(product: Product): void {
    this.slugEdited = true;

    this.form.patchValue({
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      categoryId: product.categoryId,
      brandId: product.brandId ?? '',
      shortDescription: product.shortDescription,
      description: product.description,
      price: product.price,
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
      status: product.status,
    });

    this.variants.clear();
    for (const variant of product.variants) {
      this.variants.push(
        createVariantGroup(this.fb, {
          basePrice: product.price,
          seed: {
            sku: variant.sku,
            attributes: variant.attributes,
            price: variant.price,
            stock: variant.stock,
            imageUrl: variant.imageUrl,
          },
        }),
      );
    }

    this.images.clear();
    for (const image of product.images) {
      this.images.push(
        createImageGroup(this.fb, {
          url: image.url,
          alt: image.alt,
          isPrimary: image.isPrimary,
        }),
      );
    }

    this.syncInventory();
    this.form.markAsPristine();
    this.hasChanges.set(false);
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

  /**
   * Take the server's suggestion in one click (BO-F16 tc 4).
   *
   * Writing the value triggers the debounced check again, so the field ends on
   * «آزاد» instead of keeping a stale red line.
   *
   * TRACE — the field says «قبلاً استفاده شده» with `suggestion = 'sony-2'`:
   *
   *   1. The method reads the suggestion signal; with none it returns (the state
   *      is then «checking» or «free», where the button does not render).
   *   2. `slugEdited = true` — from here on the name field may not overwrite the
   *      slug, exactly as if the user had typed it.
   *   3. `setValue('sony-2')` emits `valueChanges`, the debounce waits 400 ms and
   *      `verifySlug` asks again; this time the server answers `available: true`
   *      and the amber line becomes the green one.
   */
  useSlugSuggestion(): void {
    const suggestion = this.slugSuggestion();

    if (!suggestion) {
      return;
    }

    this.slugEdited = true;
    this.form.controls.slug.setValue(suggestion);
  }

  /**
   * Copy the slug to the clipboard (tc 10).
   *
   * The clipboard API can be missing (older browsers) or blocked (a non-secure
   * context, permissions) — both reject/throw, and neither is worth an error
   * message: the slug is right there, selectable. The button just does not flip.
   */
  async copySlug(): Promise<void> {
    const slug = this.form.controls.slug.value;

    if (slug === '') {
      return;
    }

    try {
      await navigator.clipboard.writeText(slug);
      this.slugCopied.set(true);
      setTimeout(() => this.slugCopied.set(false), SLUG_COPY_FEEDBACK_MS);
    } catch {
      this.slugCopied.set(false);
    }
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
   * Validate, POST, then route to the created product (BO-F13).
   *
   * TRACE — the user clicks «ذخیره محصول» on «هدفون سونی»:
   *
   *   1. `submitting()` is false, so the guard against a second click passes.
   *   2. Every control is marked touched. An invalid form moves the user to the
   *      tab that blocks it and stops here — no request, no toast about saving.
   *   3. `submitting` = true → both buttons show the spinner and are disabled.
   *   4. `toCreateProductDto(form)` builds the body (see `product-payload.ts`).
   *   5. 201 → `saved` = true, success toast, navigate to `/products/{id}/edit`.
   *      The navigation is allowed even though the form is dirty, because the
   *      guard reads `saved`.
   *   6. 422 `{ fields: { slug: ['تکراری'] } }` → the message lands on the slug
   *      control, the main tab opens (that is where the field lives), the
   *      message is also kept for the banner, and NOTHING is reset — a second
   *      click resends the same values plus the correction (tc 3/7).
   *   7. Network/500 → the interceptor has already toasted it; this sets the
   *      retry sentence and leaves the form untouched (tc 5).
   *
   * A validation failure is not toasted by the interceptor, which is why tc 3's
   * message is visible exactly once: under the field.
   */
  save(): void {
    if (this.submitting()) {
      return;
    }

    // A retry must be judged by the local rules, not by the message the previous
    // attempt left behind: a `server` error keeps the control invalid, so
    // without this a resubmit after a 422 could never leave the page (tc 7).
    this.clearServerErrors();
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

    this.submitting.set(true);
    this.saveError.set(null);

    const editing = this.editedProduct();
    const request = editing
      ? this.products.update(editing.id, toCreateProductDto(this.form))
      : this.products.create(toCreateProductDto(this.form));

    request.pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (product) => {
        this.submitting.set(false);

        if (editing) {
          // Stay on the page and make the current values the new baseline: a
          // second save without changes is legal (tc 10) and leaving the page
          // must not ask about edits that are already stored (tc 7).
          this.form.markAsPristine();
          this.hasChanges.set(false);
          this.toast.success('محصول به‌روزرسانی شد.');
          return;
        }

        this.saved.set(true);
        this.toast.success('محصول با موفقیت ایجاد شد.');
        void this.router.navigate(['/products', product.id, 'edit']);
      },
      error: (error: unknown) => {
        this.submitting.set(false);

        if (error instanceof ApiError && error.isValidation) {
          this.applyServerErrors(error.fields);
          this.saveError.set(error.message);
          this.activeTab.set(this.tabOwningField(error.fields));

          return;
        }

        this.saveError.set('ارسال محصول ناموفق بود. اتصال خود را بررسی و دوباره تلاش کنید.');
      },
    });
  }

  /**
   * Re-run the route's resolver after a failed load (tc 6).
   *
   * Both halves are required: `onSameUrlNavigation: 'reload'` stops the router
   * from dropping a navigation to the URL it is already on, and the route's
   * `runGuardsAndResolvers: 'always'` stops it from reusing the cached `edit`
   * data. Miss either one and the button silently does nothing.
   *
   * TRACE — the product page failed with a 500 and the user clicks «تلاش دوباره»:
   *
   *   1. `router.url` is `/products/7/edit`; `navigateByUrl` is called with it and
   *      `onSameUrlNavigation: 'reload'`, so the router does not skip it as a
   *      same-URL navigation.
   *   2. Because the route declares `runGuardsAndResolvers: 'always'`, guards and
   *      the resolver run again instead of replaying the stored `edit` value.
   *   3. The resolver's `GET /products/7` answers 200 this time → `{ product }`
   *      → `hydrate()` → the form appears. A repeat failure keeps the same block.
   */
  reload(): void {
    void this.router.navigateByUrl(this.router.url, { onSameUrlNavigation: 'reload' });
  }

  /** Read by the route's CanDeactivate guard (BO-F07 tc 7). */
  hasUnsavedChanges(): boolean {
    return !this.saved() && (this.hasChanges() || this.form.dirty);
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
   * Server field messages, kept OUTSIDE the controls (BO-F13 tc 3).
   *
   * `control.setErrors({ server: … })` alone does not survive: switching a tab
   * re-creates the panel, `formControlName` re-registers and re-validates, and
   * the marker is gone — the user sees a 422 flash and then a clean field. The
   * map is the durable copy `errorFor()` reads; each entry removes itself on the
   * control's first value change, so correcting the field clears the message
   * exactly like a local error (BO-F08 tc 10).
   */
  readonly serverMessages = signal<Readonly<Record<string, string>>>({});

  /**
   * First visible message for a field (BO-F08). `fieldError` hides it until the
   * control is touched, so an untouched form is not a wall of red (tc 9).
   *
   * The server copy wins: it is more specific than «required», and it is the one
   * that can survive a tab switch.
   */
  errorFor(field: ProductField): string | null {
    return this.serverMessages()[field] ?? fieldError(field, this.form.controls[field]);
  }

  /**
   * Map a server validation envelope onto the form (BO-F08 tc 7, BO-F13 tc 3).
   *
   * TRACE — the API answers `422 { error: { code: 'VALIDATION',
   * fields: { slug: ['این نامک قبلاً استفاده شده است.'] } } }`:
   *
   *   1. `control = form.get('slug')`; the first message is taken (the panel
   *      shows one sentence per field, not a list).
   *   2. `setErrors({ server })` keeps the F08 contract: anything that reads
   *      `control.errors` sees the key, and `ApiError.fields` is not the only
   *      copy.
   *   3. `markAsTouched()` makes the message visible without the user leaving the
   *      input (an untouched control is silent by design).
   *   4. `serverMessages` records the sentence. This is the copy that survives a
   *      tab switch: re-creating the panel re-registers `formControlName`, which
   *      re-runs validators and wipes step 2 — the map is what `errorFor()`
   *      reads first.
   *   5. The first `valueChanges` deletes the entry: correcting the value clears
   *      the message exactly like a local error (F08 tc 10), and a second
   *      `valueChanges` cannot resurrect it because the subscription is `take(1)`.
   *
   * BO-F13 calls this with `ApiError.fields`; the caller then opens the tab that
   * owns the field, so step 3 is not wasted on a hidden control.
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
      this.serverMessages.update((current) => ({ ...current, [name]: message }));

      // Correction clears it. `take(1)` so one edit per message; the map entry is
      // also what `errorFor` prints, and the control's own validators re-run.
      control.valueChanges.pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.serverMessages.update((current) => {
          if (!(name in current)) {
            return current;
          }

          const next = { ...current };
          delete next[name];
          return next;
        });
      });
    }
  }

  private isTabValid(tab: ProductTabId): boolean {
    return this.controlsFor(tab).every((control) => control.valid);
  }

  /**
   * Ask the server whether `slug` is free, or skip when there is nothing to ask.
   *
   * Local validity comes first: an empty or malformed slug already has its own
   * red message from the validator, and asking the API about it would only add a
   * spinner beside it.
   */
  private verifySlug(slug: string): Observable<SlugCheckResult> {
    const value = slug.trim();

    if (value === '' || this.form.controls.slug.invalid) {
      return of<SlugCheckResult>({ kind: 'skip' });
    }

    this.slugStatus.set('checking');

    return this.products.checkSlug(value, this.editedProduct()?.id ?? null).pipe(
      map((check): SlugCheckResult => ({ kind: 'done', check })),
      catchError(() => of<SlugCheckResult>({ kind: 'error' })),
    );
  }

  /** Map one answer onto the two signals the template reads. */
  private applySlugCheck(result: SlugCheckResult): void {
    switch (result.kind) {
      case 'skip':
        this.slugStatus.set('idle');
        this.slugSuggestion.set(null);
        return;
      case 'error':
        this.slugStatus.set('error');
        this.slugSuggestion.set(null);
        return;
      case 'done':
        this.slugStatus.set(result.check.available ? 'free' : 'taken');
        this.slugSuggestion.set(result.check.available ? null : result.check.suggestion);
    }
  }

  /**
   * Remove the `server` key from every control, keeping the local errors.
   *
   * `applyServerErrors` writes that key, and Angular counts it as invalidity —
   * which is right while the user reads it, and wrong the moment they press save
   * again. Clearing it re-runs local validation against the current values; a
   * still-wrong field keeps its own error, and a merely server-rejected one goes
   * back to the API for another look.
   *
   * TRACE — after a 422 on the slug, the user presses «ذخیره محصول» again without
   * touching anything:
   *
   *   before: slug.errors = { server: '…قبلاً…' } → form.invalid → save() would
   *           stop at the "fix the errors" branch and never resend.
   *   visit:  the key is deleted and `setErrors(null)` runs (no local error is
   *           left on a slug that matches the pattern).
   *   after:  slug.valid again → the POST goes out a second time (tc 7).
   *
   * With the value still wrong locally (`'BAD SLUG'`), `setErrors` is followed by
   * the slug validator's own `pattern` error, so the form stays invalid and no
   * request is wasted.
   */
  private clearServerErrors(): void {
    this.serverMessages.set({});

    const visit = (control: AbstractControl): void => {
      if (control.errors && 'server' in control.errors) {
        const rest = { ...control.errors };
        delete rest['server'];
        control.setErrors(Object.keys(rest).length > 0 ? rest : null);
      }

      if (control instanceof FormGroup) {
        Object.values(control.controls).forEach((child) => visit(child as AbstractControl));
      } else if (control instanceof FormArray) {
        control.controls.forEach((child) => visit(child));
      }
    };

    visit(this.form);
  }

  /**
   * Which tab holds a field the server rejected (tc 3).
   *
   * Without this the error would land on a control the user cannot see: a slug
   * message on a hidden tab looks exactly like "nothing happened". The first
   * matching rule wins; anything unrecognised belongs to «اطلاعات اصلی», where
   * most fields live.
   */
  private tabOwningField(
    fields: Readonly<Record<string, readonly string[]>> | undefined,
  ): ProductTabId {
    const keys = Object.keys(fields ?? {});

    if (keys.some((key) => key.startsWith('variants'))) {
      return 'variants';
    }

    if (keys.some((key) => key.startsWith('images'))) {
      return 'gallery';
    }

    if (keys.some((key) => key === 'stock' || key === 'lowStockThreshold')) {
      return 'inventory';
    }

    return 'main';
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
