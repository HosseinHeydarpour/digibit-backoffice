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
  { id: '3', name: 'لوازم برقی' },
  { id: '4', name: 'صوتی' },
];

const BRANDS: readonly ProductBrandOption[] = [
  { id: '5', name: 'سونی' },
  { id: '6', name: 'ریزر' },
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

  it('renders category and brand options from the service', async () => {
    await mount();

    const categoryTexts = Array.from(
      fixture.nativeElement.querySelectorAll('#product-category option'),
    ).map((option) => (option as HTMLOptionElement).textContent!.trim());
    const brandTexts = Array.from(
      fixture.nativeElement.querySelectorAll('#product-brand option'),
    ).map((option) => (option as HTMLOptionElement).textContent!.trim());

    expect(categoryTexts).toEqual(['انتخاب دسته‌بندی', 'لوازم برقی', 'صوتی']);
    expect(brandTexts).toEqual(['بدون برند', 'سونی', 'ریزر']);
  });

  it('tc 10: the form surfaces are dark-mode ready', async () => {
    await mount();

    const card = fixture.nativeElement.querySelector('form > div') as HTMLElement;
    expect(card.className).toContain('dark:bg-gray-800');
    expect(card.className).toContain('dark:border-gray-700');
  });
});
