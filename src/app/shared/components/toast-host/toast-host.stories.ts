import { Component, inject } from '@angular/core';
import { ToastService } from '@core/services/toast';
import { Meta, StoryObj } from '@storybook/angular';

import { ToastHost } from './toast-host';

/**
 * A host that fires messages through the **real** `ToastService` — not through
 * PrimeNG's `MessageService` directly.
 *
 * That distinction is the point of the story: `ToastService` is what a feature
 * calls, and it is where the severity mapping and the per-level durations live.
 */
@Component({
  selector: 'app-toast-host-story',
  imports: [ToastHost],
  template: `
    <app-toast-host />

    <div class="flex min-h-screen items-center justify-center bg-light p-6 dark:bg-background-dark">
      <div
        class="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-md dark:border-gray-700 dark:bg-card-dark"
      >
        <h3 class="mb-1 text-base font-bold text-dark dark:text-light">ToastService</h3>
        <p class="mb-5 text-sm text-gray-500 dark:text-gray-400">
          هر دکمه یکی از مسیرهای سرویس را صدا می‌زند. پیام‌ها در گوشهٔ چپ بالا (انتهای سند در RTL)
          ظاهر می‌شوند.
        </p>

        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            (click)="success()"
            class="rounded-lg bg-success px-4 py-2 text-sm font-medium text-white"
          >
            success
          </button>
          <button
            type="button"
            (click)="error()"
            class="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white"
          >
            error + detail
          </button>
          <button
            type="button"
            (click)="warning()"
            class="rounded-lg bg-warning px-4 py-2 text-sm font-medium text-white"
          >
            warning
          </button>
          <button
            type="button"
            (click)="info()"
            class="rounded-lg bg-gray-500 px-4 py-2 text-sm font-medium text-white"
          >
            info
          </button>
        </div>

        <div class="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            (click)="sticky()"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            sticky (بدون بسته شدن خودکار)
          </button>
          <button
            type="button"
            (click)="notClosable()"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            closable: false
          </button>
          <button
            type="button"
            (click)="clear()"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            clear()
          </button>
        </div>

        <p class="mt-5 text-xs text-gray-500 dark:text-gray-400">
          «sticky» و «closable: false» را با هم نزنید — آن پیام دیگر بسته نمی‌شود.
        </p>
      </div>
    </div>
  `,
})
class ToastHostStory {
  private readonly toast = inject(ToastService);

  protected success(): void {
    this.toast.success('محصول با موفقیت ذخیره شد.');
  }

  protected error(): void {
    this.toast.error('ذخیره محصول انجام نشد.', { detail: 'ارتباط با سرور برقرار نشد.' });
  }

  protected warning(): void {
    this.toast.warning('موجودی این کالا رو به پایان است.');
  }

  protected info(): void {
    this.toast.info('لینک در کلیپ‌بورد کپی شد.');
  }

  protected sticky(): void {
    this.toast.warning('این عملیات در حال انجام است.', { sticky: true });
  }

  protected notClosable(): void {
    this.toast.info('این پیام دکمهٔ بستن ندارد.', { closable: false, life: 4000 });
  }

  protected clear(): void {
    this.toast.clear();
  }
}

