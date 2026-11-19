import type { CommentStatus } from '@shared/models';

/** One product review as the moderation screen shows it (BO-N01..N05). */
export interface Comment {
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly productSlug: string;
  readonly userName: string;
  readonly body: string;
  readonly rating: number | null;
  readonly status: CommentStatus;
  readonly createdAt: number;
  readonly moderationNote: string | null;
}

export interface CommentQuery {
  readonly status: CommentStatus | '';
  readonly productId: string;
  readonly rating: number | null;
  readonly query: string;
  readonly page: number;
  readonly pageSize: number;
}

/** `POST /comments/:id/moderate` — the note is kept only for a rejection. */
export interface ModerationInput {
  readonly approved: boolean;
  readonly note?: string;
}
