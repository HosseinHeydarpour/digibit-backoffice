import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CURRENT_USER } from '@core/auth/current-user.token';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { ConfirmService } from '@core/services/confirm';
import { TicketUnread } from '@core/services/ticket-unread';
import { ToastService } from '@core/services/toast';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorState } from '@shared/components/error-state/error-state';
import { PageHeader } from '@shared/components/page-header/page-header';
import { LoadingDirective } from '@shared/directives/loading.directive';
import type { SelectOption, TicketStatus } from '@shared/models';
import { TICKET_STATUS_META } from '@shared/models';
import { PersianDatePipe } from '@shared/pipes/persian-date.pipe';
import { ButtonDirective } from 'primeng/button';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';

import type { TicketAgent, TicketDetail } from '../models/ticket.model';
import { TicketsService } from '../services/tickets.service';
import { TICKET_PRIORITY_META, TICKET_TRANSITIONS } from '../ticket-labels';

import type { TicketDetailResult } from './ticket-detail.resolver';

/**
 * One ticket and its thread — `/tickets/:id` (BO-O02..O05).
 *
 * The resolver hands the page the complete ticket, so the thread paints in one
 * pass. Mutations (reply, status, assignee) return the SAME full record, and
 * `live` swaps it in; the resolver stays the baseline for a retry.
 *
 * The composer's contract is the one the task asks for: Enter sends,
 * Shift+Enter inserts a newline, Ctrl+Enter sends too, an empty box sends
 * nothing, and a failed send keeps the text.
 */
@Component({
  selector: 'app-ticket-detail',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeader,
    EmptyState,
    ErrorState,
    LoadingDirective,
    PersianDatePipe,
    ButtonDirective,
    Select,
    Tag,
    Textarea,
  ],
  templateUrl: './ticket-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketDetailPage {
  private readonly tickets = inject(TicketsService);

  private readonly unread = inject(TicketUnread);

  private readonly confirm = inject(ConfirmService);

  private readonly toast = inject(ToastService);

  private readonly router = inject(Router);

  private readonly destroyRef = inject(DestroyRef);

  private readonly permissions = inject(PERMISSIONS);

  private readonly currentUser = inject(CURRENT_USER);

  readonly detail = input<TicketDetailResult | null>(null);

  private readonly live = signal<TicketDetail | null>(null);

  readonly ticket = computed<TicketDetail | null>(() => {
    const live = this.live();

    if (live) return live;

    const result = this.detail();

    return result && 'ticket' in result ? result.ticket : null;
  });

  readonly loadError = computed<string | null>(() => {
    const result = this.detail();

    return result && 'error' in result ? result.error : null;
  });

  readonly canManage = computed(() => this.permissions().includes('tickets.manage'));

  readonly canReopen = computed(() => this.permissions().includes('settings.write'));

  readonly agents = signal<TicketAgent[]>([]);

  readonly sending = signal(false);

  readonly actionError = signal<string | null>(null);

  readonly bodyControl = new FormControl('', { nonNullable: true });

  readonly statusOptions = computed<SelectOption<TicketStatus>[]>(() => {
    const ticket = this.ticket();

    if (!ticket) return [];

    return TICKET_TRANSITIONS[ticket.status]
      .filter((status) => status !== 'open' || this.canReopen())
      .map((status) => ({ label: TICKET_STATUS_META[status].label, value: status }));
  });

  readonly assigneeOptions = computed<SelectOption<string>[]>(() => {
    const me = this.currentUser()?.id;

    return [
      { label: 'بدون کارشناس', value: '' },
      ...this.agents().map((agent) => ({
        label: agent.id === me ? `${agent.name} (من)` : agent.name,
        value: agent.id,
      })),
    ];
  });

  readonly hasAgentReply = computed(() =>
    (this.ticket()?.messages ?? []).some((message) => message.author === 'agent'),
  );

  constructor() {
    // The GET already marked it read; the sidebar badge is a different request.
    this.unread.refresh();

    if (this.canManage()) {
      this.tickets
        .agents()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (agents) => this.agents.set(agents), error: () => undefined });
    }
  }

  statusMeta(status: TicketStatus) {
    return TICKET_STATUS_META[status];
  }

  priorityMeta(priority: TicketDetail['priority']) {
    return TICKET_PRIORITY_META[priority];
  }

  isAgent(message: { author: 'customer' | 'agent' }): boolean {
    return message.author === 'agent';
  }

  /** Closing without a single agent answer confirms with a warning (tc 10). */
  async changeStatus(status: string): Promise<void> {
    const ticket = this.ticket();

    if (!ticket || !this.canManage() || status === ticket.status) {
      return;
    }

    const target = status as TicketStatus;
    const closingWithoutReply = target === 'closed' && !this.hasAgentReply();
    const confirmed = await this.confirm.confirm({
      message: closingWithoutReply
        ? 'این تیکت هنوز پاسخ کارشناس ندارد؛ با این حال بسته شود؟'
        : `وضعیت تیکت به «${TICKET_STATUS_META[target].label}» تغییر کند؟`,
      header: 'تغییر وضعیت تیکت',
      acceptLabel: 'تغییر',
      rejectLabel: 'انصراف',
      danger: closingWithoutReply,
    });

    if (!confirmed) {
      return;
    }

    this.actionError.set(null);

    this.tickets
      .changeStatus(ticket.id, { status: target })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.live.set(updated);
          this.toast.success('وضعیت تیکت به‌روز شد.');
        },
        error: () => this.actionError.set('تغییر وضعیت ناموفق بود.'),
      });
  }

  changeAssignee(userId: string): void {
    const ticket = this.ticket();

    if (!ticket || !this.canManage()) {
      return;
    }

    this.actionError.set(null);

    this.tickets
      .assign(ticket.id, { userId: userId === '' ? null : userId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.live.set(updated);
          this.toast.success('کارشناس مسئول به‌روز شد.');
        },
        error: () => this.actionError.set('تخصیص تیکت ناموفق بود.'),
      });
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    this.send();
  }

  send(): void {
    const ticket = this.ticket();
    const body = this.bodyControl.value.trim();

    if (!ticket || !this.canManage() || body === '' || this.sending()) {
      return;
    }

    this.sending.set(true);
    this.actionError.set(null);

    this.tickets
      .reply(ticket.id, { body })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.sending.set(false);
          this.live.set(updated);
          this.bodyControl.setValue('');
          this.unread.refresh();
          this.toast.success('پاسخ ارسال شد.');
        },
        error: () => {
          this.sending.set(false);
          this.actionError.set('ارسال پاسخ ناموفق بود؛ متن حفظ شد.');
        },
      });
  }

  reload(): void {
    void this.router.navigateByUrl(this.router.url, { onSameUrlNavigation: 'reload' });
  }
}
