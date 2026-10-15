# AGENTS.md

Instructions for AI agents (and humans) working in this repository.
Read this before making changes — the commit rules are **enforced by git hooks**, not suggestions.

## Project at a glance

|                    |                                                                            |
| ------------------ | -------------------------------------------------------------------------- |
| Framework          | Angular 21 — standalone components, signals, no NgModules                  |
| Language           | TypeScript (strict), no `any`                                              |
| Styling            | SCSS + PrimeNG tokens + Tailwind v4 (utility classes)                      |
| Tests              | Vitest via `@angular/build:unit-test` (`npm test`)                         |
| Node / npm         | Node 24.x, npm 11.x                                                        |
| Language of the UI | Persian (Farsi), full RTL (`dir="rtl"`)                                    |
| Architecture       | `ARCHITECTURE.md` (kept in `tasks and arc/backoffice/`, outside this repo) |
| Task list          | `TASKS-PHASE-1.md` (same folder)                                           |

> **Do not upgrade PrimeNG to 22 or later.** PrimeNG 22 added the PrimeUI license
> manager and renders an "Invalid PrimeUI License" banner in the corner of every page
> without a licensed key. PrimeNG 21 is the newest license-free release, and it is the
> one that pairs with Angular 21 (`primeng@21` requires `@angular/core ^21`, while
> `primeng@22` requires `^22`). Moving the framework therefore means moving PrimeNG with
> it. Theming also changed between the two: v21 uses `@primeng/themes/<preset>`, v22 uses
> `@primeuix/themes/<preset>`.

Feature code lives in `src/app/features/<module>/`. The modules are:
`auth`, `dashboard`, `products`, `categories`, `brands`, `orders`, `customers`,
`coupons`, `shipping`, `banners`, `settings`, `comments`, `tickets`.

Hard rule from the architecture: **a feature may import from `core/` and `shared/`,
never from another feature.**

---

## Commit messages — mandatory

This repository follows **Conventional Commits**, the format used by Angular and
derived from Google's commit message guidelines. A `commit-msg` git hook
(Husky + commitlint) **rejects any commit that violates the rules below**.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Rules

1. **Header length** ≤ 72 characters (aim for 50).
2. **Type** is lowercase and must come from the allowed list below.
3. **Scope** is lowercase, must come from the allowed list below, and should always be present.
4. **Subject** is in the **imperative mood, present tense**: `add product filter`,
   not `added` / `adds` / `adding`.
5. **Subject** does not end with a period.
6. **Subject** is lowercase (no capital first letter) — commitlint enforces this.
7. **One logical change per commit.** Do not mix a refactor with a feature.
8. **Blank line** between the header and the body.
9. **Body** wraps at 100 characters and explains **what** and **why**, not how.
10. **Blank line** before the footer. Wrap footers at 100 characters too.
11. **Breaking changes**: add a `BREAKING CHANGE: <description>` footer.
12. Never bypass the hooks with `--no-verify` or `-n`.
13. **Never start a body or footer line with `something:`** unless it really is a footer
    token (`Closes:`, `BREAKING CHANGE:`). A body line beginning with `word:` is parsed as
    a footer and fails `footer-leading-blank`.

### Allowed types

| Type       | Use for                                                          |
| ---------- | ---------------------------------------------------------------- |
| `feat`     | a new feature                                                    |
| `fix`      | a bug fix                                                        |
| `perf`     | a change that improves performance                               |
| `refactor` | a change that neither fixes a bug nor adds a feature             |
| `style`    | formatting only — whitespace, missing semicolons, no code change |
| `test`     | adding or fixing tests                                           |
| `docs`     | documentation only                                               |
| `build`    | build system or dependencies (npm, angular.json, tsconfig)       |
| `ci`       | CI configuration and scripts                                     |
| `chore`    | anything else: tooling, configuration, scaffolding               |
| `revert`   | reverting a previous commit                                      |

### Allowed scopes

`auth`, `dashboard`, `products`, `categories`, `brands`, `orders`, `customers`,
`coupons`, `shipping`, `banners`, `settings`, `comments`, `tickets`,
`core`, `shared`, `layout`, `build`, `ci`, `deps`, `docs`, `agents`, `tooling`

### What "Google standard" means here, precisely

Google's classic CL guidance says to **capitalize** the subject line. Conventional
Commits (the Angular variant that this repo uses) instead requires lowercase after
`type(scope): `. Where the two disagree, **this repository follows Conventional
Commits**. Everything else from the Google guidance still applies: imperative mood,
no trailing period, a blank line before the body, bodies that explain _why_, and
line wrapping.

