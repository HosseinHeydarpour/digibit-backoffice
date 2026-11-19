// src/app/features/shipping/models/shipping-method.model.ts
//
// Types only. The labels, the warning and the day summary are runtime values
// and live next to the page that reads them.

import type { EntityId } from '@shared/models';

export interface ShippingMethod {
  readonly id: EntityId;
  readonly name: string;
  /** Base cost in Toman; 0 is a free method. */
  readonly cost: number;
  /** Cart total from which shipping is free; `null` = no free threshold. */
  readonly freeFrom: number | null;
  readonly minDays: number;
  readonly maxDays: number;
  readonly isDefault: boolean;
  readonly isActive: boolean;
  readonly order: number;
}

/** What the create/edit form sends; default state and order stay server-owned. */
export interface ShippingMethodInput {
  readonly name: string;
  readonly cost: number;
  readonly freeFrom: number | null;
  readonly minDays: number;
  readonly maxDays: number;
}

/** The delete answer: a method used by orders is switched off, not removed. */
export interface ShippingDeleteResult {
  readonly deleted: boolean;
  readonly method?: ShippingMethod;
}
