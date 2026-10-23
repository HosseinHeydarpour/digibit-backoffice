// src/app/features/products/services/products.service.ts
//
// The products API surface — BO-F05.
//
// WHY THE QUERY BUILDER LIVES HERE AND NOT IN THE PAGE
// ----------------------------------------------------
// BO-F03/F04 keep the filter and paging state in the URL. If each page had to
// remember how to turn that state into `?query=…&page=…`, the list, the export
// and the eventual search-as-you-type box would each grow their own copy, and a
// new filter would be added in one place and forgotten in three. `buildQuery` is
// the single serialiser, and it is a pure function so the spec can pin it without
// an HTTP test.
//
// WHY `HttpParams` AND NOT A RECORD
// ---------------------------------
// `ApiService` accepts either. A record would be turned into params by
// `toHttpParams` anyway; building the `HttpParams` directly lets this function own
// the "drop empty" rule in one place and lets the spec assert the exact wire
// shape. The service never touches `HttpClient` itself, so the mock interceptor
// (BO-C07) still answers while `environment.useMockApi` is true.

import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/services/api';
import type { EntityId, Page } from '@shared/models';
import { Observable, map } from 'rxjs';

import type {
  CreateProductDto,
  Product,
  ProductBrandOption,
  ProductCategoryOption,
  ProductListItem,
  ProductQuery,
  ProductStatus,
  UpdateProductDto,
} from '../models/product.model';

const PRODUCTS_PATH = '/products';

/**
 * A lookup list (categories/brands) is small and is not paginated in the UI.
 * The real endpoints still use the standard envelope, so `getPage` is the
 * correct reader; 100 is comfortably above the phase-1 catalogue.
 */
const LOOKUP_PAGE_SIZE = 100;

/**
 * Serialise the list state into the query string the API expects.
 *
 * Rules, in one place:
 * - `null`, `undefined`, an empty string and whitespace-only text are **absent**,
 *   not sent as `?query=`. A cleared filter must be genuinely cleared.
 * - `page`/`pageSize` are only sent when positive. `0` is not a page; it is a
 *   component that forgot to initialise, and the server should use its default.
 * - `dir` only travels with a `sort`; a direction alone says nothing.
 *
 * The function is exported (not private) because BO-F03/F04's specs test the
 * mapping directly — the alternative is asserting the same rules through an
 * `HttpTestingController` in every caller, which hides the rule being tested.
 */
export function buildQuery(query: ProductQuery = {}): HttpParams {
  let params = new HttpParams();

  const setText = (key: string, value: string | null | undefined): void => {
    if (value === null || value === undefined) {
      return;
    }

    const text = value.trim();
    if (text === '') {
      return;
    }

    params = params.set(key, text);
  };

  const setPositive = (key: string, value: number | undefined): void => {
    if (value === undefined || !Number.isFinite(value) || value <= 0) {
      return;
    }

    params = params.set(key, String(value));
  };

  setText('query', query.query);
  setText('categoryId', query.categoryId);
  setText('brandId', query.brandId);
  setText('status', query.status);
  setPositive('page', query.page);
  setPositive('pageSize', query.pageSize);
  setText('sort', query.sort);

  if (query.sort) {
    setText('dir', query.dir ?? 'asc');
  }

  return params;
}

/**
 * Products CRUD (BO-F05).
 *
 * Every method returns the exact type the screen needs: `list` a `Page` because
 * the table renders a page and a total, `get`/`create`/`update`/`setStatus` the
 * full `Product` because the edit form binds every tab from one response, and
 * `remove` `void` because the row is simply gone. The error contract is the
 * global one — `ApiService` already normalises failures to `ApiError`, so a 404
 * reaches the caller with `status: 404` and the server's Persian message.
 */
