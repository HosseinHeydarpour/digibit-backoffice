import { Component, inject, signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { PERMISSIONS } from '@core/auth/permissions.token';
import type { Page } from '@shared/models';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { NEVER, Observable, of, throwError } from 'rxjs';

import type { CustomerListItem, CustomerQuery, CustomerStatus } from '../models/customer.model';
import { CustomersService } from '../services/customers.service';

import { CustomerList } from './customer-list';

const STATUS_CYCLE: readonly CustomerStatus[] = ['active', 'blocked', 'active', 'active'];

const NAMES = [
  'زهرا محمدی',
  'علی رضایی',
  'مریم حسینی',
  'رضا کریمی',
  'سارا احمدی',
  'محمد نوری',
  'نگار شریفی',
  'امیر صادقی',
] as const;

/** Eight rows: both statuses, one row with no orders, one long email. */
const SAMPLE_CUSTOMERS: readonly CustomerListItem[] = NAMES.map((fullName, index) => ({
  id: String(index + 1),
  fullName,
  phone: `0912${String(1_000_000 + index * 1379).slice(-7)}`,
  email:
    index === 2
      ? 'maryam.hosseini.with-a-long-address@example.com'
      : `customer${index + 1}@example.com`,
  status: STATUS_CYCLE[index % STATUS_CYCLE.length],
  orderCount: index === 3 ? 0 : (index * 3) % 7,
  totalSpent: index * 1_250_000,
  createdAt: 1_728_000_000_000 - index * 3 * 86_400_000,
}));

function pageOf(
  rows: readonly CustomerListItem[],
  page = 1,
  pageSize = 20,
): Page<CustomerListItem> {
  const start = (page - 1) * pageSize;

  return {
    items: rows.slice(start, start + pageSize),
    total: rows.length,
    page,
    pageSize,
  };
}

/** One page, no server paging: enough for the default and the empty state. */
class StaticCustomersService implements Pick<CustomersService, 'list'> {
  list(): Observable<Page<CustomerListItem>> {
    return of(pageOf(SAMPLE_CUSTOMERS));
  }
}

/** 45 rows: the paginator gets three pages at the default size. */
class PagedCustomersService implements Pick<CustomersService, 'list'> {
  list(query: CustomerQuery = {}): Observable<Page<CustomerListItem>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    return of(pageOf(SAMPLE_CUSTOMERS, page, pageSize));
  }
}

/** Refuses once, then answers — so «تلاش دوباره» has somewhere to go. */
class FlakyCustomersService implements Pick<CustomersService, 'list'> {
  private failed = false;

  list(): Observable<Page<CustomerListItem>> {
    if (this.failed) {
      return of(pageOf(SAMPLE_CUSTOMERS));
    }

    this.failed = true;

    return throwError(() => new Error('offline'));
  }
}

/**
 * Lands on `?page=3` of a small result set — a bookmark left over from a larger
 * shop. The host only writes the URL; the component's own `queryParamMap`
 * subscription does the rest, exactly like a pasted link.
 */
@Component({
  selector: 'app-customers-stale-host',
  imports: [CustomerList],
  template: '<app-customer-list />',
})
class StalePageHost {
  constructor() {
    void inject(Router).navigate([], { queryParams: { page: 3 }, replaceUrl: true });
  }
}

/** A status filter that matches nobody: the filtered empty state (BO-I05). */
@Component({
  selector: 'app-customers-filtered-host',
  imports: [CustomerList],
  template: '<app-customer-list />',
})
class FilteredEmptyHost {
  constructor() {
    void inject(Router).navigate([], { queryParams: { status: 'blocked' }, replaceUrl: true });
  }
}

const meta: Meta<CustomerList> = {
  title: 'Features/Customers',
  component: CustomerList,
  decorators: [
    applicationConfig({
      providers: [
        provideRouter([]),
        // The status switch is gated on this grant; without it every story
        // would show the read-only pill and the toggle would be undocumented.
        { provide: PERMISSIONS, useValue: signal(['customers.view', 'customers.block']) },
      ],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'Customers list (BO-I01): search, account-status filter and paging, all in the URL.',
          'The table shows name (with initials), mobile, email, order count, status pill and the',
          'Jalali signup date; the profile page (BO-I02) is the one place that opens an order.',
          '',
          '**Search is debounced 300 ms; the select applies at once.** `switchMap` cancels the',
          'previous request, so a slow answer for an old query can never paint over the current',
          'one, and a filter change always returns to page 1.',
          '',
          '**Mobile hides the light columns** (BO-I01 tc 10): email below `lg`, mobile and signup',
          'date below `md`, order count below `sm`; name and status stay at every width.',
          '',
          '**The status cell is the switch when `customers.block` is granted** (BO-I03): the',
          'dialog asks first, the pill changes before the answer, and a failed request clears the',
          'override. Cancel, Escape and an offline tab all write the old value back. Without the',
          'grant the read-only pill renders instead.',
          '',
          '**One state, four outcomes (BO-E07):** error > loading > empty > data. `null` rows mean',
          '"not answered yet" and render the skeleton, never an empty shop.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<CustomerList>;

/** Eight customers: both statuses, one with no orders, one long email. */
export const Default: Story = {
  render: () => ({
    template: '<app-customer-list />',
    moduleMetadata: {
      providers: [{ provide: CustomersService, useValue: new StaticCustomersService() }],
    },
  }),
};

/** The paginator's footer at the default size; the service slices by page. */
export const Paginated: Story = {
  render: () => ({
    template: '<app-customer-list />',
    moduleMetadata: {
      providers: [{ provide: CustomersService, useValue: new PagedCustomersService() }],
    },
  }),
};

/** The request has not answered yet: four skeleton rows, no table flash. */
export const Loading: Story = {
  render: () => ({
    template: '<app-customer-list />',
    moduleMetadata: {
      providers: [{ provide: CustomersService, useValue: { list: () => NEVER } }],
    },
  }),
};

/** A shop whose customers table is still empty. */
export const Empty: Story = {
  render: () => ({
    template: '<app-customer-list />',
    moduleMetadata: {
      providers: [
        {
          provide: CustomersService,
          useValue: { list: () => of({ items: [], total: 0, page: 1, pageSize: 20 }) },
        },
      ],
    },
  }),
};

/** The fetch rejected: the shared error block, with a retry that answers. */
export const RequestFailed: Story = {
  render: () => ({
    template: '<app-customer-list />',
    moduleMetadata: {
      providers: [{ provide: CustomersService, useValue: new FlakyCustomersService() }],
    },
  }),
};

/** A filtered search with no hits (BO-I05): different sentence, different way out. */
export const FilteredEmpty: Story = {
  render: () => ({
    template: '<app-customers-filtered-host />',
    moduleMetadata: {
      imports: [FilteredEmptyHost],
      providers: [
        {
          provide: CustomersService,
          useValue: { list: () => of({ items: [], total: 0, page: 1, pageSize: 20 }) },
        },
      ],
    },
  }),
};

/** `?page=3` of a four-row result set: a stale bookmark, not an empty shop. */
export const StalePage: Story = {
  render: () => ({
    template: '<app-customers-stale-host />',
    moduleMetadata: {
      imports: [StalePageHost],
      providers: [{ provide: CustomersService, useValue: new StaticCustomersService() }],
    },
  }),
};
