// src/app/features/customers/models/customer.model.ts
//
// Types only (the `features/*/models/` rule): the paging helpers and the
// status labels are runtime values and live next to the page that reads them.
//
// A customer is a SHOPPER, not a back-office user. Keeping the two apart is
// deliberate: `SessionUser` answers "who may open this panel", `Customer`
// answers "who bought something", and a single `User` type would let a role
// check be written against a shopper's record.

import type { EntityId, SortOrder } from '@shared/models';
import type { OrderStatus } from '@shared/models/status-badge.model';

/** The account state the list toggles (BO-I03). */
export type CustomerStatus = 'active' | 'blocked';

/** The only sortable column, matching the table header. */
export type CustomerSortField = 'createdAt';

/** One row of the customers table. */
export interface CustomerListItem {
  readonly id: EntityId;
  readonly fullName: string;
  readonly phone: string;
  readonly email: string;
  readonly status: CustomerStatus;
  /**
   * Orders placed by this customer.
   *
   * Counted by the server from the order records, never typed by hand: the list
   * badge and the profile summary print the same number, and a second source
   * would let them disagree.
   */
  readonly orderCount: number;
  /** Total paid, in Toman, with cancelled and returned orders excluded. */
  readonly totalSpent: number;
  /** UTC milliseconds (ARCHITECTURE.md §5). */
  readonly createdAt: number;
}

/** One saved address on the profile. */
export interface CustomerAddress {
  readonly id: EntityId;
  readonly title: string;
  readonly province: string;
  readonly city: string;
  readonly street: string;
  readonly postalCode: string;
  readonly receiver: string;
  readonly phone: string;
  readonly isDefault: boolean;
}

/** The profile record: the list row plus every address. */
export interface Customer extends CustomerListItem {
  readonly addresses: readonly CustomerAddress[];
}

/**
 * The last orders shown on the profile.
 *
 * A projection of the order list, not a second order model: the same ids, codes
 * and totals the orders table prints. `customerName` is absent because the
 * profile already knows whose orders these are.
 */
export interface CustomerOrderSummary {
  readonly id: EntityId;
  readonly code: string;
  readonly status: OrderStatus;
  readonly total: number;
  readonly createdAt: number;
}

/**
 * The list filters.
 *
 * Paging and sort stay in the URL, so this is also what `stateFromParams`
 * rebuilds on a refresh or a shared link (BO-I01 tc 7).
 */
export interface CustomerQuery {
  /** Free text over name, mobile and email. */
  readonly query?: string;
  readonly status?: CustomerStatus;
  readonly page?: number;
  readonly pageSize?: number;
  readonly sort?: CustomerSortField;
  readonly dir?: SortOrder;
}

/** The last-orders request the profile makes next to the customer fetch. */
export interface CustomerOrdersQuery {
  readonly customerId: EntityId;
  readonly pageSize: number;
}
