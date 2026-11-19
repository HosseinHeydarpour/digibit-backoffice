// src/app/features/shipping/shipping-display.ts
//
// The one place a shipping method's numbers become the sentences the list and
// the form print (BO-K01). A second copy would let the list say «۲ تا ۴ روز»
// while the form's summary says something else.

import { formatDigits } from '@shared/pipes/persian-digits.pipe';
import { formatToman } from '@shared/pipes/toman.pipe';

import type { ShippingMethod } from './models/shipping-method.model';

/** «۲ تا ۴ روز»; a one-day window collapses to «۱ روز». */
export function deliveryWindow(method: Pick<ShippingMethod, 'minDays' | 'maxDays'>): string {
  return method.minDays === method.maxDays
    ? `${formatDigits(method.minDays)} روز`
    : `${formatDigits(method.minDays)} تا ${formatDigits(method.maxDays)} روز`;
}

/** «رایگان» for a zero cost, otherwise the Toman amount. */
export function shippingCostLabel(method: Pick<ShippingMethod, 'cost'>): string {
  return method.cost === 0 ? 'رایگان' : formatToman(method.cost);
}

/**
 * `null` → «—» (no threshold), `0` → «همیشه رایگان», otherwise the amount.
 * The three cases are different promises; one dash for all of them would hide
 * which one the shop made.
 */
export function freeFromLabel(freeFrom: number | null): string {
  if (freeFrom === null) {
    return '—';
  }

  if (freeFrom === 0) {
    return 'همیشه رایگان';
  }

  return `از ${formatToman(freeFrom)}`;
}
