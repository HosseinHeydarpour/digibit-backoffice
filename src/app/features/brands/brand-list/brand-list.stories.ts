import { signal } from '@angular/core';
import { PERMISSIONS } from '@core/auth/permissions.token';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { of } from 'rxjs';
import type { Observable } from 'rxjs';

import type { Brand, BrandListItem, BrandQuery } from '../models/brand.model';
import { BrandsService } from '../services/brands.service';

import { BrandList } from './brand-list';

const ROWS: BrandListItem[] = [
  { id: '6', name: 'سامسونگ', slug: 'brand-6', logo: null, isActive: true, productCount: 6 },
  { id: '1', name: 'سندیسک', slug: 'brand-1', logo: null, isActive: true, productCount: 4 },
  { id: '3', name: 'گلکس‌بیت', slug: 'brand-3', logo: null, isActive: false, productCount: 2 },
];

class StaticBrandsService implements Pick<BrandsService, 'list' | 'get' | 'setActive' | 'remove'> {
  list(query: BrandQuery = {}): Observable<{
    items: BrandListItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return of({ items: ROWS, total: ROWS.length, page: query.page ?? 1, pageSize: 10 });
  }

  get(id: string): Observable<Brand> {
    return of({ ...ROWS[0]!, id, description: '', createdAt: Date.now() });
  }

  setActive(id: string, isActive: boolean): Observable<Brand> {
    return of({ ...ROWS[0]!, id, isActive, description: '', createdAt: Date.now() });
  }

  remove(): Observable<number> {
    return of(0);
  }
}

const meta: Meta<BrandList> = {
  title: 'Features/Brands',
  component: BrandList,
  decorators: [
    applicationConfig({
      providers: [
        { provide: BrandsService, useValue: new StaticBrandsService() },
        { provide: PERMISSIONS, useValue: signal<readonly string[]>(['products.view']) },
      ],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'The brands screen (BO-G05): a paged, searchable list with the row actions.',
          '',
          '**Search is debounced and server-side.** A new query starts at page 1, and the label prints',
          'the server total (`صفحهٔ ۱ از ۳`), not the number of loaded rows.',
          '',
          '**The toggle is optimistic.** The pill flips before the answer and the page reloads if the',
          'API refuses — the interceptor owns the message.',
          '',
          '**Delete warns with the product count.** That brand’s products are unbranded, never deleted.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<BrandList>;

/** The seeded list with the create button and the row actions. */
export const Default: Story = {};
