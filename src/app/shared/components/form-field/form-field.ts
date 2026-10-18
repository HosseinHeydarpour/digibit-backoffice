// src/app/shared/components/form-field/form-field.ts
//
// WHAT THIS IS
// ------------
// The label + hint + error shell that every input in the panel sits inside, so
// an `input`, a `select`, a `textarea` and the Jalali datepicker all announce
// their name, their rule and their failure the same way.
//
//   <form [formGroup]="form">
//     <app-form-field controlName="title" label="عنوان" hint="حداکثر ۶۰ کاراکتر">
//       <input pInputText formControlName="title" [id]="'title'" />
//     </app-form-field>
//   </form>
//
// TWO WAYS TO REACH THE CONTROL
// -----------------------------
// `controlName` is the normal one: the component injects `ControlContainer`
// (which `FormGroupDirective` provides) and resolves `form.get(controlName)`,
// exactly as the task asks. The caller writes no error plumbing at all.
//
// `[control]` is the escape hatch for a child that needs the INSTANCE rather
// than a name — `app-jalali-datepicker` takes `[control]="form.controls.x"`
// because it subscribes to that control's value itself. Passing the same
// instance here keeps one source of truth for the label and the error.
//
// WHY THE CONTROL'S `events`, AND NOT `statusChanges`
// ---------------------------------------------------
// `markAsTouched()` fires on blur and does NOT emit on `statusChanges`: a field
// that is empty-and-required goes invalid -> invalid, so the status never
// changes, and an error keyed on `statusChanges` would stay hidden forever —
// which is exactly tc 2 failing. Angular 21 exposes `AbstractControl.events`, a
// single stream carrying `TouchedChangeEvent`, `StatusChangeEvent`,
// `PristineChangeEvent` and `ValueChangeEvent`, so one subscription covers every
// reason to re-render. (Public in this version — verified against
// node_modules/@angular/forms/types/forms.d.ts:156.)
//
// The subscription is re-made by an `effect` whenever the control identity
// changes and torn down by `onCleanup`, so swapping `controlName` can never
// leave a listener on the abandoned control.
//
// WHY THE MESSAGES ARE A TABLE
// ----------------------------
// Same reason `ToastService` owns a `SEVERITY` table: the mapping from a
// validator key to a sentence is data, and if it lives in two call sites the two
// drift. `messageFor` takes the FIRST key, because a control with `required` +
// `minlength` should say "this is required", not "too short".
// ============================================================================

import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { ControlContainer, Validators } from '@angular/forms';
import type { AbstractControl, ValidationErrors } from '@angular/forms';
import type { ApiError } from '@shared/models';

/** Builds one Persian sentence from a validator's error payload. */
type MessageBuilder = (detail: ValidationErrors) => string;

/**
 * Validator key -> the sentence shown under the field (tc 3).
 *
 * Only the validators this project actually uses are listed; an unknown key
 * falls through to a generic sentence in `messageFor` rather than leaking a
 * camelCase key like `requiredLength` into the UI. Numbers stay in Latin digits
 * until BO-B16 ships the `persianDigits` pipe.
 */
const FIELD_MESSAGES: Readonly<Record<string, MessageBuilder>> = {
  required: () => 'این فیلد الزامی است.',
  email: () => 'ایمیل وارد شده معتبر نیست.',
  pattern: () => 'قالب وارد شده صحیح نیست.',
  minlength: (d) => `حداقل ${d['requiredLength']} کاراکتر وارد کنید.`,
  maxlength: (d) => `حداکثر ${d['requiredLength']} کاراکتر وارد کنید.`,
  min: (d) => `مقدار نباید کمتر از ${d['min']} باشد.`,
  max: (d) => `مقدار نباید بیشتر از ${d['max']} باشد.`,
  unique: () => 'این مقدار قبلاً ثبت شده است.',
};

/** The first error's sentence, or a generic one for an unmapped validator. */
function messageFor(errors: ValidationErrors): string | null {
  const key = Object.keys(errors)[0];
  if (!key) {
    return null;
  }
  const build = FIELD_MESSAGES[key];
  return build ? build(errors) : 'مقدار وارد شده معتبر نیست.';
}

/**
 * The label / hint / error shell for a single form control.
 *
 * @example The normal case — bound to the parent form by name
 * ```html
 * <app-form-field controlName="title" label="عنوان" hint="حداکثر ۶۰ کاراکتر">
 *   <input pInputText formControlName="title" [id]="'title'" />
 * </app-form-field>
 * ```
 *
 * @example A child that needs the control instance (the datepicker)
 * ```html
 * <app-form-field label="تاریخ تحویل" [control]="form.controls.deliveredAt">
 *   <app-jalali-datepicker [control]="form.controls.deliveredAt" />
 * </app-form-field>
 * ```
 */
@Component({
  selector: 'app-form-field',
  templateUrl: './form-field.html',
  styleUrl: './form-field.scss',
})
export class FormField {
  /** The field's name, e.g. «عنوان». Required: an unlabelled input is a bug. */
  readonly label = input.required<string>();

  /**
   * Name of the control inside the parent `FormGroup`. This is what makes the
   * wrapper automatic: the error comes from `form.get(controlName)` and the
   * server message from `error.fields[controlName]`.
   *
   * Omit it only when passing `[control]` instead.
   */
  readonly controlName = input<string | null>(null);

