import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Meta, StoryObj } from '@storybook/angular';

import { JalaliDatepicker } from './jalali-datepicker';

/**
 * A host, because the component requires a `FormControl` — it is the translation
 * boundary between the form and the datepicker library, so it cannot be rendered
 * without one.
 *
 * The line under the input prints the control's raw value. That is the whole
 * point of the component in one glance: the user sees and types a **Shamsi**
 * date, while the form holds a **Gregorian** `YYYY-MM-DD` string.
 */
@Component({
  selector: 'app-jalali-datepicker-story',
  imports: [JalaliDatepicker, ReactiveFormsModule],
  template: `
    <div class="w-80 max-w-full">
      <app-jalali-datepicker [control]="control" [inputId]="inputId" [placeholder]="placeholder" />
      <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">
        مقدار فرم‌کنترل (میلادی):
        <code class="font-mono">{{ control.value ?? '—' }}</code>
      </p>
    </div>
  `,
})
class JalaliDatepickerStory implements OnChanges {
  /** The initial Gregorian value, pushed into the control on change. */
  @Input() value: string | null = '2025-09-23';
  @Input() inputId = 'story-jalali-datepicker';
  @Input() placeholder = 'انتخاب تاریخ';

  readonly control = new FormControl<string | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.control.setValue(this.value);
    }
  }
}

const meta: Meta<JalaliDatepicker> = {
  title: 'Shared/JalaliDatepicker',
  component: JalaliDatepicker,
  tags: ['autodocs'],
  argTypes: {
    control: { control: false, table: { type: { summary: 'FormControl<string | null>' } } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          'A Jalali (Persian) date input, wrapping `ng-persian-datepicker` so the rest of the app',
          'never touches the library directly.',
          '',
          '**Use case** — every date field in the panel: a delivery date, a discount window, a report',
          'range. Use it instead of `<p-datepicker>` for anything the user reads or types as a date,',
          'because a Persian-speaking admin should never have to convert.',
          '',
          '**How to use** — pass a `FormControl` holding a **Gregorian `YYYY-MM-DD`** string. Dates',
          'travel to and from the API as UTC; the user always sees Shamsi.',
          '',
          '```html',
          '<app-jalali-datepicker [control]="form.controls.deliveredAt" />',
          '```',
          '',
          '**Logic** — the contract is the one `ARCHITECTURE.md` §5 requires, and it is enforced by a',
          '**two-control** design. The library always parses the control it owns as *shamsi*, and it',
          're-emits `dateOnSelect` for programmatic changes as well as user picks. Handing it the',
          'public Gregorian control would make it read `2025-09-23` as a Jalali year and convert',
          'forever — `1404 → 2025 → 2646 → …`.',
          '',
          'So the library owns a private shamsi control (`inner`), and this component is the',
          'translation boundary in **both** directions: `syncInner()` converts Gregorian → Shamsi on',
          'the way in, and `onSelect()` converts Shamsi → Gregorian on the way out.',
          '',
          'The subscription is re-created whenever the `control` input changes, and released in',
          '`ngOnDestroy`, so a form that swaps its control (an edit form reusing the same component',
          'for a different record) does not leak the old listener.',
          '',
          'Both `syncInner()` and `onSelect()` compare before writing, so a programmatic change does',
          'not bounce back through the other direction — the classic infinite round-trip.',
        ].join('\n'),
      },
    },
  },
};
export default meta;
type Story = StoryObj<JalaliDatepicker>;

/**
 * A control holding `2025-09-23`, which is ۱۴۰۴/۰۷/۰۱ in the Jalali calendar.
 *
 * Read the line under the input: it is the control's raw value, so you can watch
 * it change to a Gregorian date as you pick a day.
 */
export const WithValue: Story = {
  args: {
    inputId: 'story-jalali-with-value',
    placeholder: 'انتخاب تاریخ',
  },
  render: (args) => ({
    props: args,
    template: `<app-jalali-datepicker-story [inputId]="inputId" [placeholder]="placeholder" />`,
    moduleMetadata: { imports: [JalaliDatepickerStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'The input shows ۱۴۰۴/۰۷/۰۱ and the control holds 2025-09-23. That asymmetry is the whole ' +
          'component.',
      },
    },
  },
};

/**
 * An empty control — a create form, or a filter that has not been set.
 *
 * The placeholder is what the user reads, so it should name the field rather
 * than say «تاریخ».
 */
export const Empty: Story = {
  args: {
    inputId: 'story-jalali-empty',
    placeholder: 'تاریخ تحویل',
  },
  render: (args) => ({
    props: args,
    template: `<app-jalali-datepicker-story [value]="null" [inputId]="inputId" [placeholder]="placeholder" />`,
    moduleMetadata: { imports: [JalaliDatepickerStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'No date selected. `syncInner(null)` clears the library\u2019s control rather than writing an ' +
          'empty string, so the picker opens on today rather than on a malformed date.',
      },
    },
  },
};

/**
 * A realistic form field: a label, the datepicker, and a hint — which is what a
 * feature form actually wraps it in.
 */
export const InAForm: Story = {
  args: {
    inputId: 'story-jalali-in-form',
    placeholder: 'انتخاب تاریخ ارسال',
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="w-80 max-w-full">
        <label for="story-jalali-in-form" class="mb-2 block text-sm font-medium text-dark dark:text-light">
          تاریخ ارسال
        </label>
        <app-jalali-datepicker-story
          [value]="'2025-10-05'"
          [inputId]="inputId"
          [placeholder]="placeholder"
        />
        <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          تاریخ به وقت محلی و بر پایهٔ تقویم شمسی نمایش داده می‌شود.
        </p>
      </div>
    `,
    moduleMetadata: { imports: [JalaliDatepickerStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'The `inputId` matters here: the `<label for>` must match it, or clicking the label does ' +
          'not focus the field. That is why `inputId` is an input at all rather than a constant — a ' +
          'form with two datepickers would otherwise have two elements with the same id.',
      },
    },
  },
};
