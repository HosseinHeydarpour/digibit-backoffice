import { provideRouter } from '@angular/router';
import type { Page } from '@shared/models';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { NEVER, Observable, of, throwError } from 'rxjs';

import type { Coupon, CouponQuery } from '../models/coupon.model';
import { CouponsService } from '../services/coupons.service';

import { CouponList } from './coupon-list';

const DAY = 86_400_000;

function coupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: '1',
    code: 'WELCOME10',
    type: 'percent',
    value: 10,
    minCart: 0,
    maxUses: 1000,
    maxUsesPerUser: 1,
    usedCount: 120,
    from: Date.now() - 5 * DAY,
    to: Date.now() + 20 * DAY,
    description: 'تخفیف اولین خرید',
    isActive: true,
    createdAt: Date.now() - 10 * DAY,
    ...overrides,
  };
}

const SAMPLE_COUPONS: readonly Coupon[] = [
  coupon(),
  coupon({ id: '2', code: 'OFF20', value: 20, usedCount: 318, maxUses: 500 }),
  coupon({ id: '3', code: 'CASH50', type: 'amount', value: 50_000, usedCount: 42, maxUses: 200 }),
  coupon({ id: '4', code: 'FREESHIP', type: 'amount', value: 45_000, maxUsesPerUser: null }),
  coupon({ id: '5', code: 'VIP25', value: 25, isActive: false, usedCount: 7, maxUses: 30 }),
  coupon({ id: '6', code: 'SUMMER15', value: 15, to: Date.now() - 5 * DAY, isActive: false }),
  coupon({ id: '7', code: 'CASH100', type: 'amount', value: 100_000, usedCount: 50, maxUses: 50 }),
  coupon({ id: '8', code: 'GIFT40', type: 'amount', value: 40_000, minCart: 1_000_000 }),
];

class StaticCouponsService implements Pick<CouponsService, 'list'> {
  list(query: CouponQuery = {}): Observable<Page<Coupon>> {
    const pageSize = query.pageSize ?? 10;
    const page = query.page ?? 1;
    const start = (page - 1) * pageSize;

    return of({
      items: SAMPLE_COUPONS.slice(start, start + pageSize),
      total: SAMPLE_COUPONS.length,
      page,
      pageSize,
    });
  }
}

class FlakyCouponsService implements Pick<CouponsService, 'list'> {
  private failed = false;

  list(query: CouponQuery = {}): Observable<Page<Coupon>> {
    if (this.failed) {
      return new StaticCouponsService().list(query);
    }

    this.failed = true;

    return throwError(() => new Error('offline'));
  }
}

const meta: Meta<CouponList> = {
  title: 'Features/Coupons',
  component: CouponList,
  decorators: [applicationConfig({ providers: [provideRouter([])] })],
  parameters: {
    docs: {
      description: {
        component: [
          'Coupons list (BO-J01): code (mono + copy), type badge, value, Jalali validity window,',
          'usage ratio and a DERIVED status pill (expired > exhausted > inactive > active).',
          '',
          '**The status is never stored.** `couponStatus()` reads `to`, `usedCount` and `isActive`',
          'on every render, so the filter, the badge and the toggle cannot disagree about whether a',
          'coupon is usable. The mock derives it the same way on the server side of the wire.',
          '',
          '**The copy button is quiet on failure.** `navigator.clipboard` may be missing or blocked;',
          'the icon then simply never flips to a check, and no error toast fires for a convenience',
          'action.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<CouponList>;

/** Eight coupons: all four statuses, percent and amount, one per-user cap absent. */
export const Default: Story = {
  render: () => ({
    template: '<app-coupon-list />',
    moduleMetadata: {
      providers: [{ provide: CouponsService, useValue: new StaticCouponsService() }],
    },
  }),
};

/** The request has not answered yet: skeleton rows, no table flash. */
export const Loading: Story = {
  render: () => ({
    template: '<app-coupon-list />',
    moduleMetadata: {
      providers: [{ provide: CouponsService, useValue: { list: () => NEVER } }],
    },
  }),
};

/** No coupons yet. */
export const Empty: Story = {
  render: () => ({
    template: '<app-coupon-list />',
    moduleMetadata: {
      providers: [
        {
          provide: CouponsService,
          useValue: { list: () => of({ items: [], total: 0, page: 1, pageSize: 10 }) },
        },
      ],
    },
  }),
};

/** The fetch rejected: the shared error block, with a retry that answers. */
export const RequestFailed: Story = {
  render: () => ({
    template: '<app-coupon-list />',
    moduleMetadata: {
      providers: [{ provide: CouponsService, useValue: new FlakyCouponsService() }],
    },
  }),
};
