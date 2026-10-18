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

Sidebar width is owned by the **container**, not by `Sidebar` itself: `w-72` lives on the
`<aside>` in `main-layout.html` (desktop) and on the drawer's panel body (mobile). The
sidebar is width-agnostic — its root is `w-full` and its host claims `width: 100%` beside
`height: 100%` — because the same component is reused in both places (BO-B04). A fixed
width on the component leaves a gap in whichever container is wider.

Menu routes are real children of `MainLayout` in `app.routes.ts`. `routerLinkActive` only
highlights a **matched** route, so a new menu item needs a corresponding route entry or it
will never highlight. Unmatched navigations throw `NG04002` unless a wildcard exists.

### Breadcrumb crumbs are route data, not markup

`BreadcrumbService` (`@core/services/breadcrumb`) walks the matched route chain on every
`NavigationEnd` and emits one crumb per node that declares `data.breadcrumb` — a Persian
string, or a `(params) => string` function for parameterised routes. The 404 wildcard
declares none, so no trail renders there (BO-B08 tc 9), and the service spec pins every
feature route to declaring one. Labels live in a separate field from `data.title` so a
page heading and its crumb can diverge. `<app-breadcrumb />` (in `@shared/components`) is
the only consumer; nothing mounts it until BO-B09.

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

## PrimeNG — the known gaps

PrimeNG 21 is good but not complete, and two of its gaps have already cost this project
real time. Check here before assuming a PrimeNG input does what its name says.

### `[pButton]`'s `loading` does not disable the button

`ButtonDirective` has a `loading` input, and on its own it is **not enough** to satisfy
"a submitting button must be disabled". What it actually does
(`node_modules/primeng/fesm2022/primeng-button.mjs:415-424`):

```js
if (this.loading) {
  styleClass.push(
    INTERNAL_BUTTON_CLASSES.disabled /* 'p-disabled' */,
    INTERNAL_BUTTON_CLASSES.loading /* 'p-button-loading' */,
  );
}
```

It pushes **classes**, never the attribute. The directive declares no `disabled` input at
all, and its only host bindings are `p-button-icon-only` / `p-button-text`. `.p-disabled`
carries `pointer-events: none`, so a mouse click is swallowed and the button dims — but:

- the button **stays in the tab order** while it is working, and
- **Enter / Space** still fire the click handler.

A keyboard user can therefore submit the same form twice. PrimeNG's own `p-button`
_component_ binds `[disabled]="disabled || loading || buttonProps?.disabled"`, so
"loading implies disabled" is clearly the intended contract; the directive is just the
leaner API. **Use `pLoading` (`src/app/shared/directives/loading.directive.ts`)**, which
sets the native property — do not bind `[pButton] [loading]` on its own.

### `p-skeleton` is `aria-hidden` and its inputs do not reflect

Two consequences that matter when testing or documenting it:

- The host hard-codes `attr.aria-hidden: "true"`. A skeleton can never announce itself, so
  any loading region needs its own `role="status"` wrapper.
- `animation`, `shape` and the rest are **inputs**, so a property binding
  (`[animation]="'none'"`) sets the input and writes **no DOM attribute**. What you can
  assert on is the class the style function emits — `p-skeleton-animation-none` for
  `animation: 'none'`, `p-skeleton-circle` for `shape: 'circle'`
  (`primeng/fesm2022/primeng-skeleton.mjs:16-21`). A selector like
  `p-skeleton[animation="none"]` matches nothing and is the trap.

## Naming — one convention, applied everywhere

The rule comes from Angular 21's own style guide (`angular.dev/style-guide`) and the CLI
default: **the file name mirrors the class name, and neither carries a type suffix that the
folder already states.**

| Thing                | Convention                                                 | Example                                           |
| -------------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| Component file       | `feature-name.ts` + `.html` + `.scss` + `.spec.ts`         | `shared/components/page-header/page-header.ts`    |
| Component class      | no `Component` suffix                                      | `export class PageHeader`                         |
| Service / state file | `thing.ts` — the `services/` folder already says "service" | `core/services/api.ts`                            |
| Service class        | keeps `Service`; it stays distinct from a same-named model | `export class ApiService`                         |
| Models               | keep `.model.ts`                                           | `shared/models/sort-state.model.ts`               |
| Other qualifiers     | only where two files share one folder                      | `sidebar-drawer.state.ts`, `permissions.token.ts` |

