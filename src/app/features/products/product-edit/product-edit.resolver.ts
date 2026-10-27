// src/app/features/products/product-edit/product-edit.resolver.ts
//
// The edit page's data loader (BO-F14).
//
// WHY A RESOLVER AND NOT `ngOnInit`
// ---------------------------------
// The form has four tabs and one `FormGroup`. Hydrating from a component method
// means the page paints an empty form first, then fills it — and a user who
// starts typing during that window loses what they typed when the response
// lands. A resolver hands the component a complete product, so the first paint
// is already the saved values (tc 1-4).
//
// WHY THE RESULT IS A WRAPPER, NOT `Product | null`
// -------------------------------------------------
// `null` already means "this is the create route" to the page (no `edit` input).
// A failed load is a THIRD state, and tc 6 asks for its own error block. The
// wrapper keeps the three apart without a boolean beside the data.
//
// WHY 404 REDIRECTS AND OTHER ERRORS STAY
// ---------------------------------------
// tc 5 wants the 404 page for an id that does not exist. Angular 21 lets a
// resolver return a `RedirectCommand`, which cancels the navigation and lands on
// the catch-all `**` route (`ErrorPage`, code 404). A 500 or a dead connection is
// not a missing product, so it returns `{ error }` and the form renders a retry
// block instead of pretending the product vanished.
//
// TRACE — `/products/taken/edit`:
//
//   1. The router matches `:id/edit` and runs this resolver with `id = 'taken'`.
//   2. `GET /products/taken` answers 404 with the real envelope.
//   3. The error interceptor normalises it to `ApiError { status: 404 }` and
//      toasts it, because a 404 is not a validation error. The toast is the
//      last thing the user sees before the 404 page replaces the form.
//   4. The `catch` returns `RedirectCommand('/404')`; the router cancels the
//      navigation and the wildcard route renders the 404 page (tc 5).
//
// TRACE — `/products/7/edit` with the server down:
//
//   1. `GET /products/7` rejects with status 0.
//   2. `catch` returns `{ error: 'دریافت محصول ناموفق بود.' }`.
//   3. The page binds that input and renders the retry block (tc 6); retrying
//      re-runs the resolver because the route declares
//      `runGuardsAndResolvers: 'always'`.

import { inject } from '@angular/core';
import { RedirectCommand, Router } from '@angular/router';
import type { ResolveFn } from '@angular/router';
import { ApiError } from '@shared/models';
import { firstValueFrom } from 'rxjs';

import type { Product } from '../models/product.model';
import { ProductsService } from '../services/products.service';

/** What the edit route hands the form: either a product or a sentence to show. */
export type ProductEditResult = { readonly product: Product } | { readonly error: string };

/** The message the error block prints when the request failed for any non-404 reason. */
export const PRODUCT_EDIT_ERROR = 'دریافت اطلاعات محصول ناموفق بود.';

export const productEditResolver: ResolveFn<ProductEditResult> = async (route) => {
  const products = inject(ProductsService);
  const router = inject(Router);
  const id = route.paramMap.get('id') ?? '';

  try {
    return { product: await firstValueFrom(products.get(id)) };
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) {
      return new RedirectCommand(router.parseUrl('/404'));
    }

    return { error: PRODUCT_EDIT_ERROR };
  }
};
