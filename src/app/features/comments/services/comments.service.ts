import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/services/api';
import type { Page, SelectOption } from '@shared/models';
import { Observable, map } from 'rxjs';

import type { Comment, CommentQuery, ModerationInput } from '../models/comment.model';

interface ProductLookup {
  readonly id: string;
  readonly name: string;
}

type CommentRaw = Omit<Comment, 'createdAt'> & { createdAt: string | number };

const COMMENTS_PATH = '/reviews';
const LOOKUP_PAGE_SIZE = 100;

function millis(value: string | number): number {
  return typeof value === 'number' ? value : Date.parse(value) || 0;
}

function mapComment(raw: CommentRaw): Comment {
  return { ...raw, createdAt: millis(raw.createdAt) };
}

/**
 * The comments API (BO-N01..N05), backed by the catalogue's `reviews`
 * endpoints. The form calls them «نظرات»; the server stores a `Review`.
 */
@Injectable({ providedIn: 'root' })
export class CommentsService {
  private readonly api = inject(ApiService);

  list(query: CommentQuery): Observable<Page<Comment>> {
    return this.api
      .getPage<CommentRaw>(COMMENTS_PATH, {
        status: query.status,
        productId: query.productId,
        rating: query.rating,
        query: query.query.trim(),
        page: query.page,
        pageSize: query.pageSize,
      })
      .pipe(map((page) => ({ ...page, items: page.items.map(mapComment) })));
  }

  /** How many reviews are waiting → the header badge (BO-N01 tc 10). */
  pendingCount(): Observable<number> {
    return this.api
      .getPage<CommentRaw>(COMMENTS_PATH, { status: 'pending', page: 1, pageSize: 1 })
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
    return this.api
      .patch<CommentRaw>(`${COMMENTS_PATH}/${encodeURIComponent(id)}/approve`, {
        approved: input.approved,
        note: input.note,
      })
      .pipe(map(mapComment));
  }
}
