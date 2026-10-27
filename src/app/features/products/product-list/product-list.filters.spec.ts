import { EventEmitter } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { Page } from '@shared/models';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Observable, of } from 'rxjs';

import type {
  ProductBrandOption,
  ProductCategoryOption,
  ProductListItem,
  ProductQuery,
} from '../models/product.model';
import { ProductsService } from '../services/products.service';

import { ProductList } from './product-list';

const PRODUCTS: readonly ProductListItem[] = [
  {
    id: 'p-1007',
    name: 'هدفون بی‌سیم سونی',
    sku: 'SKU-1007',
    categoryName: 'لوازم برقی',
    brandName: 'سونی',
    price: 2_100_000,
    stock: 12,
    lowStockThreshold: 5,
    status: 'published',
    createdAt: 1728969600000,
  },
  {
    id: 'p-1001',
    name: 'کیبورد مکانیکی ریزر',
    sku: 'SKU-1001',
    categoryName: 'لوازم برقی',
    brandName: 'ریزر',
    price: 1_850_000,
    stock: 0,
    lowStockThreshold: 5,
    status: 'draft',
    createdAt: 1728883200000,
  },
];

const CATEGORIES: readonly ProductCategoryOption[] = [
  { id: '3', name: 'لوازم برقی' },
  { id: '4', name: 'صوتی' },
];

const BRANDS: readonly ProductBrandOption[] = [
  { id: '5', name: 'سونی' },
  { id: '6', name: 'ریزر' },
];

/**
 * A stub that behaves like the mock for the two things this spec asserts:
 * it records every query, and it filters the rows by the text so a table
 * assertion is meaningful.
 */
class ProductsServiceStub {
  readonly queries: ProductQuery[] = [];

  rows: readonly ProductListItem[] = PRODUCTS;

  list(query: ProductQuery = {}): Observable<Page<ProductListItem>> {
    this.queries.push(query);

    const text = query.query?.trim().toLowerCase() ?? '';
    const rows = text
      ? this.rows.filter((row) => `${row.name} ${row.sku ?? ''}`.toLowerCase().includes(text))
      : this.rows;

    return of({ items: [...rows], total: rows.length, page: 1, pageSize: 20 });
  }

  categories(): Observable<readonly ProductCategoryOption[]> {
    return of(CATEGORIES);
  }

  brands(): Observable<readonly ProductBrandOption[]> {
    return of(BRANDS);
  }
}

