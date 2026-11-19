import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ToastService } from '@core/services/toast';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import type { Order } from '../models/order.model';
import { OrdersService } from '../services/orders.service';

import { OrderDetail } from './order-detail';
import { ORDER_DETAIL_ERROR } from './order-detail.resolver';

const ORDER: Order = {
  id: '7',
  code: 'ORD-14006',
  customerId: '3',
  customerName: 'مریم حسینی',
  status: 'delivered',
  total: 1_575_000,
  itemCount: 3,
  createdAt: 1_729_152_000_000,
  items: [
    {
      id: '7-item-1',
      productId: 'p-1',
      productName: 'فلش مموری سندیسک Cruzer',
      productImage: null,
      variantName: '۶۴ گیگ',
      quantity: 2,
      unitPrice: 850_000,
      totalPrice: 1_700_000,
    },
    {
      id: '7-item-2',
      productId: 'p-2',
      productName: 'کابل شارژ تایپ سی',
      productImage: null,
      variantName: null,
      quantity: 1,
      unitPrice: 150_000,
      totalPrice: 150_000,
    },
  ],
  subtotal: 1_850_000,
  discount: 185_000,
  shippingCost: 0,
  shippingMethod: 'ارسال رایگان',
  address: {
    fullName: 'مریم حسینی',
    phone: '09121022222',
    province: 'اصفهان',
    city: 'اصفهان',
    postalCode: '1100000000',
    address: 'خیابان ولیعصر، کوچهٔ شهید نوری، پلاک ۱۲، واحد ۴',
  },
  payment: {
    method: 'پرداخت آنلاین',
    gateway: 'زرین‌پال',
    trackingCode: '202600007919',
    paidAt: 1_729_152_600_000,
  },
  statusHistory: [
    { id: '7-h1', status: 'pending', note: null, createdAt: 1_729_152_000_000 },
    { id: '7-h2', status: 'paid', note: null, createdAt: 1_729_159_200_000 },
    { id: '7-h3', status: 'delivered', note: null, createdAt: 1_729_173_600_000 },
  ],
};

