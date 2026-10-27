import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { PERMISSIONS } from '@core/auth/permissions.token';
import type { Page } from '@shared/models';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { NEVER, Observable, of, throwError } from 'rxjs';

import type {
  ProductBrandOption,
  ProductCategoryOption,
  ProductListItem,
  ProductQuery,
} from '../models/product.model';
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
    lowStockThreshold: 5,
    variantsCount: 0,
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
    lowStockThreshold: 5,
    variantsCount: 0,
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
    lowStockThreshold: 5,
    variantsCount: 0,
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
    lowStockThreshold: 5,
    variantsCount: 0,
    status: 'inactive',
    createdAt: 1728883200000,
  },
];

/** 25 deterministic rows so the paginated story has a real second page. */
const PAGINATED_PRODUCTS: readonly ProductListItem[] = Array.from({ length: 25 }, (_, index) => ({
  id: `page-${index + 1}`,
  name: `محصول نمونه ${index + 1}`,
  categoryName: 'لوازم جانبی',
  brandName: 'سونی',
  price: 500_000 + index * 50_000,
  stock: index % 7,
  lowStockThreshold: 5,
  variantsCount: 0,
  status: 'published',
  createdAt: 1728883200000 + index * 86_400_000,
}));

/** Wrap rows in the one-page shape `ProductsService.list()` returns. */
function pageOf(rows: readonly ProductListItem[]): Page<ProductListItem> {
  return { items: [...rows], total: rows.length, page: 1, pageSize: 20 };
}

/** The filter bar's options — same fixture style as the rows. */
const SAMPLE_CATEGORIES: readonly ProductCategoryOption[] = [
  { id: '1', name: 'لوازم جانبی' },
  { id: '2', name: 'صوتی' },
  { id: '3', name: 'نمایشگر' },
];

const SAMPLE_BRANDS: readonly ProductBrandOption[] = [
  { id: '1', name: 'ریزر' },
  { id: '2', name: 'لاجیتک' },
  { id: '3', name: 'سونی' },
  { id: '4', name: 'ال‌جی' },
];

/** The default story's data source — deterministic, and never touches the network. */
class StaticProductsService implements Pick<ProductsService, 'list' | 'categories' | 'brands'> {
  list(): Observable<Page<ProductListItem>> {
    return of(pageOf(SAMPLE_PRODUCTS));
  }

  categories(): Observable<readonly ProductCategoryOption[]> {
    return of(SAMPLE_CATEGORIES);
  }

  brands(): Observable<readonly ProductBrandOption[]> {
    return of(SAMPLE_BRANDS);
  }
}

/** A paging-aware source: page 1 of 25, with 20 rows on screen. */
class PagedProductsService extends StaticProductsService {
  override list(query: ProductQuery = {}): Observable<Page<ProductListItem>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const start = (page - 1) * pageSize;

    return of({
      items: PAGINATED_PRODUCTS.slice(start, start + pageSize),
      total: PAGINATED_PRODUCTS.length,
      page,
      pageSize,
    });
  }
}

/** A service that refuses once, then answers — so «تلاش دوباره» has somewhere to go. */
class FlakyProductsService extends StaticProductsService {
  private failed = false;

  override list(): Observable<Page<ProductListItem>> {
    if (this.failed) {
      return of(pageOf(SAMPLE_PRODUCTS));
    }
    this.failed = true;
    return throwError(() => new Error('offline'));
  }
}

