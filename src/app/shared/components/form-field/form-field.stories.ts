import { Component, computed, effect, input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '@shared/models';
import { Meta, StoryObj } from '@storybook/angular';
import { InputText } from 'primeng/inputtext';

import { FormField } from './form-field';

/**
 * A host so the Controls panel is real.
 *
 * The component projects its control, and Storybook cannot project through
 * `args` alone — so this host owns a genuine `FormGroup` and supplies the
 * `<input>` itself. The control is a REAL `FormControl` and not a stub because
 * the whole point of the field is that it reacts to a control's state: a fake
 * object would render a convincing story that behaves nothing like the app.
 *
 * INPUTS, AND EVERY ONE OF THEM DECLARED. Storybook populates **declared
 * inputs** and ignores plain fields — a host property without `input()` is never
 * assigned, so the story quietly renders the class default while the Controls
 * panel does nothing. It also sets *every* declared input, which means an arg a
 * story omits arrives as `undefined` instead of falling back to the input's
 * default. Two consequences, both learned the hard way here:
 *
 *   - bind with `label()`, never `label` — the bare name is the signal object;
 *   - do not make something an input the story is not meant to control. The
 *     placeholder below is a literal for that reason: as an input with no arg it
 *     rendered the string "undefined" inside the box.
 *
 * `touched` is an arg rather than something the reader has to do by hand: the
 * error state is the most important story here, and hiding it behind a click on
 * the canvas would bury it.
 */
@Component({
  selector: 'app-form-field-story',
  imports: [ReactiveFormsModule, FormField, InputText],
  template: `
    <form [formGroup]="form" class="w-full max-w-md">
      <app-form-field
        controlName="title"
        [label]="label()"
        [hint]="hint()"
        [required]="required()"
        [error]="error()"
        [serverError]="serverError()"
      >
        <input
          pInputText
          id="title"
          formControlName="title"
          class="w-full"
          placeholder="مثلاً: کالای تستی"
        />
      </app-form-field>
    </form>
  `,
})
class FormFieldStory {
  readonly label = input<string>('عنوان');
  readonly hint = input<string | null>(null);
  readonly required = input<boolean | null | undefined>(null);
  readonly error = input<string | null>(null);
  readonly serverMessage = input<string | null>(null);
  readonly touched = input<boolean>(false);

  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  /** One `ApiError` for the "request", exactly as a page would hold it. */
  protected readonly serverError = computed(() => {
    const message = this.serverMessage();
    if (!message) {
      return null;
    }
    return new ApiError('VALIDATION', 'داده معتبر نیست', 422, { title: [message] });
  });

  constructor() {
    effect(() => {
      if (this.touched()) {
        this.form.controls.title.markAsTouched();
      }
    });
  }
}

/**
 * A realistic form, so the field can be judged in the layout it actually lives
 * in rather than alone on a padded canvas.
 *
 * Two fields on purpose: `title` is required and `slug` is not, which is the
 * only honest way to show the asterisk — the component derives it from
 * `Validators.required`, so a field without the validator is the comparison that
 * proves the derivation works.
 */
@Component({
  selector: 'app-form-context-story',
  imports: [ReactiveFormsModule, FormField, InputText],
  template: `
    <form [formGroup]="form" class="mx-auto w-full max-w-2xl">
      <div
        class="rounded-xl border border-gray-200 bg-white p-6 shadow-md dark:border-gray-700 dark:bg-gray-800"
      >
        <h2 class="text-lg font-bold text-dark dark:text-light">افزودن دسته‌بندی</h2>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">فیلدهای ستاره‌دار الزامی هستند.</p>

        <div class="mt-6 flex flex-col gap-5">
          <app-form-field controlName="title" label="نام دسته‌بندی" hint="حداکثر ۶۰ کاراکتر">
            <input pInputText id="title" formControlName="title" class="w-full" />
          </app-form-field>

          <app-form-field controlName="slug" label="نامک" hint="در آدرس صفحه استفاده می‌شود.">
            <input pInputText id="slug" formControlName="slug" class="w-full" dir="ltr" />
          </app-form-field>
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-dark dark:border-gray-700 dark:text-light"
          >
            انصراف
          </button>
          <button
            type="submit"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
          >
            ذخیره
          </button>
        </div>
      </div>
    </form>
  `,
})
class FormContextStory {
  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    slug: new FormControl('', { nonNullable: true }),
  });
}

