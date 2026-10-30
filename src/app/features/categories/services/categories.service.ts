import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/services/api';
import type { EntityId } from '@shared/models';
import { map } from 'rxjs';
import type { Observable } from 'rxjs';

import type { CategoryDeleteStrategy, CategoryInput, CategoryNode } from '../models/category.model';

/**
 * The categories screen's data source (BO-G01/G02).
 *
 * `tree=true` is the API contract for nested data: the flat list (`/categories`)
 * is what the product form's select needs, and asking for the tree explicitly
 * keeps the two shapes apart instead of guessing from the response.
 */
@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly api = inject(ApiService);

  tree(): Observable<readonly CategoryNode[]> {
    return this.api.get<readonly CategoryNode[]>(
      '/categories',
      new HttpParams().set('tree', 'true'),
    );
  }

  create(dto: CategoryInput): Observable<CategoryNode> {
    return this.api.post<CategoryNode>('/categories', dto);
  }

  update(id: string, dto: CategoryInput): Observable<CategoryNode> {
    return this.api.put<CategoryNode>(`/categories/${encodeURIComponent(id)}`, dto);
  }

  /**
   * Place a category at a position inside a level (BO-G03 drop).
   *
   * One call carries both halves of a drag: the list it landed in (`parentId`,
   * `null` for the roots) and the slot it landed on (`order`, 1-based). The
   * server renumbers the level, so the client never patches a list of orders.
   */
  place(id: string, parentId: string | null, order: number): Observable<CategoryNode> {
    return this.api.patch<CategoryNode>(`/categories/${encodeURIComponent(id)}`, {
      parentId,
      order,
    });
  }

  /**
   * Delete a category (BO-G04).
   *
   * The strategy travels in the query because it changes what the server does to
   * the CHILDREN, not what is deleted: `transfer` reparents them to the deleted
   * node's parent, `cascade` deletes the branch. A body on a DELETE is legal but
   * proxies strip it, and a query parameter cannot be lost that way.
   *
   * TRACE — «صوتی و تصویری» (a root with one child, zero products) is deleted with
   * the default transfer:
   *
   *   1. This builds `DELETE …/categories/pcat-audio?strategy=transfer`.
   *   2. The envelope's `{ id }` is mapped away: the caller only needs "the row is
   *      gone", and the next tree read is the source of truth (tc 9).
   *   3. A 409 — products appeared in another tab meanwhile — reaches the dialog as
   *      an `ApiError` carrying the server's Persian message, which the inline
   *      banner prints instead of pretending the row was removed.
   */
  remove(id: string, strategy: CategoryDeleteStrategy): Observable<void> {
    return this.api
      .delete<{ id: EntityId }>(`/categories/${encodeURIComponent(id)}`, {
        strategy,
      })
      .pipe(map(() => undefined));
  }
}
