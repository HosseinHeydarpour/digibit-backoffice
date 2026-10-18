import { Component, signal } from '@angular/core';
import { Meta, StoryObj } from '@storybook/angular';
import { ButtonDirective } from 'primeng/button';

import { LoadingDirective } from './loading.directive';

/**
 * The interactive demo.
 *
 * It owns its own busy flag because that is the whole point of the directive:
 * something has to say "we are saving", and it is the page, not the button. The
 * timer stands in for a request.
 */
@Component({
  selector: 'app-loading-directive-story',
  imports: [ButtonDirective, LoadingDirective],
  template: `
    <div class="flex flex-col items-start gap-3">
      <button pButton pLoading [loading]="saving()" (click)="save()">ذخیرهٔ تغییرات</button>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        {{ saving() ? 'در حال ذخیره… دکمه غیرفعال است — با Tab امتحان کنید' : 'آماده' }}
      </p>
    </div>
  `,
})
class LoadingDirectiveStory {
  protected readonly saving = signal(false);
  private timer: ReturnType<typeof setTimeout> | undefined;

  protected save(): void {
    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.saving.set(false), 2000);
  }
}

/**
 * No `component` key and no `tags: ['autodocs']`.
 *
 * A directive has no template of its own, so there is nothing for autodocs to
 * introspect — no props table, no primary story to derive. Its documentation is
 * an MDX page (`src/docs/shared/LoadingDirective.mdx`) that attaches to these
 * stories with `<Meta of={…} />`, which is the same split the `Core/*` entries
 * use for services and interceptors. The `loading` control below still drives the
 * stories, because they render through a host element.
 */
const meta: Meta = {
  title: 'Shared/LoadingDirective',
  argTypes: {
    loading: { control: 'boolean' },
  },
  parameters: {
    layout: 'centered',
  },
};
export default meta;
type Story = StoryObj;

/** The idle state — an ordinary primary button. */
export const Idle: Story = {
  args: { loading: false },
  render: (args) => ({
    props: args,
    template: `<button pButton pLoading [loading]="loading" label="ذخیرهٔ تغییرات"></button>`,
    moduleMetadata: { imports: [ButtonDirective, LoadingDirective] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          '`loading` false: no spinner, no dimming, and the native `disabled` attribute is absent — ' +
          'so the button is clickable and reachable by keyboard, as it should be.',
      },
    },
  },
};

/**
 * The busy state — spinner, dimming, and genuinely disabled.
 *
 * Press **Tab**: focus skips this button. That is the difference the directive
 * makes, and it is not visible in a screenshot.
 */
export const Busy: Story = {
  args: { loading: true },
  render: (args) => ({
    props: args,
    template: `<button pButton pLoading [loading]="loading" label="در حال ذخیره…"></button>`,
    moduleMetadata: { imports: [ButtonDirective, LoadingDirective] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'The spinner is PrimeNG’s own 14×14 SVG, injected by the directive when it writes ' +
          '`loading` through to `pButton`. Nothing here draws it, which is why a `pLoading` button ' +
          'looks identical to a stock `[pButton] [loading]` one — the difference is in the DOM, not ' +
          'in the pixels.',
      },
    },
  },
};

/**
 * Side by side: stock `[pButton] [loading]` on the left, `pLoading` on the right.
 *
 * Both look busy. Only the right one is actually out of the tab order — press Tab
 * and watch which button takes focus.
 */
export const ComparedWithStock: Story = {
  args: {},
  render: () => ({
    template: `
      <div class="flex flex-col items-start gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-xs text-gray-500 dark:text-gray-400">
            فقط [pButton] [loading] — کلاس p-disabled دارد، اما focus می‌گیرد
          </span>
          <button pButton [loading]="true" label="ذخیره (بدون pLoading)"></button>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs text-gray-500 dark:text-gray-400">
            با pLoading — disabled واقعی، از Tab حذف می‌شود
          </span>
          <button pButton pLoading [loading]="true" label="ذخیره (با pLoading)"></button>
        </div>
      </div>
    `,
    moduleMetadata: { imports: [ButtonDirective, LoadingDirective] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'Visually identical, behaviourally not. The left button is only *styled* as disabled: ' +
          '`.p-disabled` sets `pointer-events: none`, so a click does nothing, but the element is ' +
          'still in the tab order and **Enter still fires the click handler**. The right one is ' +
          'natively `disabled`, so it is skipped by Tab and cannot be activated at all. This is the ' +
          'single reason the directive exists.',
      },
    },
  },
};

/**
 * A real save: click, the button goes busy for two seconds, then comes back.
 *
 * The state lives in the page, not in the button — which is the contract the
 * directive assumes.
 */
export const SubmitFlow: Story = {
  args: {},
  render: () => ({
    template: `<app-loading-directive-story />`,
    moduleMetadata: { imports: [LoadingDirectiveStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'Click it, then press Tab while it is busy — focus lands on the text below rather than ' +
          'on the button. Clicking again during the two seconds does nothing, because the handler ' +
          'guards on the same signal the button is disabled by.',
      },
    },
  },
};
