import { AfterViewInit, Component, viewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { of } from 'rxjs';

import type { Product, ProductBrandOption, ProductCategoryOption } from '../models/product.model';
import { createVariantGroup } from '../product-variants/variant-form';
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

/** What the story's stub answers to `POST /products`; only the id is read. */
const CREATED: Product = {
  id: '42',
  name: 'هدفون سونی',
  slug: 'hdfon-sony',
  sku: 'SONY-WH1000-BLK',
  categoryId: '3',
  categoryName: 'لوازم برقی',
  brandId: null,
  brandName: null,
  shortDescription: '',
  description: '',
  price: 2_100_000,
  stock: 0,
  lowStockThreshold: 5,
  status: 'draft',
  images: [],
  variants: [],
  createdAt: 1_729_152_000_000,
};

/** The create page only reads the two lookup lists; the real endpoints are stubbed here. */
class CreateProductsService implements Pick<
  ProductsService,
  'categories' | 'brands' | 'create' | 'checkSlug'
> {
  categories() {
    return of(CATEGORIES);
  }

  brands() {
    return of(BRANDS);
  }

  create() {
    return of(CREATED);
  }

  /** BO-F16: a free slug, unless the story asks for the taken state. */
  checkSlug(slug: string) {
    return of({ available: true, suggestion: slug });
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
          'gallery tab is the BO-F11 uploader; inventory edits stock and the low-stock',
          'threshold.',
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
          '',
          '**BO-F12 makes inventory a derived number.** Once the product has variant rows its total',
          'is their sum, the field locks and «خلاصهٔ موجودی» prints the same number, the threshold and',
          'where it came from. «وضعیت موجودی» is computed by `stockLevel()` — the function the list',
          'uses for its badge — instead of a manual available/out-of-stock toggle.',
          '',
          '**BO-F13 submits for real.** `toCreateProductDto()` builds the POST body, both save buttons',
          'bind `submitting` through `pLoading` (spinner + native `disabled`), and the three answers',
          'have three endings: 201 → success toast + edit page, 422 → the message lands on its field',
          'and its tab opens, anything else → a «تلاش دوباره» banner with the form untouched.',
          '',
          '**BO-F14 is the same form in edit mode.** The route resolves the product first, the `edit`',
          'input hydrates all four tabs before the first paint, and saving PUTs to the same id and',
          'stays on the page. A missing id redirects to the 404 page; a failed load shows a retry',
          'block instead of an empty wizard that could create a duplicate.',
          '',
          '**BO-F16 checks the slug while it is typed.** 400 ms after the last keystroke the form asks',
          '`/products/slug-check` (with `excludeId` in edit mode), prints «آزاد است» or the conflict',
          'plus a one-click alternative, previews the public URL and copies it with one button.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<ProductCreate>;

/**
 * Opens on the «موجودی» tab with two variant rows already in place.
 *
 * A story cannot click its way there: the tab strip only moves forward over a
 * VALID main tab, and an empty form blocks it. The host fills the three required
 * fields, adds the variants and then calls the page's own `selectTab`, which is
 * the same method the tab button calls.
 */
@Component({
  selector: 'app-inventory-story',
  imports: [ProductCreate],
  template: '<app-product-create />',
})
class InventoryHost implements AfterViewInit {
  private readonly page = viewChild.required(ProductCreate);

  ngAfterViewInit(): void {
    const page = this.page();
    const fb = new FormBuilder();

    page.form.patchValue({ name: 'هدفون سونی', categoryId: '3', price: 2_100_000 });
    page.variants.push(
      createVariantGroup(fb, { basePrice: 2_100_000, seed: { sku: 'SONY-BLK', stock: 4 } }),
    );
    page.variants.push(
      createVariantGroup(fb, { basePrice: 2_100_000, seed: { sku: 'SONY-WHT', stock: 6 } }),
    );
    page.selectTab('inventory');
  }
}

export const Default: Story = {};

/** A saved product the edit story hands the form through its `edit` input. */
const SAVED_PRODUCT: Product = {
  ...CREATED,
  id: '7',
  name: 'هدفون بی‌سیم سونی WH-1000XM5',
  slug: 'sony-wh1000xm5',
  sku: 'SONY-WH1000-BLK',
  stock: 4,
  lowStockThreshold: 5,
  variants: [
    {
      id: 'v-1',
      sku: 'SONY-BLK',
      attributes: { رنگ: 'مشکی' },
      price: 2_100_000,
      stock: 4,
      imageUrl: null,
    },
  ],
  images: [
    { id: 'img-1', url: '/images/products/7-1.jpg', alt: 'هدفون سونی', isPrimary: true, order: 1 },
  ],
};

/**
 * The same form in edit mode (BO-F14).
 *
 * The only difference is the resolved `edit` input: the page hydrates every tab
 * from it, renames itself «ویرایش محصول», and saves with `PUT /products/:id`
 * instead of POST. No extra component, which is why the story lives beside the
 * create one.
 */
export const Edit: Story = {
  args: { edit: { product: SAVED_PRODUCT } },
};

/**
 * The inventory tab derived from the variant rows (BO-F12 tc 4/9).
 *
 * The stock input is read-only and shows 10 — the sum of 4 + 6 — the source line
 * says «واریانت‌ها», and the status pill reads «موجود» because 10 is above the
 * threshold of 5. Typing a different «آستانهٔ کم‌موجودی» (say 10) flips the pill
 * to «کم‌موجودی» without touching the number.
 */
export const Inventory: Story = {
  render: () => ({
    template: '<app-inventory-story />',
    moduleMetadata: { imports: [InventoryHost] },
  }),
};
