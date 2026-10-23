import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import type { Observable } from 'rxjs';
import { of } from 'rxjs';

import type { ProductBrandOption, ProductCategoryOption } from '../models/product.model';
import { ProductsService } from '../services/products.service';

import { ProductCreate } from './product-create';

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
  categories(): Observable<readonly ProductCategoryOption[]> {
    return of(CATEGORIES);
  }

  brands(): Observable<readonly ProductBrandOption[]> {
    return of(BRANDS);
  }
}

describe('ProductCreate (BO-F07)', () => {
  let fixture: ComponentFixture<ProductCreate>;
  let component: ProductCreate;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCreate],
      providers: [
        { provide: ProductsService, useValue: new ProductsServiceStub() },
        provideRouter([]),
        MessageService,
      ],
    }).compileComponents();
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
    expect(fixture.nativeElement.querySelector('#panel-variants')?.textContent).toContain(
      'ویرایشگر واریانت',
    );
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
});
