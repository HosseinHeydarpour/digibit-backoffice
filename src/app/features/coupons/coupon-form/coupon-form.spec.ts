import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApiError } from '@shared/models';
import { Observable, of, throwError } from 'rxjs';

import type { Coupon, CouponInput } from '../models/coupon.model';
import { CouponsService } from '../services/coupons.service';

import { CouponForm } from './coupon-form';

const COUPON: Coupon = {
  id: '1',
  code: 'WELCOME10',
  type: 'percent',
  value: 10,
  minCart: 0,
  maxUses: 1000,
  maxUsesPerUser: 1,
  usedCount: 120,
  from: new Date(2026, 0, 1).getTime(),
  to: new Date(2026, 0, 31).getTime(),
  description: 'تخفیف اولین خرید',
  isActive: true,
  createdAt: new Date(2025, 11, 1).getTime(),
};

class CouponsServiceStub {
  created: CouponInput[] = [];

  updated: { id: string; input: CouponInput }[] = [];

  failWith: unknown = null;

  create(input: CouponInput): Observable<Coupon> {
    this.created.push(input);

    return this.failWith ? throwError(() => this.failWith) : of({ ...COUPON, ...input, id: '13' });
  }

  update(id: string, input: CouponInput): Observable<Coupon> {
    this.updated.push({ id, input });

    return this.failWith ? throwError(() => this.failWith) : of({ ...COUPON, ...input });
  }
}

describe('CouponForm (BO-J02)', () => {
  let fixture: ComponentFixture<CouponForm>;
  let component: CouponForm;
  let service: CouponsServiceStub;

  async function mount(coupon: Coupon | null): Promise<void> {
    service = new CouponsServiceStub();

    await TestBed.configureTestingModule({
      imports: [CouponForm],
      providers: [{ provide: CouponsService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(CouponForm);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('coupon', coupon);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function save(): Promise<void> {
    component.save();
    await fixture.whenStable();
  }

  it('starts a create form with a 30-day window and an empty code', async () => {
    await mount(null);

    expect(component.form.controls.code.value).toBe('');
    expect(component.form.controls.type.value).toBe('percent');
    expect(component.form.controls.maxUses.value).toBe(100);
    expect(component.form.controls.from.value).toBeTruthy();
    expect(component.form.controls.to.value).toBeTruthy();
  });

  it('generates an English code into the field', async () => {
    await mount(null);

    component.generateCode();

    expect(component.form.controls.code.value).toMatch(/^OFF-[A-Z0-9]{6}$/);
  });

  it('creates a coupon with start-of-day and end-of-day millis', async () => {
    await mount(null);
    let emitted: Coupon | undefined;
    component.saved.subscribe((coupon) => (emitted = coupon));

    component.form.patchValue({
      code: ' spring25 ',
      type: 'percent',
      value: 25,
      maxUses: 10,
      maxUsesPerUser: null,
      from: '2026-01-01',
      to: '2026-01-31',
      description: ' کمپین ',
    });
    await save();

    expect(service.created).toEqual([
      {
        code: 'SPRING25',
        type: 'percent',
        value: 25,
        minCart: 0,
        maxUses: 10,
        maxUsesPerUser: null,
        from: new Date(2026, 0, 1).getTime(),
        to: new Date(2026, 0, 31, 23, 59, 59, 999).getTime(),
        description: 'کمپین',
      },
    ]);
    expect(emitted?.id).toBe('13');
  });

  it('hydrates and updates an existing coupon', async () => {
    await mount(COUPON);

    expect(component.form.controls.code.value).toBe('WELCOME10');
    expect(component.form.controls.from.value).toBe('2026-01-01');

    component.form.controls.value.setValue(15);
    await save();

    expect(service.updated.length).toBe(1);
    expect(service.updated[0].id).toBe('1');
    expect(service.updated[0].input.value).toBe(15);
  });

  it('does not call the service when the form is invalid', async () => {
    await mount(null);

    component.form.controls.code.setValue('');
    await save();

    expect(service.created).toEqual([]);
    expect(component.saveError()).toContain('کامل');
  });

  it('maps a duplicate code under the field and keeps the form open', async () => {
    await mount(null);
    let emitted = false;
    component.saved.subscribe(() => (emitted = true));
    service.failWith = new ApiError('VALIDATION', 'تکراری', 422, {
      code: ['این کد قبلاً ثبت شده است.'],
    });

    component.form.patchValue({
      code: 'WELCOME10',
      value: 10,
      from: '2026-01-01',
      to: '2026-01-31',
    });
    await save();

    expect(component.form.controls.code.errors?.['server']).toBe('این کد قبلاً ثبت شده است.');
    expect(component.fieldError('code')).toBe('این کد قبلاً ثبت شده است.');
    expect(emitted).toBe(false);
  });

  it('emits cancelled from the button', async () => {
    await mount(null);
    let cancelled = false;
    component.cancelled.subscribe(() => (cancelled = true));

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    );
    const cancel = buttons.find((button) => button.textContent?.includes('انصراف'));

    cancel?.click();

    expect(cancelled).toBe(true);
  });

  it('rejects a percent above 100 and names the rule after touch', async () => {
    await mount(null);

    component.form.controls.value.setValue(120);
    component.form.controls.value.markAsTouched();

    expect(component.form.controls.value.errors?.['percentRange']).toBe(true);
    expect(component.fieldError('value')).toContain('۱ و ۱۰۰');
  });

  it('accepts the same number once the coupon is an amount', async () => {
    await mount(null);

    component.form.patchValue({ type: 'amount', value: 120 });

    expect(component.form.controls.value.errors?.['percentRange']).toBeUndefined();
    expect(component.form.controls.value.errors?.['amountPositive']).toBeUndefined();
  });

  it('rejects an end date before the start date', async () => {
    await mount(null);

    component.form.patchValue({ from: '2026-02-01', to: '2026-01-01' });
    component.form.controls.to.markAsTouched();

    expect(component.form.controls.to.errors?.['afterFrom']).toBe(true);
    expect(component.fieldError('to')).toContain('بعد از شروع');
  });

  it('warns when an amount coupon is bigger than its minimum cart', async () => {
    await mount(null);

    component.form.patchValue({ type: 'amount', value: 200_000, minCart: 100_000 });
    fixture.detectChanges();

    expect(component.minCartWarning()).toContain('بیشتر');
    expect(fixture.nativeElement.textContent).toContain('بیشتر');
  });
});
