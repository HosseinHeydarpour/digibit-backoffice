import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { ApiError } from '@shared/models';
import { ConfirmationService, MessageService } from 'primeng/api';
import type { Observable } from 'rxjs';
import { of, Subject, throwError } from 'rxjs';

import type {
  CreateProductDto,
  Product,
  ProductBrandOption,
  ProductCategoryOption,
} from '../models/product.model';
import { ProductGalleryUploader } from '../product-gallery/product-gallery-uploader';
import { createVariantGroup } from '../product-variants/variant-form';
import { ProductsService } from '../services/products.service';

import { ProductCreate } from './product-create';

/** What the stub's `create` answers; only the id matters for the redirect. */
const CREATED: Product = {
  id: '42',
  name: 'هدفون سونی',
  slug: 'hdfon-sony',
  sku: 'SONY-WH1000-BLK',
  categoryId: '3',
  categoryName: 'لوازم برقی',
  brandId: null,
  brandName: null,
  shortDescription: '',
  description: '',
  price: 2_100_000,
  stock: 0,
  lowStockThreshold: 5,
  status: 'draft',
  images: [],
  variants: [],
  createdAt: 1_729_152_000_000,
};

/** A saved product with a variant and a gallery row, as the edit resolver hands it over. */
const EDITED: Product = {
  ...CREATED,
  id: '7',
  name: 'هدفون سونی',
  slug: 'sony-wh1000',
  stock: 4,
  lowStockThreshold: 5,
  variants: [
    {
      id: 'v-1',
      sku: 'SONY-BLK',
      attributes: { رنگ: 'مشکی' },
      price: 2_100_000,
      stock: 4,
      imageUrl: null,
    },
  ],
  images: [
    { id: 'img-1', url: '/images/products/1.jpg', alt: 'هدفون سونی', isPrimary: true, order: 1 },
  ],
};

const CATEGORIES: readonly ProductCategoryOption[] = [
  { id: '3', name: 'لوازم برقی', parentId: null, isActive: true },
  { id: '4', name: 'صوتی', parentId: '3', isActive: true },
  { id: '9', name: 'دستهٔ حذف‌شده', parentId: '3', isActive: false },
];

const BRANDS: readonly ProductBrandOption[] = [
  { id: '5', name: 'سونی', logo: '/mock/sony.png' },
  { id: '6', name: 'ریزر', logo: null },
];

class ProductsServiceStub {
  createCalls = 0;

  createError: unknown = null;

  updateCalls = 0;

  lastUpdateId: string | null = null;

  /** When set, `create` waits for this subject instead of answering at once. */
  pending: Subject<Product> | null = null;

  categories(): Observable<readonly ProductCategoryOption[]> {
    return of(CATEGORIES);
  }

  brands(): Observable<readonly ProductBrandOption[]> {
    return of(BRANDS);
  }

  create(dto: CreateProductDto): Observable<Product> {
    this.createCalls += 1;

    if (this.createError) {
      return throwError(() => this.createError);
    }

    return this.pending ?? of({ ...CREATED, name: dto.name });
  }

  update(id: string): Observable<Product> {
    this.updateCalls += 1;
    this.lastUpdateId = id;

    return of({ ...EDITED });
  }
}