### Examples

Good:

```
feat(products): add variant editor to product form
fix(orders): keep status history when order is cancelled
refactor(core): extract token storage from auth service
docs(agents): document the commit convention
build(deps): add husky and commitlint
chore(deps): bump prettier to 3.9.0
```

Good, with body and footer:

```
feat(orders): add invoice printing

The print layout needs the customer address, which the details endpoint did
not return. The invoice endpoint now supplies it so printing works offline.

Closes #142
```

Rejected:

| Message                               | Why it fails                  |
| ------------------------------------- | ----------------------------- |
| `added product filter`                | no type, and past tense       |
| `feat add product filter`             | missing parentheses and scope |
| `feat(products): Add product filter`  | subject must be lowercase     |
| `feat(products): add product filter.` | trailing period               |
| `feat(product): add filter`           | unknown scope                 |
| `feature(products): add filter`       | unknown type                  |

---

## Branches and workflow

- One task per branch, named after the task id: `feat/BO-A02-folder-structure`.
- Do not commit directly to the default branch.
- Run `npm run build` (and `npm test` once tests exist) before finishing a task.
- Keep the definition of done from `TASKS-PHASE-1.md` in mind; every task lists
  its acceptance criteria and test cases.

### Finishing a task

A task is finished when its acceptance criteria are met and `npm run build` is green.
Then **merge it into `main` and delete the feature branch** — a finished task must not
leave its branch behind, locally or on the origin:

```powershell
git checkout main
git merge --ff-only feat/BO-<id>-<slug>
git push origin main
git branch -d feat/BO-<id>-<slug>
git push origin --delete feat/BO-<id>-<slug>
```

- Use `--ff-only` so history stays linear. If it refuses, the branch needs a rebase, not
  a merge commit.
- Use `git branch -d`, never `-D`, as the default. It refuses to delete unmerged work,
  which is exactly the check that the task really landed on `main`.
- Only if a branch's commits are deliberately superseded (wrong approach, abandoned
  spike) may you force it with `-D` — and then record the dropped SHAs in the commit or
  the task log first.

## Styling

Three layers, in this order of preference:

1. **Tailwind utilities** for layout and spacing, using the design tokens in
   `src/styles/tailwind.css` (`bg-light`, `dark:bg-background-dark`, `text-primary`, …).
   Prefer these over hand-written CSS.
2. **PrimeNG components** for widgets — tables, dialogs, buttons. They are themed by the
   preset configured in `src/app/app.config.ts`, so they pick up the brand colour without
   per-component overrides.
3. **Component SCSS** only for what the first two cannot express.

Design reference is the Arino admin template; the extracted palette and layout are
recorded in `.workbuddy-ai/memory/MEMORY.md`.

### Sidebar menu is data, not markup

`src/app/layout/sidebar/menu.ts` exports `MENU` (typed by `menu.model.ts`). The sidebar
template iterates it — **never branch on permissions or hardcode items in the template**.
BO-B03 filters this array; BO-B04 reuses it for the mobile drawer; the spec unit-tests it.
Add or reorder items by editing the array only.

Sidebar width (`w-72`) is owned by `Sidebar`'s own root element, not by `MainLayout`. The
`hidden lg:flex` desktop-only gate lives on the `<aside>` in `main-layout.html` and is
lifted for mobile in BO-B04.

Menu routes are real children of `MainLayout` in `app.routes.ts`. `routerLinkActive` only
highlights a **matched** route, so a new menu item needs a corresponding route entry or it
will never highlight. Unmatched navigations throw `NG04002` unless a wildcard exists.

### Permission filtering (BO-B03)

