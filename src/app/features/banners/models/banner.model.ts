// src/app/features/banners/models/banner.model.ts
//
// Types only. The labels are runtime values next to the page.

import type { BannerPosition, EntityId } from '@shared/models';

export interface Banner {
  readonly id: EntityId;
  readonly title: string;
  /** Accessible description; the form requires it once an image is chosen. */
  readonly alt: string;
  readonly imageUrl: string;
  readonly link: string;
  readonly position: BannerPosition;
  /** Display order inside its position; 1 is first. */
  readonly order: number;
  /** UTC milliseconds, inclusive. */
  readonly from: number;
  /** UTC milliseconds, inclusive. */
  readonly to: number;
  readonly isActive: boolean;
}

/** What the create/edit form sends; id and order stay server-owned. */
export interface BannerInput {
  readonly title: string;
  readonly alt: string;
  readonly imageUrl: string;
  readonly link: string;
  readonly position: BannerPosition;
  readonly from: number;
  readonly to: number;
  readonly isActive: boolean;
}

/** The batch reorder body: the ids of one position, in their new order. */
export interface BannerOrderInput {
  readonly position: BannerPosition;
  readonly ids: readonly EntityId[];
}

/** The three schedule states the list prints (BO-L05). */
export type BannerSchedule = 'current' | 'upcoming' | 'expired';
