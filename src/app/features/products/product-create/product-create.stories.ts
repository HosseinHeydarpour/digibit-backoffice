import { provideRouter } from '@angular/router';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { of } from 'rxjs';

import type { ProductBrandOption, ProductCategoryOption } from '../models/product.model';
import { ProductsService } from '../services/products.service';

import { ProductCreate } from './product-create';

const CATEGORIES: readonly ProductCategoryOption[] = [
  { id: '3', name: 'لوازم برقی', parentId: null },
  { id: '4', name: 'صوتی', parentId: '3' },
  { id: '5', name: 'نمایشگر', parentId: '3' },
];

const BRANDS: readonly ProductBrandOption[] = [
  { id: '5', name: 'سونی', logo: null },
  { id: '6', name: 'ریزر', logo: null },
  { id: '7', name: 'ال‌جی', logo: null },
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
          'variants, gallery and inventory. The variants tab is the real BO-F10 editor',
          '(add, duplicate, remove with confirmation, per-row attributes and stock); the',
          'gallery panel is a placeholder until BO-F11; inventory edits stock and the',
          'low-stock threshold now.',
          '',
          'The name→slug sync is `slugify` in `product-slug.ts`; the route uses',
          '`unsavedProductChangesGuard` to ask before leaving a dirty form. The real POST is',
          'BO-F13, so «ذخیره» validates and reports the missing fields without navigating.',
          '',
          '**BO-F08** moves the rules into `product-validators.ts`: trimmed name length, ASCII slug,',
          'positive price and non-negative stock, with Persian messages shown only after touch.',
          '`applyServerErrors({ slug: […] })` maps an F13 API envelope onto the matching control.',
          '',
          '**BO-F10** replaces the variants placeholder with `ProductVariantEditor` +',
          '`ProductVariantRow`. Each row is its own `FormGroup`; SKU/price/stock/attributes live',
          'there. A duplicate SKU is flagged on every colliding row, the first row takes the base',
          'price, and removal goes through the shared confirmation dialog.',
          '',
          '**BO-F09** turns the category/brand selects into searchable PrimeNG selects. The category',
          'lookup is cached in `ProductLookupsService` and each option carries a full path',
          '(`لوازم برقی / صوتی`); brand options show a small logo or an initial fallback. Loading and',
          'failure each have their own state, with a per-field retry.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<ProductCreate>;

export const Default: Story = {};
