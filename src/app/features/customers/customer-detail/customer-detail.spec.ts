import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import type { Customer, CustomerOrderSummary } from '../models/customer.model';

import { CustomerDetail } from './customer-detail';
import type { CustomerDetailResult } from './customer-detail.resolver';

const CUSTOMER: Customer = {
  id: '3',
  fullName: 'مریم حسینی',
  phone: '09121000003',
  email: 'customer3@example.com',
  status: 'blocked',
  orderCount: 2,
  totalSpent: 3_200_000,
  createdAt: 1_728_000_000_000,
  addresses: [
    {
      id: '3-1',
      title: 'خانه',
      province: 'تهران',
      city: 'تهران',
      street: 'خیابان ولیعصر، پلاک ۱۲',
      postalCode: '1234567890',
      receiver: 'مریم حسینی',
      phone: '09121000003',
      isDefault: true,
    },
  ],
};

const ORDERS: readonly CustomerOrderSummary[] = [
  {
    id: '1',
    code: 'ORD-14000',
    status: 'delivered',
    total: 1_600_000,
    createdAt: 1_728_000_000_000,
  },
  { id: '2', code: 'ORD-14001', status: 'pending', total: 1_600_000, createdAt: 1_720_000_000_000 },
];

const RESULT: CustomerDetailResult = { customer: CUSTOMER, orders: ORDERS };

describe('CustomerDetail (BO-I02)', () => {
  let fixture: ComponentFixture<CustomerDetail>;

  async function mount(result: CustomerDetailResult | null): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [CustomerDetail],
      providers: [provideRouter([{ path: '**', children: [] }])],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomerDetail);
    fixture.componentRef.setInput('detail', result);
    fixture.detectChanges();
  }

  it('renders contact details, the status and the two summary numbers', async () => {
    await mount(RESULT);
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('مریم حسینی');
    expect(text).toContain('09121000003');
    expect(text).toContain('customer3@example.com');
    expect(text).toContain('مسدود');
    expect(text).toContain('۲'); // order count
    expect(text).toContain('تومان'); // total spent
  });

  it('lists every saved address with its default marker', async () => {
    await mount(RESULT);

    expect(fixture.nativeElement.textContent).toContain('خیابان ولیعصر');
    expect(fixture.nativeElement.textContent).toContain('پیش‌فرض');
    expect(fixture.nativeElement.textContent).toContain('۱۲۳۴۵۶۷۸۹۰');
  });

  it('renders the last orders with a link to each one', async () => {
    await mount(RESULT);

    const links = Array.from(
      fixture.nativeElement.querySelectorAll('a[href]') as NodeListOf<HTMLAnchorElement>,
    ).map((link) => link.getAttribute('href'));

    expect(fixture.nativeElement.textContent).toContain('ORD-۱۴۰۰۰');
    expect(links).toContain('/orders/1');
  });

  it('renders the empty-orders state for a customer who never bought', async () => {
    await mount({ customer: { ...CUSTOMER, orderCount: 0, totalSpent: 0 }, orders: [] });

    expect(fixture.nativeElement.textContent).toContain('این مشتری هنوز سفارشی ندارد');
  });

  it('renders the retry block and re-resolves the same url', async () => {
    await mount({ error: 'دریافت اطلاعات مشتری ناموفق بود.' });
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    expect(fixture.nativeElement.textContent).toContain('دریافت اطلاعات مشتری ناموفق بود');

    const retry = fixture.nativeElement.querySelector(
      'app-error-state button',
    ) as HTMLButtonElement;
    retry.click();

    expect(navigate).toHaveBeenCalledWith(router.url, { onSameUrlNavigation: 'reload' });
  });

  it('never prints a password or credential field', async () => {
    await mount(RESULT);

    expect(fixture.nativeElement.textContent?.toLowerCase()).not.toContain('password');
    expect(fixture.nativeElement.textContent).not.toContain('رمز');
  });
});
