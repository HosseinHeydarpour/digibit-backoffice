import { Meta, StoryObj } from '@storybook/angular';

import type { Order } from '../models/order.model';

import { OrderInvoice } from './order-invoice';

const ORDER: Order = {
  id: '7',
  code: 'ORD-14006',
  customerId: '3',
  customerName: 'مریم حسینی',
  status: 'delivered',
  total: 1_575_000,
  itemCount: 2,
  createdAt: 1_729_152_000_000,
  items: [
    {
      id: 'i1',
      productId: 'p1',
      productName: 'فلش مموری سندیسک',
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
    address: 'خیابان ولیعصر، پلاک ۱۲',
  },
  payment: {
    method: 'پرداخت آنلاین',
    gateway: 'زرین‌پال',
    trackingCode: '202600007919',
    paidAt: 1_729_152_000_000,
  },
  statusHistory: [],
};

const meta: Meta<OrderInvoice> = {
  title: 'Features/Orders/Invoice',
  component: OrderInvoice,
  parameters: {
    docs: {
      description: {
        component: [
          'The printable invoice (BO-H06). `invoice-print` is the only element the print',
          'stylesheet leaves visible; Ctrl+P produces the sheet and no app chrome.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<OrderInvoice>;

/** A delivered order. */
export const Delivered: Story = { args: { order: ORDER } };

/** A cancelled order gets the red stamp. */
export const Cancelled: Story = { args: { order: { ...ORDER, status: 'cancelled' } } };
