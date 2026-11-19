import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/services/api';
import type { Page, SelectOption } from '@shared/models';
import { Observable, map } from 'rxjs';

import type { Comment, CommentQuery, ModerationInput } from '../models/comment.model';

interface ProductLookup {
  readonly id: string;
  readonly name: string;
}

const COMMENTS_PATH = '/comments';
const LOOKUP_PAGE_SIZE = 100;

/**
 * The comments API (BO-N01..N05).
 *
 * TRACE — `list({ status: 'pending', query: 'ارسال', page: 2 })`:
 *   1. The query is written as `?status=pending&query=ارسال&page=2&pageSize=10`;
 *      empty filters are dropped by `ApiService`.
 *   2. The mock filters by status, product, rating and text, sorts newest
 *      first, then paginates — the same rules the real contract promises.
 *   3. `Page<Comment>` carries the server's `total`, which the page reads for
 *      its pending badge.
 *
 * `moderate` returns the updated row, so the list reconciles the optimistic
 * status with what the server actually stored.
 */
@Injectable({ providedIn: 'root' })
export class CommentsService {
  private readonly api = inject(ApiService);

  list(query: CommentQuery): Observable<Page<Comment>> {
    return this.api.getPage<Comment>(COMMENTS_PATH, {
      status: query.status,
      productId: query.productId,
      rating: query.rating,
      query: query.query.trim(),
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  /** How many reviews are waiting — the header badge (BO-N01 tc 10). */
  pendingCount(): Observable<number> {
    return this.api
      .getPage<Comment>(COMMENTS_PATH, { status: 'pending', page: 1, pageSize: 1 })
      .pipe(map((page) => page.total));
  }

  /** The product filter's options; one page is enough for phase 1. */
  products(): Observable<SelectOption<string>[]> {
    return this.api
      .getPage<ProductLookup>('/products', { page: 1, pageSize: LOOKUP_PAGE_SIZE })
      .pipe(
        map((page) => page.items.map((product) => ({ label: product.name, value: product.id }))),
      );
  }

  moderate(id: string, input: ModerationInput): Observable<Comment> {
    return this.api.post<Comment>(`${COMMENTS_PATH}/${id}/moderate`, input);
  }
}
