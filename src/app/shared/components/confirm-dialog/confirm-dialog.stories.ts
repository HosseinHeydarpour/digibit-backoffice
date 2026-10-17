import { Component, inject, signal } from '@angular/core';
import { ConfirmService } from '@core/services/confirm';
import { Meta, StoryObj } from '@storybook/angular';

import { ConfirmDialogHost } from './confirm-dialog';

/**
 * A host that asks the two kinds of question and prints the answer.
 *
 * The result is shown inline rather than in a `window.alert`, because the point
 * of the component is the `Promise<boolean>` — and the interesting case is the
 * one where it resolves `false` without the user ever pressing «لغو».
 */
@Component({
  selector: 'app-confirm-dialog-story',
  imports: [ConfirmDialogHost],
  template: `
    <app-confirm-dialog />

    <div class="flex min-h-screen items-center justify-center bg-light p-6 dark:bg-background-dark">
      <div
        class="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-md dark:border-gray-700 dark:bg-card-dark"
      >
        <h3 class="mb-1 text-base font-bold text-dark dark:text-light">ConfirmService</h3>
        <p class="mb-5 text-sm text-gray-500 dark:text-gray-400">
          هر دکمه یک <code class="font-mono">Promise&lt;boolean&gt;</code> برمی‌گرداند. با Escape،
          ضربدر، یا کلیک روی پس‌زمینه هم پاسخ داده می‌شود — بدون اینکه Promise معلق بماند.
        </p>

        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            (click)="ask(false)"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            تأیید ساده
          </button>
          <button
            type="button"
            (click)="ask(true)"
            class="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white"
          >
            حذف (خطرناک)
          </button>
          <button
            type="button"
            (click)="askTwice()"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            دو سؤال پشت سر هم
          </button>
        </div>

        <div
          class="mt-5 rounded-lg border border-gray-200 bg-light p-4 dark:border-gray-700 dark:bg-background-dark"
        >
          <p class="text-xs text-gray-500 dark:text-gray-400">نتیجهٔ آخرین سؤال:</p>
          <p class="mt-1 font-mono text-sm text-dark dark:text-light">{{ result() }}</p>
        </div>
      </div>
    </div>
  `,
})
class ConfirmDialogStory {
  private readonly confirm = inject(ConfirmService);

  protected readonly result = signal('—');

  protected async ask(danger: boolean): Promise<void> {
    const accepted = await this.confirm.confirm({
      message: danger
        ? 'آیا از حذف محصول «کالای ۱۲۳» مطمئن هستید؟'
        : 'آیا از خروج از حساب کاربری مطمئن هستید؟',
      header: danger ? 'حذف محصول' : 'تأیید عملیات',
      acceptLabel: danger ? 'حذف' : 'تأیید',
      danger,
    });

    this.result.set(accepted ? 'true — تأیید شد' : 'false — لغو شد');
  }

  /**
   * Opens a second question while the first is still on screen.
   *
   * The first resolves `false` immediately — its `await` must never hang on a
   * dialog the user can no longer see.
   */
  protected async askTwice(): Promise<void> {
    void this.ask(false);
    await new Promise((resolve) => setTimeout(resolve, 400));
    await this.ask(true);
  }
}

