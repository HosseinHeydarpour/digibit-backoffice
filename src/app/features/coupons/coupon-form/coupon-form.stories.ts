import { provideRouter } from '@angular/router';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';

import type { Coupon } from '../models/coupon.model';

import { CouponForm } from './coupon-form';

const DAY = 86_400_000;

const COUPON: Coupon = {
  id: '1',
  code: 'WELCOME10',
  type: 'percent',
  value: 10,
  minCart: 500_000,
  maxUses: 1000,
  maxUsesPerUser: 1,
  usedCount: 120,
  from: Date.now() - 5 * DAY,
  to: Date.now() + 25 * DAY,
  description: 'تخفیف اولین خرید',
  isActive: true,
  createdAt: Date.now() - 10 * DAY,
};

const meta: Meta<CouponForm> = {
  title: 'Features/Coupons/Form',
  component: CouponForm,
  decorators: [applicationConfig({ providers: [provideRouter([])] })],
  parameters: {
    docs: {
      description: {
        component: [
          'Coupon create/edit form (BO-J02): code with a generator, type, value, Jalali validity',
          'window, total and per-customer caps, minimum cart and a description.',
          '',
          '**One form, two modes.** The open dialog binds `[coupon]`; `ngOnChanges` hydrates or',
          'resets it, and the list re-creates the component on every open so a cancelled edit cannot',
          'leak into the next create.',
          '',
          '**The window is converted at the boundary:** the datepicker controls hold Gregorian',
          '`YYYY-MM-DD`, and `toInput()` sends start-of-day for `from` and END-of-day for `to`, so a',
          'coupon that ends «۱۵ مرداد» still works at 23:59 on the 15th.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<CouponForm>;

/** Create: a fresh form with a 30-day window and an empty code. */
export const Create: Story = {
  args: { coupon: null },
};

/** Edit: the same form hydrated from an existing record. */
export const Edit: Story = {
  args: { coupon: COUPON },
};
