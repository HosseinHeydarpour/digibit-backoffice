import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import type { Observable } from 'rxjs';
import { of } from 'rxjs';

import type { CategoryNode } from '../models/category.model';
import { CategoriesService } from '../services/categories.service';

import { CategoryDelete } from './category-delete';

const EMPTY_ROOT: CategoryNode = {
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

const WITH_PRODUCTS: CategoryNode = {
  ...EMPTY_ROOT,
  name: 'لوازم جانبی موبایل',
  slug: 'mobile-accessories',
  icon: 'pi pi-mobile',
  productCount: 12,
};

const WITH_CHILDREN: CategoryNode = {
  ...EMPTY_ROOT,
  name: 'لوازم کامپیوتر',
  slug: 'computer-accessories',
  icon: 'pi pi-desktop',
  children: [
    { ...EMPTY_ROOT, id: 'c-1-1', parentId: 'c-1', name: 'کیبورد', slug: 'keyboards' },
    { ...EMPTY_ROOT, id: 'c-1-2', parentId: 'c-1', name: 'ماوس', slug: 'mice' },
  ],
};

const BUSY_CHILDREN: CategoryNode = {
  ...WITH_CHILDREN,
  children: [{ ...WITH_CHILDREN.children[0]!, productCount: 5 }],
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
          '**A category with products of its own is not deletable.** The dialog says how many and',
          'offers a single «باشه» — no question, because there is no answer to give.',
          '',
          '**An empty parent asks what happens to its children.** «انتقال» moves them up a level and',
          'keeps their products; «حذف زیردسته‌ها هم» removes the whole branch. The cascade is disabled',
          'while any child holds products, because nothing would reassign them (tc 10).',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<CategoryDelete>;

/** tc 1/2: the node sits on 12 products, so the delete is refused. */
export const Blocked: Story = {
  args: { category: WITH_PRODUCTS, parentName: null },
};

/** tc 3: an empty root — its two children would move up to the roots. */
export const TransferChildren: Story = {
  args: { category: WITH_CHILDREN, parentName: null },
};

/** tc 10: one child sells five products, so only the transfer is offered. */
export const CascadeUnavailable: Story = {
  args: { category: BUSY_CHILDREN, parentName: null },
};
