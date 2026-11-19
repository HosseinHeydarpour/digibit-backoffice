import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { ToastService } from '@core/services/toast';
import type { Page } from '@shared/models';
import { NEVER, Observable, of, throwError } from 'rxjs';

import type { Coupon, CouponQuery } from '../models/coupon.model';
import { CouponsService } from '../services/coupons.service';

import { CouponList } from './coupon-list';

const DAY = 86_400_000;
const NOW = Date.now();

function coupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: '1',
    code: 'WELCOME10',
    type: 'percent',
    value: 10,
    minCart: 0,
    maxUses: 100,
    maxUsesPerUser: 1,
    usedCount: 20,
    from: NOW - 5 * DAY,
    to: NOW + 5 * DAY,
    description: 'تخفیف',
    isActive: true,
    createdAt: NOW - 10 * DAY,
    ...overrides,
  };
}

const COUPONS: readonly Coupon[] = [
  coupon(),
  coupon({ id: '2', code: 'CASH50', type: 'amount', value: 50_000, usedCount: 90 }),
  coupon({ id: '3', code: 'OLD5', to: NOW - DAY, isActive: false }),
  coupon({ id: '4', code: 'BULK200', usedCount: 100 }),
];

class CouponsServiceStub {
  queries: CouponQuery[] = [];

  rows: readonly Coupon[] = COUPONS;

  total = COUPONS.length;

  failWith: string | null = null;

  hang = false;

  list(query: CouponQuery = {}): Observable<Page<Coupon>> {
    this.queries.push(query);

    if (this.hang) {
      return NEVER;
    }

    return this.failWith === null
      ? of({ items: [...this.rows], total: this.total, page: query.page ?? 1, pageSize: 10 })
      : throwError(() => new Error(this.failWith ?? 'request failed'));
  }
}

async function settle(fixture: ComponentFixture<CouponList>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('CouponList (BO-J01)', () => {
  let fixture: ComponentFixture<CouponList>;
  let component: CouponList;
  let service: CouponsServiceStub;

  beforeEach(async () => {
    service = new CouponsServiceStub();

    await TestBed.configureTestingModule({
      imports: [CouponList],
      providers: [
        { provide: CouponsService, useValue: service },
        { provide: ToastService, useValue: { success: vi.fn() } },
      ],
    }).compileComponents();
  });

  async function mount(): Promise<void> {
    fixture = TestBed.createComponent(CouponList);
    component = fixture.componentInstance;
    await settle(fixture);
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fills the table from the service on first paint', async () => {
    await mount();

    expect(service.queries.length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(4);
    expect(fixture.nativeElement.textContent).toContain('WELCOME10');
  });

  it('renders the six Persian headers', async () => {
    await mount();

    const headers = Array.from(
      fixture.nativeElement.querySelectorAll('thead th') as NodeListOf<HTMLElement>,
    ).map((th) => th.textContent?.trim());

    expect(headers).toEqual(['کد کوپن', 'نوع', 'مقدار', 'بازهٔ اعتبار', 'استفاده', 'وضعیت']);
  });

  it('renders percent, amount, the Jalali range and the usage ratio', async () => {
    await mount();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('۱۰٪');
    expect(text).toContain('تومان');
    expect(text).toMatch(/[۰-۹]+ [آ-ی]+ تا/);
    expect(text).toContain('۲۰ از ۱۰۰');
  });

  it('derives all four statuses and their labels', async () => {
    await mount();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('فعال');
    expect(text).toContain('منقضی');
    expect(text).toContain('تمام‌شده');
  });

  it('filters by status and returns to page 1', async () => {
    await mount();

    component.onStatusChange('expired');

    expect(service.queries.at(-1)).toEqual(expect.objectContaining({ status: 'expired', page: 1 }));
  });

  it('pages and changes the size', async () => {
    service.total = 25;
    await mount();

    component.onPageChange(2);
    expect(service.queries.at(-1)).toEqual(expect.objectContaining({ page: 2 }));

    component.onPageSizeChange(20);
    expect(service.queries.at(-1)).toEqual(expect.objectContaining({ page: 1, pageSize: 20 }));
  });

  it('copies the code and flips the icon for that row', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    await mount();

    component.copyCode(component.items()![0]);
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith('WELCOME10');
    expect(component.copied()).toBe('1');
  });

  it('shows the skeleton while the request is in flight', async () => {
    service.hang = true;
    await mount();

    expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('shows the empty state and the error block with a working retry', async () => {
    service.rows = [];
    service.total = 0;
    await mount();
    expect(fixture.nativeElement.textContent).toContain('هنوز کوپنی ساخته نشده');
  });

  it('recovers from a failed fetch on retry', async () => {
    service.failWith = 'boom';
    await mount();

    expect(fixture.nativeElement.textContent).toContain('دریافت کوپن‌ها ناموفق بود');

    service.failWith = null;
    service.rows = COUPONS;
    const retry = fixture.nativeElement.querySelector(
      'app-error-state button',
    ) as HTMLButtonElement;
    retry.click();
    await settle(fixture);

    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(4);
  });
});

describe('CouponList create/edit (BO-J02)', () => {
  let fixture: ComponentFixture<CouponList>;
  let component: CouponList;
  let service: CouponsServiceStub;
  let toast: { success: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    service = new CouponsServiceStub();
    toast = { success: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CouponList],
      providers: [
        { provide: CouponsService, useValue: service },
        { provide: ToastService, useValue: toast },
        {
          provide: PERMISSIONS,
          useValue: signal(['coupons.view', 'coupons.manage']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CouponList);
    component = fixture.componentInstance;
    await settle(fixture);
  });

  it('renders the create button and the action column for a manager', () => {
    expect(fixture.nativeElement.textContent).toContain('ایجاد کوپن');
    expect(fixture.nativeElement.querySelector('[data-edit-coupon]')).toBeTruthy();
  });

  it('opens an empty form from the create button', async () => {
    component.openCreate();
    fixture.detectChanges();

    expect(component.dialogOpen()).toBe(true);
    expect(component.editing()).toBeNull();
    expect(fixture.nativeElement.querySelector('app-coupon-form')).toBeTruthy();
  });

  it('opens the same form pre-filled from a row', () => {
    const row = component.items()![0];

    component.openEdit(row);
    fixture.detectChanges();

    expect(component.editing()).toBe(row);
    expect(fixture.nativeElement.textContent).toContain('ویرایش کوپن');
  });

  it('toasts, closes and refetches after a save', async () => {
    const calls = service.queries.length;
    component.openCreate();

    component.onSaved({ ...COUPONS[0], id: '13', code: 'SPRING25' });
    await settle(fixture);

    expect(toast.success).toHaveBeenCalledWith('کوپن «SPRING25» ایجاد شد.');
    expect(component.dialogOpen()).toBe(false);
    expect(service.queries.length).toBe(calls + 1);
  });

  it('hides the create and edit controls without coupons.manage', async () => {
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CouponList],
      providers: [
        { provide: CouponsService, useValue: new CouponsServiceStub() },
        { provide: ToastService, useValue: { success: vi.fn() } },
        { provide: PERMISSIONS, useValue: signal(['coupons.view']) },
      ],
    }).compileComponents();

    const restricted = TestBed.createComponent(CouponList);
    await settle(restricted);

    expect(restricted.nativeElement.textContent).not.toContain('ایجاد کوپن');
    expect(restricted.nativeElement.querySelector('[data-edit-coupon]')).toBeNull();
  });
});
