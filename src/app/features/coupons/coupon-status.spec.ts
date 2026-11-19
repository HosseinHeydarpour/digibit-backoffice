import {
  couponStatus,
  couponStatusBadgeClass,
  couponStatusLabel,
  couponTypeLabel,
  isPercent,
  isUnlimited,
  usagePercent,
  usageTone,
} from './coupon-status';
import type { Coupon } from './models/coupon.model';

const NOW = 1_800_000_000_000;
const DAY = 86_400_000;

function coupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: '1',
    code: 'OFF20',
    type: 'percent',
    value: 20,
    minCart: 0,
    maxUses: 100,
    maxUsesPerUser: 1,
    usedCount: 10,
    from: NOW - 10 * DAY,
    to: NOW + 10 * DAY,
    description: '',
    isActive: true,
    createdAt: NOW - 20 * DAY,
    ...overrides,
  };
}

describe('coupon state (BO-J01)', () => {
  it('is active inside the window with uses left and the switch on', () => {
    expect(couponStatus(coupon(), NOW)).toBe('active');
  });

  it('is inactive when switched off but still valid', () => {
    expect(couponStatus(coupon({ isActive: false }), NOW)).toBe('inactive');
  });

  it('is expired once the end passes, even if the switch is on', () => {
    expect(couponStatus(coupon({ to: NOW - 1 }), NOW)).toBe('expired');
  });

  it('is exhausted when the allowance is used up', () => {
    expect(couponStatus(coupon({ usedCount: 100 }), NOW)).toBe('exhausted');
  });

  it('lets expired win over exhausted and inactive', () => {
    expect(couponStatus(coupon({ to: NOW - 1, usedCount: 100, isActive: false }), NOW)).toBe(
      'expired',
    );
  });

  it('labels every state in Persian and gives each a pill', () => {
    expect(
      ['active', 'inactive', 'expired', 'exhausted'].map((s) => couponStatusLabel(s as never)),
    ).toEqual(['فعال', 'غیرفعال', 'منقضی', 'تمام‌شده']);
    expect(couponStatusBadgeClass('expired')).toContain('red');
    expect(couponStatusBadgeClass('exhausted')).toContain('yellow');
  });

  it('names the two types', () => {
    expect(couponTypeLabel('percent')).toBe('درصدی');
    expect(couponTypeLabel('amount')).toBe('مبلغی');
  });

  it('clamps the usage percentage', () => {
    expect(usagePercent(30, 100)).toBe(30);
    expect(usagePercent(120, 100)).toBe(100);
    expect(usagePercent(-5, 100)).toBe(0);
    expect(usagePercent(1, 0)).toBe(0);
  });

  it('tones the bar: normal, warning above 80%, red at the cap', () => {
    expect(usageTone(coupon({ usedCount: 80, maxUses: 100 }))).toBe('ok');
    expect(usageTone(coupon({ usedCount: 81, maxUses: 100 }))).toBe('warn');
    expect(usageTone(coupon({ usedCount: 100, maxUses: 100 }))).toBe('full');
    expect(usageTone(coupon({ maxUses: 0, usedCount: 500 }))).toBe('ok');
  });

  it('knows an unlimited coupon and the percent type', () => {
    expect(isUnlimited(coupon({ maxUses: 0 }))).toBe(true);
    expect(isUnlimited(coupon({ maxUses: 10 }))).toBe(false);
    expect(isPercent('percent')).toBe(true);
    expect(isPercent('amount')).toBe(false);
  });
});
