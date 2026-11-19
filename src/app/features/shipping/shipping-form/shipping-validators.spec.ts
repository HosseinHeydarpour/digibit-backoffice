import { FormControl, FormGroup } from '@angular/forms';

import {
  freeFromWarning,
  shippingDaysValidator,
  shippingFreeFromValidator,
  shippingNameValidator,
} from './shipping-validators';

function daysGroup(minDays: number, maxDays: number): FormGroup {
  const group = new FormGroup({
    minDays: new FormControl(minDays),
    maxDays: new FormControl(maxDays),
  });

  group.addValidators(shippingDaysValidator);
  group.updateValueAndValidity({ emitEvent: false });

  return group;
}

function freeGroup(freeFrom: number | null): FormGroup {
  const group = new FormGroup({ freeFrom: new FormControl(freeFrom) });

  group.addValidators(shippingFreeFromValidator);
  group.updateValueAndValidity({ emitEvent: false });

  return group;
}

describe('shipping validators (BO-K06)', () => {
  it('rejects a name shorter than 3 or longer than 40 characters', () => {
    expect(shippingNameValidator(new FormControl(''))).toBeNull();
    expect(shippingNameValidator(new FormControl('پست'))).toBeNull();
    expect(shippingNameValidator(new FormControl('پس'))).toEqual({ nameShort: true });
    expect(shippingNameValidator(new FormControl('x'.repeat(41)))).toEqual({ nameLong: true });
  });

  it('rejects a zero or negative minimum day', () => {
    expect(daysGroup(0, 4).controls['minDays'].errors).toEqual({ minDaysError: true });
    expect(daysGroup(1, 4).controls['minDays'].errors).toBeNull();
  });

  it('rejects a maximum day below the minimum or above 30', () => {
    expect(daysGroup(4, 2).controls['maxDays'].errors).toEqual({ maxDaysError: true });
    expect(daysGroup(4, 31).controls['maxDays'].errors).toEqual({ maxDaysError: true });
    expect(daysGroup(4, 7).controls['maxDays'].errors).toBeNull();
  });

  it('rejects a negative free threshold and accepts null', () => {
    expect(freeGroup(-1).controls['freeFrom'].errors).toEqual({
      freeFromNegative: true,
    });
    expect(freeGroup(null).controls['freeFrom'].errors).toBeNull();
    expect(freeGroup(0).controls['freeFrom'].errors).toBeNull();
  });

  it('warns when the free threshold is below the base cost', () => {
    expect(freeFromWarning(60_000, 45_000)).toContain('کمتر');
    expect(freeFromWarning(45_000, 60_000)).toBeNull();
    expect(freeFromWarning(45_000, null)).toBeNull();
    expect(freeFromWarning(45_000, 0)).toBeNull();
  });
});
