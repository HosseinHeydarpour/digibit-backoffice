import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { ConfirmService } from '@core/services/confirm';
import { ToastService } from '@core/services/toast';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { NEVER, Observable, of } from 'rxjs';

import type { Comment } from '../models/comment.model';
import { CommentsService } from '../services/comments.service';

import { CommentList } from './comment-list';

const ROWS: Comment[] = [
  {
    id: '1',
    productId: 'p1',
    productName: 'هدفون بی‌سیم سونی',
    productSlug: 'sony-headphones',
    userName: 'زهرا محمدی',
    body: 'کیفیت صدا عالیه و باتری یک روز کامل جواب می‌ده. پیشنهاد می‌کنم.',
    rating: 5,
    status: 'pending',
    createdAt: 1_728_000_000_000,
    moderationNote: null,
  },
  {
    id: '2',
    productId: 'p2',
    productName: 'کیبورد مکانیکی',
    productSlug: 'mechanical-keyboard',
    userName: 'علی رضایی',
    body: 'بعد از دو هفته هنوز مثل روز اوله.',
    rating: 3.5,
    status: 'approved',
    createdAt: 1_727_900_000_000,
    moderationNote: null,
  },
  {
    id: '3',
    productId: 'p3',
    productName: 'دفتر یادداشت',
    productSlug: 'notebook',
    userName: 'کاربر مهمان',
    body: 'اشتباه سفارش دادم و مرجوعی سخت بود.',
    rating: null,
    status: 'rejected',
    createdAt: 1_727_800_000_000,
    moderationNote: 'محتوای نامناسب',
  },
];

class CommentsServiceStub {
  list() {
    return of({ items: ROWS, total: ROWS.length, page: 1, pageSize: 10 });
  }

  pendingCount(): Observable<number> {
    return of(1);
  }

  products(): Observable<{ label: string; value: string }[]> {
    return of([
      { label: 'هدفون بی‌سیم سونی', value: 'p1' },
      { label: 'کیبورد مکانیکی', value: 'p2' },
    ]);
  }

  moderate() {
    return of(ROWS[0]);
  }
}

const meta: Meta<CommentList> = {
  title: 'Features/Comments',
  component: CommentList,
  decorators: [
    applicationConfig({
      providers: [
        provideRouter([]),
        { provide: ToastService, useValue: { success: () => undefined } },
        { provide: ConfirmService, useValue: { confirm: async () => true } },
        {
          provide: PERMISSIONS,
          useValue: signal(['comments.view', 'comments.moderate', 'products.view']),
        },
      ],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'The moderation queue (BO-N01..N05): status/product/rating filters plus a debounced',
          'text search, stars, product links, and optimistic approve/reject with a rollback.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<CommentList>;

/** Three rows covering all statuses, a half rating and a missing score. */
export const Default: Story = {
  render: () => ({
    template: '<app-comment-list />',
    moduleMetadata: {
      providers: [{ provide: CommentsService, useValue: new CommentsServiceStub() }],
    },
  }),
};

/** The first paint: five skeleton rows. */
export const Loading: Story = {
  render: () => ({
    template: '<app-comment-list />',
    moduleMetadata: {
      providers: [
        { provide: CommentsService, useValue: { ...new CommentsServiceStub(), list: () => NEVER } },
      ],
    },
  }),
};