/**
 * The component's own inputs, plus the three args that exist only to drive the
 * demo host.
 *
 * `Meta<FormField>` is strictly typed against the component, so an arg the
 * component does not have is a compile error — which is the right default and
 * the reason this is an explicit intersection rather than a cast. The extras are
 * `Partial` so `component: FormField` still satisfies the meta type: a real
 * `FormField` instance is assignable to `FormField & Partial<…>`.
 */
type FormFieldStoryArgs = FormField &
  Partial<{
    touched: boolean;
    serverMessage: string;
  }>;

const meta: Meta<FormFieldStoryArgs> = {
  title: 'Shared/FormField',
  component: FormField,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    hint: { control: 'text' },
    required: { control: 'boolean' },
    error: { control: 'text' },
    // Host-only args — they drive the demo, not the component.
    serverMessage: { control: 'text' },
    touched: { control: 'boolean' },
  },
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: [
          'The label / hint / error shell around a single form control, so an `input`, a `select`,',
          'a `textarea` and the Jalali datepicker all announce their name, their rule and their',
          'failure the same way.',
          '',
          '**Use case** — every control inside a `[formGroup]`. Reach for it instead of writing a',
          '`<label>`, a hint paragraph and an `@if (errors)` block per field. Do **not** use it for a',
          'search box in a toolbar or a filter in a table header: those are labelled by their',
          'placeholder and their position, and a stacked label would break the single-row layout',
          'they exist to keep.',
          '',
          '**How to use** — project the control and name it with `controlName`. That is the whole',
          'contract; the error, the asterisk and the server message are all derived:',
          '',
          '```html',
          '<app-form-field controlName="title" label="عنوان" hint="حداکثر ۶۰ کاراکتر">',
          '  <input pInputText formControlName="title" id="title" />',
          '</app-form-field>',
          '```',
          '',
          'The one thing the caller must do: set the **same `id`** on the projected control that',
          '`inputId` names (it defaults to `controlName`). Projection is the single thing a wrapper',
          'cannot reach into, so the `for`/`id` pair is the caller’s job. The hint and the error are',
          'then addressable as `<id>-hint` and `<id>-error` for `aria-describedby`.',
          '',
          '**Logic** — the field is bound to the parent form through `ControlContainer`, so',
          '`form.get(controlName)` is the single source of truth. Nothing is copied onto the',
          'component and nothing can go stale.',
          '',
          'It re-renders on `AbstractControl.events` and **not** on `statusChanges`. That is the',
          'detail this component exists to get right: `markAsTouched()` fires on blur and emits no',
          'status change at all — an empty required field is invalid before the blur and invalid',
          'after it — so an error keyed on `statusChanges` would stay hidden forever. `events`',
          'carries `TouchedChangeEvent` alongside the status and value events, so one subscription',
          'covers every reason to repaint.',
          '',
          'The asterisk is **derived**, via `hasValidator(Validators.required)`, so it cannot drift',
          'from the validation. `[required]` exists only for a control that is mandatory by policy',
          'but carries no validator.',
          '',
          'Error precedence is hand-written `error` → server `fields` → validator. The first two',
          'appear immediately, because the user has just submitted and is waiting; a validator',
          'message waits for `touched`, because shouting at somebody who has not finished typing is',
          'the classic mistake. `serverError` takes the whole `ApiError` and reads only its own key,',
          'so one failed request can put «کد تکراری است» under the code input and nothing anywhere',
          'else.',
          '',
          'The hint stays visible while an error is showing. Replacing it would be tidier, but it',
          'would remove «حداکثر ۶۰ کاراکتر» at exactly the moment the user needs to read it.',
          '',
          '`text-danger-text`, not `text-danger`: `#ef4444` on white is 3.76:1, under WCAG AA’s',
          '4.5:1 for 12px text. The token is the same red darkened to 4.83:1. Dark mode needs no',
          'twin — `#f87171` on `#0f172a` is already 6.53:1.',
        ].join('\n'),
      },
    },
  },
};
export default meta;
type Story = StoryObj<FormFieldStoryArgs>;

