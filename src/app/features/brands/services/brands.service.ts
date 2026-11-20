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
import { environment } from '@env/environment';
import type { EntityId, Page } from '@shared/models';
import { map } from 'rxjs';
import type { Observable } from 'rxjs';

import type { Brand, BrandInput, BrandListItem, BrandQuery } from '../models/brand.model';

const BRANDS_PATH = '/brands';

@Injectable({ providedIn: 'root' })
export class BrandsService {
  private readonly api = inject(ApiService);

  /**
   * `GET /brands` → the rows, filtered and paged here.
   *
   * The endpoint answers the full array because the storefront's product page
   * needs every brand to resolve a name. The admin catalogue is small in phase 1,
   * so one request plus a local slice keeps the `Page` contract the table wants
   * without a second endpoint.
   */
  list(query: BrandQuery = {}): Observable<Page<BrandListItem>> {
    return this.api.get<BrandListItem[]>(BRANDS_PATH).pipe(
      map((items) => {
        const text = query.query?.trim().toLowerCase() ?? '';
        const filtered =
          text === ''
            ? items
            : items.filter(
                (brand) =>
                  brand.name.toLowerCase().includes(text) ||
                  brand.slug.toLowerCase().includes(text),
              );
        const page = query.page && query.page > 0 ? query.page : 1;
        const pageSize =
          query.pageSize && query.pageSize > 0 ? query.pageSize : environment.DEFAULT_PAGE_SIZE;

        return {
          items: filtered.slice((page - 1) * pageSize, page * pageSize),
          total: filtered.length,
          page,
          pageSize,
        };
      }),
    );
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
   * `POST /media` — the logo bytes, answered with the URL the brand stores
   * (BO-G06).
   *
   * TRACE — `uploadLogo(png)`:
   *
   *   1. `FormData` carries the file under `file`, the name the contract fixes.
   *   2. `ApiService.post` sends it without a manual `Content-Type`; Angular
   *      adds the multipart boundary itself.
   *   3. The 201 body is `{ data: { url } }`, so `map` hands the form one string.
   *
   * The mock answers with a `blob:` URL because it has no CDN; the real endpoint
   * answers an absolute URL. The form treats both as server-owned and never
   * revokes them.
   */
  uploadLogo(file: File): Observable<string> {
    const body = new FormData();
    body.append('file', file);

    return this.api.post<{ url: string }>('/media', body).pipe(map((answer) => answer.url));
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
   * The list refetches after the call, so the response body is not used.
   */
  remove(id: EntityId): Observable<void> {
    return this.api.delete<void>(`${BRANDS_PATH}/${encodeURIComponent(id)}`);
  }
}
