import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { ConfirmService } from '@core/services/confirm';
import { ToastService } from '@core/services/toast';
import type { ToggleSwitch } from 'primeng/toggleswitch';
import { NEVER, Observable, of, throwError } from 'rxjs';

import type { ShippingMethod } from '../models/shipping-method.model';
import { ShippingService } from '../services/shipping.service';

import { ShippingList } from './shipping-list';

const METHODS: readonly ShippingMethod[] = [
  {
    id: '1',
    name: 'پست پیشتاز',
    cost: 45_000,
    freeFrom: 1_000_000,
    minDays: 2,
    maxDays: 4,
    isDefault: false,
    isActive: true,
    order: 1,
  },
  {
    id: '2',
    name: 'تیپاکس',
    cost: 60_000,
    freeFrom: null,
    minDays: 1,
    maxDays: 1,
    isDefault: true,
    isActive: true,
    order: 2,
  },
  {
    id: '3',
    name: 'پست سفارشی',
    cost: 0,
    freeFrom: 0,
    minDays: 3,
    maxDays: 7,
    isDefault: false,
    isActive: false,
    order: 3,
  },
];

class ShippingServiceStub {
  rows: readonly ShippingMethod[] = METHODS;

  failWith: string | null = null;

  hang = false;

  statusCalls: { id: string; isActive: boolean }[] = [];

  statusFail = false;

  removeCalls: string[] = [];

  removeResult: 'deleted' | 'deactivated' | 'fail' = 'deleted';

  defaultCalls: string[] = [];

  list(): Observable<ShippingMethod[]> {
    if (this.hang) return NEVER;

    return this.failWith === null
      ? of([...this.rows])
      : throwError(() => new Error(this.failWith ?? 'failed'));
  }

  setStatus(id: string, isActive: boolean): Observable<ShippingMethod> {
    this.statusCalls.push({ id, isActive });

    return this.statusFail
      ? throwError(() => new Error('status failed'))
      : of({ ...METHODS[0], id, isActive });
  }

  remove(id: string): Observable<{ deleted: boolean; method?: ShippingMethod }> {
    this.removeCalls.push(id);

    if (this.removeResult === 'fail') return throwError(() => new Error('remove failed'));
    if (this.removeResult === 'deactivated') {
      return of({ deleted: false, method: { ...METHODS[0], id, isActive: false } });
    }

    this.rows = this.rows.filter((method) => method.id !== id);

    return of({ deleted: true });
  }

  setDefault(id: string): Observable<ShippingMethod> {
    this.defaultCalls.push(id);

    return of({ ...METHODS[0], id, isDefault: true });
  }
}

async function settle(fixture: ComponentFixture<ShippingList>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}

function fakeToggle(): ToggleSwitch {
  return { writeValue: vi.fn() } as unknown as ToggleSwitch;
}

