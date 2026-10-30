import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import type { Observable } from 'rxjs';
import { of, throwError } from 'rxjs';

import type { CategoryNode } from '../models/category.model';
import { CategoriesService } from '../services/categories.service';

import { CategoryTree } from './category-tree';

/** A two-level tree with every state the row can show: counts, active, inactive. */
const TREE: readonly CategoryNode[] = [
  {
    id: 'c-1',
    parentId: null,
    description: '',
    name: 'لوازم تحریر',
    slug: 'stationery',
    icon: 'pi pi-pen-to-square',
    order: 1,
    isActive: true,
    productCount: 12,
    children: [
      {
        id: 'c-1-1',
        parentId: 'c-1',
        description: '',
        name: 'دفتر و کاغذ',
        slug: 'paper',
        icon: 'pi pi-book',
        order: 1,
        isActive: true,
        productCount: 7,
        children: [],
      },
      {
        id: 'c-1-2',
        parentId: 'c-1',
        description: '',
        name: 'خودکار و روان‌نویس',
        slug: 'pens',
        icon: 'pi pi-pencil',
        order: 2,
        isActive: false,
        productCount: 0,
        children: [],
      },
    ],
  },
  {
    id: 'c-2',
    parentId: null,
    description: '',
    name: 'لوازم جانبی موبایل',
    slug: 'mobile-accessories',
    icon: 'pi pi-mobile',
    order: 2,
    isActive: true,
    productCount: 3,
    children: [
      {
        id: 'c-2-1',
        parentId: 'c-2',
        description: '',
        name: 'گوشی موبایل',
        slug: 'phones',
        icon: 'pi pi-mobile',
        order: 1,
        isActive: true,
        productCount: 3,
        children: [],
      },
    ],
  },
];

class StaticCategoriesService implements Pick<CategoriesService, 'tree'> {
  tree(): Observable<readonly CategoryNode[]> {
    return of(TREE);
  }
}

class FailingCategoriesService implements Pick<CategoriesService, 'tree'> {
  tree(): Observable<readonly CategoryNode[]> {
    return throwError(() => new Error('offline'));
  }
}

const meta: Meta<CategoryTree> = {
  title: 'Features/Categories',
  component: CategoryTree,
  decorators: [
    applicationConfig({
      providers: [{ provide: CategoriesService, useValue: new StaticCategoriesService() }],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'The category tree (BO-G01): nested `p-tree` data from `GET /categories?tree=true`,',
          'with the name, slug, product count and active/inactive pill on every row.',
          '',
          '**Filtering is local and keeps the hierarchy.** A matching leaf keeps its parent, so the',
          'tree never shows an orphan at the root; a matching parent keeps all of its children.',
          '',
          '**Rows are draggable (BO-G03) with Angular CDK.** Grab the grip and move the row: dropping',
          "it inside a root's list nests it, dropping it between roots makes it a root. A third level",
          'is refused, Escape cancels, and every drop renumbers the level so positions stay 1..N.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<CategoryTree>;

/** The default two-level tree. */
export const Default: Story = {};

/**
 * The fetch failed; the shared error block offers «تلاش دوباره».
 */
export const LoadFailed: Story = {
  decorators: [
    applicationConfig({
      providers: [{ provide: CategoriesService, useValue: new FailingCategoriesService() }],
    }),
  ],
};
