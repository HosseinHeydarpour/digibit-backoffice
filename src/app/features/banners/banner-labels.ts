// src/app/features/banners/banner-labels.ts
//
// One label table for the position filter and the card badge (BO-L01). A second
// copy would let the filter say «هدر» while the card says «بالای صفحه».

import type { BannerPosition } from './models/banner.model';

export const BANNER_POSITION_LABELS: Readonly<Record<BannerPosition, string>> = {
  'home-top': 'هدر',
  'home-middle': 'اسلایدر',
  sidebar: 'کناری',
};

export function bannerPositionLabel(position: BannerPosition): string {
  return BANNER_POSITION_LABELS[position] ?? position;
}
