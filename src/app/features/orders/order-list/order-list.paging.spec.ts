import { EventEmitter } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { Page } from '@shared/models';
import { Observable, of } from 'rxjs';

import type { OrderListItem, OrderQuery } from '../models/order.model';
import { OrdersService } from '../services/orders.service';

import { OrderList } from './order-list';

/** 28 rows → two pages at the default size of 20 and three at size 10. */
const ROWS: readonly OrderListItem[] = Array.from({ length: 28 }, (_, index) => ({
  id: `o-${index + 1}`,
  code: `ORD-${14000 + index}`,
  customerId: `c-${(index % 8) + 1}`,
  customerName: 'زهرا محمدی',
  status: 'paid',
  total: 100_000 + index * 10_000,
  itemCount: (index % 3) + 1,
  createdAt: 1728883200000 + index * 86_400_000,
}));

/**
 * A paging-aware stub: it sorts like the mock and slices the requested page, so
 * a table assertion proves the query actually reached the data layer.
 */
class OrdersServiceStub {
  readonly queries: OrderQuery[] = [];

  rows: readonly OrderListItem[] = ROWS;

  list(query: OrderQuery = {}): Observable<Page<OrderListItem>> {
    this.queries.push(query);

    const rows = [...this.rows];

    if (query.sort === 'total') {
      rows.sort((a, b) => a.total - b.total);
    } else if (query.sort === 'createdAt') {
      rows.sort((a, b) => a.createdAt - b.createdAt);
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
}

describe('OrderList paging and sort (BO-H01)', () => {
  let service: OrdersServiceStub;
  let harness: RouterTestingHarness;
  let fixture: ComponentFixture<OrderList>;
  let component: OrderList;
  let router: Router;

  beforeEach(async () => {
    service = new OrdersServiceStub();

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'orders', component: OrderList }]),
        { provide: OrdersService, useValue: service },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function mount(url = '/orders'): Promise<void> {
    harness = await RouterTestingHarness.create(url);
    fixture = harness.fixture! as unknown as ComponentFixture<OrderList>;
    component = harness.fixture.debugElement.query(By.directive(OrderList))!
      .componentInstance as OrderList;
    await settle();
  }

  function pageButton(page: number): HTMLButtonElement {
    return fixture.nativeElement.querySelector(`[data-page="${page}"]`) as HTMLButtonElement;
  }

  function sortButton(field: string): HTMLButtonElement {
    return fixture.nativeElement.querySelector(`[data-sort="${field}"]`) as HTMLButtonElement;
  }

  /**
   * The page size is a `p-select`: the test emits the component's `onChange`
   * output — the same event the template binds.
   */
  function changePageSize(size: number): void {
    const select = fixture.debugElement.query(By.css('#orders-page-size'))!
      .componentInstance as unknown as {
      onChange: EventEmitter<{ originalEvent: Event; value: unknown }>;
    };
    select.onChange.emit({ originalEvent: new Event('change'), value: size });
    fixture.detectChanges();
  }

  /** In v21 the label `<span>` itself carries the `inputId`. */
  function selectLabel(): string {
    return (
      fixture.nativeElement
        .querySelector('#orders-page-size.p-select-label')
        ?.textContent?.trim() ?? ''
    );
  }

  function lastQuery(): OrderQuery {
    return service.queries[service.queries.length - 1];
  }

  function urlParams(): URLSearchParams {
    return new URLSearchParams(router.url.split('?')[1] ?? '');
  }

  function footer(): HTMLElement {
    return fixture.nativeElement.querySelector('.border-t') as HTMLElement;
  }

  it('starts on page 1 with 20 rows and the server total', async () => {
    await mount();

    expect(service.queries).toHaveLength(1);
    expect(lastQuery()).toMatchObject({ page: 1, pageSize: 20 });
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(20);
    expect(pageButton(1).getAttribute('aria-current')).toBe('page');
    expect(pageButton(2)).toBeTruthy();
    expect(selectLabel()).toBe('۲۰');

    expect(footer().textContent).toContain('۱');
    expect(footer().textContent).toContain('۲۰');
    expect(footer().textContent).toContain('۲۸');
    expect(footer().textContent).toContain('سفارش');
  });

  it('page 2 fetches the next slice and marks the current page', async () => {
    await mount();

    pageButton(2).click();
    await settle();

    expect(lastQuery()).toMatchObject({ page: 2, pageSize: 20 });
    expect(component.items()!.length).toBe(8);
    expect(component.items()![0].id).toBe('o-21');
    expect(pageButton(2).getAttribute('aria-current')).toBe('page');
    expect(urlParams().get('page')).toBe('2');
    expect(footer().textContent).toContain('۲۱');
    expect(footer().textContent).toContain('۲۸');
  });

  it('changing the page size returns to page 1 and changes the slice', async () => {
    await mount('/orders?page=2');

    changePageSize(10);
    await settle();

    expect(lastQuery()).toMatchObject({ page: 1, pageSize: 10 });
    expect(component.items()!.length).toBe(10);
    expect(urlParams().get('size')).toBe('10');
    expect(urlParams().has('page')).toBe(false);
    expect(pageButton(3)).toBeTruthy();
  });

  it('the 50-row size is selectable and reflected in the control', async () => {
    await mount();

    changePageSize(50);
    await settle();

    expect(lastQuery()).toMatchObject({ page: 1, pageSize: 50 });
    expect(selectLabel()).toBe('۵۰');
    expect(component.items()!.length).toBe(28);
  });

  it('clicking total sorts ascending, clicking again descending', async () => {
    await mount();
    const before = service.queries.length;

    sortButton('total').click();
    await settle();

    expect(service.queries.length).toBe(before + 1);
    expect(lastQuery()).toMatchObject({ sort: 'total', dir: 'asc', page: 1 });
    expect(component.items()![0].total).toBe(100_000);
    expect(urlParams().get('sort')).toBe('total');
    expect(urlParams().get('dir')).toBe('asc');

    sortButton('total').click();
    await settle();

    expect(lastQuery()).toMatchObject({ sort: 'total', dir: 'desc', page: 1 });
    expect(component.items()![0].total).toBe(370_000);
    expect(urlParams().get('dir')).toBe('desc');
  });

  it('date sort uses the numeric UTC createdAt, never a string', async () => {
    await mount();

    sortButton('createdAt').click();
    await settle();

    expect(lastQuery()).toMatchObject({ sort: 'createdAt', dir: 'asc', page: 1 });
    expect(component.items()![0].createdAt).toBe(1728883200000);
    expect(urlParams().get('sort')).toBe('createdAt');
  });

  it('a shared URL restores page, size, sort and direction', async () => {
    await mount('/orders?page=2&size=10&sort=total&dir=desc');

    expect(service.queries).toHaveLength(1);
    expect(lastQuery()).toMatchObject({
      page: 2,
      pageSize: 10,
      sort: 'total',
      dir: 'desc',
    });
    expect(pageButton(2).getAttribute('aria-current')).toBe('page');
    expect(selectLabel()).toBe('۱۰');
    expect(component.items()!.length).toBe(10);
  });

  it('a repeat click on the current page does not create a request', async () => {
    await mount();
    const before = service.queries.length;

    pageButton(1).click();
    await settle();

    expect(service.queries.length).toBe(before);
  });

  it('the numbered pages are hidden on mobile, the summary is visible', async () => {
    await mount();

    const numbers = fixture.nativeElement.querySelector('#orders-page-numbers') as HTMLElement;
    const summary = fixture.nativeElement.querySelector('#orders-page-summary') as HTMLElement;

    expect(numbers.className).toContain('hidden');
    expect(numbers.className).toContain('sm:flex');
    expect(summary.className).toContain('sm:hidden');
    expect(summary.textContent).toContain('صفحه');
  });

  it('a non-sortable column has no sort control and is ignored', async () => {
    await mount();
    const before = service.queries.length;

    expect(fixture.nativeElement.querySelector('[data-sort="customerName"]')).toBeNull();

    component.sortBy('customerName');
    await settle();

    expect(service.queries.length).toBe(before);
  });
});