const meta: Meta<ConfirmDialogHost> = {
  title: 'Shared/ConfirmDialog',
  component: ConfirmDialogHost,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          'Mounts the app\u2019s two confirmation dialogs — the ordinary one and the one reserved for',
          'dangerous actions — and reports every way they can close back to `ConfirmService`.',
          '',
          '**Use case** — you do not mount it and you do not call it. Read this page to check how a',
          'dialog looks and closes; to ask a question, see',
          '[ConfirmService](/docs/core-confirmservice--docs).',
          '',
          '**How to use** — it takes no inputs. The whole API is on `ConfirmService`.',
          '',
          '**Logic** — it is mounted at the **root**, not in a page or in the layout. A confirmation',
          'can outlive a navigation: if the dialog were mounted inside `MainLayout` or a routed page,',
          'navigating while it was open would destroy it mid-flight — the dialog would vanish and its',
          'Promise would hang forever. The root shell is never destroyed, so the dialog cannot be',
          'either.',
          '',
          'The host does **not** rely on PrimeNG\u2019s `accept`/`reject` callbacks, because those two',
          'never fire for Escape or the header\u2019s ✕ — a dialog dismissed that way would leave the',
          'caller\u2019s `await` pending for good. It settles from the dialog\u2019s `onHide` event',
          'instead, which PrimeNG fires with ACCEPT, REJECT **or** CANCEL on all four paths. One code',
          'path, and no way to leak a pending Promise.',
          '',
          'There are **two** instances rather than one, matched by PrimeNG\u2019s exact key equality. The',
          "default instance deliberately carries `key: undefined` — not `'default'` — so a request",
          'from code still talking to PrimeNG\u2019s `ConfirmationService` directly reaches a dialog',
          'instead of silently reaching none.',
          '',
          'There is **no stylesheet** for this component, and that is deliberate: the dialog is',
          'appended to `<body>`, so an emulated-encapsulation rule has no ancestor to hang from, and',
          'the theme\u2019s CSS is injected after the app\u2019s so its rules would win anyway. Everything',
          'here is either a theme token or a Tailwind utility passed through `pt`.',
        ].join('\n'),
      },
    },
  },
};
export default meta;
type Story = StoryObj<ConfirmDialogHost>;

/**
 * Both shapes of question.
 *
 * «تأیید ساده» is the ordinary one: a question-mark glyph, a brand-orange accept
 * button, an outlined «لغو». «حذف (خطرناک)» is the dangerous one: a warning
 * triangle, a **red** accept button, and the request routed to the second dialog
 * instance.
 */
export const Trigger: Story = {
  render: () => ({
    template: `<app-confirm-dialog-story />`,
    moduleMetadata: { imports: [ConfirmDialogStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'The two buttons differ in more than colour. PrimeNG gives **both** buttons the default ' +
          '(primary) look out of the box, so without the service\u2019s `rejectButtonProps` the accept ' +
          'and reject buttons would be the same orange and the only difference would be the label — ' +
          'a poor thing to make the user read under pressure.',
      },
    },
  },
};

/**
 * The case that motivates the whole design: dismiss a dialog **without** pressing
 * either button.
 *
 * Press Escape, or click the ✕. The result line reads `false — لغو شد` and the
 * `await` resumes. A callback-based implementation would leave it pending
 * forever.
 */
export const DismissWithEscape: Story = {
  render: () => ({
    template: `<app-confirm-dialog-story />`,
    moduleMetadata: { imports: [ConfirmDialogStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'Open a dialog, then press Escape. `onHide` fires with CANCEL, the host calls ' +
          '`settle(false)`, and the Promise resolves. The service never uses `window.confirm` — it ' +
          'blocks the tab, cannot be themed, cannot be translated, and cannot be driven from a test.',
      },
    },
  },
};

/**
 * A second question while the first is open.
 *
 * The first is answered **«no»** the moment the second opens. Leaving it pending
 * is the tempting bug: its `await` would never resume, and the caller would wait
 * forever on a dialog the user can no longer see.
 */
export const SupersededQuestion: Story = {
  render: () => ({
    template: `<app-confirm-dialog-story />`,
    moduleMetadata: { imports: [ConfirmDialogStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'Click «دو سؤال پشت سر هم». The first result line flips to `false` as the second dialog ' +
          'appears — the only honest answer, because the user never said yes to it.',
      },
    },
  },
};

/**
 * The dialog on a phone.
 *
 * `breakpoints` gives it `90vw` below 640px, and the message area is capped at
 * `max-h-[70vh]` with `overflow-y-auto` so a long message can always be scrolled
 * to reach the buttons.
 */
export const MobileWidth: Story = {
  render: () => ({
    template: `<app-confirm-dialog-story />`,
    moduleMetadata: { imports: [ConfirmDialogStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          '90vw leaves the dialog visibly a dialog — a full-bleed modal is indistinguishable from ' +
          'a page and gives no cue that it must be answered. The scroll cap is needed because the ' +
          'confirm dialog does not forward the inner dialog\u2019s `contentStyle` inputs, so `pt` is ' +
          'the only handle for the message area.',
      },
    },
  },
};
