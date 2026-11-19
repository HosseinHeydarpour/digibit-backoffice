import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { ConfirmService } from '@core/services/confirm';
import { ToastService } from '@core/services/toast';
import type { Page, SelectOption } from '@shared/models';
import { Observable, of, Subject, throwError } from 'rxjs';

import type { Comment, CommentQuery } from '../models/comment.model';
import { CommentsService } from '../services/comments.service';

import { CommentList } from './comment-list';
function makeComment(id: string, overrides: Partial<Comment> = {}): Comment {
  return {
    id,
    productId: 'p1',
    productName: 'هدفون سونی',
    productSlug: 'sony-headphones',
    userName: 'زهرا م.',
    body: 'کیفیت خوب بود.',
    rating: 4,
    status: 'pending',
    createdAt: 1_728_000_000_000,
    moderationNote: null,
    ...overrides,
  };
}

class CommentsServiceStub {
  rows: Comment[] = [makeComment('1'), makeComment('2', { status: 'approved', rating: null })];

  total = 2;

  hang: Observable<never> | null = null;

  fail = false;

  queries: CommentQuery[] = [];

  moderate$ = new Subject<Comment>();

  moderateInput: { id: string; approved: boolean; note?: string } | null = null;

  list(query: CommentQuery): Observable<Page<Comment>> {
    this.queries.push(query);

    if (this.hang) return this.hang;
    if (this.fail) return throwError(() => new Error('offline'));

    return of({
      items: [...this.rows],
      total: this.total,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  pendingCount(): Observable<number> {
    return of(2);
  }

  products(): Observable<SelectOption<string>[]> {
    return of([{ label: 'هدفون سونی', value: 'p1' }]);
  }

  moderate(id: string, input: { approved: boolean; note?: string }): Observable<Comment> {
    this.moderateInput = { id, ...input };
    return this.moderate$;
  }
}

async function settle(fixture: ComponentFixture<CommentList>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('CommentList (BO-N01..N05)', () => {
  let fixture: ComponentFixture<CommentList>;
  let component: CommentList;
  let service: CommentsServiceStub;
  let confirm: ReturnType<typeof vi.fn>;
  let toast: { success: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    confirm = vi.fn().mockResolvedValue(true);
    toast = { success: vi.fn() };
    service = new CommentsServiceStub();

    await TestBed.configureTestingModule({
      imports: [CommentList],
      providers: [
        provideRouter([]),
        { provide: CommentsService, useValue: service },
        { provide: ToastService, useValue: toast },
        { provide: ConfirmService, useValue: { confirm } },
        {
          provide: PERMISSIONS,
          useValue: signal(['comments.view', 'comments.moderate', 'products.view']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CommentList);
    component = fixture.componentInstance;
    await settle(fixture);
  });

  it('renders the rows with stars and the pending count', () => {
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('app-star-rating')).toHaveLength(4);
    expect(component.pendingCount()).toBe(2);
  });

  it('sends the status filter in the query', async () => {
    component.onStatusChange('approved');
    await settle(fixture);

    expect(service.queries.at(-1)?.status).toBe('approved');
    expect(service.queries.at(-1)?.page).toBe(1);
  });

  it('sends the product and rating filters together', async () => {
    component.onStatusChange('pending');
    component.onProductChange('p1');
    component.onRatingChange(4);
    await settle(fixture);

    expect(service.queries.at(-1)).toMatchObject({
      status: 'pending',
      productId: 'p1',
      rating: 4,
    });
  });

  it('debounces the text search', async () => {
    vi.useFakeTimers();

    try {
      const before = service.queries.length;
      component.queryControl.setValue('ارسال');

      vi.advanceTimersByTime(299);
      expect(service.queries.length).toBe(before);

      vi.advanceTimersByTime(1);
      expect(service.queries.at(-1)?.query).toBe('ارسال');
    } finally {
      vi.useRealTimers();
    }
  });

  it('asks, then marks the row approved before the server answers', async () => {
    await component.approve(makeComment('1'));
    await settle(fixture);

    expect(confirm).toHaveBeenCalled();
    expect(service.moderateInput).toMatchObject({ id: '1', approved: true });
    expect(component.items()[0].status).toBe('approved');

    service.moderate$.next(makeComment('1', { status: 'approved' }));
    service.moderate$.complete();
    await settle(fixture);

    expect(toast.success).toHaveBeenCalledWith('نظر تأیید شد.');
  });

  it('does nothing when the confirmation is refused', async () => {
    confirm.mockResolvedValue(false);
    await component.approve(makeComment('1'));

    expect(service.moderateInput).toBeNull();
  });

  it('rejects with an optional note', async () => {
    component.openReject(makeComment('1'));
    component.rejectNote.setValue('محتوای نامناسب');
    component.confirmReject();

    expect(service.moderateInput).toEqual({
      id: '1',
      approved: false,
      note: 'محتوای نامناسب',
    });
    expect(component.rejecting()).toBeNull();
  });

  it('rolls the badge back when moderation fails', async () => {
    component.openReject(makeComment('1'));
    component.confirmReject();

    expect(component.items()[0].status).toBe('rejected');

    service.moderate$.error(new Error('offline'));
    await settle(fixture);

    expect(component.items()[0].status).toBe('pending');
  });

  it('distinguishes a filtered empty from an empty queue', async () => {
    service.rows = [];
    component.onStatusChange('rejected');
    await settle(fixture);

    expect(fixture.nativeElement.textContent).toContain('نظری با این فیلترها پیدا نشد');
    expect(fixture.nativeElement.textContent).toContain('پاک کردن فیلترها');
  });

  it('shows the shop empty state without filters', async () => {
    service.rows = [];
    component.retry();
    await settle(fixture);

    expect(fixture.nativeElement.textContent).toContain('هنوز نظری ثبت نشد');
    expect(fixture.nativeElement.textContent).not.toContain('نظری با این فیلترها پیدا نشد');
  });

  it('links to the site product with the slug and keeps edit reachable', () => {
    const site: HTMLAnchorElement = fixture.nativeElement.querySelector('a[target="_blank"]');

    expect(site.getAttribute('href')).toContain('/product/sony-headphones');
  });

  it('hides moderation controls without the grant', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CommentList],
      providers: [
        provideRouter([]),
        { provide: CommentsService, useValue: new CommentsServiceStub() },
        { provide: ToastService, useValue: toast },
        { provide: ConfirmService, useValue: { confirm } },
        { provide: PERMISSIONS, useValue: signal(['comments.view']) },
      ],
    }).compileComponents();

    const readOnly = TestBed.createComponent(CommentList);
    await settle(readOnly);

    expect(readOnly.nativeElement.querySelector('[aria-label="تأیید نظر"]')).toBeNull();
  });

  it('renders the error state and retries', async () => {
    service.fail = true;
    component.retry();
    await settle(fixture);

    expect(fixture.nativeElement.textContent).toContain('دریافت نظرات ناموفق بود');

    service.fail = false;
    const retryButton: HTMLButtonElement =
      fixture.nativeElement.querySelector('app-error-state button');
    retryButton.click();
    await settle(fixture);

    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('walks the pages and stops at the edges', async () => {
    service.total = 25;
    component.retry();
    await settle(fixture);

    expect(component.totalPages()).toBe(3);

    component.goToPage(2);
    await settle(fixture);
    expect(service.queries.at(-1)?.page).toBe(2);

    component.goToPage(9);
    expect(service.queries.at(-1)?.page).toBe(2);
  });
});
