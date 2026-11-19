// src/app/features/orders/order-detail/order-detail.resolver.ts
//
// The detail page's data loader (BO-H01 tc 10's destination; BO-H03 extends the
// page, not this contract).
//
// Same pattern as `productEditResolver`: the page binds a complete order on its
// first paint, the result is a WRAPPER (`{ order } | { error }`) so a failed
// load is a third state next to the data, a 404 becomes a `RedirectCommand` to
// the catch-all 404 page, and any other failure renders the retry block. Retry
// works because the route declares `runGuardsAndResolvers: 'always'`.
//
// TRACE — `/orders/9999`:
//   1. `GET /orders/9999` answers 404 with the real envelope.
//   2. The error interceptor normalises it to `ApiError { status: 404 }`.
//   3. `catch` returns `RedirectCommand('/404')`; the wildcard renders the 404
//      page instead of a detail page pretending the order exists.
//
// TRACE — `/orders/3` with the server down:
//   1. `GET /orders/3` rejects with status 0.
//   2. `catch` returns `{ error: ORDER_DETAIL_ERROR }`.
//   3. The page renders the retry block; «تلاش دوباره» re-runs this resolver.

import { inject } from '@angular/core';
import { RedirectCommand, Router } from '@angular/router';
import type { ResolveFn } from '@angular/router';
import { ApiError } from '@shared/models';
import { firstValueFrom } from 'rxjs';

import type { Order } from '../models/order.model';
import { OrdersService } from '../services/orders.service';

/** What the detail route hands the page: either an order or a sentence to show. */
export type OrderDetailResult = { readonly order: Order } | { readonly error: string };

/** The message the error block prints when the request failed for any non-404 reason. */
export const ORDER_DETAIL_ERROR = 'دریافت اطلاعات سفارش ناموفق بود.';

export const orderDetailResolver: ResolveFn<OrderDetailResult> = async (route) => {
  const orders = inject(OrdersService);
  const router = inject(Router);
  const id = route.paramMap.get('id') ?? '';

  try {
    return { order: await firstValueFrom(orders.get(id)) };
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) {
      return new RedirectCommand(router.parseUrl('/404'));
    }

    return { error: ORDER_DETAIL_ERROR };
  }
};
