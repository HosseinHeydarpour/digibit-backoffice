// src/app/features/settings/models/settings.model.ts
//
// Types only. Secret fields exist twice on purpose: the stored key is never
// returned, only its masked form plus a `has*` flag; the edit form holds a NEW
// key in a `merchantKey?` field that is omitted when left empty.

export interface StoreSettings {
  readonly name: string;
  readonly description: string;
  readonly phone: string;
  readonly email: string;
  readonly province: string;
  readonly city: string;
  readonly postalCode: string;
  readonly address: string;
  readonly logoUrl: string;
  readonly instagram: string;
  readonly telegram: string;
  readonly whatsapp: string;
}

export type PaymentGateway = 'zarinpal' | 'zibal' | 'idpay';

export interface PaymentSettings {
  readonly gateway: PaymentGateway;
  readonly merchantId: string;
  readonly merchantKeyMasked: string;
  readonly hasMerchantKey: boolean;
  readonly sandbox: boolean;
}

export type SmsProvider = 'kavenegar' | 'smsir';

export interface SmsSettings {
  readonly provider: SmsProvider;
  readonly sender: string;
  readonly apiKeyMasked: string;
  readonly hasApiKey: boolean;
  readonly otpTemplate: string;
}

export interface SeoSettings {
  readonly metaTitle: string;
  readonly metaDescription: string;
  readonly keywords: readonly string[];
  readonly ogImage: string;
}

export interface Settings {
  readonly store: StoreSettings;
  readonly payment: PaymentSettings;
  readonly sms: SmsSettings;
  readonly seo: SeoSettings;
}

/** What the page sends: the visual groups plus optional NEW secrets. */
export interface SettingsUpdate {
  readonly store: StoreSettings;
  readonly payment: {
    readonly gateway: PaymentGateway;
    readonly merchantId: string;
    readonly sandbox: boolean;
    readonly merchantKey?: string;
  };
  readonly sms: {
    readonly provider: SmsProvider;
    readonly sender: string;
    readonly otpTemplate: string;
    readonly apiKey?: string;
  };
  readonly seo: SeoSettings;
}
