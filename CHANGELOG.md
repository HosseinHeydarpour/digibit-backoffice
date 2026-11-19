# Changelog

All notable changes to the backoffice. Format: [Keep a Changelog](https://keepachangelog.com/).

## [1.0.0] - 2026-11-19

### Added

- **Shell and auth seam:** RTL layout, sidebar/drawer, breadcrumb, page title, permission token and
  route guard (BO-B, BO-D07).
- **Dashboard:** KPI tiles, two-series sales chart, recent orders and low-stock card (BO-E).
- **Catalogue:** products list with URL filters/paging, create/edit wizard, variants, gallery,
  stock levels, slug uniqueness and soft delete; category tree with drag & drop, create/edit,
  status and delete strategies; brands with logo upload (BO-F, BO-G).
- **Orders:** list with Jalali filters, read-only detail, status graph + history, cancel with
  reason, printable invoice, filtered CSV and customer link (BO-H).
- **Customers:** list, profile, last orders and optimistic block toggle (BO-I).
- **Coupons:** list, create/edit, validity rules, usage progress, toggle and delete (BO-J).
- **Shipping:** methods CRUD, default/free thresholds and guarded delete (BO-K).
- **Content:** banner lifecycle (upload, edit, per-position order, schedule, toggle, delete) and
  fixed content pages (BO-L).
- **Settings:** store/payment/SMS/SEO tabs, write-only masked keys, one save and dirty guards
  (BO-M).
- **Comments:** combined filters, star rating, optimistic moderation and rejection notes (BO-N).
- **Tickets:** queue, thread with attachments, composer, status/assignee controls and polling
  unread badge (BO-O).
- **Shared:** `StarRating`, `hasPermission` directive, print stylesheet (BO-N04, BO-D08, BO-H06).

### Changed

- Initial bundle budget raised to 900 kB warning / 1.1 MB error; the actual initial transfer is
  ~199 kB.
- README rewritten with Quick Start, environment, structure, roles, deploy and troubleshooting.

### Tooling

- Vitest unit suite, Playwright e2e (dashboard, 404, create product, order status/cancel) and a
  GitHub Actions workflow running lint, format, typecheck, unit, build and e2e.
- Storybook catalogue and MDX docs for every module, plus AGENTS.md decision notes.