/** The default: a required field, untouched, with the asterisk derived. */
export const Basic: Story = {
  args: { label: 'عنوان', touched: false },
  render: (args) => ({
    props: args,
    template: `<app-form-field-story
      [label]="label"
      [hint]="hint"
      [required]="required"
      [error]="error"
      [serverMessage]="serverMessage"
      [touched]="touched"
    />`,
    moduleMetadata: { imports: [FormFieldStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'No `[required]` is passed and the asterisk is there anyway — it comes from ' +
          '`Validators.required` on the control. That is the difference between a label that ' +
          'promises a rule and a label that agrees with the validation.',
      },
    },
  },
};

/** A field that explains its rule before the user gets it wrong. */
export const WithHint: Story = {
  args: { label: 'نامک', hint: 'در آدرس صفحه استفاده می‌شود و باید یکتا باشد.' },
  render: (args) => ({
    props: args,
    template: `<app-form-field-story
      [label]="label"
      [hint]="hint"
      [required]="required"
      [error]="error"
      [serverMessage]="serverMessage"
      [touched]="touched"
    />`,
    moduleMetadata: { imports: [FormFieldStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'The hint sits below the control in the same muted weight the panel uses for metadata. ' +
          'It is the cheapest validation there is: a rule stated before the attempt costs the user ' +
          'nothing, while the same rule stated after it costs a correction.',
      },
    },
  },
};

/** The touched-and-invalid state — what the user sees after leaving an empty required field. */
export const Error: Story = {
  args: { label: 'عنوان', touched: true },
  render: (args) => ({
    props: args,
    template: `<app-form-field-story
      [label]="label"
      [hint]="hint"
      [required]="required"
      [error]="error"
      [serverMessage]="serverMessage"
      [touched]="touched"
    />`,
    moduleMetadata: { imports: [FormFieldStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'Compare with `Basic`: the same control, the same empty value — only `touched` differs. ' +
          'That is the whole visibility rule. Before the blur the field is already invalid and ' +
          'says nothing, because the user has not finished.',
      },
    },
  },
};

/** A rejected submit — the server’s own message, mapped onto the field it belongs to. */
export const ServerError: Story = {
  args: { label: 'عنوان', serverMessage: 'کد وارد شده تکراری است.' },
  render: (args) => ({
    props: args,
    template: `<app-form-field-story
      [label]="label"
      [hint]="hint"
      [required]="required"
      [error]="error"
      [serverMessage]="serverMessage"
      [touched]="touched"
    />`,
    moduleMetadata: { imports: [FormFieldStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'No `touched` here, and the message shows anyway. A server rejection is the answer to a ' +
          'submit the user already made, so making it wait for a blur would be waiting for an ' +
          'event that may never come. The host builds one `ApiError` and the field reads only the ' +
          '`title` key out of `fields` — which is why this message cannot appear under any other ' +
          'field on the page.',
      },
    },
  },
};

/**
 * Two fields in the layout they actually live in — one required, one not.
 *
 * The side-by-side comparison is the point: the asterisk is derived per control,
 * so the optional field is visibly different without a line of configuration.
 */
export const InContext: Story = {
  args: {},
  render: () => ({
    template: `<app-form-context-story />`,
    moduleMetadata: { imports: [FormContextStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'A card, a heading, two fields and an action row — the shape every create/edit page in ' +
          'this panel takes. The fields stack in one column at any width, which is why there is ' +
          'no breakpoint to get wrong: a stacked column is already the 320px layout, and each ' +
          'control keeps its own touch-friendly height. Toggle the Theme toolbar to watch the ' +
          'label, the hint and the error all follow the same light/dark pair as the card surface.',
      },
    },
  },
};
