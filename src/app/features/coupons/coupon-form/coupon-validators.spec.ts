import { FormControl, FormGroup } from '@angular/forms';

import type { CouponType } from '../models/coupon.model';

import {
  couponCodeValidator,
  couponDateRangeValidator,
  couponValueValidator,
  minCartWarning,
} from './coupon-validators';

function valueGroup(type: CouponType, value: number): FormGroup {
  const group = new FormGroup({
    type: new FormControl<CouponType>(type, { nonNullable: true }),
    value: new FormControl(value, { nonNullable: true }),
  });

  group.addValidators(couponValueValidator);
  group.updateValueAndValidity({ emitEvent: false });

  return group;
}

function dateGroup(from: string | null, to: string | null): FormGroup {
  const group = new FormGroup({
    from: new FormControl<string | null>(from),
    to: new FormControl<string | null>(to),
  });

  group.addValidators(couponDateRangeValidator);
  group.updateValueAndValidity({ emitEvent: false });

  return group;
}

describe('coupon validators (BO-J03)', () => {
  it('accepts an English code of 3..20 characters and rejects the rest', () => {
    expect(couponCodeValidator(new FormControl('OFF-20'))).toBeNull();
    // Lowercase is accepted because the form sends the uppercase value.
    expect(couponCodeValidator(new FormControl('off-20'))).toBeNull();
    expect(couponCodeValidator(new FormControl('AB'))).toEqual({ codePattern: true });
    expect(couponCodeValidator(new FormControl('OFF 20'))).toEqual({ codePattern: true });
    expect(couponCodeValidator(new FormControl('X'.repeat(21)))).toEqual({ codePattern: true });
  });

  it('leaves an empty code to the required validator', () => {
    expect(couponCodeValidator(new FormControl(''))).toBeNull();
  });

  it('rejects a percent outside 1..100', () => {
    expect(valueGroup('percent', 0).controls['value'].errors).toEqual({ percentRange: true });
    expect(valueGroup('percent', 101).controls['value'].errors).toEqual({ percentRange: true });
    expect(valueGroup('percent', 100).controls['value'].errors).toBeNull();
    expect(valueGroup('percent', 1).controls['value'].errors).toBeNull();
  });

  it('rejects a non-positive amount and accepts a positive one', () => {
    expect(valueGroup('amount', 0).controls['value'].errors).toEqual({ amountPositive: true });
    expect(valueGroup('amount', -5).controls['value'].errors).toEqual({ amountPositive: true });
    expect(valueGroup('amount', 50_000).controls['value'].errors).toBeNull();
  });

  it('revalidates the value when the type changes', () => {
    const group = valueGroup('percent', 80);
    expect(group.controls['value'].errors).toBeNull();

    group.controls['type'].setValue('amount');

    expect(group.controls['value'].errors).toBeNull(); // 80 Toman is still valid

    group.controls['type'].setValue('percent');
    group.controls['value'].setValue(120);
    expect(group.controls['value'].errors).toEqual({ percentRange: true });
  });

  it('rejects an end date before the start date', () => {
    expect(dateGroup('2026-02-01', '2026-01-01').controls['to'].errors).toEqual({
      afterFrom: true,
    });
    expect(dateGroup('2026-01-01', '2026-02-01').controls['to'].errors).toBeNull();
    expect(dateGroup('2026-01-01', '2026-01-01').controls['to'].errors).toBeNull();
  });

  it('ignores an absent date instead of inventing an error', () => {
    expect(dateGroup(null, '2026-01-01').controls['to'].errors).toBeNull();
    expect(dateGroup('2026-01-01', null).controls['to'].errors).toBeNull();
  });

  it('warns when an amount coupon exceeds the minimum cart', () => {
    expect(minCartWarning('amount', 200_000, 100_000)).toContain('بیشتر');
    expect(minCartWarning('amount', 50_000, 100_000)).toBeNull();
    expect(minCartWarning('percent', 50_000, 0)).toBeNull();
  });
});
