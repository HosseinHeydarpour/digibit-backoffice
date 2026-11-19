import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApiError } from '@shared/models';
import { Observable, of, throwError } from 'rxjs';

import type { ShippingMethod, ShippingMethodInput } from '../models/shipping-method.model';
import { ShippingService } from '../services/shipping.service';

import { ShippingForm } from './shipping-form';

const METHOD: ShippingMethod = {
  id: '1',
  name: 'پست پیشتاز',
  cost: 45_000,
  freeFrom: 1_000_000,
  minDays: 2,
  maxDays: 4,
  isDefault: false,
  isActive: true,
  order: 1,
};

class ShippingServiceStub {
  created: ShippingMethodInput[] = [];

  updated: { id: string; input: ShippingMethodInput }[] = [];

  failWith: unknown = null;

  create(input: ShippingMethodInput): Observable<ShippingMethod> {
    this.created.push(input);

    return this.failWith ? throwError(() => this.failWith) : of({ ...METHOD, ...input, id: '7' });
  }

  update(id: string, input: ShippingMethodInput): Observable<ShippingMethod> {
    this.updated.push({ id, input });

    return this.failWith ? throwError(() => this.failWith) : of({ ...METHOD, ...input });
  }
}

describe('ShippingForm (BO-K02/K06)', () => {
  let fixture: ComponentFixture<ShippingForm>;
  let component: ShippingForm;
  let service: ShippingServiceStub;

  async function mount(method: ShippingMethod | null): Promise<void> {
    service = new ShippingServiceStub();

    await TestBed.configureTestingModule({
      imports: [ShippingForm],
      providers: [{ provide: ShippingService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(ShippingForm);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('method', method);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function save(): Promise<void> {
    component.save();
    await fixture.whenStable();
  }

  it('starts a create form with sensible defaults', async () => {
    await mount(null);

    expect(component.form.controls.name.value).toBe('');
    expect(component.form.controls.cost.value).toBe(0);
    expect(component.form.controls.freeFrom.value).toBeNull();
    expect(component.form.controls.minDays.value).toBe(2);
    expect(component.form.controls.maxDays.value).toBe(4);
  });

  it('creates a method with trimmed name and a null threshold', async () => {
    await mount(null);
    let emitted: ShippingMethod | undefined;
    component.saved.subscribe((method) => (emitted = method));

    component.form.patchValue({
      name: ' پیک تهران ',
      cost: 85_000,
      freeFrom: null,
      minDays: 1,
      maxDays: 1,
    });
    await save();

    expect(service.created).toEqual([
      {
        name: 'پیک تهران',
        cost: 85_000,
        freeFrom: null,
        minDays: 1,
        maxDays: 1,
      },
    ]);
    expect(emitted?.id).toBe('7');
  });

  it('hydrates and updates an existing method', async () => {
    await mount(METHOD);

    expect(component.form.controls.name.value).toBe('پست پیشتاز');
    expect(component.form.controls.freeFrom.value).toBe(1_000_000);

    component.form.controls.cost.setValue(50_000);
    await save();

    expect(service.updated.length).toBe(1);
    expect(service.updated[0].id).toBe('1');
    expect(service.updated[0].input.cost).toBe(50_000);
  });

  it('rejects a negative cost and sends nothing', async () => {
    await mount(null);

    component.form.patchValue({
      name: 'پیک تهران',
      cost: -1,
      minDays: 1,
      maxDays: 2,
    });
    await save();

    expect(component.form.controls.cost.errors?.['min']).toBeDefined();
    expect(service.created).toEqual([]);
  });

  it('rejects a max day below the min day', async () => {
    await mount(null);

    component.form.patchValue({ name: 'پیک تهران', minDays: 5, maxDays: 2 });
    component.form.controls.maxDays.markAsTouched();

    expect(component.form.controls.maxDays.errors?.['maxDaysError']).toBe(true);
    expect(component.fieldError('maxDays')).toContain('حداقل روز');
  });

  it('warns when the free threshold is below the cost', async () => {
    await mount(null);

    component.form.patchValue({ cost: 60_000, freeFrom: 45_000 });
    fixture.detectChanges();

    expect(component.thresholdWarning()).toContain('کمتر');
    expect(fixture.nativeElement.textContent).toContain('کمتر');
  });

  it('maps a duplicate name 422 under the field', async () => {
    await mount(null);
    service.failWith = new ApiError('VALIDATION', 'تکراری', 422, {
      name: ['روشی با این نام وجود دارد.'],
    });
    let emitted = false;
    component.saved.subscribe(() => (emitted = true));

    component.form.patchValue({ name: 'پست پیشتاز', minDays: 1, maxDays: 2 });
    await save();

    expect(component.form.controls.name.errors?.['server']).toBe('روشی با این نام وجود دارد.');
    expect(component.fieldError('name')).toBe('روشی با این نام وجود دارد.');
    expect(emitted).toBe(false);
  });

  it('emits cancelled from the button', async () => {
    await mount(null);
    let cancelled = false;
    component.cancelled.subscribe(() => (cancelled = true));

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    );
    buttons.find((button) => button.textContent?.includes('انصراف'))?.click();

    expect(cancelled).toBe(true);
  });
});
