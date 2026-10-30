import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import type { Observable } from 'rxjs';
import { of } from 'rxjs';

import type { CategoryNode } from '../models/category.model';
import { CategoriesService } from '../services/categories.service';

import { CategoryDelete } from './category-delete';

const BASE: CategoryNode = {
  id: 'c-1',
  parentId: null,
  name: 'لوازم تحریر',
  slug: 'stationery',
  icon: 'pi pi-pen-to-square',
  order: 1,
  isActive: true,
  description: '',
  productCount: 0,
  children: [],
};

const WITH_PRODUCTS: CategoryNode = { ...BASE, productCount: 12 };

const DEFAULT_BUCKET: CategoryNode = {
  ...BASE,
  name: 'بدون دسته‌بندی',
  slug: 'uncategorized',
  icon: 'pi pi-inbox',
  isDefault: true,
  productCount: 3,
};

const WITH_CHILDREN: CategoryNode = {
  ...BASE,
  name: 'لوازم کامپیوتر',
  slug: 'computer-accessories',
  icon: 'pi pi-desktop',
  children: [
    { ...BASE, id: 'c-1-1', parentId: 'c-1', name: 'کیبورد', slug: 'keyboards' },
    { ...BASE, id: 'c-1-2', parentId: 'c-1', name: 'ماوس', slug: 'mice' },
  ],
};

/** The dialog only deletes; the story never leaves the page. */
class StaticCategoriesService implements Pick<CategoriesService, 'remove'> {
  remove(): Observable<void> {
    return of(undefined);
  }
}

const meta: Meta<CategoryDelete> = {
  title: 'Features/Categories/Delete',
  component: CategoryDelete,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [{ provide: CategoriesService, useValue: new StaticCategoriesService() }],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          "The body of the delete dialog (BO-G04), rendered inside the tree page's own dialog.",
          '',
          '**The default «بدون دسته‌بندی» bucket is protected.** It is where the products of every',
          'deleted category land, so the row has no trash button and the API refuses a stale request.',
          '',
          '**Products never block a delete.** The dialog prints how many will move to the default',
          'bucket above the confirmation, so the re-bucketing is never a surprise.',
          '',
          '**An empty parent asks what happens to its children**: «انتقال» moves them up a level and',
          'keeps their products; «زیردسته‌ها را هم حذف کن» removes the whole branch.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<CategoryDelete>;

/** tc 1: the fallback category — no delete, only «باشه». */
export const Protected: Story = {
  args: { category: DEFAULT_BUCKET, parentName: null },
};

/** tc 2: 12 products would be re-bucketed to «بدون دسته‌بندی». */
export const WithProducts: Story = {
  args: { category: WITH_PRODUCTS, parentName: null },
};

/** tc 3: an empty parent — its two children would move up to the roots. */
export const TransferChildren: Story = {
  args: { category: WITH_CHILDREN, parentName: null },
};