Why the split: dropping `Service` from `BreadcrumbService` would collide with a `Breadcrumb`
component or a `Breadcrumb` model — the classic "same name, two meanings" trap that makes an
import need an alias. Putting the role on the class and leaving it off the file gives short
paths and unambiguous identifiers at once. The same reasoning renamed the model that backs a
crumb to `BreadcrumbItem`, freeing `Breadcrumb` for the component.

Consequences worth remembering:

- Functional interceptors are `mock-interceptor.ts` (hyphen, as `ng g interceptor` writes
  them), **not** `mock.interceptor.ts`.
- A spec name always matches the file under test: `api.ts` → `api.spec.ts`.
- A rename is a `git mv`, never delete + create — history has to survive it.
- `npm run lint:fix` owns import order, so a rename never needs hand-sorting.

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
`core/mock/mock-interceptor.ts` for `environments/mock-interceptor.prod.ts` in the
production configuration. If you add a file to `core/mock/` that production should not
contain, it needs its own replacement entry — and the only way to know it worked is to grep
the built bundle, not to trust the build succeeding.

## Local tooling

| Command                   | Purpose                                         |
| ------------------------- | ----------------------------------------------- |
| `npm start`               | dev server on http://localhost:4200             |
| `npm run build`           | production build into `dist/backoffice/browser` |
| `npm test`                | Vitest unit tests                               |
| `npm run lint`            | ESLint over ts and html                         |
| `npm run lint:fix`        | ESLint with autofix                             |
| `npm run format`          | format the whole repo with Prettier             |
| `npm run format:check`    | check formatting without writing                |
| `npm run storybook`       | Storybook dev server                            |
| `npm run build-storybook` | static Storybook build into `storybook-static/` |

Formatting is applied automatically to staged files by the `pre-commit` hook
(Husky + lint-staged), and commit messages are validated by the `commit-msg` hook.

## Storybook — the living catalogue

Storybook 11 (alpha) is the reference for **every** shared component, every layout
piece, and every non-visual building block. It is the place to look before writing a
component and the place to check one after changing it.

### Run it — only through the Angular CLI

```bash
npm run storybook          # ng run backoffice:storybook
npm run build-storybook    # ng run backoffice:build-storybook
```

**`storybook dev` does not work here.** Storybook 11's Angular framework reads the
build configuration from an **Angular target** (`browserTarget:
"backoffice:build:storybook"`), not from `.storybook/main.ts` — the `tsConfig`, the
global `styles`, the `assets`, the `fileReplacements`. Without the target it raises
`AngularLegacyBuildOptionsError`. The upside is that the preview iframe compiles
through the _same_ pipeline as the app, so Tailwind, the Payda fonts and PrimeIcons
are exactly what ships.

`angular.json` also has a `storybook` **build configuration** adding
`allowedCommonJsDependencies` for `jalali-ts`, `axe-core`, `semver` and `strip-ansi`.
Without it the CommonJS bailout warnings become errors and the build fails.

### The catalogue

Sidebar order comes from `options.storySort.order` in `.storybook/preview.ts`, keyed on
the **first segment** of each `title`. A typo there silently reorders the sidebar
instead of failing, so check it when you add a new root.

| Root           | Contents                                                       |
| -------------- | -------------------------------------------------------------- |
| `Introduction` | orientation, tooling, the doc standard                         |
| `Foundations`  | design tokens — colour, type, RTL, dark mode, breakpoints      |
| `Conventions`  | how to write a story and its docs                              |
| `Shared`       | `src/app/shared/components/**`                                 |
| `Layout`       | `src/app/layout/**`                                            |
| `Core`         | services, interceptors, tokens, models — everything non-visual |

