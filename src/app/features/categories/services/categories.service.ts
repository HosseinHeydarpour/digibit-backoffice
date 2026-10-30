import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/services/api';
import type { Observable } from 'rxjs';

import type { CategoryInput, CategoryNode } from '../models/category.model';

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
}