describe('OrderDetail (BO-H01)', () => {
  let fixture: ComponentFixture<OrderDetail>;
  let router: Router;
  let orders: {
    changeStatus: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    orders = {
      changeStatus: vi.fn((_id: string, input: { status: string }) =>
        of({ ...ORDER, status: input.status }),
      ),
      cancel: vi.fn(() => of({ ...ORDER, status: 'cancelled' })),
    };

    await TestBed.configureTestingModule({
      imports: [OrderDetail],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: MessageService, useValue: { add: vi.fn(), clear: vi.fn() } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: OrdersService, useValue: orders },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderDetail);
    router = TestBed.inject(Router);
  });

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('renders every card from the resolved order on first paint', () => {
    fixture.componentRef.setInput('detail', { order: ORDER });
    fixture.detectChanges();

    expect(text()).toContain('اطلاعات سفارش');
    expect(text()).toContain('مشتری و آدرس تحویل');
    expect(text()).toContain('پرداخت');
    expect(text()).toContain('اقلام سفارش');
    expect(text()).toContain('جمع‌بندی مالی');
    expect(text()).toContain('تاریخچه وضعیت');

    expect(text()).toContain('ORD-14006'); // the code keeps Latin digits
    expect(text()).toContain('تحویل شده');
    expect(text()).toContain('مریم حسینی');
    expect(text()).toContain('اصفهان / اصفهان');
    expect(text()).toContain('زرین‌پال');
  });

  it('renders one items row per line, with the variant under the name', () => {
    fixture.componentRef.setInput('detail', { order: ORDER });
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('فلش مموری سندیسک Cruzer');
    expect(rows[0].textContent).toContain('۶۴ گیگ');
    expect(rows[0].textContent).toContain('۱٬۷۰۰٬۰۰۰');
    // A simple product has no variant line to print.
    expect(rows[1].textContent).toContain('کابل شارژ تایپ سی');

    expect(rows[0].querySelector('a[href="/products/p-1"]')).toBeTruthy();
    expect(rows[1].querySelector('a[href="/products/p-2"]')).toBeTruthy();
  });

  it('prints the derived totals and marks free shipping as «رایگان»', () => {
    fixture.componentRef.setInput('detail', { order: ORDER });
    fixture.detectChanges();

    expect(text()).toContain('۱٬۸۵۰٬۰۰۰'); // subtotal
    expect(text()).toContain('۱۸۵٬۰۰'); // discount
    expect(text()).toContain('رایگان');
    expect(text()).toContain('۱٬۵۷۵٬۰۰۰'); // total = subtotal − discount + 0
  });

  it('shows «پرداخت نشده» for an order that never paid', () => {
    const pending: Order = {
      ...ORDER,
      status: 'pending',
      payment: { method: 'پرداخت آنلاین', gateway: null, trackingCode: null, paidAt: null },
    };
    fixture.componentRef.setInput('detail', { order: pending });
    fixture.detectChanges();

    expect(text()).toContain('پرداخت نشده');
    expect(text()).not.toContain('زرین‌پال');
  });

  it('prints the history in order, with a note when one exists', () => {
    const cancelled: Order = {
      ...ORDER,
      status: 'cancelled',
      statusHistory: [
        { id: 'h1', status: 'pending', note: null, createdAt: ORDER.createdAt },
        {
          id: 'h2',
          status: 'cancelled',
          note: 'انصراف مشتری از خرید',
          createdAt: ORDER.createdAt + 7_200_000,
        },
      ],
    };
    fixture.componentRef.setInput('detail', { order: cancelled });
    fixture.detectChanges();

    expect(text()).toContain('این سفارش لغو شده است.');
    expect(text()).toContain('انصراف مشتری از خرید');
    expect(fixture.nativeElement.querySelectorAll('app-order-timeline ol li')).toHaveLength(5);
  });

  it('the back link points at the orders list', () => {
    fixture.componentRef.setInput('detail', { order: ORDER });
    fixture.detectChanges();

    const back = fixture.nativeElement.querySelector('a[href="/orders"]') as HTMLAnchorElement;
    expect(back).toBeTruthy();
    expect(back.textContent).toContain('بازگشت به سفارش‌ها');
  });

  it('copies the Latin order code from the info card', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    fixture.componentRef.setInput('detail', { order: ORDER });
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      'dd button[aria-label^="کپی کد سفارش"]',
    ) as HTMLButtonElement;
    button.click();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith('ORD-14006');
  });

  it('a failed load renders the retry block, not empty cards', () => {
    fixture.componentRef.setInput('detail', { error: ORDER_DETAIL_ERROR });
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain(ORDER_DETAIL_ERROR);
    expect(text()).not.toContain('اقلام سفارش');
  });

  it('«تلاش دوباره» re-navigates with reload so the resolver runs again', () => {
    fixture.componentRef.setInput('detail', { error: ORDER_DETAIL_ERROR });
    fixture.detectChanges();

    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    (fixture.nativeElement.querySelector('[role="alert"] button') as HTMLButtonElement).click();

    expect(navigate).toHaveBeenCalledWith(router.url, { onSameUrlNavigation: 'reload' });
  });

  it('offers only the next status the graph allows (BO-H04)', () => {
    fixture.componentRef.setInput('detail', { order: { ...ORDER, status: 'paid' } });
    fixture.detectChanges();

    const button = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((item) => item.textContent?.includes('تغییر وضعیت'));

    button!.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('تغییر وضعیت سفارش');
    expect(fixture.nativeElement.querySelector('#order-next-status')).toBeTruthy();

    component().statusTarget.setValue('shipped');
    component().applyStatus();

    expect(orders.changeStatus).not.toHaveBeenCalled();
    expect(component().actionError()).toContain('مجاز نیست');
  });

  it('applies an allowed transition and updates the badge', () => {
    fixture.componentRef.setInput('detail', { order: { ...ORDER, status: 'processing' } });
    fixture.detectChanges();

    component().statusTarget.setValue('shipped');
    component().applyStatus();
    fixture.detectChanges();

    expect(orders.changeStatus).toHaveBeenCalledWith('7', { status: 'shipped', note: undefined });
    expect(text()).toContain('ارسال');
  });

  it('refuses a cancel without a reason and sends the chosen one (BO-H07)', () => {
    fixture.componentRef.setInput('detail', { order: { ...ORDER, status: 'processing' } });
    fixture.detectChanges();

    component().confirmCancel();

    expect(orders.cancel).not.toHaveBeenCalled();
    expect(component().actionError()).toContain('دلیل');

    component().cancelReason.setValue('انصراف مشتری');
    component().confirmCancel();
    fixture.detectChanges();

    expect(orders.cancel).toHaveBeenCalledWith('7', { reason: 'انصراف مشتری' });
    expect(text()).toContain('لغو شده');
  });

  function component(): OrderDetail {
    return fixture.componentInstance;
  }
});
