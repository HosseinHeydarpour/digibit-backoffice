import { provideRouter } from '@angular/router';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { NEVER, Observable, of, throwError } from 'rxjs';

import type { ProductListItem } from '../models/product.model';
import { ProductsService } from '../services/products.service';

import { ProductList } from './product-list';

const SAMPLE_PRODUCTS: readonly ProductListItem[] = [
  {
    id: 'p-1001',
    name: 'کیبورد مکانیکی ریزر BlackWidow',
    categoryName: 'لوازم جانبی',
    brandName: 'ریزر',
    price: 1_850_000,
    stock: 0,
    status: 'published',
    createdAt: 1729142400000,
  },
  {
    id: 'p-1002',
    name: 'ماوس گیمینگ لاجیتک G502',
    categoryName: 'لوازم جانبی',
    brandName: 'لاجیتک',
    price: 920_000,
    stock: 3,
    status: 'published',
    createdAt: 1729056000000,
  },
  {
    id: 'p-1003',
    name: 'هدفون بی‌سیم سونی WH-1000XM5',
    categoryName: 'صوتی',
    brandName: 'سونی',
    price: 2_100_000,
    stock: 12,
    status: 'draft',
    createdAt: 1728969600000,
  },
  {
    id: 'p-1004',
    name: 'مانیتور ۲۴ اینچ ال‌جی UltraGear',
    categoryName: 'نمایشگر',
    brandName: 'ال‌جی',
    price: 8_400_000,
    stock: 25,
    status: 'inactive',
    createdAt: 1728883200000,
  },
];

/** A service that refuses once, then answers — so «تلاش دوباره» has somewhere to go. */
class FlakyProductsService implements Pick<ProductsService, 'list'> {
  private failed = false;

  list(): Observable<readonly ProductListItem[]> {
    if (this.failed) {
      return of(SAMPLE_PRODUCTS);
    }
    this.failed = true;
    return throwError(() => new Error('offline'));
  }
}

const meta: Meta<ProductList> = {
  title: 'Features/Products/ProductList',
  component: ProductList,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [provideRouter([])],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'Products list page (BO-F02): the `/products` landing table with name, category, brand,',
          'price (`toman`), stock, status pill, Solar date and an actions column, matching the',
          'Arino admin template.',
          '',
          '**One `state()`, four outcomes (BO-E07).** The page fetches through a `BehaviorSubject`',
          'trigger so it owns its own retry, and `state()` resolves `error > loading > empty > data`.',
          'A rejected fetch never renders as a table or as an empty shop — it renders the shared',
          '`<app-error-state>`, whose «تلاش دوباره» re-runs the same request. `null` rows read as',
          '`loading` (a request in flight is not an empty list), `[]` reads as the shared',
          '`<app-empty-state>` with a way out to the create form.',
          '',
          'The `cols` array carries `field/header/width/sortable`; the sort click itself is BO-F04.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<ProductList>;

export const Default: Story = {};

/** The request has not answered yet (tc 9). */
export const Loading: Story = {
  render: () => ({
    template: '<app-product-list />',
    moduleMetadata: { providers: [{ provide: ProductsService, useValue: { list: () => NEVER } }] },
  }),
};

/** The shop has no products (tc 8). */
export const Empty: Story = {
  render: () => ({
    template: '<app-product-list />',
    moduleMetadata: { providers: [{ provide: ProductsService, useValue: { list: () => of([]) } }] },
  }),
};

/**
 * The fetch rejected; «تلاش دوباره» then succeeds (BO-E07).
 *
 * Named `RequestFailed` and not `Error` on purpose: a module-scoped `const
 * Error` shadows the global `Error` constructor for every later line of this
 * file, and `new Error(...)` in the stub above would stop compiling.
 */
export const RequestFailed: Story = {
  render: () => ({
    template: '<app-product-list />',
    moduleMetadata: {
      providers: [{ provide: ProductsService, useValue: new FlakyProductsService() }],
    },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'The first request fails, so `state()` resolves `error` before the `null` payload could ' +
          'look like "still loading" — the page shows the red `role="alert"` block. Clicking ' +
          '«تلاش دوباره» re-runs the fetch, this stub answers, and the table appears.',
      },
    },
  },
};
