// src/app/core/mock/fixtures/banners.fixture.ts
//
// The banner dataset (BO-L01..L07).
//
// The windows are relative to the REAL clock, like coupons: a banner's
// schedule is a fact about today, and a fixed demo date would turn every row
// «منقضی» after it. The set covers all three schedule states (current, future,
// expired), all three positions, and one row without an image so the
// «active without an image» guard is reachable.

import type { BannerPosition } from '@shared/models';

export interface MockBanner {
  readonly id: string;
  title: string;
  /** Accessible description; the form requires it once an image is chosen. */
  alt: string;
  imageUrl: string;
  link: string;
  readonly position: BannerPosition;
  order: number;
  from: number;
  to: number;
  isActive: boolean;
}

const DAY = 86_400_000;
const NOW = Date.now();

export const MOCK_BANNERS: readonly MockBanner[] = [
  {
    id: '1',
    title: 'تخفیف پاییزه',
    alt: 'بنر نارنجی تخفیف پاییزه',
    imageUrl: '/mock/banner-1.jpg',
    link: '/products',
    position: 'home-top',
    order: 1,
    from: NOW - 5 * DAY,
    to: NOW + 10 * DAY,
    isActive: true,
  },
  {
    id: '2',
    title: 'جشنوارهٔ زمستانه',
    alt: 'بنر جشنوارهٔ زمستانه',
    imageUrl: '/mock/banner-2.jpg',
    link: '/products?sort=newest',
    position: 'home-top',
    order: 2,
    from: NOW + 5 * DAY,
    to: NOW + 25 * DAY,
    isActive: true,
  },
  {
    id: '3',
    title: 'حراج تابستانه',
    alt: 'بنر حراج تابستانه',
    imageUrl: '/mock/banner-3.jpg',
    link: '/products?sort=cheapest',
    position: 'home-top',
    order: 3,
    from: NOW - 40 * DAY,
    to: NOW - 2 * DAY,
    isActive: true,
  },
  {
    id: '4',
    title: 'لوازم جانبی موبایل',
    alt: 'بنر لوازم جانبی موبایل',
    imageUrl: '/mock/banner-4.jpg',
    link: '/categories',
    position: 'home-middle',
    order: 1,
    from: NOW - 3 * DAY,
    to: NOW + 20 * DAY,
    isActive: true,
  },
  {
    id: '5',
    title: 'هدفون و صوتی',
    alt: 'بنر هدفون',
    imageUrl: '/mock/banner-5.jpg',
    link: '/categories',
    position: 'home-middle',
    order: 2,
    from: NOW - 1 * DAY,
    to: NOW + 30 * DAY,
    isActive: false,
  },
  {
    id: '6',
    title: 'پیشنهاد ویژهٔ هفته',
    alt: 'بنر پیشنهاد ویژه',
    imageUrl: '/mock/banner-6.jpg',
    link: '/products',
    position: 'home-middle',
    order: 3,
    from: NOW,
    to: NOW + 7 * DAY,
    isActive: true,
  },
  {
    id: '7',
    title: 'دستهٔ لوازم تحریر',
    alt: 'بنر لوازم تحریر',
    imageUrl: '/mock/banner-7.jpg',
    link: '/categories',
    position: 'sidebar',
    order: 1,
    from: NOW - 10 * DAY,
    to: NOW + 15 * DAY,
    isActive: true,
  },
  {
    id: '8',
    title: 'بنر بدون تصویر',
    alt: 'بنر آزمایشی بدون تصویر',
    imageUrl: '',
    link: 'https://digibit.market/blog',
    position: 'sidebar',
    order: 2,
    from: NOW - 2 * DAY,
    to: NOW + 40 * DAY,
    isActive: false,
  },
];
