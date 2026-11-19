import { Component, inject } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import type { Page } from '@shared/models';
import type { OrderStatus } from '@shared/models/status-badge.model';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { NEVER, Observable, of, throwError } from 'rxjs';

import type { OrderListItem, OrderQuery } from '../models/order.model';
import { OrdersService } from '../services/orders.service';

import { OrderList } from './order-list';

const STATUS_CYCLE: readonly OrderStatus[] = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
];

const CUSTOMERS: readonly string[] = [
  'علی رضایی',
  'سارا احمدی',
  'محمد نوری',
  'زهرا موسوی',
  'رضا کمالی',
  'مریم حسینی',
  'مهدی یوسفی',
];

/** Seven rows — one per status, so every badge colour is on screen at once. */
const SAMPLE_ORDERS: readonly OrderListItem[] = STATUS_CYCLE.map((status, index) => ({
  id: `ord-${index + 1}`,
  code: `ORD-${14000 + index}`,
  customerId: `c-${index + 1}`,
  customerName: CUSTOMERS[index],
  status,
  total: 480_000 + index * 310_000,
  itemCount: (index % 4) + 1,
  createdAt: 1729684800000 - index * 32_400_000,
}));

/** 28 deterministic rows so the paginated story has a real second page. */
const PAGINATED_ORDERS: readonly OrderListItem[] = Array.from({ length: 28 }, (_, index) => ({
  id: `ord-${index + 1}`,
  code: `ORD-${14000 + index}`,
  customerId: `c-${(index % CUSTOMERS.length) + 1}`,
  customerName: CUSTOMERS[index % CUSTOMERS.length],
  status: STATUS_CYCLE[index % STATUS_CYCLE.length],
  total: 350_000 + index * 125_000,
  itemCount: (index % 4) + 1,
  createdAt: 1729684800000 - index * 32_400_000,
}));

/** Wrap rows in the one-page shape `OrdersService.list()` returns. */
function pageOf(rows: readonly OrderListItem[]): Page<OrderListItem> {
  return { items: [...rows], total: rows.length, page: 1, pageSize: 20 };
}

/** The story's data source — deterministic, and never touches the network. */
class StaticOrdersService implements Pick<OrdersService, 'list'> {
  list(): Observable<Page<OrderListItem>> {
    return of(pageOf(SAMPLE_ORDERS));
  }
}

/**
 * A paging-and-sort-aware source, like the mock: numbers sort as numbers and
 * the slice happens AFTER the sort, so a header click visibly reorders rows.
 */
class PagedOrdersService implements Pick<OrdersService, 'list'> {
  list(query: OrderQuery = {}): Observable<Page<OrderListItem>> {
    const rows = [...PAGINATED_ORDERS];

    if (query.sort === 'total') {
      rows.sort((a, b) => a.total - b.total);
    } else if (query.sort === 'createdAt') {
      rows.sort((a, b) => a.createdAt - b.createdAt);
    }

    if (query.sort && query.dir === 'desc') {
      rows.reverse();
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const start = (page - 1) * pageSize;

    return of({
      items: rows.slice(start, start + pageSize),
      total: rows.length,
      page,
      pageSize,
    });
  }
}

/** A service that refuses once, then answers — so «تلاش دوباره» has somewhere to go. */
class FlakyOrdersService implements Pick<OrdersService, 'list'> {
  private failed = false;

