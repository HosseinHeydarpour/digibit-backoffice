import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { ConfirmService } from '@core/services/confirm';
import { ToastService } from '@core/services/toast';
import { environment } from '@env/environment';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorState } from '@shared/components/error-state/error-state';
import { PageHeader } from '@shared/components/page-header/page-header';
import { StarRating } from '@shared/components/star-rating/star-rating';
import type { CommentStatus, Page, SelectOption } from '@shared/models';
import { COMMENT_STATUS_META } from '@shared/models';
import { PersianDatePipe } from '@shared/pipes/persian-date.pipe';
import { PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import type { Comment } from '../models/comment.model';
import { CommentsService } from '../services/comments.service';

const PAGE_SIZE = 10;

/**
 * The comments queue — `/comments` (BO-N01..N05).
 *
 * One request drives the list: status, product, rating and the debounced text
 * are all sent together, so «در انتظار تأیید + محصول X + ۲ ستاره» is a single
 * query and not three filters fighting in the client.
 *
 * Approve and reject are optimistic: the badge changes before the answer, a
 * failure clears the override (the interceptor has already toasted the reason),
 * and success reloads the page so the row the server stored is the one on
 * screen.
 */
@Component({
  selector: 'app-comment-list',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    PageHeader,
    EmptyState,
    ErrorState,
    StarRating,
    PersianDatePipe,
    PersianDigitsPipe,
    ButtonDirective,
    Dialog,
    IconField,
    InputIcon,
    InputText,
    Select,
    Tag,
    Textarea,
  ],
  templateUrl: './comment-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentList {
  private readonly comments = inject(CommentsService);

  private readonly confirm = inject(ConfirmService);

  private readonly toast = inject(ToastService);

  private readonly destroyRef = inject(DestroyRef);

  private readonly permissions = inject(PERMISSIONS);

  readonly page = signal<Page<Comment> | null>(null);

  readonly loading = signal(true);

  readonly error = signal<string | null>(null);

  readonly pendingCount = signal(0);

  readonly status = signal<CommentStatus | ''>('');

  readonly productId = signal('');

  readonly rating = signal<number | null>(null);

  readonly pageNumber = signal(1);

  readonly queryControl = new FormControl('', { nonNullable: true });

  readonly products = signal<SelectOption<string>[]>([]);

  readonly rejecting = signal<Comment | null>(null);

  readonly rejectNote = new FormControl('', { nonNullable: true });

  /** id → the status the user just chose, until the server's answer arrives. */
  private readonly overrides = signal<ReadonlyMap<string, CommentStatus>>(new Map());

  readonly items = computed(() =>
    (this.page()?.items ?? []).map((comment) => ({
      ...comment,
      status: this.overrides().get(comment.id) ?? comment.status,
    })),
  );

  readonly total = computed(() => this.page()?.total ?? 0);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));

  readonly hasFilters = computed(
    () =>
      this.status() !== '' ||
      this.productId() !== '' ||
      this.rating() !== null ||
      this.queryControl.value.trim() !== '',
  );

  readonly canModerate = computed(() => this.permissions().includes('comments.moderate'));

  readonly canOpenProduct = computed(() => this.permissions().includes('products.view'));

  readonly statusOptions: SelectOption<CommentStatus | ''>[] = [
    { label: 'همهٔ وضعیت‌ها', value: '' },
    { label: 'در انتظار تأیید', value: 'pending' },
    { label: 'تأییدشده', value: 'approved' },
    { label: 'ردشده', value: 'rejected' },
  ];

  readonly ratingOptions: SelectOption<number | null>[] = [
    { label: 'همهٔ امتیازها', value: null },
    { label: '۱ ستاره', value: 1 },
    { label: '۲ ستاره', value: 2 },
    { label: '۳ ستاره', value: 3 },
    { label: '۴ ستاره', value: 4 },
    { label: '۵ ستاره', value: 5 },
  ];

  readonly productOptions = computed<SelectOption<string>[]>(() => [
    { label: 'همهٔ محصولات', value: '' },
    ...this.products(),
  ]);

  constructor() {
    this.queryControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageNumber.set(1);
        this.load();
      });

    this.loadProducts();
    this.loadPending();
    this.load();
  }

  meta(status: CommentStatus) {
    return COMMENT_STATUS_META[status];
  }

  siteUrl(comment: Comment): string {
    return `${environment.SITE_URL}/product/${comment.productSlug}`;
  }

  onStatusChange(value: CommentStatus | ''): void {
    this.status.set(value);
    this.reloadFromFirstPage();
  }

  onProductChange(value: string): void {
    this.productId.set(value);
    this.reloadFromFirstPage();
  }

  onRatingChange(value: number | null): void {
    this.rating.set(value);
    this.reloadFromFirstPage();
  }

  clearFilters(): void {
    this.status.set('');
    this.productId.set('');
    this.rating.set(null);
    this.queryControl.setValue('');
    this.reloadFromFirstPage();
  }

  retry(): void {
    this.load();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.pageNumber()) {
      return;
    }

    this.pageNumber.set(page);
    this.load();
  }

  async approve(comment: Comment): Promise<void> {
    const confirmed = await this.confirm.confirm({
      message: `نظر «${comment.userName}» تأیید و در سایت نمایش داده شود؟`,
      header: 'تأیید نظر',
      acceptLabel: 'تأیید',
    });

    if (!confirmed) {
      return;
    }

    this.moderate(comment, true);
  }

  openReject(comment: Comment): void {
    this.rejectNote.setValue('');
    this.rejecting.set(comment);
  }

  onRejectVisibility(open: boolean): void {
    if (!open) {
      this.rejecting.set(null);
    }
  }

  confirmReject(): void {
    const comment = this.rejecting();

    if (!comment) {
      return;
    }

    this.rejecting.set(null);
    this.moderate(comment, false, this.rejectNote.value.trim());
  }

  private moderate(comment: Comment, approved: boolean, note = ''): void {
    this.applyOverride(comment.id, approved ? 'approved' : 'rejected');

    this.comments
      .moderate(comment.id, { approved, note: note === '' ? undefined : note })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success(approved ? 'نظر تأیید شد.' : 'نظر رد شد.');
          this.load();
          this.loadPending();
        },
        error: () => this.applyOverride(comment.id, comment.status),
      });
  }

  private applyOverride(id: string, status: CommentStatus): void {
    const next = new Map(this.overrides());
    next.set(id, status);
    this.overrides.set(next);
  }

  private reloadFromFirstPage(): void {
    this.pageNumber.set(1);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.comments
      .list({
        status: this.status(),
        productId: this.productId(),
        rating: this.rating(),
        query: this.queryControl.value,
        page: this.pageNumber(),
        pageSize: PAGE_SIZE,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.loading.set(false);
          this.page.set(page);
          this.overrides.set(new Map());
        },
        error: () => {
          this.loading.set(false);
          this.error.set('دریافت نظرات ناموفق بود.');
        },
      });
  }

  private loadPending(): void {
    this.comments
      .pendingCount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (count) => this.pendingCount.set(count),
        error: () => this.pendingCount.set(0),
      });
  }

  private loadProducts(): void {
    this.comments
      .products()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products) => this.products.set(products),
        error: () => this.products.set([]),
      });
  }
}
