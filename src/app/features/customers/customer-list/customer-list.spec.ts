import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import type { Page } from '@shared/models';
import { NEVER, Observable, of, throwError } from 'rxjs';

import type { CustomerListItem, CustomerQuery } from '../models/customer.model';
import { CustomersService } from '../services/customers.service';

import { CustomerList } from './customer-list';

function customer(index: number, overrides: Partial<CustomerListItem> = {}): CustomerListItem {
  return {
    id: String(index),
    fullName: `مشتری شماره ${index}`,
    phone: `0912100000${index}`,
    email: `customer${index}@example.com`,
    status: index % 2 === 0 ? 'active' : 'blocked',
    orderCount: index,
    totalSpent: index * 100_000,
    createdAt: 1_728_000_000_000 - index * 86_400_000,
    ...overrides,
  };
}

const CUSTOMERS = Array.from({ length: 4 }, (_, i) => customer(i + 1));

/** Recording stub for the page's only data source (BO-I01 tc 8). */
class CustomersServiceStub {
  queries: CustomerQuery[] = [];

  rows: readonly CustomerListItem[] = CUSTOMERS;

  total = 4;

  failWith: string | null = null;

  hang = false;

  list(query: CustomerQuery = {}): Observable<Page<CustomerListItem>> {
    this.queries.push(query);

    if (this.hang) {
      return NEVER;
    }

    return this.failWith === null
      ? of({ items: [...this.rows], total: this.total, page: query.page ?? 1, pageSize: 20 })
      : throwError(() => new Error(this.failWith ?? 'request failed'));
  }
}

async function settle(fixture: ComponentFixture<CustomerList>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('CustomerList (BO-I01)', () => {
  let fixture: ComponentFixture<CustomerList>;
  let component: CustomerList;
  let service: CustomersServiceStub;
  let router: Router;

  beforeEach(async () => {
    service = new CustomersServiceStub();

    await TestBed.configureTestingModule({
      imports: [CustomerList],
      providers: [
        { provide: CustomersService, useValue: service },
        provideRouter([{ path: '**', children: [] }]),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  async function mount(): Promise<void> {
    fixture = TestBed.createComponent(CustomerList);
    component = fixture.componentInstance;
    await settle(fixture);
  }

  it('fills the table from the service on first paint', async () => {
    await mount();

    expect(service.queries.length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(4);
    expect(fixture.nativeElement.textContent).toContain('مشتری شماره 1');
  });

  it('renders the Persian headers in order', async () => {
    await mount();

    const headers = Array.from(
      fixture.nativeElement.querySelectorAll('thead th') as NodeListOf<HTMLElement>,
    ).map((th) => th.textContent?.trim());

    expect(headers).toEqual(['مشتری', 'موبایل', 'ایمیل', 'تعداد سفارش', 'وضعیت', 'تاریخ عضویت']);
  });

  it('renders the Jalali signup date and the status label', async () => {
    await mount();

    expect(fixture.nativeElement.textContent).toMatch(/۱۴[۰-۹]{2}\//);
    expect(fixture.nativeElement.textContent).toContain('فعال');
    expect(fixture.nativeElement.textContent).toContain('مسدود');
  });

  it('hides the light columns on a phone and keeps the three that matter', async () => {
    await mount();

    const byField = new Map(component.cols.map((col) => [col.field, col]));

    expect(byField.get('email')?.class).toContain('hidden');
    expect(byField.get('email')?.class).toContain('lg:table-cell');
    expect(byField.get('phone')?.class).toContain('md:table-cell');
    expect(byField.get('createdAt')?.class).toContain('md:table-cell');
    expect(byField.get('orderCount')?.class).toContain('sm:table-cell');
    expect(byField.get('customer')?.class).toBeUndefined();
    expect(byField.get('status')?.class).toBeUndefined();
  });

  it('debounces the search and resets to page 1', async () => {
    await mount();
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.useFakeTimers();

    component.onSearchInput('مریم');
    component.onSearchInput('مریم حسینی');
    vi.advanceTimersByTime(299);

    expect(service.queries.at(-1)?.query).toBeUndefined();

    vi.advanceTimersByTime(1);
    vi.useRealTimers();

    expect(service.queries.at(-1)).toEqual(
      expect.objectContaining({ query: 'مریم حسینی', page: 1 }),
    );
  });

  it('applies the status filter immediately', async () => {
    await mount();

    component.onStatusChange('blocked');

    expect(service.queries.at(-1)).toEqual(expect.objectContaining({ status: 'blocked', page: 1 }));
  });

  it('sorts by signup date, flipping direction on the second click', async () => {
    await mount();

    component.sortBy('createdAt');
    expect(service.queries.at(-1)).toEqual(
      expect.objectContaining({ sort: 'createdAt', dir: 'asc', page: 1 }),
    );

    component.sortBy('createdAt');
    expect(service.queries.at(-1)).toEqual(expect.objectContaining({ dir: 'desc' }));
  });

  it('ignores a sort on a column that is not sortable', async () => {
    await mount();
    const calls = service.queries.length;

    component.sortBy('email');

    expect(service.queries.length).toBe(calls);
  });

  it('pages and writes the page number to the URL', async () => {
    service.total = 45;
    await mount();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onPageChange(2);

    expect(service.queries.at(-1)).toEqual(expect.objectContaining({ page: 2 }));
    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ page: '2' }),
        replaceUrl: true,
      }),
    );
  });

  it('ignores a click on the page that is already active', async () => {
    await mount();
    const calls = service.queries.length;

    component.onPageChange(1);

    expect(service.queries.length).toBe(calls);
  });

  it('shows the empty state when the shop has no customers', async () => {
    service.rows = [];
    service.total = 0;
    await mount();

    expect(fixture.nativeElement.textContent).toContain('هنوز مشتری‌ای ثبت نشده');
  });

  it('shows the skeleton while the request is in flight', async () => {
    service.hang = true;
    await mount();

    expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('shows the error block and recovers on retry', async () => {
    service.failWith = 'boom';
    await mount();

    expect(fixture.nativeElement.textContent).toContain('دریافت مشتریان ناموفق بود');

    service.failWith = null;
    const retry = fixture.nativeElement.querySelector(
      'app-error-state button',
    ) as HTMLButtonElement;
    retry.click();
    await settle(fixture);

    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(4);
  });

  it('clears both filters and returns to page 1', async () => {
    await mount();
    component.onSearchInput('x');
    component.onStatusChange('blocked');

    component.clearFilters();

    expect(service.queries.at(-1)).toEqual(
      expect.objectContaining({ query: undefined, status: undefined, page: 1 }),
    );
    expect(component.search()).toBe('');
  });
});
