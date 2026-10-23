import { provideRouter } from '@angular/router';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { of } from 'rxjs';

import type { ProductBrandOption, ProductCategoryOption } from '../models/product.model';
import { ProductsService } from '../services/products.service';

import { ProductCreate } from './product-create';

const CATEGORIES: readonly ProductCategoryOption[] = [
  { id: '3', name: 'لوازم برقی' },
  { id: '4', name: 'صوتی' },
  { id: '5', name: 'نمایشگر' },
];

const BRANDS: readonly ProductBrandOption[] = [
  { id: '5', name: 'سونی' },
  { id: '6', name: 'ریزر' },
  { id: '7', name: 'ال‌جی' },
];

/** The create page only reads the two lookup lists; the real endpoints are stubbed here. */
class CreateProductsService implements Pick<ProductsService, 'categories' | 'brands'> {
  categories() {
    return of(CATEGORIES);
  }

  brands() {
    return of(BRANDS);
  }
}

const meta: Meta<ProductCreate> = {
  title: 'Features/Products/Create',
  component: ProductCreate,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [
        provideRouter([]),
        { provide: ProductsService, useValue: new CreateProductsService() },
      ],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'Products create page (BO-F07). Four tabs share one `FormGroup`: main info,',
          'variants, gallery and inventory. The variants/gallery panels are placeholders until',
          'BO-F10/F11; inventory edits stock and the low-stock threshold now.',
          '',
          'The name→slug sync is `slugify` in `product-slug.ts`; the route uses',
          '`unsavedProductChangesGuard` to ask before leaving a dirty form. The real POST is',
          'BO-F13, so «ذخیره» validates and reports the missing fields without navigating.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<ProductCreate>;

export const Default: Story = {};
