# بک‌آفیس دیجی‌بیت مارکت

پنل مدیریت فروشگاه، ساخته‌شده با Angular 21 (standalone + signals)، PrimeNG 21،
Tailwind v4 و Vitest. رابط کاربری فارسی و کاملاً RTL است.

## شروع سریع

```bash
npm ci
npm start          # http://localhost:4200
npm test           # Vitest
npm run e2e        # Playwright (Chromium)
```

## اسکریپت‌ها

| دستور                     | کار                                            |
| ------------------------- | ---------------------------------------------- |
| `npm start`               | سرور توسعه روی 4200                            |
| `npm run build`           | بیلد production در `dist/backoffice/browser`   |
| `npm test`                | تست واحد Vitest                                |
| `npm run e2e`             | تست‌های Playwright (سرور را خودش بالا می‌آورد) |
| `npm run lint`            | ESLint روی TS و HTML                           |
| `npm run lint:fix`        | ESLint با اصلاح خودکار                         |
| `npm run format`          | Prettier                                       |
| `npm run format:check`    | بررسی فرمت بدون نوشتن                          |
| `npm run storybook`       | کاتالوگ Storybook                              |
| `npm run build-storybook` | بیلد استاتیک Storybook                         |

## محیط و API

- `src/environments/environment.ts` (dev) و `environment.prod.ts` با `fileReplacements`
  جابه‌جا می‌شوند؛ هر فیلد جدید را در **هر دو** اضافه کن.
- `API_BASE_URL` روی `/api/v1` است و همهٔ درخواست‌ها از `ApiService` می‌گذرند.
- در توسعه بک‌اند روی `http://localhost:5072` اجرا می‌شود
  (`dotnet run --project src/Digibit.Api`). لایهٔ ماک حذف شده است و هر درخواست
  واقعاً به بک‌اند می‌رود.
- ورود از `POST /auth/admin/login` است؛ توکن‌ها در `localStorage` می‌مانند،
  `authInterceptor` هدر `Authorization: Bearer` را می‌گذارد و یک ۴۰۱ را با
  refresh حل می‌کند.
- `SITE_URL` آدرس سایت کاربر است (لینک محصول در نظرات).

## ساختار

```
src/app/
  core/        سرویس‌ها، گاردها، توکن‌ها، mock و مدل‌های مشترک
  shared/      کامپوننت/دایرکتیو/پایپ مشترک
  layout/      shell، سایدبار، تاپ‌بار، drawer
  features/    auth, dashboard, products, categories, brands, orders,
               customers, coupons, shipping, banners, pages, settings,
               comments, tickets
```

هر feature فقط از `core/` و `shared/` import می‌کند، نه از feature دیگر. مسیرها lazy‌اند
و تعریفشان در `features/<name>/<name>.routes.ts` است.

## نقش‌ها و مجوزها

`PERMISSIONS` یک `Signal<readonly string[]>` است و پیش‌فرضش **خالی** (fail-closed).
`permissionGuard` روی route و `*appHasPermission` روی کنترل‌ها همین لیست را می‌خوانند.
مجوزهای نوشتنی مثل `comments.moderate`، `tickets.manage` و `settings.write` جدا از
`*.view` هستند. این محدودسازی UI است؛ اعتبار نهایی سمت API است.

## تست

- تست واحد: `npm test` (Vitest + TestBed).
- e2e: `npm run e2e`؛ `playwright.config.ts` فقط سرور توسعه را خودش اجرا می‌کند، پس
  بک‌اند باید از قبل روی `http://localhost:5072` بالا باشد و داده‌های تست را
  خود specها می‌سازند.
- CI: `.github/workflows/ci.yml` مراحل lint، format، typecheck، تست، بیلد و
  Playwright را اجرا می‌کند.

## دیپلوی

خروجی `dist/backoffice/browser` را روی Nginx سرو کن و برای مسیرهای SPA fallback بگذار:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

سقف باندل اولیه در `angular.json` روی ۹۰۰kB هشدار / ۱.۱MB خطاست؛ انتقال واقعی
حدود ۲۰۰kB است. بیلد production باید سبز باشد.

## عیب‌یابی

- **Storybook بالا نمی‌آید:** فقط با `npm run storybook` (Angular target) اجرا کن،
  نه `storybook dev`.
- **صفحه سفید بعد از دیپلوی:** fallback نکسی را چک کن؛ مسیرهای lazy بدون آن 404 می‌شوند.
- **خطای باندل:** `npm run build` را کامل بخوان؛ سقف در `angular.json` است.
- **تست‌های e2e:** یک بار `npx playwright install chromium` لازم است.

## مستندات

- [`AGENTS.md`](./AGENTS.md) — قواعد کد، Commit، RTL، Storybook و تصمیم‌های ماژول‌ها.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — معماری و قرارداد API.
- `../tasks and arc/backoffice/TASKS-PHASE-1.md` — تسک‌های فاز ۱.
- `../tasks and arc/checklist/tests.html` — چک‌لیست تست دستی و یکپارچگی.
