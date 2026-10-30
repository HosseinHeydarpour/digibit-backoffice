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
   * Move a category under another (or back to the root) — BO-G03 drag & drop.
   *
   * `PATCH`, not `PUT`: the drag sends one field, and a full update would let a
   * stale tab overwrite a name it is not editing.
   */
  move(id: string, parentId: string | null): Observable<CategoryNode> {
    return this.api.patch<CategoryNode>(`/categories/${encodeURIComponent(id)}`, { parentId });
  }
}
