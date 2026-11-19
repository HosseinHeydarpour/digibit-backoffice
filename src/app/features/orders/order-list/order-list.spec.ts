import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import type { Page } from '@shared/models';
import { NEVER, Observable, of, throwError } from 'rxjs';

import type { OrderListItem } from '../models/order.model';
import { OrdersService } from '../services/orders.service';

import { OrderList } from './order-list';

const ORDERS: readonly OrderListItem[] = [
  {
    id: 'o-1',
    code: 'ORD-14001',
    customerId: 'c-1',
    customerName: 'زهرا محمدی',
    status: 'pending',
    total: 1_250_000,
    itemCount: 2,
    createdAt: 1729142400000,
  },
  {
    id: 'o-2',
    code: 'ORD-14002',
    customerId: 'c-2',
    customerName: 'علی رضایی',
    status: 'delivered',
    total: 850_000,
    itemCount: 1,
    createdAt: 1729056000000,
  },
  {
    id: 'o-3',
    code: 'ORD-14003',
    customerId: 'c-3',
    customerName: 'مریم حسینی',
    status: 'cancelled',
    total: 340_000,
    itemCount: 3,
    createdAt: 1728969600000,
  },
  {
    id: 'o-4',
    code: 'ORD-14004',
    customerId: 'c-4',
    customerName: 'رضا کریمی',
    status: 'processing',
    total: 490_000,
    itemCount: 1,
    createdAt: 1728883200000,
  },
];

/**
 * Recording stub for the page's only data source (tc 6: «تست واحد با موک
 * سرویس»). The dials cover every outcome a list fetch has: rows, an empty
 * array (tc 7), `NEVER` (tc 8) and a rejection (the error path).
 */
class OrdersServiceStub {
  listCalls = 0;

  rows: readonly OrderListItem[] = ORDERS;

  failWith: string | null = null;

  /** `true` → the request never answers, i.e. the in-flight state. */
  hang = false;

  list(): Observable<Page<OrderListItem>> {
    this.listCalls += 1;
    if (this.hang) {
      return NEVER;
    }
    return this.failWith === null
      ? of({ items: [...this.rows], total: this.rows.length, page: 1, pageSize: 20 })
      : throwError(() => new Error(this.failWith ?? 'request failed'));
  }
}