Every entry, with its file and its docs id:

| Entry               | File                                     | Docs id                         |
| ------------------- | ---------------------------------------- | ------------------------------- |
| `StatCard`          | `shared/components/stat-card/`           | `shared-statcard--docs`         |
| `EmptyState`        | `shared/components/empty-state/`         | `shared-emptystate--docs`       |
| `PageHeader`        | `shared/components/page-header/`         | `shared-pageheader--docs`       |
| `Breadcrumb`        | `shared/components/breadcrumb/`          | `shared-breadcrumb--docs`       |
| `ToastHost`         | `shared/components/toast-host/`          | `shared-toasthost--docs`        |
| `ConfirmDialogHost` | `shared/components/confirm-dialog/`      | `shared-confirmdialog--docs`    |
| `JalaliDatepicker`  | `shared/components/jalali-datepicker/`   | `shared-jalalidatepicker--docs` |
| `FormField`         | `shared/components/form-field/`          | `shared-formfield--docs`        |
| `LoadingBlock`      | `shared/components/loading-block/`       | `shared-loadingblock--docs`     |
| `LoadingDirective`  | `shared/directives/loading.directive.ts` | `shared-loadingdirective--docs` |
| `PersianPipes`      | `shared/pipes/`                          | `shared-persianpipes--docs`     |
| `MainLayout`        | `layout/main-layout/`                    | `layout-mainlayout--docs`       |
| `Sidebar`           | `layout/sidebar/`                        | `layout-sidebar--docs`          |
| `SidebarDrawer`     | `layout/sidebar-drawer/`                 | `layout-sidebardrawer--docs`    |
| `Topbar`            | `layout/topbar/`                         | `layout-topbar--docs`           |
| `ApiService`        | `core/services/api.ts`                   | `core-apiservice--docs`         |
| `ThemeService`      | `core/services/theme.ts`                 | `core-themeservice--docs`       |
| `ToastService`      | `core/services/toast.ts`                 | `core-toastservice--docs`       |
| `ConfirmService`    | `core/services/confirm.ts`               | `core-confirmservice--docs`     |
| `PageTitleService`  | `core/services/page-title.ts`            | `core-pagetitleservice--docs`   |
| `BreadcrumbService` | `core/services/breadcrumb.ts`            | `core-breadcrumbservice--docs`  |
| HTTP pipeline       | `core/interceptors/`, `core/mock/`       | `core-http-pipeline--docs`      |
| Permissions & menu  | `core/auth/`, `layout/sidebar/menu*.ts`  | `core-permissions--docs`        |
| Shared models       | `shared/models/**`                       | `core-shared-models--docs`      |

Also documented: `layout/sidebar/menu.ts` (`MENU`, `MENU_PERMISSIONS`),
`layout/sidebar/menu-filter.ts` (`filterMenu`), `layout/sidebar-drawer/sidebar-drawer.state.ts`
(`SidebarDrawerState`).

`LoadingDirective` is the first **directive** in the catalogue, and it shows the shape the
rest will follow: a directive has no template, so its stories drive it through a host
element and the meta has no `component` key. `shared/directives/` is no longer empty.

`PersianPipes` is the first **pipe** group, and it adds one rule to that shape: a pipe has
no inputs a Controls panel could drive, so `tags: ['autodocs']` would generate an empty args
table. The stories are mapping tables instead — input on the left, exact output on the
right — with no `component` key, and the prose lives in `src/docs/shared/PersianPipes.mdx`
referenced by explicit `<Canvas of={…} />`. Keep the story rows and the spec cases in step:
they are the same list, and that is what stops the canvas and the suite from drifting.

`FormField` is the first **reactive-forms** consumer in the app — before it, `src/app` contained
no `ControlContainer`, `formControlName` or `FormGroup` at all. Two rules come out of it and hold
for every form from here on:

- A field binds to the parent form through `ControlContainer` and reads `form.get(controlName)`.
  Nothing is copied onto the component, so nothing can go stale.
