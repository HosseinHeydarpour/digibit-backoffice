import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import type { Observable } from 'rxjs';
import { of } from 'rxjs';

import type { CategoryInput, CategoryNode } from '../models/category.model';
import { CategoriesService } from '../services/categories.service';

import { CategoryForm } from './category-form';

const ROOT: CategoryNode = {
  id: 'c-1',
  parentId: null,
  name: 'لوازم تحریر',
  slug: 'stationery',
  icon: 'pi pi-pen-to-square',
  order: 1,
  isActive: true,
  description: 'دفتر و نوشت‌افزار',
  productCount: 12,
  children: [],
};

/** The form only posts; the story never leaves the dialog. */
class StaticCategoriesService implements Pick<CategoriesService, 'create' | 'update'> {
  create(dto: CategoryInput): Observable<CategoryNode> {
    return of({ ...ROOT, ...dto, id: 'c-new' });
  }

  update(_id: string, dto: CategoryInput): Observable<CategoryNode> {
    return of({ ...ROOT, ...dto });
  }
}

const meta: Meta<CategoryForm> = {
  title: 'Features/Categories/Form',
  component: CategoryForm,
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
          "The create/edit category form (BO-G02), rendered inside the tree page's dialog.",
          '',
          '**The slug follows the name until it is edited by hand.** Typing a Persian name calls the',
          'shared `slugify` (`لوازم تحریر` → `accessories-stationery`); a manual edit stops the sync.',
          '',
          '**Duplicate names are per level.** The page hands the form only the nodes at the edited',
          "node's level, so a child may repeat a root's name. A server 422 maps under its field.",
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<CategoryForm>;

/** Creating a new root category. */
export const Create: Story = {
  args: { category: null, siblings: [ROOT] },
};

/** Editing an existing category: every field is prefilled. */
export const Edit: Story = {
  args: { category: ROOT, siblings: [ROOT] },
};
