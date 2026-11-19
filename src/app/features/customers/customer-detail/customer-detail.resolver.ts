// src/app/features/customers/customer-detail/customer-detail.resolver.ts
//
// The profile's loader (BO-I02).
//
// Two requests in PARALLEL with `forkJoin`: the customer record and their five
// latest orders. Sequential calls would double the wait for no reason; the two
// are independent and both are needed before the first paint.
//
// The result is a WRAPPER (`{ customer, orders } | { error }`) so the page can
// render a third state next to data, and a 404 becomes a redirect to the
// catch-all page instead of an empty profile. Retry works because the route
// declares `runGuardsAndResolvers: 'always'` and the page reloads the same URL.
//
// TRACE — `/customers/3`:
//   1. `forkJoin({ customer: GET /customers/3, orders: GET /orders?customerId=3&pageSize=5&sort=createdAt&dir=desc })`.
//   2. Both answer, so the field is `{ customer, orders: items }`; the first
//      paint already shows the contact card, the three addresses and the list.
//   3. `/customers/9999` answers 404 → `RedirectCommand('/404')`; a 500 keeps
//      the page and renders the retry block.

import { inject } from '@angular/core';
import { RedirectCommand, Router } from '@angular/router';
import type { ResolveFn } from '@angular/router';
import { ApiError } from '@shared/models';
import { firstValueFrom, forkJoin } from 'rxjs';

import type { Customer, CustomerOrderSummary } from '../models/customer.model';
import { CustomersService } from '../services/customers.service';

/** What the profile route hands the page: the data, or a sentence to show. */
export type CustomerDetailResult =
  | { readonly customer: Customer; readonly orders: readonly CustomerOrderSummary[] }
  | { readonly error: string };

/** The message the retry block prints for any non-404 failure. */
export const CUSTOMER_DETAIL_ERROR = 'دریافت اطلاعات مشتری ناموفق بود.';

export const customerDetailResolver: ResolveFn<CustomerDetailResult> = async (route) => {
  const customers = inject(CustomersService);
  const router = inject(Router);
  const id = route.paramMap.get('id') ?? '';

  try {
    const { customer, orders } = await firstValueFrom(
      forkJoin({
        customer: customers.get(id),
        orders: customers.lastOrders(id),
      }),
    );

    return { customer, orders: orders.items };
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) {
      return new RedirectCommand(router.parseUrl('/404'));
    }

    return { error: CUSTOMER_DETAIL_ERROR };
  }
};
