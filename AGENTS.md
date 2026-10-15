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
