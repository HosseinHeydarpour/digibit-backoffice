import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { Page } from '@shared/models';
import { MessageService } from 'primeng/api';
import { Observable, of } from 'rxjs';

import type {
  ProductBrandOption,
  ProductCategoryOption,
  ProductListItem,
  ProductQuery,
} from '../models/product.model';
import { ProductsService } from '../services/products.service';

import { ProductList } from './product-list';

/** 45 rows → three pages at the default size of 20 and five at size 10. */
const ROWS: readonly ProductListItem[] = Array.from({ length: 45 }, (_, index) => ({
  id: `p-${index + 1}`,
  name: `محصول ${index + 1}`,
  sku: `SKU-${1001 + index}`,
  categoryName: 'لوازم برقی',
  brandName: 'سونی',
  price: 100_000 + index * 10_000,
  stock: index,
  status: 'published',
  createdAt: 1728883200000 + index * 86_400_000,
}));

/**
 * A paging-aware stub: it sorts like the mock and slices the requested page, so
 * a table assertion proves the query actually reached the data layer.
 */
class ProductsServiceStub {
  readonly queries: ProductQuery[] = [];

  rows: readonly ProductListItem[] = ROWS;

  list(query: ProductQuery = {}): Observable<Page<ProductListItem>> {
    this.queries.push(query);

    const rows = [...this.rows];

    if (query.sort === 'price') {
      rows.sort((a, b) => a.price - b.price);
    } else if (query.sort === 'createdAt') {
      rows.sort((a, b) => a.createdAt - b.createdAt);
    } else if (query.sort === 'name') {
      rows.sort((a, b) => a.name.localeCompare(b.name, 'fa'));
    }

    if (query.sort && query.dir === 'desc') {
      rows.reverse();
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const start = (page - 1) * pageSize;

    return of({
      items: rows.slice(start, start + pageSize),
      total: rows.length,
      page,
      pageSize,
    });
  }

  categories(): Observable<readonly ProductCategoryOption[]> {
    return of([]);
  }

  brands(): Observable<readonly ProductBrandOption[]> {
    return of([]);
  }
}

describe('ProductList paging and sort (BO-F04)', () => {
  let service: ProductsServiceStub;
  let harness: RouterTestingHarness;
  let fixture: ComponentFixture<ProductList>;
  let component: ProductList;
  let router: Router;

  beforeEach(async () => {
    service = new ProductsServiceStub();

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'products', component: ProductList }]),
        { provide: ProductsService, useValue: service },
        MessageService,
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
    component = harness.fixture.debugElement.query(By.directive(ProductList))!
      .componentInstance as ProductList;
    await settle();
  }

  function pageButton(page: number): HTMLButtonElement {
    return fixture.nativeElement.querySelector(`[data-page="${page}"]`) as HTMLButtonElement;
  }

  function sortButton(field: string): HTMLButtonElement {
    return fixture.nativeElement.querySelector(`[data-sort="${field}"]`) as HTMLButtonElement;
  }

  function changePageSize(size: string): void {
    const select = fixture.nativeElement.querySelector('#page-size') as HTMLSelectElement;
    select.value = size;
    select.dispatchEvent(new Event('change'));
  }

  function lastQuery(): ProductQuery {
    return service.queries[service.queries.length - 1];
  }

  function urlParams(): URLSearchParams {
    return new URLSearchParams(router.url.split('?')[1] ?? '');
  }

  function footer(): HTMLElement {
    return fixture.nativeElement.querySelector('.border-t') as HTMLElement;
  }

  it('tc 1/6: starts on page 1 with 20 rows and the server total', async () => {
    await mount();

    expect(service.queries).toHaveLength(1);
    expect(lastQuery()).toMatchObject({ page: 1, pageSize: 20 });
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(20);
    expect(pageButton(1).getAttribute('aria-current')).toBe('page');
    expect(pageButton(2)).toBeTruthy();
    expect(pageButton(3)).toBeTruthy();
    expect((fixture.nativeElement.querySelector('#page-size') as HTMLSelectElement).value).toBe(
      '20',
    );

    expect(footer().textContent).toContain('۱');
    expect(footer().textContent).toContain('۲۰');
    expect(footer().textContent).toContain('۴۵');
  });

