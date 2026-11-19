import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { ConfirmService } from '@core/services/confirm';
import { ToastService } from '@core/services/toast';
import { ApiError } from '@shared/models';
import { Subject, NEVER, of, throwError } from 'rxjs';

import type { Settings, SettingsUpdate } from '../models/settings.model';
import { SettingsService } from '../services/settings.service';

import { SettingsPage } from './settings-page';

const SEED: Settings = {
  store: {
    name: 'دیجی‌بیت مارکت',
    description: 'فروشگاه',
    phone: '09121234567',
    email: 'info@digibit.market',
    province: 'تهران',
    city: 'تهران',
    postalCode: '1234567890',
    address: 'ولیعصر',
    logoUrl: '',
    instagram: '',
    telegram: '',
    whatsapp: '',
  },
  payment: {
    gateway: 'zarinpal',
    merchantId: 'zp-1',
    merchantKeyMasked: '•••• 6789',
    hasMerchantKey: true,
    sandbox: true,
  },
  sms: {
    provider: 'kavenegar',
    sender: '10008663',
    apiKeyMasked: '•••• 4321',
    hasApiKey: true,
    otpTemplate: 'کد ورود: {code}',
  },
  seo: { metaTitle: 'عنوان', metaDescription: 'توضیح', keywords: ['الف', 'ب'], ogImage: '' },
};

class SettingsServiceStub {
  result: Settings = structuredClone(SEED) as Settings;

  save$: Subject<Settings> = new Subject<Settings>();

  saved: SettingsUpdate | null = null;

  failSave: unknown = null;

  get() {
    return of(structuredClone(this.result) as Settings);
  }

  save(update: SettingsUpdate) {
    this.saved = update;

    if (this.failSave) {
      return throwError(() => this.failSave);
    }

    return this.save$;
  }

  testSms() {
    return of({ message: 'پیامک آزمایشی ارسال شد.' });
  }

  uploadLogo() {
    return of({ url: '/mock/logo.png' });
  }
}

