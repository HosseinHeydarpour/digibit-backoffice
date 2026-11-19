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
import { LoadingDirective } from '@shared/directives/loading.directive';
import { ApiError } from '@shared/models';
import { ButtonDirective } from 'primeng/button';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { startWith } from 'rxjs';

import type { ShippingMethod, ShippingMethodInput } from '../models/shipping-method.model';
import { ShippingService } from '../services/shipping.service';

import {
  freeFromWarning,
  shippingDaysValidator,
  shippingFreeFromValidator,
  shippingNameValidator,
} from './shipping-validators';

/**
 * Shipping create/edit form (BO-K02/K06).
 *
 * One form for both modes; the list re-creates it on every open, so a
 * cancelled edit cannot leak into the next create. Costs are Toman, the free
 * threshold may be empty (no free shipping), and the day window is two numeric
 * fields rather than a free-text range.
 *
 * A free threshold below the base cost is a WARNING, not an error: the values
 * are legal, they just do not do what the author probably meant.
 */
@Component({
  selector: 'app-shipping-form',
  imports: [
    ReactiveFormsModule,
    FormField,
    LoadingDirective,
    ButtonDirective,
    InputNumber,
    InputText,
  ],
  templateUrl: './shipping-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShippingForm implements OnChanges {
  private readonly shipping = inject(ShippingService);

  /** `null` = create; a record = edit. */
  readonly method = input<ShippingMethod | null>(null);

  readonly saved = output<ShippingMethod>();

  readonly cancelled = output<void>();

  readonly saving = signal(false);

  readonly saveError = signal<string | null>(null);

  readonly form = new FormGroup(
    {
      name: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, shippingNameValidator],
      }),
      cost: new FormControl(0, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0)],
      }),
      freeFrom: new FormControl<number | null>(null, { validators: [Validators.min(0)] }),
      minDays: new FormControl(2, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(1)],
      }),
      maxDays: new FormControl(4, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(1)],
      }),
    },
    { validators: [shippingDaysValidator, shippingFreeFromValidator] },
  );

  private readonly formValue = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );

  /** A live note under the free threshold, not a blocker. */
  readonly thresholdWarning = computed(() => {
    const value = this.formValue();
    const freeFrom =
      value.freeFrom === null || value.freeFrom === undefined ? null : Number(value.freeFrom);

    return freeFromWarning(Number(value.cost) || 0, freeFrom);
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['method']) {
      this.hydrate();
    }
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

    if (errors['nameShort']) {
      return 'نام باید حداقل ۳ کاراکتر باشد.';
    }

    if (errors['nameLong']) {
      return 'نام باید حداکثر ۴۰ کاراکتر باشد.';
    }

    if (errors['freeFromNegative']) {
      return 'آستانهٔ رایگان نباید منفی باشد.';
    }

    if (errors['minDaysError']) {
      return 'حداقل روز باید بین ۱ و ۳۰ باشد.';
    }

    if (errors['maxDaysError']) {
      return 'حداکثر روز باید بین حداقل روز و ۳۰ باشد.';
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

    const editing = this.method();
    const input = this.toInput();
    const request = editing ? this.shipping.update(editing.id, input) : this.shipping.create(input);

    request.subscribe({
      next: (method) => {
        this.saving.set(false);
        this.saved.emit(method);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.onSaveError(error);
      },
    });
  }

  private hydrate(): void {
    const method = this.method();

    this.saveError.set(null);
    this.clearServerErrors();

    this.form.reset(
      method
        ? {
            name: method.name,
            cost: method.cost,
            freeFrom: method.freeFrom,
            minDays: method.minDays,
            maxDays: method.maxDays,
          }
        : { name: '', cost: 0, freeFrom: null, minDays: 2, maxDays: 4 },
    );
  }

  private toInput(): ShippingMethodInput {
    const value = this.form.getRawValue();
    const freeFrom =
      value.freeFrom === null || value.freeFrom === undefined ? null : Number(value.freeFrom);

    return {
      name: value.name.trim(),
      cost: Number(value.cost) || 0,
      freeFrom,
      minDays: Number(value.minDays) || 0,
      maxDays: Number(value.maxDays) || 0,
    };
  }

  /** A 422 carries `fields`; each message goes under its control. */
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
      error instanceof ApiError ? error.message : 'ذخیرهٔ روش ارسال ناموفق بود. دوباره تلاش کن.',
    );
  }

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
