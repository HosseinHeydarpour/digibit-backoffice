import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { ConfirmService } from '@core/services/confirm';
import { ToastService } from '@core/services/toast';
import type { Page } from '@shared/models';
import type { ToggleSwitch } from 'primeng/toggleswitch';
import { NEVER, Observable, of, throwError } from 'rxjs';

import type { Customer, CustomerListItem, CustomerQuery } from '../models/customer.model';
import { CustomersService } from '../services/customers.service';

import { CustomerList } from './customer-list';

function customer(index: number, overrides: Partial<CustomerListItem> = {}): CustomerListItem {
  return {
    id: String(index),
    fullName: `مشتری شماره ${index}`,
    phone: `0912100000${index}`,
    email: `customer${index}@example.com`,
    status: index % 2 === 0 ? 'blocked' : 'active',
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

  setStatusCalls: { id: string; blocked: boolean }[] = [];

  statusResult: 'ok' | 'fail' = 'ok';

  list(query: CustomerQuery = {}): Observable<Page<CustomerListItem>> {
    this.queries.push(query);

    if (this.hang) {
      return NEVER;
    }

    return this.failWith === null
      ? of({ items: [...this.rows], total: this.total, page: query.page ?? 1, pageSize: 20 })
      : throwError(() => new Error(this.failWith ?? 'request failed'));
  }

  setStatus(id: string, blocked: boolean): Observable<Customer> {
    this.setStatusCalls.push({ id, blocked });

    if (this.statusResult === 'fail') {
      return throwError(() => new Error('toggle failed'));
    }

    return of({
      ...customer(1),
      id,
      status: blocked ? 'blocked' : 'active',
      addresses: [],
    });
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
        { provide: ConfirmService, useValue: { confirm: vi.fn().mockResolvedValue(false) } },
        { provide: ToastService, useValue: { success: vi.fn(), warning: vi.fn() } },
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

    expect(headers).toEqual([
      'مشتری',
      'موبایل',
      'ایمیل',
      'تعداد سفارش',
      'وضعیت',
      'تاریخ عضویت',
      'عملیات',
    ]);
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

  it('keeps a filter change out of browser history', async () => {
    await mount();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onStatusChange('blocked');

    expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({ replaceUrl: true }));
  });

  it('copies the mobile number without opening the profile', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    await mount();
    const navigate = vi.spyOn(router, 'navigate');

    const button = fixture.nativeElement.querySelector(
      'tbody tr button[aria-label^="کپی موبایل"]',
    ) as HTMLButtonElement;
    expect(button.textContent).toContain('09121000001');

    button.click();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith('09121000001');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('copies the email without opening the profile', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    await mount();
    const navigate = vi.spyOn(router, 'navigate');

    const button = fixture.nativeElement.querySelector(
      'tbody tr button[aria-label^="کپی ایمیل"]',
    ) as HTMLButtonElement;
    expect(button.textContent).toContain('customer1@example.com');

    button.click();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith('customer1@example.com');
    expect(navigate).not.toHaveBeenCalled();
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
        replaceUrl: false,
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
    expect(fixture.nativeElement.querySelector('app-empty-state button')).toBeNull();
  });

  it('tells a filtered empty apart and clears the filters on request', async () => {
    service.rows = [];
    service.total = 0;
    await mount();

    component.onStatusChange('blocked');
    await settle(fixture);

    expect(fixture.nativeElement.textContent).toContain('مشتری‌ای با این مشخصات پیدا نشد');

    const clear = fixture.nativeElement.querySelector(
      'app-empty-state button',
    ) as HTMLButtonElement;
    clear.click();
    await settle(fixture);

    expect(service.queries.at(-1)).toEqual(
      expect.objectContaining({ query: undefined, status: undefined, page: 1 }),
    );
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

  it('renders no switch without customers.block (BO-I03 tc 9)', async () => {
    await mount();

    expect(fixture.nativeElement.querySelector('[data-toggle-customer]')).toBeNull();
  });

  it('opens the profile from a row click (BO-I02 tc 10)', async () => {
    await mount();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const row = fixture.nativeElement.querySelector('tbody tr') as HTMLElement;
    row.click();

    expect(navigate).toHaveBeenCalledWith(['/customers', '1']);
  });
});

describe('CustomerList status toggle (BO-I03)', () => {
  let fixture: ComponentFixture<CustomerList>;
  let component: CustomerList;
  let service: CustomersServiceStub;
  let confirm: { confirm: ReturnType<typeof vi.fn> };
  let toast: { success: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn> };

  function fakeToggle(): ToggleSwitch {
    return { writeValue: vi.fn() } as unknown as ToggleSwitch;
  }

  beforeEach(async () => {
    service = new CustomersServiceStub();
    confirm = { confirm: vi.fn().mockResolvedValue(true) };
    toast = { success: vi.fn(), warning: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CustomerList],
      providers: [
        { provide: CustomersService, useValue: service },
        { provide: ConfirmService, useValue: confirm },
        { provide: ToastService, useValue: toast },
        { provide: PERMISSIONS, useValue: signal(['customers.view', 'customers.block']) },
        provideRouter([{ path: '**', children: [] }]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomerList);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders the switch for an admin who may block', () => {
    expect(fixture.nativeElement.querySelector('[data-toggle-customer]')).toBeTruthy();
  });

  it('does not open the profile when the status switch is clicked', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate');

    const toggle = fixture.nativeElement.querySelector('[data-toggle-customer]') as HTMLElement;
    toggle.click();

    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not open the profile from the switch label padding', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate');

    const label = fixture.nativeElement.querySelector(
      'label[for="customer-status-1"]',
    ) as HTMLElement;
    label.click();

    expect(navigate).not.toHaveBeenCalled();
  });

  it('asks first, then blocks optimistically and toasts', async () => {
    const row = component.items()![0];

    await component.toggleStatus(row, fakeToggle());

    expect(confirm.confirm).toHaveBeenCalledWith(expect.objectContaining({ danger: true }));
    expect(service.setStatusCalls).toEqual([{ id: row.id, blocked: true }]);
    expect(component.items()![0].status).toBe('blocked');
    expect(toast.success).toHaveBeenCalledWith('حساب مشتری مسدود شد.');
  });

  it('cancel writes the old value back and sends nothing', async () => {
    confirm.confirm.mockResolvedValue(false);
    const row = component.items()![0];
    const control = fakeToggle();

    await component.toggleStatus(row, control);

    expect(service.setStatusCalls).toEqual([]);
    expect(control.writeValue).toHaveBeenCalledWith(true);
  });

  it('rolls the row back when the request fails', async () => {
    service.statusResult = 'fail';
    const row = component.items()![0];
    const control = fakeToggle();

    await component.toggleStatus(row, control);

    expect(component.items()![0].status).toBe('active');
    expect(control.writeValue).toHaveBeenCalledWith(true);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('drops the override once the server returns the new status', async () => {
    const row = component.items()![0];
    await component.toggleStatus(row, fakeToggle());

    service.rows = service.rows.map((item, index) =>
      index === 0 ? { ...item, status: 'blocked' } : item,
    );
    component.onPageSizeChange(10);
    await settle(fixture);

    const overrides = (
      component as unknown as {
        statusOverrides: () => ReadonlyMap<string, string>;
      }
    ).statusOverrides();

    expect(overrides.size).toBe(0);
    expect(component.items()![0].status).toBe('blocked');
  });
});
