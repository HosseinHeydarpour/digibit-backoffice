// src/app/core/mock/fixtures/content-pages.fixture.ts
//
// The four fixed pages the site ships (BO-L08). They cannot be created or
// deleted — only their content changes — so the seed IS the list.

export interface MockContentPage {
  readonly slug: string;
  title: string;
  body: string;
  metaTitle: string;
  metaDescription: string;
  updatedAt: number;
}

const DAY = 86_400_000;
const NOW = Date.now();

export const MOCK_CONTENT_PAGES: readonly MockContentPage[] = [
  {
    slug: 'about',
    title: 'درباره ما',
    body: 'دیجی‌بیت مارکت فروشگاه آنلاین لوازم دیجیتال است.\nما از سال ۱۴۰۰ در کنار شما هستیم.',
    metaTitle: 'درباره دیجی‌بیت مارکت',
    metaDescription: 'معرفی فروشگاه دیجی‌بیت مارکت و تیم پشت آن.',
    updatedAt: NOW - 12 * DAY,
  },
  {
    slug: 'contact',
    title: 'تماس با ما',
    body: 'تلفن: ۰۲۱۱۲۳۴۵۶۷۸\nایمیل: info@digibit.market\nساعت پاسخ‌گویی: ۹ تا ۱۸',
    metaTitle: 'تماس با دیجی‌بیت مارکت',
    metaDescription: 'راه‌های ارتباط با پشتیبانی فروشگاه.',
    updatedAt: NOW - 30 * DAY,
  },
  {
    slug: 'terms',
    title: 'قوانین و مقررات',
    body: 'با ثبت سفارش، قوانین فروشگاه را می‌پذیرید.\nمرجوعی تا ۷ روز پس از تحویل پذیرفته می‌شود.',
    metaTitle: 'قوانین و مقررات',
    metaDescription: 'شرایط خرید، ارسال و مرجوعی در دیجی‌بیت مارکت.',
    updatedAt: NOW - 60 * DAY,
  },
  {
    slug: 'faq',
    title: 'سوالات متداول',
    body: 'پرداخت چگونه است؟\nارسال چقدر طول می‌کشد؟',
    metaTitle: 'سوالات متداول',
    metaDescription: 'پاسخ کوتاه به پرسش‌های پرتکرار مشتریان.',
    updatedAt: NOW - 7 * DAY,
  },
];
