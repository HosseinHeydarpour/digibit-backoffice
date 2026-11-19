// src/app/features/coupons/models/coupon.model.ts
//
// Types only (the `features/*/models/` rule). The status derivation, the
// labels and the paging runtime live outside this file.

import type { EntityId } from '@shared/models';

/** A percentage of the cart, or a fixed amount in Toman. */
export type CouponType = 'percent' | 'amount';

/**
 * The four states the list shows and filters on.
 *
 * Derived from the record, never stored: `expired` wins over the switch (a
 * dead window cannot be rescued by toggling), then `exhausted`, then `inactive`
 * (switched off while still valid), else `active`.
 */
export type CouponStatus = 'active' | 'inactive' | 'expired' | 'exhausted';

/** One coupon, as the list and the edit form read it. */
export interface Coupon {
  readonly id: EntityId;
  readonly code: string;
  readonly type: CouponType;
  /** Percent (1..100) for `percent`, Toman for `amount`. */
  readonly value: number;
  /** Minimum cart in Toman; 0 means no floor. */
  readonly minCart: number;
  /** Total redemptions allowed across all customers. */
  readonly maxUses: number;
  /** Redemptions allowed per customer; `null` means no cap. */
  readonly maxUsesPerUser: number | null;
  readonly usedCount: number;
  /** UTC milliseconds, inclusive. */
  readonly from: number;
  /** UTC milliseconds, inclusive. */
  readonly to: number;
  readonly description: string;
  readonly isActive: boolean;
  readonly createdAt: number;
}

/** What the create/edit form sends. The id and usage counters stay server-owned. */
export interface CouponInput {
  readonly code: string;
  readonly type: CouponType;
  readonly value: number;
  readonly minCart: number;
  readonly maxUses: number;
  readonly maxUsesPerUser: number | null;
  readonly from: number;
  readonly to: number;
  readonly description: string;
}

/** The list request. */
export interface CouponQuery {
  /** Free text over the code and the description. */
  readonly query?: string;
  readonly status?: CouponStatus;
  readonly page?: number;
  readonly pageSize?: number;
}