Visibility is decided by `filterMenu(groups, permissions)` in `menu-filter.ts` — a pure
function, so the access rules are testable without a component. It drops unauthorised items
_and_ any group left empty, and never mutates `MENU` (which is module-level and shared; an
in-place filter would leak one user's access into the next render).

- Permissions come from the `PERMISSIONS` injection token (`core/auth/permissions.token.ts`),
  a `Signal<readonly string[]>`. BO-D08 replaces the provider with the real `/auth/me` list.
- The token's default is an **empty** set — a missing provider must fail closed, never widen
  access. `app.config.ts` grants everything only while `useMockApi` is true, so production
  degrades to a dashboard-only menu rather than a full one.
- An item with no `permission` is public to any signed-in user. That is how «پیشخوان» stays
  reachable for a zero-grant role. Do not "fix" it by adding a dashboard permission.
- `Permission` is a union in `menu.model.ts`. Keep it that way: a typo in a permission string
  would never match a grant, and because a missing permission means _public_, the item would
  silently render for everyone. A test pins the public list to just «پیشخوان».

**This hides navigation; it is not access control.** Until BO-D07 (route guard) lands, a
hidden route is still reachable by typing its URL. The real boundary is server-side
validation (`ARCHITECTURE.md §6`). Never treat a filtered menu as authorisation.

### Breakpoints — `lg` is 992px, not 1024px

`src/styles/tailwind.css` pins `--breakpoint-lg: 992px` in its `@theme` block, because the
task specs (e.g. BO-B05 tc 3) define the mobile/desktop split at **992px** while Tailwind
defaults that name to 1024px. Do not remove it.

The two layout affordances must change over at the _same_ width: the sidebar's `<aside>` is
`hidden lg:flex` and the topbar hamburger is `lg:hidden`. If they disagree, the band between
the two widths has **neither** — no sidebar and no way to open one. Verify breakpoint changes
in the **built** CSS (`dist/backoffice/browser/styles-*.css`), not just in source; Tailwind
emits a single `@media(width>=992px)` block and a stale 1024px query is easy to miss.

### Page title (BO-B05)

`PageTitleService` (`core/services/page-title.ts`) owns the topbar heading. It listens on
`NavigationEnd` — not `NavigationStart`, where a lazy route's title is not resolvable yet —
and `startWith(null)` so the first paint is already correct.

- `readDeepestTitle()` walks `route.firstChild` because a feature route under `MainLayout`
  nests its title one or more levels down. It returns **`null`**, never the default, so the
  fallback `«پنل مدیریت»` is applied in exactly one place (`title`).
- Routes declare both `data: { title }` (read by this service, untyped by Angular) and
  `title:` (Angular's built-in `<title>` setter). Add both when creating a route.
- `Topbar.menuToggle` is an `output<void>()`; BO-B04 listens to it to open the drawer. The
  topbar must not own drawer state or import the sidebar.

### Imports — let `lint:fix` decide

`eslint.config.js` uses `import-x/order` with `newlines-between: 'always'`. The trap:
path-aliased imports (`@core/*`, `@layout/*`, `@env/*`) are classified as **external**
alongside `@angular/*` and `rxjs`, because the plugin matches on the `@` prefix before it
consults tsconfig paths. So the correct shape is:

```ts
// one unbroken, alphabetised block — @angular, @core, @layout, rxjs together
import { Component } from '@angular/core';
import { PageTitleService } from '@core/services/page-title';

// blank line, then relative imports
import { Topbar } from './topbar';
```

That is the opposite of the usual "third-party / own code / relative" layout, and it is easy
to get wrong by hand. **Run `npm run lint:fix` rather than sorting imports manually.**

### RTL and logical properties

Never use physical `left` / `right` / `margin-left` / `padding-right`. Use the logical
equivalents so a stylesheet stays correct if `dir` ever flips:

| Instead of                       | Use                                           |
| -------------------------------- | --------------------------------------------- |
| `margin-left` / `margin-right`   | `margin-inline-start` / `margin-inline-end`   |
| `padding-left` / `padding-right` | `padding-inline-start` / `padding-inline-end` |
| `left` / `right`                 | `inset-inline-start` / `inset-inline-end`     |
| `text-align: right`              | `text-align: start`                           |

Tailwind already ships these as `ms-*`, `me-*`, `ps-*`, `pe-*` — **do not hand-write
utility classes for them.** `src/styles/_mixins.scss` holds only mixins (`flex-center`,
`flex-between`, `card-base`), not generated utilities.

Import the mixins per component with a relative path and a namespace:

```scss
@use '../styles/mixins' as m;

.card {
  @include m.card-base;
}
```

### Dark mode — one switch only

PrimeNG toggles via `darkModeSelector: '.app-dark'`, and `src/styles/tailwind.css` binds
Tailwind's `dark:` variant to the same class:

```css
@custom-variant dark (&:where(.app-dark, .app-dark *));
```

Add `.app-dark` to `<html>` to switch themes. **Do not** use `prefers-color-scheme` or a
second toggle — the two systems would then disagree and half the UI would stay light.

### Two styling gotchas

- **The PrimeNG preset cannot live in SCSS.** `@primeng/themes` ships `.mjs` entry points,
  so Sass `@use` cannot resolve it. Configure it in TypeScript (`app.config.ts`).
- **Import Tailwind with CSS `@import`, not Sass `@use`.** Sass parses `@use`d files as its
  own syntax and strips the semicolons from Tailwind's `@theme` block. Sass also requires
  every `@use` to come before other rules, so `@use './styles/fonts'` goes first.

### Fonts

**Payda** (FaNum variant, Persian digits) lives in `public/fonts/` and is served from the
site root, so reference it as `/fonts/…`, never `/assets/fonts/…`. Note there is no
Regular cut — Medium is registered for both 400 and 500 to stop the browser synthesising
a faux weight.

## Shared models

`src/app/shared/models/` holds only types used by **more than one feature**. A model that
belongs to a single feature lives in `features/<name>/models/`. The rule matters because
the architecture forbids a feature importing from another feature: anything two features
both need must be promoted to `shared/`.

| File                     | Holds                                                           |
| ------------------------ | --------------------------------------------------------------- |
| `api-response.model.ts`  | `ApiResponse<T>`, `PageMeta`, `Page<T>`                         |
| `api-error.model.ts`     | `ApiErrorBody`, `ApiError` (class)                              |
| `id.model.ts`            | `EntityId`, `BaseEntity`                                        |
| `select-option.model.ts` | `SelectOption<T>`, `toOptions()`                                |
| `sort-state.model.ts`    | `SortState`, `SortOrder`, `fromPrimeSort()`, `toPrimeSort()`    |
| `status.model.ts`        | `Activable`, `ACTIVE_LABELS`                                    |
| `status-badge.model.ts`  | `OrderStatus`, `TicketStatus`, `CommentStatus`, `*_STATUS_META` |

Three conventions worth keeping:

- **`Page<T>`, not `PagedResult<T>`.** `TASKS-PHASE-1.md` calls the paged envelope
  `PagedResult<T>`; this repo uses `Page<T>`. Same shape, and it matches the `PageEvent`
  vocabulary PrimeNG already puts in the stack. Keep one name — do not add an alias.
- **Status labels and badge colours live in one map.** `ORDER_STATUS_META` is read by the
  orders list, the orders detail page, the dashboard widget and the invoice. Editing a
  label there changes it everywhere; never inline a Persian status string in a template.
- **Dates are UTC milliseconds** (`number`), per `ARCHITECTURE.md §5`. Convert to Jalali
  only in the presentation layer, via the shared pipes in BO-B16.

Barrel rule: `export type { … }` for interfaces and unions, plain `export { … }` for
classes, functions and constants. `isolatedModules` is on, so mixing them is a compile
error rather than a warning.

## Mock backend (BO-C07)

There is no API yet, so `src/app/core/mock/` answers requests from local fixtures. This is
what lets the ~137 UI-only tasks proceed. It is **temporary scaffolding** — when the real
backend lands, the mock layer is deleted, not adapted.

How the switch actually works:

- `environment.useMockApi` (true in dev, false in prod) decides at runtime whether
  `mockInterceptor` is registered and whether `mockHeaders()` adds `X-Mock: 1`.
- **Every request must go through `ApiService`.** It is the only place that attaches
  `X-Mock`, via `mockHeaders()` wrapping `JSON_HEADERS`. A feature service that injects
  `HttpClient` directly silently bypasses the mock and hits a backend that does not exist.
- Fixtures must match the real envelope (`{ data, meta, message }`) and use **string IDs**
  and **UTC millis**, per `ARCHITECTURE.md §4`. A fixture with a numeric id or an ISO date
  string teaches the UI a contract the real API will not honour.
- Error paths are testable two ways: `?__mockStatus=500` forces a status, and an unknown
  id returns a real 404 body.

Production hygiene — this is subtle and was wrong once:

`useMockApi: false` alone does **not** keep the mock layer out of the bundle. A runtime flag
cannot remove code the bundler has already included; the fixtures were shipping 12.14 kB of
dead weight. `angular.json` therefore has a second `fileReplacements` entry that swaps
`core/mock/mock.interceptor.ts` for `environments/mock.interceptor.prod.ts` in the
production configuration. If you add a file to `core/mock/` that production should not
contain, it needs its own replacement entry — and the only way to know it worked is to grep
the built bundle, not to trust the build succeeding.

## Local tooling

| Command                | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `npm start`            | dev server on http://localhost:4200             |
| `npm run build`        | production build into `dist/backoffice/browser` |
| `npm test`             | Vitest unit tests                               |
| `npm run lint`         | ESLint over ts and html                         |
| `npm run lint:fix`     | ESLint with autofix                             |
| `npm run format`       | format the whole repo with Prettier             |
| `npm run format:check` | check formatting without writing                |

Formatting is applied automatically to staged files by the `pre-commit` hook
(Husky + lint-staged), and commit messages are validated by the `commit-msg` hook.
