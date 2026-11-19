import { TestBed } from '@angular/core/testing';

import type { Order } from '../models/order.model';

import { OrderInvoice } from './order-invoice';

const ORDER: Order = {
  id: '7',
  code: 'ORD-14006',
  customerId: '3',
  customerName: 'مریم حسینی',
  status: 'delivered',
  total: 1_575_000,
  itemCount: 1,
  createdAt: 1_729_152_000_000,
  items: [
    {
      id: 'i1',
      productId: 'p1',
      productName: 'فلش مموری',
      productImage: null,
      variantName: '۶۴ گیگ',
      quantity: 2,
      unitPrice: 850_000,
      totalPrice: 1_700_000,
    },
  ],
  subtotal: 1_700_000,
  discount: 125_000,
  shippingCost: 0,
  shippingMethod: 'ارسال رایگان',
  address: {
    fullName: 'مریم حسینی',
    phone: '09121022222',
    province: 'اصفهان',
    city: 'اصفهان',
    postalCode: '1100000000',
    address: 'خیابان ولیعصر',
  },
  payment: {
    method: 'پرداخت آنلاین',
    gateway: 'زرین‌پال',
    trackingCode: '202600007919',
    paidAt: 1_729_152_000_000,
  },
  statusHistory: [],
};

describe('OrderInvoice (BO-H06)', () => {
  async function render(order: Order): Promise<HTMLElement> {
    await TestBed.configureTestingModule({ imports: [OrderInvoice] }).compileComponents();
    const fixture = TestBed.createComponent(OrderInvoice);
    fixture.componentRef.setInput('order', order);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  it('prints the invoice number, customer, gateway and totals', async () => {
    const element = await render(ORDER);

    expect(element.textContent).toContain('ORD-14006');
    expect(element.textContent).toContain('مریم حسینی');
    expect(element.textContent).toContain('زرین‌پال');
    expect(element.textContent).toContain('۱٬۵۷۵٬۰۰۰');
    expect(element.textContent).toContain('رایگان');
    expect(element.querySelector('.invoice-print')).toBeTruthy();
  });

  it('stamps a cancelled order', async () => {
    const element = await render({ ...ORDER, status: 'cancelled' });

    expect(element.textContent).toContain('لغو شده');
  });
});