- Re-render on `AbstractControl.events`, **not** on `statusChanges`. `markAsTouched()` fires on
  blur and emits no status change — a field that was already invalid before the blur is still
  invalid after it — so an error keyed on `statusChanges` stays hidden forever.

A component that projects its control cannot reach it: the `for`/`id` pair and any
`aria-describedby` stay the caller's job. `FormField` publishes the convention
(`inputId`, defaulting to `controlName`, with `<id>-hint` and `<id>-error`).

**Not covered because they do not exist yet:** `src/app/features/**` and
`src/app/core/guards/` — both folders are empty. The first guard to land gets an MDX page
the same way a pipe or a directive does.

### The docs standard — three parts, always in this order

1. **Use case** — when to reach for it, and **when not to**. The negative half matters
   most: the component someone reaches for by mistake is what causes the bug.
2. **How to use** — the public surface, with a copy-pasteable Persian example.
3. **Logic** — why it is built this way and what it protects you from: the decision, the
   trap a naive implementation produces, and what is deliberately _not_ in the module.

An entry that only lists the API tells you what the code does and never whether it is the
right tool. The rule is applied to every MDX page and every autodocs description.

**Every page is bilingual, Persian first.** Section headings carry both languages
(`## کاربرد / Use case`); the prose is written twice, Persian above English. **Code blocks
appear once** — code has no language, only the prose is translated. Tables appear twice
because the "notes" column is prose. This is the one place where duplication is correct:
a Persian team reads the Persian, and a new contributor can check the English.

### Docs pages are typeset and oriented, not raw

Storybook's docs stylesheet is a neutral default written for one Latin language. On a
bilingual Persian catalogue it is wrong in four visible ways, and the docs container
fixes all four itself:

- **The page direction.** `BrandedDocsContainer` sets `dir`, `lang` and `.app-dark` on
  `<html>`, because an MDX page runs no preview decorator. Without it the content is RTL
  inside an LTR document — right text, wrong scrollbar and wrong `lang`.
- **The typesetting.** `.storybook/docs-styles.ts` is a CSS string injected once as a
  `<style>` element and scoped to `.docs-shell`, the wrapper the container renders. It
  gives the page a card, a real heading scale, bordered code/table surfaces and the
  brand accent. It is deliberately **not** an import in `preview.ts`: a CSS module import
  would need a declaration file and would load docs rules for every story, while the
  app bundle has no business carrying docs CSS. Because it is a template literal, a
  backtick anywhere inside — including in a CSS comment — terminates the string; that
  failure shows up as a babel `Missing initializer` error, not as CSS.
- **Storybook's physical offsets.** Its heading copy-link sits at `right: 100%` with
  `padding-right: 8px`, and its list indent is `padding-left: 30px`. In RTL the link
  lands in the wrong gutter and the bullets hang off the right edge. Both are restated
  with logical properties; the physical declaration is overridden by specificity, not
  by a second physical one.
- **Bilingual blocks.** `.storybook/docs-direction.ts` decides the direction of every
  paragraph, list, table and sub-heading from its own text: an English block is LTR, a
  Persian block RTL, and a heading with any Persian letter stays RTL (the bilingual
  heading would otherwise flip on its English half). `h1` is excluded because it is the
  page title; story canvases are excluded because their direction belongs to the preview
  decorator. The Direction toolbar set to LTR disables the pass, so the diagnostic shows
  a genuinely LTR page rather than half a mirrored one.

The pass is synchronous. Scheduling it in `requestAnimationFrame` looks tidier, but rAF
is paused while the preview document is hidden, so a docs page opened in a background tab
renders every English block on the wrong side until it is looked at.

### Tables need `remark-gfm`

MDX compiles CommonMark only, and GitHub tables are an **extension**. Without the plugin
every `| a | b |` table compiles to a single `<p>` of literal pipes — which is what the
API pages looked like before it was added. Storybook does not ship it and only exposes
`rehypePlugins`, so `.storybook/main.ts` passes it through
`mdxPluginOptions.mdxCompileOptions.remarkPlugins`. If a table ever renders as raw pipes
again, that wiring is the first thing to check.