  it('tc 1/5/6: page 2 fetches the next slice and marks the current page', async () => {
    await mount();

    pageButton(2).click();
    await settle();

    expect(lastQuery()).toMatchObject({ page: 2, pageSize: 20 });
    expect(component.items()!.length).toBe(20);
    expect(component.items()![0].id).toBe('p-21');
    expect(pageButton(2).getAttribute('aria-current')).toBe('page');
    expect(urlParams().get('page')).toBe('2');
    expect(footer().textContent).toContain('۲۱');
    expect(footer().textContent).toContain('۴۰');
  });

  it('tc 2: changing the page size returns to page 1 and changes the slice', async () => {
    await mount('/products?page=2');

    changePageSize('10');
    await settle();

    expect(lastQuery()).toMatchObject({ page: 1, pageSize: 10 });
    expect(component.items()!.length).toBe(10);
    expect(urlParams().get('size')).toBe('10');
    expect(urlParams().has('page')).toBe(false);
    expect(pageButton(5)).toBeTruthy();
    expect(footer().textContent).toContain('۱۰');
  });

  it('tc 2: the 50-row size is selectable and reflected in the control', async () => {
    await mount();

    changePageSize('50');
    await settle();

    expect(lastQuery()).toMatchObject({ page: 1, pageSize: 50 });
    expect((fixture.nativeElement.querySelector('#page-size') as HTMLSelectElement).value).toBe(
      '50',
    );
    expect(component.items()!.length).toBe(45);
  });

  it('tc 3: clicking price sorts ascending, clicking again descending', async () => {
    await mount();
    const before = service.queries.length;

    sortButton('price').click();
    await settle();

    expect(service.queries.length).toBe(before + 1);
    expect(lastQuery()).toMatchObject({ sort: 'price', dir: 'asc', page: 1 });
    expect(component.items()![0].price).toBe(100_000);
    expect(urlParams().get('sort')).toBe('price');
    expect(urlParams().get('dir')).toBe('asc');

    sortButton('price').click();
    await settle();

    expect(lastQuery()).toMatchObject({ sort: 'price', dir: 'desc', page: 1 });
    expect(component.items()![0].price).toBe(540_000);
    expect(urlParams().get('dir')).toBe('desc');
  });

  it('tc 4: date sort uses the numeric UTC createdAt, never a string', async () => {
    await mount();

    sortButton('createdAt').click();
    await settle();

    expect(lastQuery()).toMatchObject({ sort: 'createdAt', dir: 'asc', page: 1 });
    expect(component.items()![0].createdAt).toBe(1728883200000);
    expect(urlParams().get('sort')).toBe('createdAt');
  });

  it('tc 5: a shared URL restores page, size, sort and direction', async () => {
    await mount('/products?page=2&size=10&sort=price&dir=desc');

    expect(service.queries).toHaveLength(1);
    expect(lastQuery()).toMatchObject({
      page: 2,
      pageSize: 10,
      sort: 'price',
      dir: 'desc',
    });
    expect(pageButton(2).getAttribute('aria-current')).toBe('page');
    expect((fixture.nativeElement.querySelector('#page-size') as HTMLSelectElement).value).toBe(
      '10',
    );
    expect(component.items()!.length).toBe(10);
  });

  it('tc 7: a repeat click on the current page does not create a request', async () => {
    await mount();
    const before = service.queries.length;

    pageButton(1).click();
    await settle();

    expect(service.queries.length).toBe(before);
  });

  it('tc 7: rapid page changes settle on the last page', async () => {
    await mount();

    pageButton(2).click();
    pageButton(3).click();
    await settle();

    expect(lastQuery().page).toBe(3);
    expect(urlParams().get('page')).toBe('3');
    expect(pageButton(3).getAttribute('aria-current')).toBe('page');
    expect(component.items()!.length).toBe(5);
  });

  it('tc 9: the numbered pages are hidden on mobile, the summary is visible', async () => {
    await mount();

    const numbers = fixture.nativeElement.querySelector('#page-numbers') as HTMLElement;
    const summary = fixture.nativeElement.querySelector('#page-summary') as HTMLElement;

    expect(numbers.className).toContain('hidden');
    expect(numbers.className).toContain('sm:flex');
    expect(summary.className).toContain('sm:hidden');
  });

  it('tc 10: a non-sortable column has no sort control and is ignored', async () => {
    await mount();
    const before = service.queries.length;

    expect(fixture.nativeElement.querySelector('[data-sort="categoryName"]')).toBeNull();

    component.sortBy('categoryName');
    await settle();

    expect(service.queries.length).toBe(before);
  });
});
