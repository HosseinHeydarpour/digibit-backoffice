// src/app/core/mock/fixtures/settings.fixture.ts
//
// The store settings seed (BO-M01..M07). The raw keys live here so the mock can
// pretend to keep them; the API NEVER returns them, only a mask (`maskSettings`
// in the interceptor).

export interface MockSettings {
  store: {
    name: string;
    description: string;
    phone: string;
    email: string;
    province: string;
    city: string;
    postalCode: string;
    address: string;
    logoUrl: string;
    instagram: string;
    telegram: string;
    whatsapp: string;
  };
  payment: {
    gateway: 'zarinpal' | 'zibal' | 'idpay';
    merchantId: string;
    merchantKey: string;
    sandbox: boolean;
  };
  sms: {
    provider: 'kavenegar' | 'smsir';
    sender: string;
    apiKey: string;
    otpTemplate: string;
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    ogImage: string;
  };
}

export const MOCK_SETTINGS: MockSettings = {
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
    merchantKey: 'zp_live_123456789',
    sandbox: true,
  },
  sms: {
    provider: 'kavenegar',
    sender: '10008663',
    apiKey: 'kg_live_987654321',
    otpTemplate: 'کد ورود شما: {code}',
  },
  seo: {
    metaTitle: 'دیجی‌بیت مارکت | فروشگاه لوازم دیجیتال',
    metaDescription: 'خرید آنلاین لوازم دیجیتال با ارسال سریع.',
    keywords: ['دیجی‌بیت', 'لوازم دیجیتال', 'فروشگاه آنلاین'],
    ogImage: '',
  },
};