**And check the server's age before doubting that wiring.** The `.mdx` loader rule is
resolved once when the server boots (`mdxLoaderOptions` runs through the preset chain at
startup), so an edit to `main.ts` while the dev server is running is never re-applied —
the stale process keeps compiling MDX without the plugin and tables stay raw even though
the source is right. Measured on 17.10: tables stayed broken with `remark-gfm` on disk
until the server was restarted; the restart alone fixed every page. Restart
`npm run storybook` first, then look at `main.ts`.

### Rules for adding an entry

- Stories live **next to what they document**: `stat-card.stories.ts` beside
  `stat-card.ts`.
- `tags: ['autodocs']` on every **component** story, or there is no page for the
  description to live on.
- A **directive** has no template of its own, so autodocs has nothing to introspect: give
  it a stories file (host element, no `component` key in the meta) plus an MDX page that
  carries the same `title` and pulls the stories in with `<Canvas of={Stories.X} />`. That
  is how `LoadingDirective` is documented, and it is the pattern for every future
  directive. Do **not** put `tags: ['autodocs']` on such a meta as well — you get two docs
  entries for one title.
- **`<Meta of={Stories} />` produces the wrong docs id.** It derives the page name from
  the MDX's first heading, so `Shared/LoadingDirective` came out as
  `shared-loadingdirective--loadingdirective` instead of the catalogue's uniform
  `…--docs`. `MetaProps` has no `name` to pin it, so use a standalone
  `<Meta title="…" />` (identical to the stories file's title, which is what groups them
  in the sidebar) and reference the canvases explicitly.
- A `/** … */` comment above every story export — it becomes the story's description.
- Name stories for the **scenario** (`SalesToday`, `OrdersWithProgress`), never for the
  values (`Variant1`).
- Prefer `args` over `render`. `args` are editable in Controls and appear in the props
  table; a hand-written `render` is opaque. Use `render` only when the component needs a
  host — a `FormControl`, an injected service.
- **Never import app fixtures into a story.** Define the data in the story file; the mock
  layer is compiled out of production and Storybook must not depend on it.
- MDX pages live in `src/docs/`, one per non-visual concern. `src/docs/core/*.mdx` is the
  convention for services, interceptors, tokens and models; `src/docs/shared/*.mdx` for
  shared building blocks that are not components (directives, pipes).

### Gotchas

- **SB11's Angular `render` has no `component` key.** The return type is
  `StoryFnAngularReturnType` = `{ props?, moduleMetadata?, applicationConfig?, template?, styles? }`.
  Returning `{ component: X }` fails to compile — use `template` + `moduleMetadata`.
- **`preview.ts` already provides the app's global providers** — `LOCALE_ID: 'fa-IR'`,
  `provideHttpClient`, `provideRouter([])`, `providePrimeNG` with the Digibit preset,
  `MessageService`, `ConfirmationService`. A story never provides those. The two PrimeNG
  services are registered **explicitly** because neither is `providedIn: 'root'`.
- **`.storybook/tsconfig.json` must keep `["./**/*.ts", "../src/**/*.stories.ts"]` in
  `include`.** Drop the stories and `@ngtools/webpack` fails with "missing from the
  TypeScript compilation". The manager-only file is excluded, because it is Node-side.
- **The "is part of the TypeScript compilation but it's unused" warnings are filtered**
  in `main.ts`'s `webpackFinal`. They are unavoidable with the webpack Angular builder and
  they hide real warnings.
- **The dev server needs `.storybook/webpack-context-include-fix.ts` on Windows.** Storybook
  builds the story list as a webpack _context module_ whose `webpackInclude` filter is
  generated from a forward-slash glob, but webpack tests that filter against a `path.join`
  absolute path — backslashes on Windows. Nothing matches, the context map comes out empty,
  and every story dies at runtime with `Cannot find module './docs/…'`. The plugin widens
  `\/` to `[\\/]` in the filter, which is a no-op on POSIX. Note that `build-storybook` never
  builds a context, so **a green static build proves nothing about the dev server** — check
  both.