describe('ProductCreate (BO-F07)', () => {
  let fixture: ComponentFixture<ProductCreate>;
  let component: ProductCreate;
  let service: ProductsServiceStub;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    service = new ProductsServiceStub();

    await TestBed.configureTestingModule({
      imports: [ProductCreate],
      providers: [
        { provide: ProductsService, useValue: service },
        provideRouter([]),
        ConfirmationService,
        MessageService,
      ],
    }).compileComponents();

    // Every save that succeeds navigates; the test router has no such route, so
    // the call is recorded instead of matched (an unmatched navigate throws
    // NG04002 outside the test's own stack).
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function mount(): Promise<void> {
    fixture = TestBed.createComponent(ProductCreate);
    component = fixture.componentInstance;
    await settle();
  }

  /** Fill the minimum the main tab requires, including the auto-generated slug. */
  function fillMainTab(): void {
    component.form.controls.name.setValue('هدفون سونی');
    component.form.controls.categoryId.setValue('3');
    component.form.controls.price.setValue(2_100_000);
    fixture.detectChanges();
  }

  /** Everything the POST needs: the main tab plus the required first variant. */
  function fillValidForm(): void {
    fillMainTab();
    component.form.controls.variants.push(
      createVariantGroup(new FormBuilder(), {
        basePrice: 2_100_000,
        seed: { sku: 'SONY-BLK', stock: 4 },
      }),
    );
    fixture.detectChanges();
  }

  /** The page only exposes the save button on the last tab. */
  function goToLastTab(): void {
    component.selectTab('inventory');
    fixture.detectChanges();
  }

  it('tc 2/6: builds one central group with every tab and both FormArrays', async () => {
    await mount();

    const controls = component.form.controls;

    expect(controls.name).toBeTruthy();
    expect(controls.slug).toBeTruthy();
    expect(controls.categoryId).toBeTruthy();
    expect(controls.brandId).toBeTruthy();
    expect(controls.shortDescription).toBeTruthy();
    expect(controls.price).toBeTruthy();
    expect(controls.stock).toBeTruthy();
    expect(controls.lowStockThreshold).toBeTruthy();
    expect(controls.variants).toBeTruthy();
    expect(controls.images).toBeTruthy();
    expect(component.tabs.map((tab) => tab.id)).toEqual([
      'main',
      'variants',
      'gallery',
      'inventory',
    ]);
  });

  it('tc 1: renders the four tabs and switches to a valid next tab', async () => {
    await mount();
    fillMainTab();
    await settle();

    const tabs = fixture.nativeElement.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(4);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');

    (fixture.nativeElement.querySelector('[data-tab="variants"]') as HTMLButtonElement).click();
    await settle();

    expect(component.activeTab()).toBe('variants');

    const panel = fixture.nativeElement.querySelector('#panel-variants') as HTMLElement;
    expect(panel.querySelector('app-product-variant-editor')).toBeTruthy();
    expect(panel.textContent).toContain('ویرایشگر واریانت');
    expect(panel.textContent).toContain('هنوز واریانتی اضافه نشده');
  });

  it('tc 4/6: an empty variants tab is invalid and its first row takes the base price', async () => {
    await mount();
    fillMainTab();
    await settle();

    component.selectTab('variants');
    await settle();

    const panel = fixture.nativeElement.querySelector('#panel-variants') as HTMLElement;

    expect(component.form.controls.variants.length).toBe(0);
    expect(component.form.controls.variants.hasError('requiredVariants')).toBe(true);

    (panel.querySelector('app-empty-state button') as HTMLButtonElement).click();
    await settle();

    expect(component.form.controls.variants.length).toBe(1);
    expect(component.form.controls.variants.at(0).get('price')?.value).toBe(2_100_000);
    expect(component.form.controls.variants.hasError('requiredVariants')).toBe(false);
    expect(panel.querySelectorAll('app-product-variant-row').length).toBe(1);
  });

  it('tc 11: saving a valid main tab opens the variants tab when that is what blocks it', async () => {
    await mount();
    fillMainTab();
    await settle();

    component.save();
    await settle();

    expect(component.form.controls.variants.hasError('requiredVariants')).toBe(true);
    expect(component.activeTab()).toBe('variants');
  });

  it('tc 3: a value entered on the main tab survives a trip to another tab', async () => {
    await mount();
    fillMainTab();
    await settle();

    component.next();
    await settle();
    expect(component.activeTab()).toBe('variants');

    component.previous();
    await settle();

    expect(component.form.controls.name.value).toBe('هدفون سونی');
    expect((fixture.nativeElement.querySelector('#product-name') as HTMLInputElement).value).toBe(
      'هدفون سونی',
    );
  });

  it('tc 4: an invalid current tab blocks moving forward and marks its controls touched', async () => {
    await mount();

    component.next();
    await settle();

    expect(component.activeTab()).toBe('main');
    expect(component.form.controls.name.touched).toBe(true);
    expect(component.form.controls.categoryId.touched).toBe(true);
  });

  it('tc 8: derives the slug from the name until the user edits it manually', async () => {
    await mount();

    component.form.controls.name.setValue('لپ‌تاپ ایسوس');
    fixture.detectChanges();
    expect(component.form.controls.slug.value).toBe('laptop-asus');

    component.form.controls.slug.setValue('custom-slug');
    component.onSlugInput();
    component.form.controls.name.setValue('هدفون سونی');
    fixture.detectChanges();

    expect(component.form.controls.slug.value).toBe('custom-slug');
  });

  it('tc 9: enforces the short-description limit and shows the counter', async () => {
    await mount();

    const textarea = fixture.nativeElement.querySelector(
      '#product-short-description',
    ) as HTMLTextAreaElement;
    expect(textarea.getAttribute('maxlength')).toBe('160');

    component.form.controls.shortDescription.setValue('x'.repeat(161));
    fixture.detectChanges();

    expect(component.form.controls.shortDescription.invalid).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('۱۶۰');
    expect(fixture.nativeElement.textContent).toContain('۱۶۱');
  });

  it('tc 7/8: reports dirty state for the guard and starts pristine', async () => {
    await mount();

    expect(component.hasUnsavedChanges()).toBe(false);

    component.form.controls.name.setValue('هدفون سونی');
    fixture.detectChanges();

    expect(component.hasUnsavedChanges()).toBe(true);
  });

  it('tc 1/3/10: builds full-path active categories and keeps brand logos', async () => {
    await mount();

    expect(component.categoryOptions().map((option) => option.path)).toEqual([
      'لوازم برقی',
      'لوازم برقی / صوتی',
    ]);
    expect(component.brands().map((brand) => brand.name)).toEqual(['سونی', 'ریزر']);
    expect(component.brands()[0].logo).toBe('/mock/sony.png');
  });

  it('tc 10: the form surfaces are dark-mode ready', async () => {
    await mount();

    const card = fixture.nativeElement.querySelector('form > div') as HTMLElement;
    expect(card.className).toContain('dark:bg-gray-800');
    expect(card.className).toContain('dark:border-gray-700');
  });

  it('tc 9: hides a message until touched, then shows the typed error', async () => {
    await mount();

    expect(component.errorFor('name')).toBeNull();

    component.form.controls.name.markAsTouched();
    fixture.detectChanges();

    expect(component.errorFor('name')).toContain('الزامی');
    expect(fixture.nativeElement.textContent).toContain('نام محصول الزامی است.');
  });

  it('tc 1/2/3/5/6: each field rejects its documented invalid value', async () => {
    await mount();

    const controls = component.form.controls;

    controls.name.setValue('ab');
    expect(controls.name.hasError('minlength')).toBe(true);

    controls.name.setValue('   ');
    expect(controls.name.hasError('required')).toBe(true);

    controls.slug.setValue('BAD SLUG');
    expect(controls.slug.hasError('pattern')).toBe(true);

    controls.categoryId.setValue('');
    expect(controls.categoryId.hasError('required')).toBe(true);

    controls.price.setValue(0);
    expect(controls.price.hasError('positive')).toBe(true);

    controls.stock.setValue(-1);
    expect(controls.stock.hasError('negative')).toBe(true);
  });

  it('tc 7: maps a server slug error onto the control and shows it', async () => {
    await mount();

    component.applyServerErrors({ slug: ['این نامک قبلاً استفاده شده است.'] });
    fixture.detectChanges();

    expect(component.form.controls.slug.hasError('server')).toBe(true);
    expect(component.errorFor('slug')).toBe('این نامک قبلاً استفاده شده است.');
    expect(fixture.nativeElement.textContent).toContain('این نامک قبلاً استفاده شده است.');
  });

  it('tc 10: a server error clears when the value is corrected', async () => {
    await mount();

    component.applyServerErrors({ slug: ['این نامک قبلاً استفاده شده است.'] });
    component.form.controls.slug.setValue('new-slug');
    fixture.detectChanges();

    expect(component.form.controls.slug.hasError('server')).toBe(false);
    expect(component.errorFor('slug')).toBeNull();
  });

  it('tc 10: correcting a local value clears its error immediately', async () => {
    await mount();

    const name = component.form.controls.name;
    name.setValue('ab');
    name.markAsTouched();
    expect(component.errorFor('name')).toContain('حداقل');

    name.setValue('کیف');
    expect(component.errorFor('name')).toBeNull();
  });

  it('BO-F11 tc 9: the gallery tab hosts the uploader with both Arino dropzones', async () => {
    await mount();
    fillMainTab();
    await settle();

    (fixture.nativeElement.querySelector('[data-tab="gallery"]') as HTMLButtonElement).click();
    await settle();

    const panel = fixture.nativeElement.querySelector('#panel-gallery') as HTMLElement;
    expect(panel.querySelector('app-product-gallery-uploader')).toBeTruthy();
    expect(panel.querySelector('[data-primary-dropzone]')).toBeTruthy();
    expect(panel.querySelector('[data-gallery-dropzone]')).toBeTruthy();
    expect(panel.textContent).toContain('تصویر اصلی');
    expect(panel.textContent).toContain('تصاویر گالری');
    expect(panel.textContent).toContain('هنوز تصویری اضافه نشده است');
  });

  it('BO-F11: rows the uploader adds land on the page-owned images array', async () => {
    // jsdom has no createObjectURL; the wiring test only needs stable strings.
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:wired-1');
    URL.revokeObjectURL = vi.fn();

    try {
      await mount();
      fillMainTab();
      await settle();

      (fixture.nativeElement.querySelector('[data-tab="gallery"]') as HTMLButtonElement).click();
      await settle();

      const uploader = fixture.debugElement.query(By.css('app-product-gallery-uploader'));
      await (uploader.componentInstance as ProductGalleryUploader).addFiles(
        [new File([new Uint8Array(10)], 'cover.png', { type: 'image/png' })],
        'gallery',
      );
      await settle();

      expect(component.images.length).toBe(1);
      expect(component.images.at(0).get('url')?.value).toBe('blob:wired-1');
      expect(component.images.at(0).get('isPrimary')?.value).toBe(true);
      expect(component.images.at(0).get('alt')?.value).toBe('هدفون سونی - تصویر ۱');
      expect(component.hasUnsavedChanges()).toBe(true);
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
  });

  // ─── BO-F12 · inventory fields ────────────────────────────────────────────

  it('BO-F12 tc 1/2/8: rejects a negative or non-numeric stock and accepts zero', async () => {
    await mount();

    const { stock, lowStockThreshold } = component.form.controls;

    stock.setValue(-1);
    stock.markAsTouched();
    expect(stock.hasError('negative')).toBe(true);
    expect(component.errorFor('stock')).toContain('منفی');

    stock.setValue(Number.NaN);
    expect(stock.hasError('number')).toBe(true);
    expect(component.errorFor('stock')).toContain('عدد');

    stock.setValue(0);
    expect(stock.valid).toBe(true);

    lowStockThreshold.setValue(-2);
    expect(lowStockThreshold.hasError('negative')).toBe(true);
  });

  it('BO-F12 tc 4/9: the variant rows own the total once there is one', async () => {
    await mount();
    fillMainTab();

    const fb = new FormBuilder();
    const variants = component.form.controls.variants;

    variants.push(
      createVariantGroup(fb, { basePrice: 2_100_000, seed: { sku: 'SKU-1', stock: 4 } }),
    );
    variants.push(
      createVariantGroup(fb, { basePrice: 2_100_000, seed: { sku: 'SKU-2', stock: 6 } }),
    );

    expect(component.inventory()).toEqual({ total: 10, threshold: 5, derived: true });
    expect(component.form.controls.stock.value).toBe(10);

    component.selectTab('inventory');
    await settle();

    const panel = fixture.nativeElement.querySelector('#panel-inventory') as HTMLElement;
    const stockInput = panel.querySelector('#product-stock') as HTMLInputElement;

    expect(stockInput.readOnly).toBe(true);
    expect(panel.textContent).toContain('۱۰');
    expect(panel.textContent).toContain('واریانت‌ها');

    // Deleting the last row hands the field back to the user (tc 4).
    variants.clear();
    expect(component.inventory().derived).toBe(false);
    expect(component.form.controls.stock.value).toBe(10);
  });

  // ─── BO-F13 · submit, map errors, retry ───────────────────────────────────

  it('BO-F13 tc 1/2: a successful save toasts, unlocks the guard and opens the edit page', async () => {
    await mount();
    fillValidForm();

    component.save();
    await settle();

    expect(service.createCalls).toBe(1);
    expect(component.submitting()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/products', '42', 'edit']);
    // The guard must not ask about the dirty form we just saved (tc 2/9).
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('BO-F13 tc 4: a second click while the POST is in flight is ignored', async () => {
    await mount();
    fillValidForm();
    goToLastTab();

    service.pending = new Subject<Product>();
    component.save();
    component.save();
    component.save();
    fixture.detectChanges();

    expect(service.createCalls).toBe(1);
    expect(component.submitting()).toBe(true);
    expect((fixture.nativeElement.querySelector('[data-save]') as HTMLButtonElement).disabled).toBe(
      true,
    );

    service.pending.next({ ...CREATED });
    await settle();

    expect(component.submitting()).toBe(false);
  });

  it('BO-F13 tc 3/7: a 422 lands on the right control, keeps the data and can be retried', async () => {
    await mount();
    fillValidForm();

    service.createError = new ApiError('VALIDATION', 'اطلاعات محصول معتبر نیست.', 422, {
      slug: ['این نامک قبلاً استفاده شده است.'],
    });

    component.save();
    await settle();

    expect(component.form.controls.slug.hasError('server')).toBe(true);
    expect(component.form.controls.slug.touched).toBe(true);
    expect(component.errorFor('slug')).toBe('این نامک قبلاً استفاده شده است.');
    expect(component.activeTab()).toBe('main');
    expect(component.saveError()).toBe('اطلاعات محصول معتبر نیست.');
    // Nothing was cleared: the user corrects one field instead of retyping.
    expect(component.form.controls.name.value).toBe('هدفون سونی');
    expect(component.form.controls.variants.length).toBe(1);

    // A tab switch destroys and re-creates the panel, which re-registers
    // `formControlName` and re-runs the validators. The server message must
    // survive that, or a 422 on a field the user is not looking at disappears
    // the moment they go to look at it.
    component.selectTab('variants');
    component.selectTab('main');
    fixture.detectChanges();
    expect(component.errorFor('slug')).toBe('این نامک قبلاً استفاده شده است.');

    service.createError = null;
    component.save();
    await settle();

    expect(service.createCalls).toBe(2);
    expect(component.errorFor('slug')).toBeNull();
  });

  it('BO-F13 tc 5: a network failure offers «تلاش دوباره» and keeps every value', async () => {
    await mount();
    fillValidForm();
    goToLastTab();

    service.createError = new Error('offline');
    component.save();
    await settle();

    expect(component.saveError()).toContain('ناموفق');
    expect(component.submitting()).toBe(false);
    expect(component.form.controls.name.value).toBe('هدفون سونی');

    const retry = fixture.nativeElement.querySelector('[data-retry-save]') as HTMLButtonElement;
    expect(retry).toBeTruthy();
    expect(retry.textContent).toContain('تلاش دوباره');

    service.createError = null;
    retry.click();
    await settle();

    expect(service.createCalls).toBe(2);
    expect(component.saveError()).toBeNull();
  });

  it('BO-F12 tc 5/9: the status pill follows the total and the threshold', async () => {
    await mount();

    expect(component.inventoryLevel()).toBe('out');
    component.form.controls.stock.setValue(10);
    component.form.controls.lowStockThreshold.setValue(5);
    expect(component.inventoryLevel()).toBe('ok');
    expect(component.inventoryStatus().label).toBe('موجود');

    component.form.controls.lowStockThreshold.setValue(10);
    expect(component.inventoryLevel()).toBe('low');
    expect(component.inventoryStatus().label).toBe('کم‌موجودی');

    component.form.controls.stock.setValue(0);
    expect(component.inventoryStatus().label).toBe('ناموجود');
  });

  // ─── BO-F14 · edit mode ───────────────────────────────────────────────────

  /** Mount, then hand the component the resolver's product and let it hydrate. */
  async function mountEdit(): Promise<void> {
    await mount();
    fixture.componentRef.setInput('edit', { product: EDITED });
    fixture.detectChanges();
    await settle();
  }

  it('BO-F14 tc 1/2/3/4: hydrates every tab from the resolved product', async () => {
    await mountEdit();

    const controls = component.form.controls;

    expect(controls.name.value).toBe('هدفون سونی');
    expect(controls.slug.value).toBe('sony-wh1000');
    expect(controls.price.value).toBe(2_100_000);
    expect(controls.status.value).toBe('draft');
    expect(controls.lowStockThreshold.value).toBe(5);

    expect(component.variants.length).toBe(1);
    expect(component.variants.at(0).get('sku')?.value).toBe('SONY-BLK');
    expect(component.images.length).toBe(1);
    expect(component.images.at(0).get('url')?.value).toBe('/images/products/1.jpg');

    expect(component.inventory()).toEqual({ total: 4, threshold: 5, derived: true });
    expect(component.pageTitle()).toBe('ویرایش محصول');
    expect(component.saveLabel()).toBe('ذخیره تغییرات');
    // A prefilled form the user has not touched must not trip the leave guard.
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('BO-F14: renaming a saved product keeps its slug', async () => {
    await mountEdit();

    component.form.controls.name.setValue('هدفون سونی نسخه ۲');

    expect(component.form.controls.slug.value).toBe('sony-wh1000');
  });

  it('BO-F14 tc 7/10: saving without changes PUTs and stays on the page', async () => {
    await mountEdit();

    component.save();
    await settle();

    expect(service.updateCalls).toBe(1);
    expect(service.lastUpdateId).toBe('7');
    expect(service.createCalls).toBe(0);
    expect(component.submitting()).toBe(false);
    expect(component.hasUnsavedChanges()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('BO-F14 tc 6: a failed load replaces the form with a retry block', async () => {
    await mount();
    fixture.componentRef.setInput('edit', { error: 'دریافت اطلاعات محصول ناموفق بود.' });
    fixture.detectChanges();
    await settle();

    expect(fixture.nativeElement.querySelector('#panel-main')).toBeNull();
    const retry = fixture.nativeElement.querySelector('[data-retry-load]') as HTMLButtonElement;
    expect(retry).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('ناموفق');
  });
});