@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly api = inject(ApiService);

  /**
   * `GET /products?query=…&categoryId=…&page=…` → one page of table rows.
   *
   * TRACE — one real list request, end to end:
   *
   *   Input: list({ query: 'سونی', categoryId: '3', page: 2, pageSize: 10,
   *                 sort: 'price', dir: 'desc' })
   *
   *   1. buildQuery() drops nothing here and returns
   *      `query=سونی&categoryId=3&page=2&pageSize=10&sort=price&dir=desc`.
   *   2. ApiService.getPage('/products', params) sends
   *      `GET http://localhost:5000/api/v1/products?…` with `X-Mock: 1`.
   *   3. mockInterceptor's segments() yields ['products']; filterProducts()
   *      keeps rows whose `name + slug + sku` contains «سونی», whose
   *      categoryId is '3', then sorts by price descending.
   *   4. paginate() slices rows 10..19 and returns
   *      `{ data: [...], meta: { page: 2, pageSize: 10, total: N }, message: '' }`.
   *   5. ApiService.toPage() flattens that to
   *      `{ items, total: N, page: 2, pageSize: 10 }`.
   *   6. ProductList stores the Page in its `page` signal; `items()` reads
   *      `page().items` and `total()` reads `page().total` for the footer.
   *
   * Output: at most 10 rows, `total` still the size of the filtered catalogue.
   *
   * The default `{}` is what keeps BO-F02's page working unchanged: it calls
   * `list()` before the filter bar exists, and gets page 1 with the server's
   * default size.
   */
  list(query: ProductQuery = {}): Observable<Page<ProductListItem>> {
    return this.api.getPage<ProductListItem>(PRODUCTS_PATH, buildQuery(query));
  }

  /**
   * `GET /categories?pageSize=100` → the options for the category filter.
   *
   * A lookup, not a feature page: the products module only needs id + name, and
   * filters out a category the API marks inactive (`isActive === false`) so a
   * retired option cannot be selected. `undefined` is treated as active for
   * backward compatibility with older payloads.
   */
  categories(): Observable<readonly ProductCategoryOption[]> {
    return this.api
      .getPage<ProductCategoryOption>('/categories', { pageSize: LOOKUP_PAGE_SIZE })
      .pipe(map((page) => page.items.filter((category) => category.isActive !== false)));
  }

  /** `GET /brands?pageSize=100` → the options for the brand filter (same rules). */
  brands(): Observable<readonly ProductBrandOption[]> {
    return this.api
      .getPage<ProductBrandOption>('/brands', { pageSize: LOOKUP_PAGE_SIZE })
      .pipe(map((page) => page.items.filter((brand) => brand.isActive !== false)));
  }

  /** `GET /products/:id` → the full record, variants and gallery included. */
  get(id: EntityId): Observable<Product> {
    return this.api.get<Product>(`${PRODUCTS_PATH}/${encodeURIComponent(id)}`);
  }

  /** `POST /products` → the created record, with the server-assigned id. */
  create(dto: CreateProductDto): Observable<Product> {
    return this.api.post<Product>(PRODUCTS_PATH, dto);
  }

  /** `PUT /products/:id` → the updated record (BO-F14). */
  update(id: EntityId, dto: UpdateProductDto): Observable<Product> {
    return this.api.put<Product>(`${PRODUCTS_PATH}/${encodeURIComponent(id)}`, dto);
  }

  /**
   * `DELETE /products/:id` → soft delete (BO-F15).
   *
   * The endpoint may return the deleted id; the caller only needs to know the
   * request succeeded, so the body is mapped away instead of leaking a shape the
   * next backend revision could change.
   */
  remove(id: EntityId): Observable<void> {
    return this.api
      .delete<{ id: EntityId }>(`${PRODUCTS_PATH}/${encodeURIComponent(id)}`)
      .pipe(map(() => undefined));
  }

  /**
   * `PATCH /products/:id/status` → publish / draft / inactive (BO-F06).
   *
   * A dedicated endpoint rather than a full `update`: the row action toggles one
   * field, and sending the whole product would let a stale form overwrite a
   * concurrent edit.
   */
  setStatus(id: EntityId, status: ProductStatus): Observable<Product> {
    return this.api.patch<Product>(`${PRODUCTS_PATH}/${encodeURIComponent(id)}/status`, {
      status,
    });
  }
}
