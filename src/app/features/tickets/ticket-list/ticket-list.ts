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
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorState } from '@shared/components/error-state/error-state';
import { PageHeader } from '@shared/components/page-header/page-header';
import type { Page, SelectOption, TicketStatus } from '@shared/models';
import { TICKET_STATUS_META } from '@shared/models';
import { PersianDatePipe } from '@shared/pipes/persian-date.pipe';
import { PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { ButtonDirective } from 'primeng/button';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import type { TicketListItem, TicketPriority } from '../models/ticket.model';
import { TicketsService } from '../services/tickets.service';
import { TICKET_PRIORITY_META } from '../ticket-labels';

const PAGE_SIZE = 10;

/**
 * The support queue — `/tickets` (BO-O01).
 *
 * Unread rows are bold and carry an envelope, so the one thing a support agent
 * needs to spot is visible before reading a single word. The date is the LAST
 * message's, not the ticket's creation: the queue is about who is waiting now.
 */
@Component({
  selector: 'app-ticket-list',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    PageHeader,
    EmptyState,
    ErrorState,
    PersianDatePipe,
    PersianDigitsPipe,
    ButtonDirective,
    IconField,
    InputIcon,
    InputText,
    Select,
    Tag,
  ],
  templateUrl: './ticket-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketList {
  private readonly tickets = inject(TicketsService);

  private readonly destroyRef = inject(DestroyRef);

  readonly page = signal<Page<TicketListItem> | null>(null);

  readonly loading = signal(true);

  readonly error = signal<string | null>(null);

  readonly status = signal<TicketStatus | ''>('');

  readonly priority = signal<TicketPriority | ''>('');

  readonly pageNumber = signal(1);

  readonly queryControl = new FormControl('', { nonNullable: true });

  readonly items = computed(() => this.page()?.items ?? []);

  readonly total = computed(() => this.page()?.total ?? 0);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));

  readonly hasFilters = computed(
    () => this.status() !== '' || this.priority() !== '' || this.queryControl.value.trim() !== '',
  );

  readonly statusOptions: SelectOption<TicketStatus | ''>[] = [
    { label: 'همهٔ وضعیت‌ها', value: '' },
    { label: 'باز', value: 'open' },
    { label: 'در انتظار پاسخ مشتری', value: 'pending' },
    { label: 'بسته', value: 'closed' },
  ];

  readonly priorityOptions: SelectOption<TicketPriority | ''>[] = [
    { label: 'همهٔ اولویت‌ها', value: '' },
    { label: 'عادی', value: 'normal' },
    { label: 'فوری', value: 'high' },
  ];

  constructor() {
    this.queryControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reloadFromFirstPage());

    this.load();
  }

  statusMeta(status: TicketStatus) {
    return TICKET_STATUS_META[status];
  }

  priorityMeta(priority: TicketPriority) {
    return TICKET_PRIORITY_META[priority];
  }

  onStatusChange(value: TicketStatus | ''): void {
    this.status.set(value);
    this.reloadFromFirstPage();
  }

  onPriorityChange(value: TicketPriority | ''): void {
    this.priority.set(value);
    this.reloadFromFirstPage();
  }

  clearFilters(): void {
    this.status.set('');
    this.priority.set('');
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

  private reloadFromFirstPage(): void {
    this.pageNumber.set(1);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.tickets
      .list({
        status: this.status(),
        priority: this.priority(),
        query: this.queryControl.value,
        page: this.pageNumber(),
        pageSize: PAGE_SIZE,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.loading.set(false);
          this.page.set(page);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('دریافت تیکت‌ها ناموفق بود.');
        },
      });
  }
}