  /**
   * The control itself, for children that need the instance rather than a name
   * (see `app-jalali-datepicker`). Wins over `controlName` when both are given.
   */
  readonly control = input<AbstractControl | null>(null);

  /**
   * `id` of the projected control, used for the label's `for`.
   *
   * Defaults to `controlName`, so the common case needs nothing. The caller must
   * set the SAME id on the projected control — projection is the one thing a
   * wrapper cannot reach into. The hint and error are then addressable as
   * `<id>-hint` and `<id>-error` for `aria-describedby`.
   */
  readonly inputId = input<string>('');

  /** One muted line under the field, e.g. «حداکثر ۶۰ کاراکتر». Omitted → none. */
  readonly hint = input<string | null>(null);

  /**
   * Force the required asterisk on or off.
   *
   * `null` or `undefined` (the defaults) mean "ask the control":
   * `hasValidator(required)` is true exactly when the caller wrote
   * `Validators.required`, so the asterisk cannot drift from the validation
   * (tc 5). Pass a boolean only for a control that is required by policy but not
   * by a validator.
   *
   * `undefined` is part of the type on purpose. A signal input does **not** fall
   * back to its default when a binding evaluates to `undefined`, so
   * `[required]="maybeFlag"` really does deliver `undefined` — declaring the
   * input as `boolean | null` would hide that from the compiler and leave the
   * component to guess. Accepting it and treating it as "unset" is the honest
   * contract.
   */
  readonly required = input<boolean | null | undefined>(null);

  /**
   * A hand-written error, shown verbatim and immediately. Highest precedence —
   * use it for a failure that never came from the server or a validator.
   */
  readonly error = input<string | null>(null);

  /**
   * The failed request, so its `fields` map can be projected onto THIS field
   * (tc 6). The page holds one `ApiError` for the whole submit; each field reads
   * its own key, so «کد تکراری است» lands under the code input and nowhere else.
   */
  readonly serverError = input<ApiError | null>(null);

  private readonly container = inject(ControlContainer, { optional: true });

  /**
   * Bumped by the control's `events` subscription. Reading it inside
   * `errorMessage` is what makes that computed re-evaluate on blur, on a status
   * change and on a value change — `touched` is a plain getter, not a signal, so
   * without a marker nothing would ever invalidate the cache.
   */
  private readonly revision = signal(0);

  /**
   * Stable id for the label's `for` when the caller supplied neither
   * `inputId` nor `controlName`. A field counter rather than a per-render value,
   * because a `computed` that increments would hand out a new id on every
   * recompute and break the `for`/`id` pair mid-session.
   */
  private static nextFallbackId = 0;
  private readonly fallbackId = `app-form-field-${FormField.nextFallbackId++}`;

  /** The control this field reports on, from `[control]` or from the form. */
  private readonly resolvedControl = computed<AbstractControl | null>(() => {
    const direct = this.control();
    if (direct) {
      return direct;
    }

    const name = this.controlName();
    const form = this.container?.control;
    if (!name || !form) {
      return null;
    }

    return form.get(name);
  });

  /** The id shared by the label, the hint and the error. */
  protected readonly fieldId = computed(
    () => this.inputId() || this.controlName() || this.fallbackId,
  );

  /**
   * tc 5 — derived from the validator unless the caller overrides it.
   *
   * The guard is `null || undefined`, not `!== null`. An input declared as
   * `input<boolean | null>(null)` still arrives as `undefined` when a caller
   * binds an optional value that happens to be unset — `[required]="maybeBool"`.
   * Testing only against `null` would read that as an explicit "not required"
   * and silently drop the asterisk from a required field. Found in the
   * Storybook canvas, pinned by the "undefined binding" case in the spec.
   */
  protected readonly isRequired = computed(() => {
    const explicit = this.required();
    if (explicit === null || explicit === undefined) {
      return this.resolvedControl()?.hasValidator(Validators.required) ?? false;
    }
    return explicit;
  });

  /**
   * The sentence under the field, or `null` for no element at all (tc 8).
   *
   * Precedence: hand-written `error` -> server `fields` -> validator. Server and
   * manual messages show the moment they arrive, because the user has just
   * submitted and is waiting; validator messages wait for `touched`, because
   * shouting at somebody who has not finished typing is the classic mistake.
   */
  protected readonly errorMessage = computed<string | null>(() => {
    // Dependency marker — see `revision`.
    this.revision();

    const manual = this.error();
    if (manual) {
      return manual;
    }

    const apiError = this.serverError();
    if (apiError) {
      const name = this.controlName();
      const mapped = name ? apiError.fieldError(name) : undefined;
      if (mapped) {
        return mapped;
      }
    }

    const control = this.resolvedControl();
    if (!control || control.pending || !control.invalid || !control.touched) {
      return null;
    }

    return control.errors ? messageFor(control.errors) : null;
  });

  constructor() {
    effect((onCleanup) => {
      const control = this.resolvedControl();
      if (!control) {
        return;
      }

      const subscription = control.events.subscribe(() => {
        this.revision.update((value) => value + 1);
      });

      onCleanup(() => subscription.unsubscribe());
    });
  }
}
