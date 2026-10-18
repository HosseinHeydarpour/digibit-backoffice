// src/app/shared/components/form-field/form-field.spec.ts
//
// One `describe` per test case, matching TASKS-PHASE-1.md's numbering.
//
// The control is a REAL `FormGroup`, not a stub. tc 2 and tc 10 both turn on
// `markAsTouched()` emitting a `TouchedChangeEvent`, which a hand-written mock
// would simply not do — the test would pass against an object that behaves
// nothing like a control. Only `ApiError` is constructed by hand, because that
// is a plain value.
//
// No `vi` anywhere (repo rule): hosts, real forms, TestBed.
//
// WHAT JSDOM CANNOT CHECK (tc 7, tc 9)
// ------------------------------------
// jsdom applies no Tailwind stylesheet and does no layout, so "red enough" and
// "full width" are asserted as CLASS PRESENCE on the right element. The colour
// values themselves are measured in the tailwind.css comment (4.83:1 light,
// 6.53:1 dark); these tests fail loudly if a future edit drops the token.

import { Component } from '@angular/core';
import type { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '@shared/models';

import { FormField } from './form-field';

/** The normal case: a required `title` and an optional `notes`, both wrapped. */
@Component({
  imports: [ReactiveFormsModule, FormField],
  template: `
    <form [formGroup]="form">
      <app-form-field
        controlName="title"
        label="عنوان"
        hint="حداکثر ۶۰ کاراکتر"
        [serverError]="serverError"
      >
        <input formControlName="title" id="title" />
      </app-form-field>

      <app-form-field controlName="notes" label="یادداشت" [serverError]="serverError">
        <input formControlName="notes" id="notes" />
      </app-form-field>
    </form>
  `,
})
class Host {
  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    notes: new FormControl('', { nonNullable: true }),
  });

  // `[serverError]` is bound on BOTH fields on purpose. A real page holds one
  // ApiError for the whole submit and hands it to every field; each field then
  // reads only its own key. That arrangement is what makes the "does not leak"
  // case a real test — with the binding on one field only, the second field
  // could never show anything and the case would prove nothing.
  serverError: ApiError | null = null;
}

/** `[control]` mode — the path `app-jalali-datepicker` needs. */
@Component({
  imports: [FormField],
  template: `
    <app-form-field label="تاریخ تحویل" inputId="date" [control]="control">
      <input id="date" />
    </app-form-field>
  `,
})
class DirectHost {
  readonly control = new FormControl<string | null>(null, Validators.required);
}

/**
 * `[required]` bound to a value that is `undefined`.
 *
 * This is the shape a real caller writes — `[required]="someOptionalFlag"` — and
 * it is how the asterisk bug was found: an `input<boolean | null>(null)` does not
 * coerce `undefined` to `null`, so a guard written as `!== null` reads the
 * unset value as an explicit "not required" and drops the asterisk from a field
 * that carries `Validators.required`.
 */
@Component({
  imports: [ReactiveFormsModule, FormField],
  template: `
    <form [formGroup]="form">
      <app-form-field controlName="title" label="عنوان" [required]="unset">
        <input formControlName="title" id="title" />
      </app-form-field>
    </form>
  `,
})
class UnsetRequiredHost {
  readonly unset: boolean | undefined = undefined;

  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
}

function mount<T>(type: Type<T>): ComponentFixture<T> {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  return fixture;
}

/** The nth `<app-form-field>` host element. */
function field(fixture: ComponentFixture<unknown>, index = 0): HTMLElement {
  return fixture.nativeElement.querySelectorAll('app-form-field')[index] as HTMLElement;
}

/** Blur is the real trigger: FormControlName calls markAsTouched() on it. */
function blur(fixture: ComponentFixture<unknown>, index = 0): void {
  field(fixture, index).querySelector('input')!.dispatchEvent(new Event('blur'));
  fixture.detectChanges();
}

