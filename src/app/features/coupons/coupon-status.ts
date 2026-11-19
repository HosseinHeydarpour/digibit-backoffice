// src/app/features/coupons/coupon-status.ts
//
// The single status → label + pill mapping for coupons (BO-J01/J04).
//
// `couponStatus` is the ONLY place the four states are decided. The list badge,
// the status filter and the toggle's guard all call it, so a coupon cannot be
// «منقضی» in the table and "still usable" in the switch.
//
// `now` is a parameter with a default: the tests pin it, the UI lets it default
// to the browser clock. A coupon's expiry is a fact about the current instant,
// so a cached "status" field would be wrong the moment midnight passes.

import type { Coupon, CouponStatus } from './models/coupon.model';

/**
 * `expired` > `exhausted` > `inactive` > `active`.
 *
 * An expired coupon cannot be enabled, so its badge must win over the switch;
 * an exhausted one has no redemptions left and is just as dead.
 */
export function couponStatus(coupon: Coupon, now: number = Date.now()): CouponStatus {
  if (coupon.to < now) {
    return 'expired';
  }

  if (coupon.usedCount >= coupon.maxUses) {
    return 'exhausted';
  }

  return coupon.isActive ? 'active' : 'inactive';
}

export function couponStatusLabel(status: CouponStatus): string {
  switch (status) {
    case 'active':
      return 'فعال';
    case 'inactive':
      return 'غیرفعال';
    case 'expired':
      return 'منقضی';
    case 'exhausted':
      return 'تمام‌شده';
  }
}

/** The pill classes, dark mode included. */
export function couponStatusBadgeClass(status: CouponStatus): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
    case 'inactive':
      return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    case 'expired':
      return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
    case 'exhausted':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
  }
}

/** The coupon type's Persian word, for the type badge. */
export function couponTypeLabel(type: Coupon['type']): string {
  return type === 'percent' ? 'درصدی' : 'مبلغی';
}

/** How much of the total allowance is used, clamped to 0..100. */
export function usagePercent(used: number, max: number): number {
  if (max <= 0) {
    return 100;
  }

  return Math.min(100, Math.max(0, Math.round((used / max) * 100)));
}