/** Let the `toSignal` pipeline drain, then render. */
async function settle(fixture: ComponentFixture<OrderList>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OrderList (BO-H01)', () => {
  let fixture: ComponentFixture<OrderList>;
  let component: OrderList;
  let service: OrdersServiceStub;
  let router: Router;

  beforeEach(async () => {
    service = new OrdersServiceStub();

    await TestBed.configureTestingModule({
      imports: [OrderList],
      providers: [
        // The stub, not the real service — this spec IS tc 6.
        { provide: OrdersService, useValue: service },
        // A catch-all so a row click's navigation resolves without an outlet;
        // the assertions read the spy and the rendered href, not a target page.
        provideRouter([{ path: '**', children: [] }]),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  /**
   * Create the page AFTER the stub's dials are set and let the fetch drain:
   * the component subscribes in a field initialiser, so an error test must
   * dial `failWith` before `createComponent`.
   */
  async function mount(): Promise<void> {
    fixture = TestBed.createComponent(OrderList);
    component = fixture.componentInstance;
    await settle(fixture);
  }

  // ─── tc 1 · the table fills from the service ──────────────────────────────

  it('tc 1: renders one row per order the service returns', async () => {
    await mount();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(ORDERS.length);
    expect(rows[0].textContent).toContain('زهرا محمدی');
    // ORD-14001 with every digit converted: ۱۴۰۰۱
    expect(rows[0].textContent).toContain('۱۴۰۰۱');
  });

  // ─── tc 2 · Persian column titles ─────────────────────────────────────────

  it('tc 2: renders the seven columns with Persian titles', async () => {
    await mount();

    const headers = Array.from(
      fixture.nativeElement.querySelectorAll('thead th') as NodeListOf<HTMLElement>,
    ).map((th) => th.textContent.trim());

    expect(headers).toEqual([
      'کد سفارش',
      'مشتری',
      'تعداد اقلام',
      'مبلغ کل',
      'وضعیت',
      'تاریخ ثبت',
      'عملیات',
    ]);
  });

  // ─── tc 3 · Jalali date ───────────────────────────────────────────────────

  it('tc 3: formats the order date as a zero-padded Solar date', async () => {
    await mount();

    const dateCell = fixture.nativeElement.querySelector('tbody tr td:nth-child(6)');
    expect(dateCell.textContent.trim()).toMatch(/^۱۴۰۳\/[۰-۹]{2}\/[۰-۹]{2}$/);
  });

  // ─── tc 4 · amount with separators + تومان ────────────────────────────────

  it('tc 4: formats the total with Persian digits, separators and «تومان»', async () => {
    await mount();

    const totalCell = fixture.nativeElement.querySelector('tbody tr td:nth-child(4)');
    // 1,250,000 with Persian digits and the Arabic thousands separator (U+066C).
    expect(totalCell.textContent).toContain('۱٬۲۵۰٬۰۰۰');
    expect(totalCell.textContent).toContain('تومان');
  });

  // ─── tc 5 · coloured status badges ────────────────────────────────────────

  it('tc 5: shows a coloured pill per status with its Persian label', async () => {
    await mount();

    expect(component.statusLabel('pending')).toBe('در انتظار پرداخت');
    expect(component.statusLabel('delivered')).toBe('تحویلشده');
    expect(component.statusLabel('cancelled')).toBe('لغوشده');

    expect(component.statusBadgeClass('delivered')).toContain('text-green-800');
    expect(component.statusBadgeClass('cancelled')).toContain('text-red-800');
    expect(component.statusBadgeClass('pending')).toContain('text-yellow-800');
    expect(component.statusBadgeClass('processing')).toContain('text-primary');

    const pills = fixture.nativeElement.querySelectorAll('tbody tr td:nth-child(5) span');
    expect(pills.length).toBe(4);
    expect(pills[0].textContent.trim()).toBe('در انتظار پرداخت');
    expect(pills[0].className).toContain('bg-yellow-100');
    expect(pills[1].className).toContain('bg-green-100');
    expect(pills[2].className).toContain('bg-red-100');
  });

  // ─── tc 6 · mocked-service unit test (the suite itself) ───────────────────

  it('tc 6: fetches through the service exactly once on first paint', async () => {
    await mount();

    expect(service.listCalls).toBe(1);
    expect(component.items()?.length).toBe(ORDERS.length);
  });

  // ─── tc 7 · empty state ───────────────────────────────────────────────────

  it('tc 7: shows the empty state (not an empty table) when there are no orders', async () => {
    service.rows = [];
    await mount();

    expect(fixture.nativeElement.querySelector('tbody tr')).toBeNull();

    const status = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
    expect(status).toBeTruthy();
    expect(status.textContent).toContain('هنوز سفارشی ثبت نشده');
    // Orders come from customers: there is no «افزودن سفارش» action to offer.
    expect(status.querySelector('button')).toBeNull();
  });

  it('a stale page number offers the way back to page 1 instead', async () => {
    service.rows = [];
    await mount();

    // The stale-page branch: page 2 with an empty result set (a bookmark left
    // over from a larger shop). Only the template branch is under test here.
    component.paging.set({ ...component.paging(), page: 2 });
    fixture.detectChanges();

    const status = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
    expect(status.textContent).toContain('سفارشی در این صفحه نیست');
    expect(status.querySelector('button')?.textContent).toContain('بازگشت به صفحهٔ اول');
  });

  // ─── tc 8 · loading skeleton ──────────────────────────────────────────────

  it('tc 8: shows a skeleton while the request is in flight', async () => {
    service.hang = true;
    await mount();

    expect(component.state()).toBe('loading');
    const skeleton = fixture.nativeElement.querySelector('[role="status"][aria-busy="true"]');
    expect(skeleton).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('tbody tr.animate-pulse').length).toBe(4);
  });

  // ─── tc 9 · mobile column hiding ──────────────────────────────────────────

  it('tc 9: drops item count below sm and the date below md', async () => {
    await mount();

    const ths = fixture.nativeElement.querySelectorAll('thead th');
    expect(ths[2].className).toContain('hidden');
    expect(ths[2].className).toContain('sm:table-cell');
    expect(ths[5].className).toContain('hidden');
    expect(ths[5].className).toContain('md:table-cell');

    const tds = fixture.nativeElement.querySelectorAll('tbody tr td');
    expect(tds[2].className).toContain('hidden');
    expect(tds[2].className).toContain('sm:table-cell');
    expect(tds[5].className).toContain('hidden');
    expect(tds[5].className).toContain('md:table-cell');
  });

  // ─── tc 10 · row click navigates to the detail page ───────────────────────

  it('tc 10: clicking a row navigates to /orders/:id', async () => {
    await mount();
    const navigate = vi.spyOn(router, 'navigate');

    (fixture.nativeElement.querySelector('tbody tr') as HTMLTableRowElement).click();
    await settle(fixture);

    expect(navigate).toHaveBeenCalledWith(['/orders', 'o-1']);
  });

  it('tc 10: the «جزئیات» link points at the detail route and does not double-navigate', async () => {
    await mount();
    const navigate = vi.spyOn(router, 'navigate');

    const link = fixture.nativeElement.querySelector('tbody tr a[href]') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/orders/o-1');
    expect(link.textContent).toContain('جزئیات');

    link.click();
    await settle(fixture);

    // stopPropagation: the row handler must NOT fire a second navigation.
    expect(navigate).not.toHaveBeenCalled();
  });

  // ─── BO-E07's error path, on a page that owns its fetch ───────────────────

  it('error: shows the error block instead of the table when the fetch rejects', async () => {
    service.failWith = 'network down';
    await mount();

    expect(component.state()).toBe('error');
    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain('دریافت سفارش‌ها ناموفق بود');
    expect(fixture.nativeElement.querySelector('tbody tr')).toBeNull();
  });

  it('error: «تلاش دوباره» re-runs the request and can recover', async () => {
    service.failWith = 'network down';
    await mount();
    expect(service.listCalls).toBe(1);

    service.failWith = null;
    (fixture.nativeElement.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    await settle(fixture);

    expect(service.listCalls).toBe(2);
    expect(component.state()).toBe('data');
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(ORDERS.length);
  });

  // ─── the one switch that drives the template ──────────────────────────────

  it('state() resolves error > loading > empty > data', async () => {
    service.failWith = 'boom';
    await mount();
    expect(component.state()).toBe('error');

    service.failWith = null;
    service.hang = true;
    component.retry();
    await settle(fixture);
    expect(component.state()).toBe('loading');

    service.hang = false;
    service.rows = [];
    component.retry();
    await settle(fixture);
    expect(component.state()).toBe('empty');
  });
});
