import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import type { DashboardRecentOrder } from '../models/dashboard.model';

import { RecentOrders } from './recent-orders';

const MOCK_8_ORDERS: readonly DashboardRecentOrder[] = [
  {
    id: 'ord-1',
    code: 'ORD-14001',
    customerId: 'c-1',
    customerName: 'علی رضایی',
    status: 'delivered',
    total: 1250000,
    itemCount: 2,
    createdAt: 1723456789000,
  },
  {
    id: 'ord-2',
    code: 'ORD-14002',
    customerId: 'c-2',
    customerName: 'سارا احمدی',
    status: 'processing',
    total: 850000,
    itemCount: 1,
    createdAt: 1723456789000,
  },
  {
    id: 'ord-3',
    code: 'ORD-14003',
    customerId: 'c-3',
    customerName: 'محمد نوری',
    status: 'paid',
    total: 340000,
    itemCount: 3,
    createdAt: 1723456789000,
  },
  {
    id: 'ord-4',
    code: 'ORD-14004',
    customerId: 'c-4',
    customerName: 'زهرا موسوی',
    status: 'shipped',
    total: 490000,
    itemCount: 1,
    createdAt: 1723456789000,
  },
  {
    id: 'ord-5',
    code: 'ORD-14005',
    customerId: 'c-5',
    customerName: 'رضا کمالی',
    status: 'cancelled',
    total: 120000,
    itemCount: 1,
    createdAt: 1723456789000,
  },
  {
    id: 'ord-6',
    code: 'ORD-14006',
    customerId: 'c-6',
    customerName: 'مریم حسینی',
    status: 'returned',
    total: 620000,
    itemCount: 2,
    createdAt: 1723456789000,
  },
  {
    id: 'ord-7',
    code: 'ORD-14007',
    customerId: 'c-7',
    customerName: 'مهدی یوسفی',
    status: 'pending',
    total: 990000,
    itemCount: 4,
    createdAt: 1723456789000,
  },
  {
    id: 'ord-8',
    code: 'ORD-14008',
    customerId: 'c-8',
    customerName: 'نیلوفر امینی',
    status: 'delivered',
    total: 2100000,
    itemCount: 5,
    createdAt: 1723456789000,
  },
];

