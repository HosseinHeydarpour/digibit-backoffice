import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { NEVER, Observable, of } from 'rxjs';

import type { Settings } from '../models/settings.model';
import { SettingsService } from '../services/settings.service';

import { SettingsPage } from './settings-page';

const SETTINGS: Settings = {
  store: {
    name: 'دیجی‌بیت مارکت',
    description: 'فروشگاه آنلاین لوازم دیجیتال و جانبی',
    phone: '09121234567',
    email: 'info@digibit.market',
    province: 'تهران',
    city: 'تهران',
    postalCode: '1234567890',
    address: 'خیابان ولیعصر، کوچهٔ شهید نوری، پلاک ۱۲',
    logoUrl: '',
    instagram: 'https://instagram.com/digibit',
    telegram: '',
    whatsapp: '',
  },
  payment: {
    gateway: 'zarinpal',
    merchantId: 'zp-merchant-1234',
    merchantKeyMasked: '•••• 6789',
    hasMerchantKey: true,
    sandbox: true,
  },
  sms: {
    provider: 'kavenegar',
    sender: '10008663',
    apiKeyMasked: '•••• 4321',
    hasApiKey: true,
    otpTemplate: 'کد ورود شما: {code}',
  },
  seo: {
    metaTitle: 'دیجی‌بیت مارکت | فروشگاه لوازم دیجیتال',
    metaDescription: 'خرید آنلاین لوازم دیجیتال با ارسال سریع.',
    keywords: ['دیجی‌بیت', 'لوازم دیجیتال', 'فروشگاه آنلاین'],
    ogImage: '',
  },
};

class SettingsServiceStub {
  private readonly data = SETTINGS;

  get(): Observable<Settings> {
    return of(this.data);
  }

  save(): Observable<Settings> {
    return of(this.data);
  }

  testSms(): Observable<{ message: string }> {
    return of({ message: 'پیامک آزمایشی ارسال شد.' });
  }

  uploadLogo(): Observable<{ url: string }> {
    return of({ url: '' });
  }
}

const meta: Meta<SettingsPage> = {
  title: 'Features/Settings',
  component: SettingsPage,
  decorators: [
    applicationConfig({
      providers: [
        provideRouter([]),
        { provide: PERMISSIONS, useValue: signal(['settings.write']) },
      ],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'Store settings (BO-M01..M07): four tabs — store, payment, SMS and SEO — each with its',
          'own FormGroup, and one save for the page. The active tab lives in `?tab=`.',
          '',
          '**Secrets are write-only.** The key inputs start empty next to a «•••• 6789» mask; empty',
          'keeps the stored key, typing replaces it, and the answer only ever carries the mask.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<SettingsPage>;

/** The four tabs over the seeded shop. */
export const Default: Story = {
  render: () => ({
    template: '<app-settings-page />',
    moduleMetadata: {
      providers: [{ provide: SettingsService, useValue: new SettingsServiceStub() }],
    },
  }),
};

/** The first paint: a skeleton while `GET /settings` answers. */
export const Loading: Story = {
  render: () => ({
    template: '<app-settings-page />',
    moduleMetadata: {
      providers: [
        {
          provide: SettingsService,
          useValue: { ...new SettingsServiceStub(), get: () => NEVER },
        },
      ],
    },
  }),
};
