// src/app/features/brands/services/brands.service.ts
//
// The brands screen's data source (BO-G05).
//
// Same shape as `CategoriesService` and `ProductsService`: every call goes through
// `ApiService`, so the mock interceptor answers it in development and the real
// backend answers it later without touching this file.
//
// TRACE — the list page asks for the second page of «سامسونگ»:
//
//   1. `list({ query: 'سامسونگ', page: 2, pageSize: 10 })`.
//   2. `toHttpParams`-style record → `GET /brands?query=…&page=2&pageSize=10`.
//   3. `ApiService.getPage` flattens `{ data, meta }` into `Page<BrandListItem>`,
//      so the table gets `items` and `total` from one answer.
//   4. `total` is what the paginator needs; counting the rows would only count the
//      current page and the «۲ از ۳» label would be wrong.

import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/services/api';
import type { EntityId, Page } from '@shared/models';
import { map } from 'rxjs';
import type { Observable } from 'rxjs';

import type { Brand, BrandInput, BrandListItem, BrandQuery } from '../models/brand.model';

const BRANDS_PATH = '/brands';

@Injectable({ providedIn: 'root' })
export class BrandsService {
  private readonly api = inject(ApiService);

  /** `GET /brands` — paged rows plus the server's `total`. */
  list(query: BrandQuery = {}): Observable<Page<BrandListItem>> {
    return this.api.getPage<BrandListItem>(BRANDS_PATH, {
      query: query.query,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  get(id: EntityId): Observable<Brand> {
    return this.api.get<Brand>(`${BRANDS_PATH}/${encodeURIComponent(id)}`);
  }

  create(dto: BrandInput): Observable<Brand> {
    return this.api.post<Brand>(BRANDS_PATH, dto);
  }

  update(id: EntityId, dto: BrandInput): Observable<Brand> {
    return this.api.put<Brand>(`${BRANDS_PATH}/${encodeURIComponent(id)}`, dto);
  }

  /**
   * `PATCH /brands/:id/status` — the optimistic toggle (tc 6).
   *
   * Its own endpoint, like the products' status, because the row's switch flips
   * before the answer arrives and a full PUT would need the whole form body.
   */
  setActive(id: EntityId, isActive: boolean): Observable<Brand> {
    return this.api.patch<Brand>(`${BRANDS_PATH}/${encodeURIComponent(id)}/status`, { isActive });
  }

  /**
   * `DELETE /brands/:id` — the products stay, they simply lose their brand.
   *
   * The request returns how many products were moved, but the caller only needs
   * "it worked"; the list refetches anyway (tc 7/9).
   */
  remove(id: EntityId): Observable<number> {
    return this.api
      .delete<{ id: EntityId; movedProducts: number }>(`${BRANDS_PATH}/${encodeURIComponent(id)}`)
      .pipe(map((answer) => answer.movedProducts ?? 0));
  }
}