const meta: Meta<ToastHost> = {
  title: 'Shared/ToastHost',
  component: ToastHost,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          'Mounts the app\u2019s toast. It is placed **once**, in `app.html`, and nothing calls it —',
          'features inject `ToastService` and never see this file.',
          '',
          '**Use case** — you do not mount it and you do not call it. Read this page to check where',
          'messages appear and how they behave as a group; to send one, see',
          '[ToastService](/docs/core-toastservice--docs).',
          '',
          '**How to use** — it takes no inputs. The whole API is on `ToastService`.',
          '',
          '**Logic** — it is mounted at the **root**, not in a page or in the layout. A message about',
          'what just happened usually arrives *after* a navigation (save, then leave the page), and a',
          'toast mounted inside a routed page would be destroyed by exactly that navigation — the',
          'message would be torn down before it was read. The root shell is never destroyed, so the',
          'toast cannot be either. `ConfirmDialogHost` is mounted the same way, for the same reason.',
          '',
          'It appears **top-left** on desktop, which is the *end* side in this RTL app, and',
          'full-width along the bottom on phones. PrimeNG\u2019s `position` is **physical** —',
          '`top-left` means the left edge whatever the document direction is — and the sidebar owns',
          'the start (right) edge, so a 25rem toast at `top-right` would sit on top of the navigation.',
          'The end edge is free, and it is also where the design reference puts its own overlay.',
          '',
          'The mobile layout comes from the `breakpoints` input, not from a `matchMedia` listener:',
          'PrimeNG turns each entry into a real media query with `!important`, which is the only',
          'thing that can beat the inline `top`/`right` the component writes onto its own root',
          'element. That is why the breakpoint sets `top: auto` next to `bottom`, and `width: auto`',
          'next to `left`/`right`.',
          '',
          'The severity glyphs are set by **nobody**, on purpose. PrimeNG 21 renders a per-severity',
          'inline SVG — a check, a circle-i, a circle-✕, a warning triangle — and only falls back to',
          'a `pi` font glyph when the message carries an explicit `icon`. Setting one would replace a',
          'crisp SVG with a font glyph and lose the automatic per-level mapping for nothing.',
        ].join('\n'),
      },
    },
  },
};
export default meta;
type Story = StoryObj<ToastHost>;

/**
 * All four levels, plus the two dismissal options.
 *
 * The durations differ by level: `success` and `info` clear after 3s, `warning`
 * and `error` after 5s — a server error needs longer to read than «ذخیره شد.».
 * Hover a toast and the countdown pauses.
 */
export const Trigger: Story = {
  render: () => ({
    template: `<app-toast-host-story />`,
    moduleMetadata: { imports: [ToastHostStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'Fire several in a row to see them stack. `clear()` dismisses all of them — call it on ' +
          'navigation and on sign-out, because a message about the page the user just left is worse ' +
          'than no message.',
      },
    },
  },
};

/**
 * The `warning` level, which is the one that catches people out.
 *
 * `ToastService.warning(…)` maps to PrimeNG's `'warn'`. Calling
 * `MessageService.add({ severity: 'warning' })` directly — the obvious guess —
 * matches no severity class at all and renders an uncoloured toast that looks
 * like a styling bug. This story is the visual proof that the mapping is right.
 */
export const WarningIsAmber: Story = {
  render: () => ({
    template: `<app-toast-host-story />`,
    moduleMetadata: { imports: [ToastHostStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'Click «warning»: the toast is amber. If it were grey, the severity string was misspelled ' +
          'somewhere upstream — see the SEVERITY table in `core/services/toast.ts`.',
      },
    },
  },
};

/**
 * Every message is `closable` by default.
 *
 * `closable: false` removes the ✕ and makes the message purely informational —
 * it still disappears on its own. Combine it with `sticky: true` and the message
 * can never be removed, which is why `closable` defaults to on and only an
 * explicit `false` turns it off.
 */
export const ClosableBehaviour: Story = {
  render: () => ({
    template: `<app-toast-host-story />`,
    moduleMetadata: { imports: [ToastHostStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'Compare «sticky» (no auto-dismiss, ✕ present) with «closable: false» (auto-dismiss, no ✕). ' +
          'They answer different questions and are easy to confuse.',
      },
    },
  },
};

/**
 * Check the phone layout.
 *
 * Use the Viewport tool in the toolbar and pick a phone: the toast moves to the
 * bottom and goes full width.
 */
export const MobilePosition: Story = {
  render: () => ({
    template: `<app-toast-host-story />`,
    moduleMetadata: { imports: [ToastHostStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'Below 640px the toast becomes a full-width bar at the bottom, clear of the home ' +
          'indicator by `env(safe-area-inset-bottom)`. The theme fixes the root at 25rem, which does ' +
          'not fit a 360px phone — hence the `width: auto` in the breakpoint.',
      },
    },
  },
};
