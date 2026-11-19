// src/app/features/banners/models/banner.model.ts
//
// Types only. The labels are runtime values next to the page.

import type { EntityId } from '@shared/models';

/** The three slots the shop renders (BO-L01's filter). */
export type BannerPosition = 'home-top' | 'home-middle' | 'sidebar';

export interface Banner {
  readonly id: EntityId;
  readonly title: string;
  readonly imageUrl: string;
  readonly link: string;
  readonly position: BannerPosition;
  /** Display order inside its position; 1 is first. */
  readonly order: number;
  /** UTC milliseconds, inclusive. */
  readonly from: number;
  readonly to: number;
  readonly isActive: boolean;
}
