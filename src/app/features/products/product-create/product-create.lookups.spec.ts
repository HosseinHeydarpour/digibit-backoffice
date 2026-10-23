import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Select } from 'primeng/select';
import { Observable, Subject, of } from 'rxjs';

import type { ProductBrandOption, ProductCategoryOption } from '../models/product.model';
import { ProductsService } from '../services/products.service';

import { ProductCreate } from './product-create';

const CATEGORIES: readonly ProductCategoryOption[] = [
  { id: '3', name: 'لوازم برقی', parentId: null, isActive: true },
  { id: '4', name: 'صوتی', parentId: '3', isActive: true },
  { id: '9', name: 'حذف‌شده', parentId: '3', isActive: false },
];

const BRANDS: readonly ProductBrandOption[] = [
  { id: '5', name: 'سونی', logo: '/mock/sony.png' },
  { id: '6', name: 'ریزر', logo: null },
];

class ProductsServiceStub {
  categoryCalls = 0;

  categories$: Observable<readonly ProductCategoryOption[]> = of(CATEGORIES);

  brands$: Observable<readonly ProductBrandOption[]> = of(BRANDS);

  categories(): Observable<readonly ProductCategoryOption[]> {
    this.categoryCalls += 1;
    return this.categories$;
  }

  brands(): Observable<readonly ProductBrandOption[]> {
    return this.brands$;
  }
}

describe('ProductCreate lookups (BO-F09)', () => {
  let fixture: ComponentFixture<ProductCreate>;
  let component: ProductCreate;
  let service: ProductsServiceStub;

  beforeEach(async () => {
    service = new ProductsServiceStub();

    await TestBed.configureTestingModule({
      imports: [ProductCreate],
      providers: [
        { provide: ProductsService, useValue: service },
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

  it('tc 8: shows loading, then the full-path options when the request answers', async () => {
    const categories = new Subject<readonly ProductCategoryOption[]>();
    service.categories$ = categories.asObservable();

    await mount();
    expect(component.categoriesLoading()).toBe(true);

    categories.next(CATEGORIES);
    categories.complete();
    await settle();

    expect(component.categoriesLoading()).toBe(false);
    expect(component.categoryOptions().map((option) => option.path)).toContain('لوازم برقی / صوتی');
  });

  it('tc 9: shows a Persian error and retries the category request', async () => {
    let attempt = 0;
    service.categories$ = new Observable((subscriber) => {
      attempt += 1;
      if (attempt === 1) {
        subscriber.error(new Error('offline'));
      } else {
        subscriber.next(CATEGORIES);
        subscriber.complete();
      }
    });

    await mount();

    expect(component.categoriesError()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('بارگذاری دسته‌بندی‌ها ناموفق بود.');

    (fixture.nativeElement.querySelector('[data-retry-categories]') as HTMLButtonElement).click();
    await settle();

    expect(component.categoriesError()).toBe(false);
    expect(component.categoryOptions().map((option) => option.path)).toContain('لوازم برقی');
  });

  it('tc 2/4/7: configures local search, placeholders and full-width selects', async () => {
    await mount();

    const selects = fixture.debugElement.queryAll(By.directive(Select));
    expect(selects.length).toBe(2);
    expect(selects[0].componentInstance.filter).toBe(true);
    expect(selects[0].componentInstance.filterBy).toBe('path');
    expect(selects[1].componentInstance.filterBy).toBe('name');

    const hosts = fixture.nativeElement.querySelectorAll('p-select') as NodeListOf<HTMLElement>;
    expect(hosts[0].className).toContain('w-full');
    expect(hosts[1].className).toContain('w-full');

    const labels = fixture.nativeElement.querySelectorAll(
      '.p-select-label',
    ) as NodeListOf<HTMLElement>;
    expect(labels[0].textContent).toContain('انتخاب دسته‌بندی');
    expect(labels[1].textContent).toContain('بدون برند');
  });

  it('tc 3: keeps the brand logo on the option model', async () => {
    await mount();

    expect(component.brands()[0]).toMatchObject({ name: 'سونی', logo: '/mock/sony.png' });
    expect(component.brands()[1].logo).toBeNull();
  });

  it('tc 5: a selected id survives the options arriving asynchronously', async () => {
    const categories = new Subject<readonly ProductCategoryOption[]>();
    service.categories$ = categories.asObservable();

    await mount();
    component.form.controls.categoryId.setValue('4');

    categories.next(CATEGORIES);
    categories.complete();
    await settle();

    expect(component.form.controls.categoryId.value).toBe('4');
    const label = fixture.nativeElement.querySelector('.p-select-label') as HTMLElement;
    expect(label.textContent).toContain('لوازم برقی / صوتی');
  });

  it('tc 10: an inactive category never reaches the options', async () => {
    await mount();

    expect(component.categoryOptions().map((option) => option.id)).not.toContain('9');
  });
});