  list(): Observable<Page<OrderListItem>> {
    if (this.failed) {
      return of(pageOf(SAMPLE_ORDERS));
    }
    this.failed = true;
    return throwError(() => new Error('offline'));
  }
}

/**
 * Lands on `?page=3` of a 25-row shop — a bookmark left over from a larger
 * catalogue. The host only writes the URL; the component's own queryParamMap
 * subscription does the rest, exactly like a pasted link.
 */
@Component({
  selector: 'app-stale-page-host',
  imports: [OrderList],
  template: '<app-order-list />',
})
class StalePageHost {
  constructor() {
    void inject(Router).navigate([], { queryParams: { page: 3 }, replaceUrl: true });
  }
}

const meta: Meta<OrderList> = {
  title: 'Features/Orders',
  component: OrderList,
  decorators: [
    applicationConfig({
      providers: [provideRouter([])],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'Orders list page (BO-H01): the `/orders` landing table with order code, customer,',
          'item count, total (`toman`), status pill, Solar date and a details action, matching',
          'the Arino admin template. Read-only by design — status changes are BO-H04.',
          '',
          '**One `state()`, four outcomes (BO-E07).** `state()` resolves `error > loading >',
          'empty > data`; a rejected fetch renders the shared `<app-error-state>` whose',
          '«تلاش دوباره» re-runs the request, and `null` rows read as loading, never as an',
          'empty shop. An empty page ABOVE page 1 is a stale bookmark, so it offers',
          '«بازگشت به صفحهٔ اول» instead of «no orders yet».',
          '',
          '**Paging and sort live in the URL** (`?page=&size=&sort=&dir=`): a refresh or a',
          'shared link restores the same view, Back/Forward work, and the mock sorts totals',
          'and UTC dates as numbers before slicing. `switchMap` cancels the in-flight request',
          'on rapid page clicks, so a slow page 2 can never overwrite page 3.',
          '',
          '**Row click opens the detail page** (`/orders/:id`, BO-H01 tc 10). The «جزئیات»',
          'link inside the row stops propagation, so one click is one navigation and',
          'ctrl/middle-click still opens a new tab.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<OrderList>;

/** One row per status — all seven badge colours at a glance. */
export const Default: Story = {
  render: () => ({
    template: '<app-order-list />',
    moduleMetadata: {
      providers: [{ provide: OrdersService, useValue: new StaticOrdersService() }],
    },
  }),
};

/**
 * Page 1 of a 28-row shop.
 *
 * The footer says «نمایش ۱ تا ۲۰ از ۲۸ سفارش», page 2 exists, the size select
 * switches to 10/50, and clicking «مبلغ کل» or «تاریخ ثبت» sorts on the server
 * stub and writes `sort`/`dir` to the URL — nothing is sorted locally.
 */
export const Paginated: Story = {
  render: () => ({
    template: '<app-order-list />',
    moduleMetadata: {
      providers: [{ provide: OrdersService, useValue: new PagedOrdersService() }],
    },
  }),
};

/** The request has not answered yet (tc 8): four skeleton rows, no table flash. */
export const Loading: Story = {
  render: () => ({
    template: '<app-order-list />',
    moduleMetadata: {
      providers: [{ provide: OrdersService, useValue: { list: () => NEVER } }],
    },
  }),
};

/** The shop has no orders (tc 7) — and no create button: orders come from checkout. */
export const Empty: Story = {
  render: () => ({
    template: '<app-order-list />',
    moduleMetadata: {
      providers: [
        {
          provide: OrdersService,
          useValue: { list: () => of({ items: [], total: 0, page: 1, pageSize: 20 }) },
        },
      ],
    },
  }),
};

/**
 * The fetch rejected; «تلاش دوباره» then succeeds (BO-E07).
 *
 * Named `RequestFailed` and not `Error` on purpose: a module-scoped `const
 * Error` would shadow the global `Error` constructor used in the stub above.
 */
export const RequestFailed: Story = {
  render: () => ({
    template: '<app-order-list />',
    moduleMetadata: {
      providers: [{ provide: OrdersService, useValue: new FlakyOrdersService() }],
    },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'The first request fails, so `state()` resolves `error` before the `null` payload could ' +
          'look like "still loading". Clicking «تلاش دوباره» re-runs the fetch, this stub answers, ' +
          'and the table appears.',
      },
    },
  },
};

/**
 * A stale page number: `?page=3` while only 25 orders remain (two pages).
 *
 * The empty state reads «سفارشی در این صفحه نیست» and offers «بازگشت به صفحهٔ
 * اول» — clicking it lands on page 1 with rows. A plain "no orders" message
 * here would lie about a shop that clearly has orders.
 */
export const StalePage: Story = {
  render: () => ({
    template: '<app-stale-page-host />',
    moduleMetadata: {
      imports: [StalePageHost],
      providers: [
        {
          provide: OrdersService,
          useValue: {
            list: (query: OrderQuery = {}) => {
              const page = query.page ?? 1;
              const pageSize = query.pageSize ?? 20;
              const start = (page - 1) * pageSize;

              return of({
                items: PAGINATED_ORDERS.slice(0, 25).slice(start, start + pageSize),
                total: 25,
                page,
                pageSize,
              });
            },
          },
        },
      ],
    },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'The host navigates to `?page=3`; the component mirrors the URL into its state and ' +
          'fetches an empty slice of a 25-row shop. The stale-page branch offers the way back ' +
          'to page 1, and the button really works.',
      },
    },
  },
};