const meta: Meta<ProductList> = {
  title: 'Features/Products',
  component: ProductList,
  decorators: [
    applicationConfig({
      providers: [
        provideRouter([]),
        // Same grant the app's mock config supplies; without it BO-F06 hides
        // every row action, and the catalogue would not show the controls.
        { provide: PERMISSIONS, useValue: signal<readonly string[]>(['products.view']) },
      ],
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
          'BO-F05 changed the service to return a `Page`, so the footer can print the server total',
          'rather than the number of rows currently on screen.',
          '',
          '**BO-F03 adds the filter bar.** Search (name/SKU), category, brand and status are written',
          'to the URL (`?query=&category=&brand=&status=`); the text box is debounced by 300 ms and',
          'the other three apply on change. A refresh or a shared link restores the same filters,',
          'and the filtered empty state offers «پاک کردن فیلترها» instead of «افزودن محصول».',
          '',
          '**BO-F04 adds paging and sort.** The footer shows the server range, lets the user pick',
          '10/20/50 rows, and keeps the current page; clicking name, price or createdAt toggles',
          'asc/desc. `page`, `size`, `sort` and `dir` live in the URL next to the filters, and the',
          'mock sorts numbers (including UTC createdAt) rather than strings.',
          '',
          '**BO-F06 adds row actions.** Edit is a real link; status and delete go through',
          '`ConfirmService` (delete is the red danger dialog), update the row optimistically, and',
          'roll back if the API rejects. On a phone the three controls collapse into one kebab whose',
          'menu is appended to `<body>`, so the table overflow cannot clip it. Actions require the',
          '`products.view` grant.',
          '',
          '**BO-F12 adds the stock level.** The «موجودی» cell prints the number plus a pill when the',
          'row needs attention: `stock === 0` reads «ناموجود» (red number) and',
          '`0 < stock <= lowStockThreshold` reads «کم‌موجودی» (amber). A healthy row prints the number',
          'alone. The comparison is `stockLevel()` in `product-stock.ts`, which the create form uses',
          'too — the two surfaces cannot disagree about what low means.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<ProductList>;

/** The two lookup calls every story's stub needs (the filter bar asks at construction). */
const LOOKUP_STUBS = {
  categories: () => of(SAMPLE_CATEGORIES),
  brands: () => of(SAMPLE_BRANDS),
} as const;

export const Default: Story = {
  render: () => ({
    template: '<app-product-list />',
    moduleMetadata: {
      providers: [{ provide: ProductsService, useValue: new StaticProductsService() }],
    },
  }),
};

/**
 * The footer prints the SERVER total, not the rows on screen (BO-F05).
 *
 * The stub returns four rows and `total: 137`, which is what page 1 of a
 * 137-row catalogue looks like once BO-F04 adds the paginator. The table shows
 * four products; the footer says «۱۳۷ محصول». This is the visible proof that
 * `list()` returns a `Page` whose `total` survives the trip from the API.
 */
export const ServerTotal: Story = {
  render: () => ({
    template: '<app-product-list />',
    moduleMetadata: {
      providers: [
        {
          provide: ProductsService,
          useValue: {
            ...LOOKUP_STUBS,
            list: () => of({ items: [...SAMPLE_PRODUCTS], total: 137, page: 1, pageSize: 20 }),
          },
        },
      ],
    },
  }),
};

/**
 * Page 1 of a 25-row catalogue (BO-F04).
 *
 * The footer says «نمایش ۱ تا ۲۰ از ۲۵ محصول», the numbered pages expose 2, and
 * the size select can switch to 10/50. Clicking page 2 or a sortable header
 * changes the URL and refetches; nothing is filtered locally.
 */
export const Paginated: Story = {
  render: () => ({
    template: '<app-product-list />',
    moduleMetadata: {
      providers: [{ provide: ProductsService, useValue: new PagedProductsService() }],
    },
  }),
};

/**
 * The threshold is per product, not one global number (BO-F12 tc 5).
 *
 * Both rows have a stock of 8. The first one warns because its own threshold is
 * 10; the second one is fine because its threshold is 5. A single shared
 * threshold could not tell these two apart, which is exactly why the field
 * travels in the list row instead of being hard-coded on the page.
 */
export const LowStock: Story = {
  render: () => ({
    template: '<app-product-list />',
    moduleMetadata: {
      providers: [
        {
          provide: ProductsService,
          useValue: {
            ...LOOKUP_STUBS,
            list: () =>
              of(
                pageOf([
                  {
                    ...SAMPLE_PRODUCTS[1],
                    id: 'low-1',
                    name: 'کارتریج تونر (آستانه ۱۰)',
                    stock: 8,
                    lowStockThreshold: 10,
                  },
                  {
                    ...SAMPLE_PRODUCTS[1],
                    id: 'ok-1',
                    name: 'کارتریج تونر (آستانه ۵)',
                    stock: 8,
                    lowStockThreshold: 5,
                    variantsCount: 0,
                  },
                  { ...SAMPLE_PRODUCTS[0], id: 'out-1', name: 'کارتریج تونر (تمام‌شده)', stock: 0 },
                ]),
              ),
          },
        },
      ],
    },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'Two rows with `stock: 8`: the first carries `lowStockThreshold: 10` and shows «کم‌موجودی», ' +
          'the second carries `5` and shows the plain number. The third row is at zero and reads ' +
          '«ناموجود» with a red number, because zero is out, not nearly out.',
      },
    },
  },
};

/** The request has not answered yet (tc 9). */
export const Loading: Story = {
  render: () => ({
    template: '<app-product-list />',
    moduleMetadata: {
      providers: [{ provide: ProductsService, useValue: { ...LOOKUP_STUBS, list: () => NEVER } }],
    },
  }),
};

/** The shop has no products (tc 8). */
export const Empty: Story = {
  render: () => ({
    template: '<app-product-list />',
    moduleMetadata: {
      providers: [
        {
          provide: ProductsService,
          useValue: {
            ...LOOKUP_STUBS,
            list: () => of({ items: [], total: 0, page: 1, pageSize: 20 }),
          },
        },
      ],
    },
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