describe('RecentOrders (BO-E04)', () => {
  let fixture: ComponentFixture<RecentOrders>;
  let component: RecentOrders;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecentOrders],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(RecentOrders);
    component = fixture.componentInstance;
  });

  it('tc 1 & 7: renders exactly 8 order rows when 8 mock orders provided', () => {
    fixture.componentRef.setInput('orders', MOCK_8_ORDERS);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(8);
  });

  it('tc 2: renders correct Persian label and styling classes for status badges', () => {
    fixture.componentRef.setInput('orders', MOCK_8_ORDERS);
    fixture.detectChanges();

    expect(component.statusLabel('delivered')).toBe('تحویلشده');
    expect(component.statusLabel('pending')).toBe('در انتظار پرداخت');
    expect(component.statusLabel('processing')).toBe('در حال پردازش');
    expect(component.statusLabel('shipped')).toBe('ارسالشده');
    expect(component.statusLabel('cancelled')).toBe('لغوشده');
    expect(component.statusLabel('returned')).toBe('مرجوعشده');

    expect(component.statusBadgeClass('delivered')).toContain('text-green-800');
    expect(component.statusBadgeClass('cancelled')).toContain('text-red-800');
    expect(component.statusBadgeClass('paid')).toContain('text-blue-800');
    expect(component.statusBadgeClass('pending')).toContain('text-yellow-800');
    expect(component.statusBadgeClass('shipped')).toContain('text-primary');
  });

  it('tc 3: renders Jalali persianDate in date column', () => {
    fixture.componentRef.setInput('orders', [MOCK_8_ORDERS[0]]);
    fixture.detectChanges();

    const dateCell = fixture.nativeElement.querySelector('tbody tr td:nth-child(2)');
    expect(dateCell.textContent.trim()).toBe('۱۴۰۳/۰۵/۲۲');
  });

  it('tc 4: renders total formatted in Toman with persianDigits', () => {
    fixture.componentRef.setInput('orders', [MOCK_8_ORDERS[0]]);
    fixture.detectChanges();

    const totalCell = fixture.nativeElement.querySelector('tbody tr td:nth-child(4)');
    expect(totalCell.textContent).toContain('۱٬۲۵۰٬۰۰۰\u00A0تومان');
  });

  it('tc 5: emits orderClick output with order ID when a row is clicked', () => {
    fixture.componentRef.setInput('orders', MOCK_8_ORDERS);
    fixture.detectChanges();

    let clickedId = '';
    component.orderClick.subscribe((id: string) => {
      clickedId = id;
    });

    const firstRow = fixture.nativeElement.querySelector('tbody tr');
    firstRow.click();

    expect(clickedId).toBe('ord-1');
  });

  it('tc 6: hides less important column (createdAt) on mobile with hidden sm:table-cell', () => {
    fixture.componentRef.setInput('orders', [MOCK_8_ORDERS[0]]);
    fixture.detectChanges();

    const ths = fixture.nativeElement.querySelectorAll('thead th');
    expect(ths[1].className).toContain('hidden');
    expect(ths[1].className).toContain('sm:table-cell');

    const tds = fixture.nativeElement.querySelectorAll('tbody tr td');
    expect(tds[1].className).toContain('hidden');
    expect(tds[1].className).toContain('sm:table-cell');
  });

  it('tc 8: renders empty state message when orders is empty array or null', () => {
    fixture.componentRef.setInput('orders', []);
    fixture.detectChanges();

    const emptyCell = fixture.nativeElement.querySelector('tbody tr td');
    expect(emptyCell.textContent.trim()).toBe('هیچ سفارشی یافت نشد');
  });

  it('tc 9: "مشاهده همه" link points to /orders', () => {
    fixture.componentRef.setInput('orders', MOCK_8_ORDERS);
    fixture.detectChanges();

    const viewAllLink = fixture.nativeElement.querySelector('a[routerLink="/orders"]');
    expect(viewAllLink).toBeTruthy();
    expect(viewAllLink.getAttribute('href')).toBe('/orders');
  });

  it('tc 10: renders loading skeleton rows when loading input is true', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const skeletonRows = fixture.nativeElement.querySelectorAll('tbody tr.animate-pulse');
    expect(skeletonRows.length).toBe(4);
  });

  // ─── BO-E07: the error path a failed fetch takes ──────────────────────────

  it('tc 2: shows the error block (not the table) when the error input is set', () => {
    fixture.componentRef.setInput('error', 'دریافت سفارشات اخیر ناموفق بود');
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain('دریافت سفارشات اخیر ناموفق بود');
    // The table must not render behind the failure — a dead request must never
    // look like "no orders" or "still loading".
    expect(fixture.nativeElement.querySelector('tbody tr')).toBeNull();
  });

  it('tc 3: emits retry from the error block', () => {
    fixture.componentRef.setInput('error', 'دریافت سفارشات اخیر ناموفق بود');
    fixture.detectChanges();

    let retries = 0;
    component.retry.subscribe(() => {
      retries += 1;
    });

    (fixture.nativeElement.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    expect(retries).toBe(1);
  });

  it('tc 7: state() resolves error > loading > empty > data', () => {
    fixture.componentRef.setInput('error', 'x');
    fixture.componentRef.setInput('orders', null);
    fixture.componentRef.setInput('loading', true);
    expect(component.state()).toBe('error');

    fixture.componentRef.setInput('error', null);
    fixture.componentRef.setInput('loading', true);
    expect(component.state()).toBe('loading');

    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('orders', null);
    // A `null` payload that simply has not answered yet reads as "loading", not
    // "empty" — otherwise the table flashes «هیچ سفارشی یافت نشد» at a user whose
    // request is still in flight.
    expect(component.state()).toBe('loading');

    fixture.componentRef.setInput('orders', []);
    expect(component.state()).toBe('empty');

    fixture.componentRef.setInput('orders', MOCK_8_ORDERS);
    expect(component.state()).toBe('data');
  });
});
