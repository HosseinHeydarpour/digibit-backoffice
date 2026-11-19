import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { OrderStatus } from '@shared/models/status-badge.model';
import { PersianDatePipe } from '@shared/pipes/persian-date.pipe';

import type { OrderStatusHistoryEntry } from '../models/order.model';
import { ORDER_FLOW, orderStatusLabel } from '../order-status';

interface TimelineStep {
  readonly status: OrderStatus;
  readonly label: string;
  readonly at: number | null;
  readonly state: 'done' | 'current' | 'future';
}

/**
 * The five-step order flow (BO-H05).
 *
 * The steps come from `ORDER_FLOW`, not from the history: a past step without a
 * recorded entry still renders as done in grey, and a future step renders
 * hollow. The CURRENT status is always the last recorded step, so «تحویل‌شده»
 * shows four green steps and one brand-coloured current step.
 *
 * A cancelled or returned order does not walk the flow at all: it renders one
 * red row with the reason, because a cancelled order is not "waiting at step 3".
 */
@Component({
  selector: 'app-order-timeline',
  imports: [PersianDatePipe],
  template: `
    @if (terminal(); as status) {
      <div
        class="flex flex-col gap-1 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-900/20"
      >
        <span class="text-sm font-medium text-red-700 dark:text-red-300">
          این سفارش {{ label(status) }} است.
        </span>
        @if (terminalEntry(); as entry) {
          <span class="text-xs text-red-600 dark:text-red-400">
            {{ entry.createdAt | persianDate }}
            @if (entry.note) {
              · {{ entry.note }}
            }
          </span>
        }
      </div>
    }

    <ol class="space-y-0" aria-label="مراحل سفارش">
      @for (step of steps(); track step.status; let last = $last) {
        <li class="flex gap-3">
          <div class="flex flex-col items-center">
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs"
              [class]="dotClass(step)"
            >
              @if (step.state === 'done') {
                <i class="pi pi-check text-[10px]" aria-hidden="true"></i>
              } @else {
                <span aria-hidden="true">{{ $index + 1 }}</span>
              }
            </span>
            @if (!last) {
              <span class="h-8 w-0.5" [class]="lineClass(step)" aria-hidden="true"></span>
            }
          </div>

          <div class="pb-4">
            <p [class]="labelClass(step)">{{ step.label }}</p>
            @if (step.at !== null) {
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {{ step.at | persianDate }}
              </p>
            }
          </div>
        </li>
      }
    </ol>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderTimeline {
  readonly status = input.required<OrderStatus>();

  readonly history = input.required<readonly OrderStatusHistoryEntry[]>();

  readonly steps = computed<TimelineStep[]>(() => {
    const history = this.history();
    const currentIndex = ORDER_FLOW.indexOf(this.status());

    return ORDER_FLOW.map((status, index) => ({
      status,
      label: orderStatusLabel(status),
      at: history.find((entry) => entry.status === status)?.createdAt ?? null,
      state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'future',
    }));
  });

  readonly terminal = computed<OrderStatus | null>(() =>
    this.status() === 'cancelled' || this.status() === 'returned' ? this.status() : null,
  );

  readonly terminalEntry = computed<OrderStatusHistoryEntry | null>(() => {
    const status = this.terminal();

    return status === null
      ? null
      : ([...this.history()].reverse().find((entry) => entry.status === status) ?? null);
  });

  label(status: OrderStatus): string {
    return orderStatusLabel(status);
  }

  dotClass(step: TimelineStep): string {
    if (step.state === 'done')
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (step.state === 'current') return 'bg-primary text-white';

    return 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500';
  }

  lineClass(step: TimelineStep): string {
    return step.state === 'done'
      ? 'bg-green-200 dark:bg-green-900/50'
      : 'bg-gray-200 dark:bg-gray-700';
  }

  labelClass(step: TimelineStep): string {
    if (step.state === 'current') return 'text-sm font-bold text-primary';
    if (step.state === 'done') return 'text-sm font-medium text-gray-900 dark:text-white';

    return 'text-sm text-gray-400 dark:text-gray-500';
  }
}