- **Adjacent string literals are a syntax error, not concatenation.** In a docs array,
  a missing `+` produces a confusing `Parsing error: ':' expected` at the end of the
  following line. `tsc -p .storybook/tsconfig.json --noEmit` finds it in a second.
- **MDX supports no comment syntax, so put notes in the prose or in this file.** The two
  obvious candidates both break:
  - `{/* … */}` — Prettier's MDX printer escapes a **multi-line** one to `{/\* … \*/}`,
    and the build then dies with `Could not parse expression with acorn`. A single-line
    `{/* … */}` survives, but only until someone wraps it.
  - `<!-- … -->` — MDX 3 is not HTML: `Unexpected character '!' (U+0021) before name`.
    This is why `.prettierrc` now parses `*.mdx` with the `mdx` parser (it was falling back
    to markdown, which is what caused the escaping in the first place).
- **`a11y.test` is `'todo'`, not `'error'`.** Violations are reported in the panel without
  failing the build — the right level while the feature pages are still being written.
- **The docs page follows the Theme and Direction toolbars, and is RTL by default.**
  Both come from `docs.container`, not from a parameter: the preview decorator only
  runs for _stories_, so a pure MDX page never gets `dir` and would render LTR, and
  `parameters.docs.theme` is resolved once at config time so it can never follow a
  global. Do not "simplify" it back to `parameters.docs.theme`.
- **Read the toolbar state off the preview document's own URL, not the context or the
  channel.** Three ways that all look right and all silently fail:
  `DocsContextProps` has no `globals` (only `projectAnnotations.initialGlobals`, which
  holds the _defaults_, so a `theme:dark` deep link still reported `light`);
  `globalsUpdated` never fires for a global applied before the container mounted, and
  `channel.last()` does not hold it either; and `useGlobals()` from
  `storybook/preview-api` throws outside a story render, killing the whole page.
  What works is `globalsFromUrl(location.search)` — Storybook persists every toolbar
  change into the manager URL and rebuilds the preview iframe's `src` with
  `globals=theme:dark` in it (measured, for stories and docs alike). Keep the
  `globalsUpdated` listener as the second source for a change _after_ mount.
- **SB11 joins two or more globals with `;`, not `,`.** A single global deep-links as
  `&globals=theme:dark`, but with both toolbars off their defaults the manager writes
  `&globals=direction:ltr;theme:dark` (`mergeSerializedParams` → `.join(";")` in the
  shipped manager bundle). `globalsFromUrl` in `docs-container.ts` splits on both
  separators; with a comma-only split the one pair under `direction` swallowed the theme
  and the page re-rendered RTL + light against an LTR + dark toolbar (measured).
- **`parameters.docs.lang` is honoured by the custom container.** Storybook never applies
  it to an MDX docs page itself — its own `htmlLang` parameter only reaches story roots
  and embedded story canvases. `BrandedDocsContainer` copies the project-level
  `docs.lang` onto the page root, so the page is `dir="rtl" lang="fa"` by default.

### Recommendations — not yet done, in priority order

1. Raise `a11y.test` to `'error'` once the feature pages exist.
2. Add `play` functions (`@storybook/test`) for `ConfirmDialog` and `ToastHost`, which
   currently ask a human to click. A `play` function asserting that the Promise resolves
   on Escape would pin the exact bug the `settle()`-on-`onHide` design exists to prevent.
3. Add visual regression (Chromatic, or `storybook/test-runner` snapshots) before the
   feature pages land — nothing today catches a component that renders _wrong_ rather than
   _broken_.
4. Publish `storybook-static/` so designers can browse it without a checkout.

### Known defect found while documenting

`layout/sidebar-drawer/sidebar-drawer.html` puts a static `aria-hidden="true"` on the
panel wrapper, which is an ancestor of the `role="dialog"` element. That removes the open
drawer from the accessibility tree entirely — a screen reader never sees it. It should be
`[attr.aria-hidden]="!isOpen()"`. Flagged rather than changed, because it alters component
behaviour and is not part of the Storybook work.