async function settle(fixture: ComponentFixture<SettingsPage>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('SettingsPage (BO-M01..M07)', () => {
  let fixture: ComponentFixture<SettingsPage>;
  let component: SettingsPage;
  let service: SettingsServiceStub;
  let confirm: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let toast: { success: ReturnType<typeof vi.fn> };

  beforeAll(() => {
    // p-tablist measures itself; jsdom has no ResizeObserver.
    if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
      (window as unknown as Record<string, unknown>)['ResizeObserver'] = class ResizeObserver {
        observe(): void {
          /* no-op */
        }
        unobserve(): void {
          /* no-op */
        }
        disconnect(): void {
          /* no-op */
        }
      };
    }
  });

  async function setup(query: Record<string, string> = {}): Promise<void> {
    confirm = vi.fn().mockResolvedValue(true);
    navigate = vi.fn().mockResolvedValue(true);
    toast = { success: vi.fn() };
    service = new SettingsServiceStub();

    await TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [
        { provide: SettingsService, useValue: service },
        { provide: ToastService, useValue: toast },
        { provide: ConfirmService, useValue: { confirm } },
        { provide: PERMISSIONS, useValue: signal(['settings.write']) },
        {
          provide: Router,
          useValue: { navigate, events: NEVER, routerState: { root: { firstChild: null } } },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(query) },
            queryParamMap: of(convertToParamMap(query)),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsPage);
    component = fixture.componentInstance;
    await settle(fixture);
  }

  it('renders the four tabs and hydrates the store form', async () => {
    await setup();

    expect(fixture.nativeElement.querySelectorAll('p-tab')).toHaveLength(4);
    expect(component.storeForm.controls.name.value).toBe('دیجی‌بیت مارکت');
    expect(component.merchantKeyMasked()).toBe('•••• 6789');
  });

  it('opens the tab named in the URL', async () => {
    await setup({ tab: 'payment' });

    expect(component.activeTab()).toBe('payment');
  });

  it('falls back to the store tab for an unknown value', async () => {
    await setup({ tab: 'nope' });

    expect(component.activeTab()).toBe('store');
  });

  it('keeps the forms when the tab changes and mirrors it into the URL', async () => {
    await setup();

    component.storeForm.controls.name.setValue('نام تازه');
    component.onTabChange('seo');
    await settle(fixture);

    expect(component.storeForm.controls.name.value).toBe('نام تازه');
    expect(component.activeTab()).toBe('seo');
    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { tab: 'seo' }, replaceUrl: true }),
    );
  });

  it('asks before leaving a dirty tab and stays when refused', async () => {
    await setup();

    component.storeForm.controls.name.setValue('نام تازه');
    component.storeForm.markAsDirty();
    confirm.mockResolvedValue(false);
    component.onTabChange('payment');
    await settle(fixture);

    expect(confirm).toHaveBeenCalled();
    expect(component.activeTab()).toBe('store');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('counts dirty groups and disables save until something changes', async () => {
    await setup();

    expect(component.dirtyCount()).toBe(0);
    expect(component.canSave()).toBe(false);

    component.storeForm.controls.name.setValue('نام تازه');
    component.storeForm.markAsDirty();
    component.smsForm.controls.sender.setValue('2000');
    component.smsForm.markAsDirty();

    expect(component.dirtyCount()).toBe(2);
    expect(component.canSave()).toBe(true);
  });

  it('saves every group in one request and clears the dirty state', async () => {
    await setup();

    component.storeForm.controls.name.setValue('نام تازه');
    component.storeForm.markAsDirty();
    component.paymentForm.controls.merchantKey.setValue('zp_new_9999');
    component.paymentForm.markAsDirty();
    component.save();
    service.save$.next(structuredClone(SEED) as Settings);
    await settle(fixture);

    const sent = service.saved as SettingsUpdate;

    expect(sent.store.name).toBe('نام تازه');
    expect(sent.payment.merchantKey).toBe('zp_new_9999');
    expect(component.dirtyCount()).toBe(0);
    expect(toast.success).toHaveBeenCalled();
  });

  it('omits the key fields when they are left empty', async () => {
    await setup();

    component.storeForm.controls.city.setValue('کرج');
    component.storeForm.markAsDirty();
    component.save();
    service.save$.next(structuredClone(SEED) as Settings);
    await settle(fixture);

    const sent = service.saved as SettingsUpdate;

    expect(sent.payment).not.toHaveProperty('merchantKey');
    expect(sent.sms).not.toHaveProperty('apiKey');
  });

  it('maps a 422 field onto its control and opens that tab', async () => {
    await setup();

    service.failSave = new ApiError('VALIDATION', 'invalid', 422, {
      'store.phone': ['شماره معتبر نیست.'],
    });

    component.storeForm.controls.city.setValue('کرج');
    component.storeForm.markAsDirty();
    component.save();
    await settle(fixture);

    expect(component.storeForm.controls.phone.errors?.['server']).toBe('شماره معتبر نیست.');
    expect(component.dirtyCount()).toBe(1);
  });

  it('keeps the edits when the save fails', async () => {
    await setup();

    service.failSave = new Error('offline');
    component.storeForm.controls.name.setValue('نام تازه');
    component.storeForm.markAsDirty();
    component.save();
    await settle(fixture);

    expect(component.storeForm.controls.name.value).toBe('نام تازه');
    expect(component.saveError()).toBeTruthy();
  });

  it('refuses a logo that is not an allowed image', async () => {
    await setup();

    const input = document.createElement('input');
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { value: [file] });

    component.onLogoSelected({ target: input } as unknown as Event);

    expect(component.logoError()).toContain('PNG');
  });

  it('sends a test SMS and reports the answer', async () => {
    await setup();

    component.testSms();
    await settle(fixture);

    expect(toast.success).toHaveBeenCalledWith('پیامک آزمایشی ارسال شد.');
  });
});
