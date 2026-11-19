// src/app/features/banners/banner-labels.ts
//
// One label table for the position filter and the card badge (BO-L01). A second
// copy would let the filter say «هدر» while the card says «بالای صفحه».

import type { BannerPosition } from '@shared/models';

import type { Banner, BannerSchedule } from './models/banner.model';

export const BANNER_POSITION_LABELS: Readonly<Record<BannerPosition, string>> = {
  'home-top': 'هدر',
  'home-middle': 'اسلایدر',
  sidebar: 'کناری',
};

export function bannerPositionLabel(position: BannerPosition): string {
  return BANNER_POSITION_LABELS[position] ?? position;
}

/**
 * The schedule state at `now` (BO-L05).
 *
 * `current` wins while the window contains now; `upcoming` starts later;
 * `expired` ended before now. The switch (`isActive`) is a different axis: a
 * banner can be active AND expired, and the card must say so.
 */
export function bannerSchedule(
  banner: Pick<Banner, 'from' | 'to'>,
  now: number = Date.now(),
): BannerSchedule {
  if (banner.from > now) {
    return 'upcoming';
  }

  return banner.to < now ? 'expired' : 'current';
}

export function bannerScheduleLabel(schedule: BannerSchedule): string {
  switch (schedule) {
    case 'current':
      return 'در حال نمایش';
    case 'upcoming':
      return 'آینده';
    case 'expired':
      return 'منقضی';
  }
}

export function bannerScheduleBadgeClass(schedule: BannerSchedule): string {
  switch (schedule) {
    case 'current':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'upcoming':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'expired':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
  }
}
