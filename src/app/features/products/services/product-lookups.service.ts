// src/app/features/products/services/product-lookups.service.ts
//
// A cached, root-scoped view of the two lookup lists the product form needs
// (BO-F09). Categories and brands change rarely; fetching them on every visit
// to `/products/new` would be two requests per visit for data that is usually
// identical.
//
// WHY A SERVICE AND NOT A RESOLVER
// --------------------------------
// A resolver would block navigation until both lists arrive, and a failure
// would cancel the navigation — the user would never see the form or its
// "بارگذاری ناموفق بود" retry. The page wants to render immediately and show a
// per-field loading/error state. A root service keeps the last successful state
// across visits and gives the page a signal to render.
//
// WHY `BehaviorSubject` + `toSignal`
// ----------------------------------
// One reload trigger per list means "retry" is a single `next()` and the same
// pipeline owns loading → loaded/error. `toSignal` subscribes once for the
// lifetime of the root service, so every consumer shares the cache.

import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, concat, map, of, switchMap } from 'rxjs';

import type { ProductBrandOption, ProductCategoryOption } from '../models/product.model';

import { ProductsService } from './products.service';

type LookupStatus = 'loading' | 'loaded' | 'error';

interface LookupState<T> {
  readonly status: LookupStatus;
  readonly items: readonly T[];
}

/**
 * TRACE — the first visit and one retry:
 *
 *   1. `ProductCreate` injects this service; the constructor's `BehaviorSubject`s
 *      emit once, so both lists start in `loading` with `items: []`.
 *   2. `categories()` sends `GET /categories?pageSize=100`; the page renders two
 *      selects with spinners while the rest of the form is usable.
 *   3. The response maps to `{ status: 'loaded', items }`; the template's
 *      `categoryOptions` computed turns it into `path`/`level` rows.
 *   4. If the request fails, `catchError` stores `{ status: 'error', items: [] }`
 *      and keeps the stream alive. The retry button calls `reloadCategories()`,
 *      whose `next()` re-enters `switchMap`: `concat` emits `loading` first and
 *      then the new request. The brands list is untouched.
 *   5. A second component that injects this service reads the same signals —
 *      no second HTTP request until an explicit reload.
 */
@Injectable({ providedIn: 'root' })
export class ProductLookupsService {
  private readonly products = inject(ProductsService);

  private readonly categoryReload = new BehaviorSubject<void>(undefined);

  private readonly brandReload = new BehaviorSubject<void>(undefined);

  private readonly categoryState = toSignal(
    this.categoryReload.pipe(
      switchMap(() =>
        concat(
          of<LookupState<ProductCategoryOption>>({ status: 'loading', items: [] }),
          this.products.categories().pipe(
            map((items): LookupState<ProductCategoryOption> => ({ status: 'loaded', items })),
            catchError(() =>
              of<LookupState<ProductCategoryOption>>({ status: 'error', items: [] }),
            ),
          ),
        ),
      ),
    ),
    {
      initialValue: { status: 'loading', items: [] } as LookupState<ProductCategoryOption>,
    },
  );

  private readonly brandState = toSignal(
    this.brandReload.pipe(
      switchMap(() =>
        concat(
          of<LookupState<ProductBrandOption>>({ status: 'loading', items: [] }),
          this.products.brands().pipe(
            map((items): LookupState<ProductBrandOption> => ({ status: 'loaded', items })),
            catchError(() => of<LookupState<ProductBrandOption>>({ status: 'error', items: [] })),
          ),
        ),
      ),
    ),
    {
      initialValue: { status: 'loading', items: [] } as LookupState<ProductBrandOption>,
    },
  );

  readonly categories = computed(() => this.categoryState().items);

  readonly categoriesLoading = computed(() => this.categoryState().status === 'loading');

  readonly categoriesError = computed(() => this.categoryState().status === 'error');

  readonly brands = computed(() => this.brandState().items);

  readonly brandsLoading = computed(() => this.brandState().status === 'loading');

  readonly brandsError = computed(() => this.brandState().status === 'error');

  /** Re-runs only the categories request; the cached brands stay untouched. */
  reloadCategories(): void {
    this.categoryReload.next();
  }

  /** Re-runs only the brands request. */
  reloadBrands(): void {
    this.brandReload.next();
  }
}
