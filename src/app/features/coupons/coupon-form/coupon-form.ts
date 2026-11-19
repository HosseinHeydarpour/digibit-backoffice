import {
  ChangeDetectionStrategy,
  Component,
  OnChanges,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { SimpleChanges } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField } from '@shared/components/form-field/form-field';
import { JalaliDatepicker } from '@shared/components/jalali-datepicker/jalali-datepicker';
import { LoadingDirective } from '@shared/directives/loading.directive';
import { ApiError } from '@shared/models';
import { ButtonDirective } from 'primeng/button';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { startWith } from 'rxjs';

import type { Coupon, CouponInput, CouponType } from '../models/coupon.model';
import { CouponsService } from '../services/coupons.service';

import { generateCouponCode } from './coupon-code';
import {
  couponCodeValidator,
  couponDateRangeValidator,
  couponValueValidator,
  minCartWarning,
} from './coupon-validators';

const DAY = 86_400_000;

/** `millis` → `YYYY-MM-DD` in LOCAL time (the datepicker's own contract). */
function toDateInput(millis: number): string {
  const date = new Date(millis);
  const pad = (value: number): string => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A `YYYY-MM-DD` string → the first millisecond of that local day. */
function toStartOfDay(value: string | null): number {
  if (!value) {
    return 0;
  }

  const [year, month, day] = value.split('-').map(Number);

  return new Date(year, month - 1, day).getTime();
}

/** A `YYYY-MM-DD` string → the last millisecond of that local day (inclusive). */
function toEndOfDay(value: string | null): number {
  if (!value) {
    return 0;
  }

  return toStartOfDay(value) + DAY - 1;
}

/**
 * Coupon create/edit form (BO-J02).
 *
 * One form for both modes: the open dialog binds `[coupon]`, and `ngOnChanges`
 * hydrates or resets it. The list re-creates the component every time the
 * dialog opens, so a cancelled edit cannot leak into the next create.
 *
 * TRACE — saving a new 20% coupon:
 *   1. `code` is generated (`OFF-…`), `type` is percent, `value` 20, dates are
 *      two Jalali picks; `from`/`to` controls hold Gregorian `YYYY-MM-DD`.
 *   2. `toInput()` converts the window to UTC millis: start-of-day for `from`,
 *      END-of-day for `to`, so a coupon that ends «۱۵ مرداد» still works at
 *      23:59 on the 15th.
 *   3. `create` answers 201 → `saved` → the list toasts, closes and reloads.
 *   4. A duplicate code answers 422 with `fields.code`; the message is written
 *      onto the control, the field is marked touched, and the dialog stays open.
 */
@Component({
  selector: 'app-coupon-form',
  imports: [
    ReactiveFormsModule,
    FormField,
    JalaliDatepicker,
    LoadingDirective,
    ButtonDirective,
    InputNumber,
    InputText,
    Select,
    Textarea,
  ],
  templateUrl: './coupon-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CouponForm implements OnChanges {
  private readonly coupons = inject(CouponsService);

  /** `null` = create; a record = edit. */
  readonly coupon = input<Coupon | null>(null);

  readonly saved = output<Coupon>();

  readonly cancelled = output<void>();

  readonly saving = signal(false);

  readonly saveError = signal<string | null>(null);

  readonly form = new FormGroup(
    {
      code: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, couponCodeValidator],
      }),
      type: new FormControl<CouponType>('percent', { nonNullable: true }),
      value: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
      minCart: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
      maxUses: new FormControl(100, { nonNullable: true, validators: [Validators.min(1)] }),
      maxUsesPerUser: new FormControl<number | null>(1, { validators: [Validators.min(1)] }),
      from: new FormControl<string | null>(null, { validators: [Validators.required] }),
      to: new FormControl<string | null>(null, { validators: [Validators.required] }),
      description: new FormControl('', { nonNullable: true }),
    },
    { validators: [couponValueValidator, couponDateRangeValidator] },
  );

  /** The live form value; feeds the one cross-field WARNING. */
  private readonly formValue = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );

  /** An amount coupon bigger than its minimum cart: allowed, but worth a note. */
  readonly minCartWarning = computed(() => {
    const value = this.formValue();

    return minCartWarning(
      value.type ?? 'percent',
      Number(value.value) || 0,
      Number(value.minCart) || 0,
    );
  });

  get typeOptions(): { label: string; value: CouponType }[] {
    return [
      { label: 'درصدی', value: 'percent' },
      { label: 'مبلغی', value: 'amount' },
    ];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['coupon']) {
      this.hydrate();
    }
  }

  /** The «تولید» button: an English code the user may still edit. */
  generateCode(): void {
    this.form.controls.code.setValue(generateCouponCode());
    this.form.controls.code.markAsTouched();
  }

  /** A server error's field message, shown only after the field was touched. */
  fieldError(name: string): string | null {
    const control = this.form.get(name);

    if (!control?.touched) {
      return null;
    }

    const server = control.errors?.['server'];

    if (typeof server === 'string') {
      return server;
    }

    const errors = control.errors ?? {};

    if (errors['codePattern']) {
      return 'کد باید ۳ تا ۲۰ کاراکتر انگلیسی، رقم یا خط تیره باشد.';
    }

    if (errors['percentRange']) {
      return 'درصد باید بین ۱ و ۱۰۰ باشد.';
    }

    if (errors['amountPositive']) {
      return 'مبلغ تخفیف باید بزرگ‌تر از صفر باشد.';
    }

    if (errors['afterFrom']) {
      return 'پایان بازه باید بعد از شروع باشد.';
    }

    return null;
  }

  save(): void {
    if (this.saving()) {
      return;
    }

    this.form.markAllAsTouched();
    this.saveError.set(null);
    this.clearServerErrors();

    if (this.form.invalid) {
      this.saveError.set('اطلاعات فرم را کامل کنید.');
      return;
    }

    this.saving.set(true);

    const editing = this.coupon();
    const input = this.toInput();
    const request = editing ? this.coupons.update(editing.id, input) : this.coupons.create(input);

    request.subscribe({
      next: (coupon) => {
        this.saving.set(false);
        this.saved.emit(coupon);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.onSaveError(error);
      },
    });
  }

  private hydrate(): void {
    const coupon = this.coupon();
    const now = Date.now();

    this.saveError.set(null);
    this.clearServerErrors();

    if (coupon) {
      this.form.reset({
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minCart: coupon.minCart,
        maxUses: coupon.maxUses,
        maxUsesPerUser: coupon.maxUsesPerUser,
        from: toDateInput(coupon.from),
        to: toDateInput(coupon.to),
        description: coupon.description,
      });
    } else {
      this.form.reset({
        code: '',
        type: 'percent',
        value: 0,
        minCart: 0,
        maxUses: 100,
        maxUsesPerUser: 1,
        from: toDateInput(now),
        to: toDateInput(now + 30 * DAY),
        description: '',
      });
    }
  }

  private toInput(): CouponInput {
    const value = this.form.getRawValue();

    return {
      code: value.code.trim().toUpperCase(),
      type: value.type,
      value: Number(value.value) || 0,
      minCart: Number(value.minCart) || 0,
      maxUses: Number(value.maxUses) || 0,
      maxUsesPerUser:
        value.maxUsesPerUser === null || value.maxUsesPerUser === undefined
          ? null
          : Number(value.maxUsesPerUser),
      from: toStartOfDay(value.from),
      to: toEndOfDay(value.to),
      description: value.description.trim(),
    };
  }

  /**
   * A 422 carries `fields`; each message goes under its control and the dialog
   * stays open with the typed values. Any other failure is one banner sentence
   * (the interceptor already toasted it).
   */
  private onSaveError(error: unknown): void {
    if (error instanceof ApiError && error.fields) {
      for (const [field, messages] of Object.entries(error.fields)) {
        const control = this.form.get(field);

        if (control && messages.length > 0) {
          control.setErrors({ server: messages[0] });
          control.markAsTouched();
        }
      }

      return;
    }

    this.saveError.set(
      error instanceof ApiError ? error.message : 'ذخیرهٔ کوپن ناموفق بود. دوباره تلاش کنید.',
    );
  }

  /** A `server` error makes the control invalid; drop it before the retry. */
  private clearServerErrors(): void {
    for (const control of Object.values(this.form.controls)) {
      if (control.errors?.['server']) {
        const errors = { ...control.errors };
        delete errors['server'];
        control.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
    }
  }
}