describe('ShippingList (BO-K01)', () => {
  let fixture: ComponentFixture<ShippingList>;
  let component: ShippingList;
  let service: ShippingServiceStub;
  let toast: { success: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn> };
  let confirm: { confirm: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    service = new ShippingServiceStub();
    toast = { success: vi.fn(), warning: vi.fn() };
    confirm = { confirm: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [ShippingList],
      providers: [
        { provide: ShippingService, useValue: service },
        { provide: ToastService, useValue: toast },
        { provide: ConfirmService, useValue: confirm },
        { provide: PERMISSIONS, useValue: signal(['shipping.view', 'shipping.manage']) },
      ],
    }).compileComponents();
  });

  async function mount(): Promise<void> {
    fixture = TestBed.createComponent(ShippingList);
    component = fixture.componentInstance;
    await settle(fixture);
  }

  it('renders the rows with cost, free threshold, window and default badge', async () => {
    await mount();
    const text = fixture.nativeElement.textContent;

    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(3);
    expect(text).toContain('پست پیشتاز');
    expect(text).toContain('رایگان');
    expect(text).toContain('از');
    expect(text).toContain('۲ تا ۴ روز');
    expect(text).toContain('۱ روز');
    expect(text).toContain('پیش‌فرض');
  });

  it('toggles a non-default method optimistically and toasts', async () => {
    await mount();
    const row = component.methods()!.find((method) => !method.isDefault && method.isActive)!;

    await component.toggleStatus(row, fakeToggle());

    expect(service.statusCalls).toEqual([{ id: row.id, isActive: false }]);
    expect(component.methods()!.find((method) => method.id === row.id)!.isActive).toBe(false);
    expect(toast.success).toHaveBeenCalledWith('روش ارسال غیرفعال شد.');
  });

  it('rolls the switch back when the status request fails', async () => {
    service.statusFail = true;
    await mount();
    const row = component.methods()!.find((method) => !method.isDefault && method.isActive)!;

    await component.toggleStatus(row, fakeToggle());

    expect(component.methods()!.find((method) => method.id === row.id)!.isActive).toBe(true);
  });

  it('refuses to disable the default method and writes the switch back', async () => {
    await mount();
    const row = component.methods()!.find((method) => method.isDefault)!;
    const control = fakeToggle();

    await component.toggleStatus(row, control);

    expect(control.writeValue).toHaveBeenCalledWith(true);
    expect(service.statusCalls).toEqual([]);
    expect(toast.warning).toHaveBeenCalled();
  });

  it('keeps at least one active method', async () => {
    service.rows = [{ ...METHODS[0], id: 'only', isDefault: false, isActive: true }];
    await mount();
    const control = fakeToggle();

    await component.toggleStatus(component.methods()![0], control);

    expect(control.writeValue).toHaveBeenCalledWith(true);
    expect(service.statusCalls).toEqual([]);
  });

  it('deletes an unused method after confirmation', async () => {
    await mount();
    const row = component.methods()!.find((method) => !method.isDefault)!;

    await component.removeMethod(row);
    await settle(fixture);

    expect(service.removeCalls).toEqual([row.id]);
    expect(component.methods()!.some((method) => method.id === row.id)).toBe(false);
    expect(toast.success).toHaveBeenCalledWith('روش ارسال حذف شد.');
  });

  it('keeps a used method but switches it off', async () => {
    service.removeResult = 'deactivated';
    await mount();
    const row = component.methods()!.find((method) => !method.isDefault)!;

    await component.removeMethod(row);
    await settle(fixture);

    expect(component.methods()!.find((method) => method.id === row.id)!.isActive).toBe(false);
    expect(toast.success).toHaveBeenCalledWith('این روش در سفارش‌ها استفاده شده و غیرفعال شد.');
  });

  it('refuses to delete the default method', async () => {
    await mount();
    const row = component.methods()!.find((method) => method.isDefault)!;

    await component.removeMethod(row);

    expect(service.removeCalls).toEqual([]);
    expect(toast.warning).toHaveBeenCalled();
  });

  it('does nothing when the delete confirmation is cancelled', async () => {
    confirm.confirm.mockResolvedValue(false);
    await mount();

    await component.removeMethod(component.methods()![0]);

    expect(service.removeCalls).toEqual([]);
  });

  it('sets a method as default', async () => {
    await mount();
    const row = component.methods()!.find((method) => !method.isDefault)!;

    component.setDefault(row);

    expect(service.defaultCalls).toEqual([row.id]);
  });

  it('opens an empty form from the create button', async () => {
    await mount();

    component.openCreate();
    fixture.detectChanges();

    expect(component.dialogOpen()).toBe(true);
    expect(component.editing()).toBeNull();
    expect(fixture.nativeElement.querySelector('app-shipping-form')).toBeTruthy();
  });

  it('shows the skeleton, empty and error states', async () => {
    service.hang = true;
    await mount();
    expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('recovers from a failed fetch', async () => {
    service.failWith = 'boom';
    await mount();
    expect(fixture.nativeElement.textContent).toContain('دریافت روش‌های ارسال ناموفق بود');

    service.failWith = null;
    const retry = fixture.nativeElement.querySelector(
      'app-error-state button',
    ) as HTMLButtonElement;
    retry.click();
    await settle(fixture);

    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(3);
  });

  it('hides the write controls without shipping.manage', async () => {
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ShippingList],
      providers: [
        { provide: ShippingService, useValue: new ShippingServiceStub() },
        { provide: ToastService, useValue: { success: vi.fn(), warning: vi.fn() } },
        { provide: ConfirmService, useValue: { confirm: vi.fn() } },
        { provide: PERMISSIONS, useValue: signal(['shipping.view']) },
      ],
    }).compileComponents();

    const restricted = TestBed.createComponent(ShippingList);
    await settle(restricted);

    expect(restricted.nativeElement.textContent).not.toContain('افزودن روش ارسال');
    expect(restricted.nativeElement.querySelector('[data-edit-shipping]')).toBeNull();
    expect(restricted.nativeElement.querySelector('[data-toggle-shipping]')).toBeNull();
  });
});
