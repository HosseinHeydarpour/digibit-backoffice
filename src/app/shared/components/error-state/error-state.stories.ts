import { Meta, StoryObj } from '@storybook/angular';

import { ErrorState } from './error-state';

const meta: Meta<ErrorState> = {
  title: 'Shared/ErrorState',
  component: ErrorState,
  tags: ['autodocs'],
  argTypes: {
    retry: { action: 'retry' },
  },
  parameters: {
    docs: {
      description: {
        component: [
          'The panel’s **«the request failed»** block: a red alert with an `pi-exclamation-triangle`',
          'glyph, a headline, a muted sentence, and a «تلاش دوباره» button. It is the SAME visual the',
          'dashboard’s own failure branch draws (`dashboard.html`), lifted out so **every** widget — and',
          'the page — renders one failure identically (BO-E07 tc 8: one widget breaking must not look',
          'different from another, or from the page).',
          '',
          '**Why a separate component from `EmptyState`.** A failed fetch is NOT "no data". Reusing',
          '`app-empty-state` would tell the user «موردی برای نمایش وجود ندارد» when the network actually',
          'failed — the shop would look empty, not broken. The two states get different colours (red vs',
          'neutral), different icons (triangle vs inbox) and `role="alert"` vs `role="status"`: an error',
          'REPLACES content the user was waiting on and is announced immediately; an empty result is a',
          'quiet outcome announced at the next pause.',
          '',
          '**How to use** — the caller hands it a message and listens for the retry; the block knows',
          'nothing about the router or which service to call:',
          '',
          '```html',
          '<app-error-state',
          '  [title]="error()!"',
          '  [description]="\'لطفاً دوباره تلاش کنید.\'"',
          '  (retry)="retry.emit()"',
          '/>',
          '```',
          '',
          '**Logic.** `title` and `description` and `retryLabel` all have defaults, so a widget that',
          'just wants to say "it broke" can render `<app-error-state />` and speak the generic wording.',
          'A widget overrides `title` only when the failure has a specific owner (e.g. the sales chart',
          'passes «دریافت نمودار فروش ناموفق بود»). The button exists because `retryLabel` is set — its',
          'only job on click is `retry.emit()`, the component’s single output.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<ErrorState>;

/**
 * Bare call site — the generic failure wording.
 *
 * Every input has a default, so `<app-error-state />` is already valid. This is
 * what a widget draws when it catches a rejected request and has nothing more
 * specific to say.
 */
export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'Title «دریافت اطلاعات ناموفق بود», description «لطفاً دوباره تلاش کنید.», and a ' +
          '«تلاش دوباره» button. Clicking it emits `retry` — bind `(retry)` to re-run the request.',
      },
    },
  },
};

/**
 * A failure with a specific owner.
 *
 * The sales chart, the order list and the low-stock card each pass their own
 * title so the user knows which fetch died.
 */
export const WithOwner: Story = {
  args: {
    title: 'دریافت نمودار فروش ناموفق بود',
    description: 'سرور پاسخ نداد. اتصال اینترنت خود را بررسی کنید.',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Override `title` (and optionally `description`) when the failure has a specific owner. ' +
          'The retry button is unchanged — the caller decides what "again" means.',
      },
    },
  },
};

/**
 * All four states of a card, side by side — which is how the dashboard actually
 * uses `ErrorState` next to `EmptyState`.
 */
export const InContext: Story = {
  args: {},
  render: () => ({
    template: `
      <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div class="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <app-error-state />
        </div>
        <div class="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <app-error-state
            title="دریافت نمودار فروش ناموفق بود"
            description="سرور پاسخ نداد."
          />
        </div>
      </div>
    `,
    moduleMetadata: { imports: [ErrorState] },
  }),
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story:
          'The component paints no surface of its own, so each one is wrapped in a card here — ' +
          'exactly what a page does.',
      },
    },
  },
};