describe('ProductList filters (BO-F03)', () => {
  let service: ProductsServiceStub;
  let harness: RouterTestingHarness;
  let fixture: ComponentFixture<ProductList>;
  let router: Router;

  beforeEach(async () => {
    service = new ProductsServiceStub();

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'products', component: ProductList }]),
        { provide: ProductsService, useValue: service },
        // ToastService is root-provided but injects MessageService, which is not.
        MessageService,
        ConfirmationService,
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function mount(url = '/products'): Promise<void> {
    harness = await RouterTestingHarness.create(url);
    fixture = harness.fixture! as unknown as ComponentFixture<ProductList>;
    await settle();
  }

  /** Real timers: the debounce is 300 ms, so 350 ms is comfortably past it. */
  async function wait(ms = 350): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
    await settle();
  }

  function typeSearch(value: string): void {
    const input = fixture.nativeElement.querySelector('#product-search') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  /**
   * The filters are `p-select` components now, not native `<select>` elements:
   * the test emits the component's `onChange` output — the same event the
   * template binds — and lets the handler's signal update flow back into the
   * label through `[ngModel]`.
   */
  function choose(id: string, value: string): void {
    const select = fixture.debugElement.query(By.css(`#${id}`))!.componentInstance as unknown as {
      onChange: EventEmitter<{ originalEvent: Event; value: unknown }>;
    };
    select.onChange.emit({ originalEvent: new Event('change'), value });
    fixture.detectChanges();
  }

  /**
   * The closed select's visible label. In v21 the label `<span>` itself carries
   * the `inputId`, so the id and the class are the SAME element.
   */
  function selectLabel(id: string): string {
    return fixture.nativeElement.querySelector(`#${id}.p-select-label`)?.textContent?.trim() ?? '';
  }

  function lastQuery(): ProductQuery {
    return service.queries[service.queries.length - 1];
  }

  function urlParams(): URLSearchParams {
    return new URLSearchParams(router.url.split('?')[1] ?? '');
  }

  it('tc 9: mounts with no filters and fetches the whole catalogue', async () => {
    await mount();

    expect(service.queries).toHaveLength(1);
    expect(lastQuery()).toMatchObject({
      query: undefined,
      categoryId: null,
      brandId: null,
      status: null,
    });
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('tc 1/2: typing filters by name after the 300 ms debounce and writes the URL', async () => {
    await mount();
    const before = service.queries.length;

    typeSearch('هدفون');
    await wait();

    expect(service.queries.length).toBe(before + 1);
    expect(lastQuery().query).toBe('هدفون');
    expect(urlParams().get('query')).toBe('هدفون');
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('tc 2: three quick keystrokes produce one request, for the last value', async () => {
    await mount();
    const before = service.queries.length;

    typeSearch('ه');
    await wait(100);
    typeSearch('هد');
    await wait(100);
    typeSearch('هدفون');
    await wait();

    expect(service.queries.length).toBe(before + 1);
    expect(lastQuery().query).toBe('هدفون');
  });

  it('tc 3/5: category and brand combine and both appear in the URL', async () => {
    await mount();

    choose('filter-category', '3');
    await settle();
    expect(lastQuery().categoryId).toBe('3');

    choose('filter-brand', '5');
    await settle();

    expect(lastQuery().categoryId).toBe('3');
    expect(lastQuery().brandId).toBe('5');
    expect(urlParams().get('category')).toBe('3');
    expect(urlParams().get('brand')).toBe('5');
  });

  it('tc 4: the status filter is applied and stored', async () => {
    await mount();

    choose('filter-status', 'draft');
    await settle();

    expect(lastQuery().status).toBe('draft');
    expect(urlParams().get('status')).toBe('draft');
  });

  it('tc 6: a shared/refreshed URL restores every filter before the first fetch', async () => {
    await mount('/products?query=هدفون&category=3&brand=5&status=draft');

    expect(service.queries).toHaveLength(1);
    expect(lastQuery()).toMatchObject({
      query: 'هدفون',
      categoryId: '3',
      brandId: '5',
      status: 'draft',
    });

    expect((fixture.nativeElement.querySelector('#product-search') as HTMLInputElement).value).toBe(
      'هدفون',
    );
    expect(selectLabel('filter-category')).toBe('لوازم برقی');
    expect(selectLabel('filter-brand')).toBe('سونی');
    expect(selectLabel('filter-status')).toBe('پیش‌نویس');
  });

  it('tc 7: clearing removes all four keys and returns to the full list', async () => {
    await mount('/products?query=هدفون&category=3&brand=5&status=draft');
    const before = service.queries.length;

    (fixture.nativeElement.querySelector('#clear-filters') as HTMLButtonElement).click();
    await settle();

    expect(service.queries.length).toBe(before + 1);
    expect(lastQuery()).toMatchObject({
      query: undefined,
      categoryId: null,
      brandId: null,
      status: null,
    });
    expect(urlParams().has('query')).toBe(false);
    expect(urlParams().has('category')).toBe(false);
    expect(urlParams().has('brand')).toBe(false);
    expect(urlParams().has('status')).toBe(false);
    expect((fixture.nativeElement.querySelector('#product-search') as HTMLInputElement).value).toBe(
      '',
    );
  });

  it('tc 8: a filtered empty state is not "the shop has no products"', async () => {
    service.rows = [];
    await mount('/products?query=ناموجود');

    const empty = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement | null;
    expect(empty?.textContent).toContain('محصولی با این فیلترها پیدا نشد');
    expect(empty?.textContent).toContain('پاک کردن فیلترها');
  });

  it('tc 10: Persian names and Latin SKUs both travel as query text', async () => {
    await mount();

    typeSearch('هدفون');
    await wait();
    expect(lastQuery().query).toBe('هدفون');
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);

    typeSearch('SKU-1001');
    await wait();
    expect(lastQuery().query).toBe('SKU-1001');
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('renders the category and brand options from the service', async () => {
    await mount();

    // The options live on the component instance (the overlay listbox renders
    // only when open), so the assertion reads the `options` input.
    const optionLabels = (id: string): string[] => {
      const select = fixture.debugElement.query(By.css(`#${id}`))!.componentInstance as unknown as {
        options: readonly { label: string }[];
      };
      return select.options.map((option) => option.label);
    };

    expect(optionLabels('filter-category')).toEqual(['همه دسته‌ها', 'لوازم برقی', 'صوتی']);
    expect(optionLabels('filter-brand')).toEqual(['همه برندها', 'سونی', 'ریزر']);
  });
});
