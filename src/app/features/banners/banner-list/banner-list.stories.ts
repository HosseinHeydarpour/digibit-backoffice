import { provideRouter } from '@angular/router';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { NEVER, Observable, of, throwError } from 'rxjs';

import type { Banner } from '../models/banner.model';
import { BannersService } from '../services/banners.service';

import { BannerList } from './banner-list';

/** A tiny inline poster, so the card renders without a CDN. */
const IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E" +
  "%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23ff8229'/%3E" +
  "%3Cstop offset='1' stop-color='%237c2d12'/%3E%3C/linearGradient%3E%3C/defs%3E" +
  "%3Crect width='640' height='360' fill='url(%23g)'/%3E" +
  "%3Ccircle cx='520' cy='80' r='90' fill='%23ffffff' opacity='.14'/%3E" +
  "%3Ctext x='48' y='200' fill='%23ffffff' font-family='sans-serif' font-size='38' font-weight='bold'%3E" +
  'DIGIBIT SALE%3C/text%3E%3C/svg%3E';

const BANNERS: readonly Banner[] = [
  {
    id: '1',
    title: 'تخفیف پاییزه',
    imageUrl: IMAGE,
    link: '/products',
    position: 'home-top',
    order: 1,
    from: 1_728_000_000_000,
    to: 1_730_000_000_000,
    isActive: true,
  },
  {
    id: '2',
    title: 'اسلایدر پیشنهاد ویژه',
    imageUrl: IMAGE,
    link: '/products',
    position: 'home-middle',
    order: 2,
    from: 1_728_000_000_000,
    to: 1_730_000_000_000,
    isActive: true,
  },
  {
    id: '3',
    title: 'بنر کناری دسته‌بندی',
    imageUrl: IMAGE,
    link: '/categories',
    position: 'sidebar',
    order: 1,
    from: 1_728_000_000_000,
    to: 1_730_000_000_000,
    isActive: false,
  },
  {
    id: '4',
    title: 'تصویر خراب (نمونه)',
    imageUrl: '/mock/missing-banner.jpg',
    link: '/products',
    position: 'home-top',
    order: 2,
    from: 1_728_000_000_000,
    to: 1_730_000_000_000,
    isActive: true,
  },
];

class StaticBannersService implements Pick<BannersService, 'list'> {
  list(): Observable<Banner[]> {
    return of([...BANNERS]);
  }
}

class FlakyBannersService implements Pick<BannersService, 'list'> {
  private failed = false;

  list(): Observable<Banner[]> {
    if (this.failed) return of([...BANNERS]);

    this.failed = true;

    return throwError(() => new Error('offline'));
  }
}

const meta: Meta<BannerList> = {
  title: 'Features/Banners',
  component: BannerList,
  decorators: [applicationConfig({ providers: [provideRouter([])] })],
  parameters: {
    docs: {
      description: {
        component: [
          'Banners list (BO-L01): a card grid with the image, position badge, order, Jalali',
          'display window and status. The position filter works on the already-loaded list.',
          '',
          '**A broken image is a card, not a page error.** The card renders an honest placeholder;',
          'the rest of the grid stays usable.',
          '',
          '**Read-only on purpose.** Upload, create/edit, reorder and delete are BO-L02..L07; nothing',
          'here pretends they exist.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<BannerList>;

/** Four cards: header, slider, sidebar, and one broken image. */
export const Default: Story = {
  render: () => ({
    template: '<app-banner-list />',
    moduleMetadata: {
      providers: [{ provide: BannersService, useValue: new StaticBannersService() }],
    },
  }),
};

/** The first paint: three skeleton cards, no layout jump. */
export const Loading: Story = {
  render: () => ({
    template: '<app-banner-list />',
    moduleMetadata: {
      providers: [{ provide: BannersService, useValue: { list: () => NEVER } }],
    },
  }),
};

/** No banner in the shop yet. */
export const Empty: Story = {
  render: () => ({
    template: '<app-banner-list />',
    moduleMetadata: {
      providers: [{ provide: BannersService, useValue: { list: () => of([]) } }],
    },
  }),
};

/** The fetch rejected; retry answers. */
export const RequestFailed: Story = {
  render: () => ({
    template: '<app-banner-list />',
    moduleMetadata: {
      providers: [{ provide: BannersService, useValue: new FlakyBannersService() }],
    },
  }),
};
