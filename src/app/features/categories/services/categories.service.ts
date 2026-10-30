import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/services/api';
import type { Observable } from 'rxjs';

import type { CategoryNode } from '../models/category.model';

/**
 * The categories screen's data source (BO-G01).
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
}