describe('FormField', () => {
  // tc 1
  describe('label', () => {
    it('renders the label text and points it at the control id', () => {
      const fixture = mount(Host);
      const label = field(fixture).querySelector('label')!;

      expect(label.textContent).toContain('عنوان');
      expect(label.getAttribute('for')).toBe('title');
    });
  });

  // tc 2
  describe('touched error', () => {
    it('stays silent until the control is touched, then shows the error', () => {
      const fixture = mount(Host);
      expect(field(fixture).querySelector('[role="alert"]')).toBeNull();

      blur(fixture);

      expect(field(fixture).querySelector('[role="alert"]')).not.toBeNull();
    });
  });

  // tc 3
  describe('message wording', () => {
    it('renders the Persian sentence, not the validator key', () => {
      const fixture = mount(Host);
      blur(fixture);

      const message = field(fixture).querySelector('[role="alert"]')!.textContent!.trim();
      expect(message).toBe('این فیلد الزامی است.');
      expect(message).not.toContain('required');
    });
  });

  // tc 4
  describe('hint', () => {
    it('renders the hint when given and omits the element entirely when not', () => {
      const fixture = mount(Host);

      expect(field(fixture).querySelector('[id="title-hint"]')!.textContent).toContain(
        'حداکثر ۶۰ کاراکتر',
      );
      expect(field(fixture, 1).querySelector('[id="notes-hint"]')).toBeNull();
    });

    it('keeps the hint visible while an error is showing', () => {
      const fixture = mount(Host);
      blur(fixture);

      expect(field(fixture).querySelector('[id="title-hint"]')).not.toBeNull();
      expect(field(fixture).querySelector('[role="alert"]')).not.toBeNull();
    });
  });

  // tc 5
  describe('required asterisk', () => {
    it('appears only on the control that carries Validators.required', () => {
      const fixture = mount(Host);

      expect(field(fixture).querySelector('label')!.textContent).toContain('*');
      expect(field(fixture, 1).querySelector('label')!.textContent).not.toContain('*');
    });

    it('is announced in words for a screen reader', () => {
      const fixture = mount(Host);

      expect(field(fixture).querySelector('.sr-only')!.textContent).toContain('الزامی');
    });

    it('still derives when [required] is bound to an undefined value', () => {
      const fixture = mount(UnsetRequiredHost);

      expect(field(fixture).querySelector('label')!.textContent).toContain('*');
    });
  });

  // tc 6
  describe('server error', () => {
    it('maps the message for this field out of error.fields', () => {
      const fixture = mount(Host);
      fixture.componentInstance.serverError = new ApiError('VALIDATION', 'داده معتبر نیست', 422, {
        title: ['کد تکراری است'],
      });
      fixture.detectChanges();

      expect(field(fixture).querySelector('[role="alert"]')!.textContent!.trim()).toBe(
        'کد تکراری است',
      );
    });

    it('does not leak another field’s message onto this one', () => {
      const fixture = mount(Host);
      fixture.componentInstance.serverError = new ApiError('VALIDATION', 'داده معتبر نیست', 422, {
        notes: ['یادداشت نامعتبر است'],
      });
      fixture.detectChanges();

      expect(field(fixture).querySelector('[role="alert"]')).toBeNull();
      expect(field(fixture, 1).querySelector('[role="alert"]')!.textContent!.trim()).toBe(
        'یادداشت نامعتبر است',
      );
    });
  });

  // tc 7
  describe('error styling', () => {
    it('paints the error with the contrast-safe token in both themes', () => {
      const fixture = mount(Host);
      blur(fixture);

      const message = field(fixture).querySelector('[role="alert"]')!;
      expect(message.classList.contains('text-danger-text')).toBe(true);
      expect(message.classList.contains('dark:text-danger-dark')).toBe(true);
    });
  });

  // tc 8
  describe('clean field', () => {
    it('shows no error for a touched but valid control', () => {
      const fixture = mount(Host);
      blur(fixture, 1);

      expect(field(fixture, 1).querySelector('[role="alert"]')).toBeNull();
    });
  });

  // tc 9
  describe('mobile layout', () => {
    it('lets the field fill its column and stack its parts', () => {
      const fixture = mount(Host);
      const wrapper = field(fixture).querySelector('div')!;

      expect(wrapper.classList.contains('w-full')).toBe(true);
      expect(wrapper.classList.contains('flex-col')).toBe(true);
    });
  });

  // tc 10
  describe('form + control integration', () => {
    it('resolves the control from the parent form and reacts to its state', () => {
      const fixture = mount(Host);
      const control = fixture.componentInstance.form.controls.title;

      expect(field(fixture).querySelector('[role="alert"]')).toBeNull();

      control.markAsTouched();
      fixture.detectChanges();
      expect(field(fixture).querySelector('[role="alert"]')).not.toBeNull();

      control.setValue('کالای تستی');
      fixture.detectChanges();
      expect(field(fixture).querySelector('[role="alert"]')).toBeNull();
    });

    it('works in [control] mode with no form around it', () => {
      const fixture = mount(DirectHost);
      fixture.componentInstance.control.markAsTouched();
      fixture.detectChanges();

      expect(field(fixture).querySelector('label')!.getAttribute('for')).toBe('date');
      expect(field(fixture).querySelector('[role="alert"]')!.textContent!.trim()).toBe(
        'این فیلد الزامی است.',
      );
    });
  });
});
