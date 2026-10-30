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

### Who is signed in — the `CURRENT_USER` token (BO-B06)

`CURRENT_USER` (`core/auth/current-user.token.ts`) is a `Signal<SessionUser | null>` — the
same seam and the same reasoning as `PERMISSIONS`, one layer further in. `SessionService`
(`@core/services/session`) wraps it as `user` / `initials` / `logout()`, and the topbar's
profile dropdown is its only consumer.

- The default is **`null`, not a stub user**. An anonymous shell must render no profile
  menu, and `@if (session.user(); as account)` in the topbar is what enforces that. Do not
  "fix" the empty header by giving the token a placeholder identity.
- BO-D03/B04 replace the provider with the real `/auth/me` result. Nothing else changes.
- `logout()` clears the signal and `navigateByUrl('/login', { replaceUrl: true })` — the
  replace flag matters, because a Back press after signing out must not return to the panel.
- `toInitials` (in `session.model.ts`) is pure: first letter of the first two words, which
  is why «مدیر سیستم» becomes «مس» and an empty name yields `''` — the avatar block then
  falls back to a blank circle rather than throwing.
- **Overriding the token in a spec or story requires overriding `SessionService` too.** It is
  `providedIn: 'root'`, so a root-instantiated instance resolves `CURRENT_USER` from the
  _root_ injector and never sees a component-scoped override — the header then renders with no
  profile menu and nothing reports an error. `TestBed` providers are unaffected (they are the
  root injector), which is why the specs pass and only the Storybook host needs the extra
  `SessionService` entry.

### Breakpoints — `lg` is 992px, not 1024px

`src/styles/tailwind.css` pins `--breakpoint-lg: 992px` in its `@theme` block, because the
task specs (e.g. BO-B05 tc 3) define the mobile/desktop split at **992px** while Tailwind
defaults that name to 1024px. Do not remove it.

The two layout affordances must change over at the _same_ width: the sidebar's `<aside>` is
`hidden lg:flex` and the topbar hamburger is `lg:hidden`. If they disagree, the band between
the two widths has **neither** — no sidebar and no way to open one. Verify breakpoint changes
in the **built** CSS (`dist/backoffice/browser/styles-*.css`), not just in source; Tailwind
emits a single `@media(width>=992px)` block and a stale 1024px query is easy to miss.

### Responsive rules (BO-B17)

The shell and the shared kit were measured at **320 / 375 / 768 / 1280 / 1920** across every
story. The result worth keeping: **nothing overflows horizontally at any width**, and the
rules below are what keeps it that way.

- **Touch targets are 44px on phones, 36-40px above.** A control that only exists to be
  tapped gets `max-sm:min-h-11` (or `max-sm:h-11 max-sm:w-11` for an icon button). Scoping it
  to `max-sm` is deliberate: a 44px toolbar button on a 1920px screen is a bigger button, not
  a better one. Do not raise the base size instead.
- **An icon-only button needs a box, not just an icon.** A bare `<i class="pi …">` inside a
  `<button>` inherits the glyph's size — the theme switch was **24×24** and the drawer close
  **16×24** before BO-B17. Give it `flex h-10 w-10 items-center justify-center` (or `h-11 w-11`
  where it is always a mobile control).
- **A truncating flex item needs `min-w-0`.** Flex items default to `min-width: auto` and
  refuse to shrink below their content, so `truncate` alone does nothing and the item pushes
  its siblings off-screen. `PageHeader` and `Topbar` both pair `min-w-0` with `truncate`; the
  topbar also uses `flex-1` to reproduce the reference's `justify-between`.
- **A table never scrolls the page.** Wrap it: `<div class="overflow-x-auto …"><p-table/></div>`.
  `overflow-x-auto` on `<main>` is the anti-pattern — it makes the whole shell scroll and
  hides the bug instead of fixing it. No `p-table` exists yet, so this rule is unenforced.
- **Grids collapse on a named breakpoint, never on a container guess.** Stat cards are
  `grid-cols-1 min-[360px]:grid-cols-2 xl:grid-cols-4`; forms are `grid-cols-1` until `sm:`.
  The second step is 360px and not `sm` (640px) because BO-E02 tc 6 asks for **two columns on a
  phone**, and a phone is 360-430px — `sm:` leaves every one of them single-column. The base
  `grid-cols-1` still holds the 320px overflow floor the BO-B17 review measured. Verified in the
  compiled CSS: `@media (width >= 360px)` with a `grid-template-columns: repeat(2, …)` rule.
  `LoadingBlock`'s `cards` variant must declare the same three steps, or the skeleton reflows into
  a different shape than the content it stands in for.

**Still unverified:** no `p-table` and no form page exists, so the table-wrapper and
single-column-form rules have no target yet, and only the emulated matrix was run — real
mobile browsers (tc 10) remain outstanding. PrimeNG's own dialog footer buttons are 36px;
raising them is a design-system decision, not a responsive patch.

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

### Feature routes own their own definition (BO-E01)

BO-E01 made `/dashboard` the first **feature** route: `app.routes.ts` keeps one
`loadChildren` line, and `features/dashboard/dashboard.routes.ts` owns the page, its resolver
and its `data`. Every feature page after it follows that shape.

- **Why `loadChildren` and not a statically imported resolver.** A `resolve:` entry pointing
  at an imported resolver pulls the resolver, its service and `ApiService` into the MAIN
  bundle — every visitor downloads the dashboard's data layer to see the login page. With
  `loadChildren`, the production build emits `dashboard-routes` as its own chunk (20.87 kB raw
  at BO-E01; 248.60 kB at BO-E05, most of it Chart.js and the four widgets), which is the real
  acceptance test for tc 4.
- **The route fetches, the page renders.** A page with a service call in `ngOnInit` cannot be
  re-resolved, has to invent its own loading state, and drags HTTP into every test of the
  page. A page reads `ActivatedRoute.data` (as a signal via `toSignal`, not a snapshot —
  a retry replaces the snapshot).
- **A resolver returns `null` on failure; it never rejects.** A rejected resolver cancels the
  navigation (`NavigationError`), which on a deep link leaves a blank screen. `null` lets the
  page render its own error state with a retry, and the failure is still reported because the
  error interceptor toasts it.
- **Refetching needs TWO router settings, and missing either one fails silently.** (1)
  `navigateByUrl(url, { onSameUrlNavigation: 'reload' })` — otherwise the router drops a
  same-URL navigation as `NavigationSkipped` before any guard or resolver is considered.
  (2) `runGuardsAndResolvers: 'always'` on the route — otherwise the reused route is handed
  the previous route's already-resolved `_resolvedData` and the resolver never runs again.
  Both are in `Dashboard.retry()` / `DASHBOARD_ROUTES` with the source references.
- **`breadcrumb.spec.ts` and `page-title.spec.ts` exempt `loadChildren` routes.** Their "every
  feature route declares `data`" loops cannot see inside a lazy chunk. The labels are pinned
  by the feature's own spec instead, and the functional tests still navigate to the route and
  assert what the services actually read.
- **Feature models live in `features/*/models/`.** Only models two features agree on belong
  in `shared/models` (BO-C06) — a shared barrel that holds one page's schema becomes the whole
  backend.
- **Deferred on purpose:** tc 7 (no login → no resolve) is BO-D06's guard, and a first-paint
  progress bar is BO-C05's loading interceptor. A resolver blocks navigation, so a page-level
  loading state is only reachable on a _re_-resolve (retry, return visit).

### Products data layer — `Page`, `buildQuery`, and a mock that filters (BO-F05)

- **`ProductsService.list(query)` returns `Page<ProductListItem>`, not an array.** The table needs the
  server's `total` for BO-F04's paginator, and `null`/`[]` already mean different things to the page
  (`loading` vs `empty`). `ProductList` reads `page().items` and `page().total`; its template did not
  change.
- **`buildQuery` is the only serializer.** `features/products/services/products.service.ts` owns the
  filter/paging → `HttpParams` mapping, and drops `null`/`undefined`/whitespace/non-positive paging.
  `ApiService.get`/`getPage` accept either a record or an `HttpParams` (the latter forwarded as-is),
  so a new filter is one entry in `buildQuery`, not a second URL builder in a component.
- **The mock filters, sorts and paginates `GET /products`.** It reads the same `query`/`categoryId`/
  `brandId`/`status`/`sort`/`dir`/`page`/`pageSize` parameters BO-F03/F04 will put in the URL, so the
  list page is testable before a backend exists. It does **not persist** writes: the fixture array is
  frozen, so one test cannot affect the next.
- **One status field.** `MockProduct.isActive` was replaced by `status` (`published` / `draft` /
  `inactive`); keeping both would have been two answers to one question.
- **The trace lives with the method.** The `TRACE` block above `ProductsService.list()` follows one
  `list({ query: 'سونی', page: 2, … })` through `buildQuery` → `ApiService` → `mockInterceptor` →
  `Page` → the component, for the next reader who needs to know what a call actually does.

### URL is the filter state (BO-F03)

- **Filters live in the URL** (`?query=&category=&brand=&status=`), not only in component state.
  `features/products/product-list/product-filters.ts` is the single translator: `filtersFromParams`
  reads the URL, `filtersToQuery` maps `category`/`brand` to `categoryId`/`brandId` for the API, and
  `filtersToQueryParams` writes the keys back. Its spec needs no `TestBed`.
- **Text is debounced 300 ms; selects apply immediately.** `applyFilters` writes `filters$` and the
  URL with `replaceUrl: true`, so typing does not fill the browser history.
  `queryParamsHandling: 'merge'` is deliberate — clearing four filter keys must not erase BO-F04's
  future `page`/`sort`.
- **Back/Forward is mirrored, not re-navigated.** The `route.queryParamMap` subscription updates
  `filters`/`filters$` only when `filtersEqual` says the URL differs; our own navigation is a no-op.
- **A filtered empty is not an empty shop.** When `hasFilters()` is true the shared empty state says
  «محصولی با این فیلترها پیدا نشد» and clears the filters; only the unfiltered case offers
  «افزودن محصول».
- **Lookups come from the API.** `ProductsService.categories()`/`brands()` read the lookup endpoints
  and drop `isActive === false`; do not hard-code a category or brand list in the component. The
  lookup page size is 100, enough for the phase-1 catalogue.

### Paging and sort are URL state too (BO-F04)

- **`product-paging.ts` owns `page`/`size`/`sort`/`dir`.** `pagingFromParams` validates the
  closed sets (1-based page, sizes 10/20/50, sort fields name/price/stock/createdAt) and falls
  back rather than sending an untyped query. `pagingToQuery` maps the URL's `size` to the API's
  `pageSize`; `pagingToQueryParams` omits defaults (`/products`, not `?page=1&size=20`).
- **Filters and paging share ONE state subject.** A filter change resets page 1 in the same
  emission; two subjects would make `combineLatest` fire twice and send a request that is
  immediately cancelled. `writeState` is the only path that updates state and the URL.
- **Clicking the active page is a no-op.** `pagingEqual` guards `applyPaging`, and `replaceUrl`
  keeps rapid page changes out of history (tc 7). Page size and sort also reset to page 1.
- **Only name/price/createdAt are sortable.** The template renders a real `<button>` inside the
  `<th>` (keyboard reachable), `aria-sort` stays on the `<th>`, and `sortBy` rejects anything
  outside `ProductSortField` even when called directly (tc 10). Date sorting is numeric UTC
  milliseconds in the mock, never a string comparison.
- **`pageWindow` is the compact paginator.** Up to seven pages it shows all; above that first,
  last and active ±1 with `null` for an ellipsis. The numbered pages are `hidden sm:flex`; a
  phone gets «صفحه ۲ از ۷» instead (tc 9).
- **The empty state distinguishes three cases:** active filters, a stale page number, and an
  actually empty shop. Only the last offers «افزودن محصول».

### Row actions: confirm, optimistic update, rollback (BO-F06)

- **One confirm API, two shapes.** Status and delete both `await ConfirmService.confirm(...)`. Delete
  passes `danger: true`, which routes it to the red dialog; cancel resolves `false` and must leave
  state, URL and network untouched (tc 3).
- **Optimistic state lives ABOVE `page()`.** `statusOverrides` (id → status) and `removedIds` are
  applied by the `items` computed; `total` subtracts pending deletes. The HTTP response remains the
  source of truth: `reconcileOptimistic(page)` drops an override when the server returns the same
  status, and drops a removed id once the row is absent. On error the overlay is cleared — that is
  the rollback (tc 7).
- **The error toast belongs to the interceptor.** The mutation's `error` branch only rolls back; it
  does not call `toast.error`, or the user would see two messages for one failure (the error
  interceptor already reported it). Success toasts are component-owned.
- **Row actions require `products.view`.** Without it the inline controls and the mobile kebab do not
  render, and the handlers return early (tc 9). Finer `products.edit`/`products.delete` grants land
  with BO-D07/D08.
- **One shared popup, appended to `<body>`.** The desktop three controls are `hidden sm:flex`; the
  mobile kebab is `sm:hidden` and opens a single `<p-menu appendTo="body">`. A popup inside the table
  would be clipped by the `overflow-x-auto` wrapper (tc 10).
- **Any spec that creates `ProductList` now needs `ConfirmationService`** (or a `ConfirmService`
  stub), because the page injects the confirm service. `ProductList` also reads `PERMISSIONS`; its
  default is empty, so action tests must provide `['products.view']`.

### Create form: one group, four tabs (BO-F07)

- **One `FormGroup`, four tabs.** `ProductCreate.form` owns every field and both `FormArray`s
  (`variants`, `images`); switching `activeTab` never swaps a control. Inventory edits `stock`/
  `lowStockThreshold` now; `variants` is the BO-F10 editor and `images` is a placeholder until
  BO-F11, but both arrays live on the central group so the payload shape is stable.
- **Tab validation is per-tab.** `next()`/`selectTab()` validate only the controls the current tab
  owns and `markAsTouched` them; an invalid main tab cannot be skipped (tc 4). BO-F08 adds the
  complete validator set.
- **`slugify` is pure and dictionary-backed.** `product-slug.ts` maps common Persian words
  (`لپ‌تاپ` → `laptop`, `ایسوس` → `asus`) and falls back to a character map, producing
  `[a-z0-9-]` only. A manual slug edit sets `slugEdited` and stops the name→slug sync; uniqueness
  is BO-F16.
- **Leaving a dirty create page asks first.** `unsavedProductChangesGuard` implements
  `CanDeactivate` through `ConfirmService`; `ProductCreate.hasUnsavedChanges()` is
  `hasChanges() || form.dirty` (a `valueChanges` flag catches programmatic edits too). The route
  also has a `beforeunload` listener for refresh/close (tc 7). The guard is written against the
  small `HasUnsavedChanges` interface so BO-F14 can reuse it.
- **The save button is honest, not broken.** BO-F13 owns the POST; until then `save()` marks all
  controls touched, reports errors, and otherwise says the submit arrives in BO-F13.
- **Storybook title is `Features/Products/Create` with `autodocs`.** It is a child of the
  `Features/Products` docs page, not embedded as a `Canvas`: two CSF files cannot share the
  `Features/Products` title, and the docs page already owns it.
- **Any route spec that navigates to `/products/new` now needs `provideHttpClientTesting`.** The
  page injects `ProductsService` for the category/brand lookups at construction; without an HTTP
  backend the test fails with `No provider for HttpClient`.

### Product form validation: one message table (BO-F08)

- **Rules are pure functions in `product-validators.ts`.** Name trims before counting (a
  three-space name is not a name), slug is the same ASCII/hyphen regex the hint promises, price is
  strictly positive, stock/threshold accept zero but not negatives, and short description counts
  code points against 160. The spec pins each function without a `TestBed` (tc 8).
- **`fieldError()` is the only error reader.** It returns `null` until the control is touched
  (tc 9), prefers a `server` key over a local one (tc 7), and formats lengths with Persian digits.
  The template calls `errorFor('field')`; it must not inspect `control.errors` directly, or the
  messages and the touched rule will drift across fields.
- **Server errors use `applyServerErrors`.** BO-F13 passes `ApiError.fields`; each message is written
  as a `server` error and the control is marked touched. Editing the value re-runs the validators
  and clears it (tc 10), so no manual "clear server error" bookkeeping is needed.
- **`SHORT_DESCRIPTION_MAX` is exposed through a getter.** It is a runtime import shared with the
  eager spec bundle; a field initialiser could run before that module is ready (same hazard as
  `TOMAN_UNIT`).
- **Validation is per-tab, not per-form.** `next()` still touches only the current tab's controls;
  a valid main tab can advance even while the (empty) variants/gallery arrays are untouched.

### Cached lookups and searchable selects (BO-F09)

- **`ProductLookupsService` is the cache, not the page.** Root-scoped `toSignal` state for categories
  and brands, one `BehaviorSubject` reload per list, and `loading`/`loaded`/`error` in one state
  object. Revisiting `/products/new` reuses the last success; the retry button re-runs only the list
  that failed. A resolver would block navigation and turn a lookup failure into no page at all.
- **`buildCategoryOptions` is pure.** It filters inactive rows, walks `parentId` to a full
  `path` (`لوازم برقی / صوتی`), computes `level` for indentation, sorts by Persian path, and stops a
  corrupt parent cycle at 20. A missing parent becomes a root instead of `undefined / name`.
  `ProductCategoryOption` now carries the optional `parentId` the API already returns.
- **Search is local.** `p-select [filter]="true" filterBy="path"` (categories) and `filterBy="name"`
  (brands) filter the already-loaded options; no keystroke reaches the API (tc 2). Brand
  `itemTemplate`/`selectedItemTemplate` show a 20px logo or an initial fallback (tc 3).
- **The select is full width and appended to `<body>`.** `class="w-full"` plus `styleClass="w-full"`
  covers the host and the inner container on a phone (tc 7); `appendTo="body"` keeps the overlay out
  of the form card's `overflow-hidden`.
- **Loading and failure live on the field.** `[loading]` is the spinner; a failure renders a Persian
  sentence and `[data-retry-categories]`/`[data-retry-brands]` buttons, without hiding the rest of
  the form (tc 8/9). The F09 spec uses a `Subject` to hold the loading state and a second emission
  to prove the retry recovers.
- **Prefill is the form's value, not a component field.** `formControlName` + `optionValue="id"`
  means an id set before the options arrive still selects the right row (tc 5); F14 reuses this on
  the edit page.

### Variant editor: one array, one row component (BO-F10)

- **The page owns the array, the editor mutates it.** `ProductCreate.form.controls.variants` is a
  `FormArray<FormGroup>` built by `createVariantArray` (which attaches `atLeastOneVariantValidator`).
  `ProductVariantEditor` takes it as a required input and never creates a second array, so every row
  is already in the payload when BO-F13 reads the form.
- **A row is its own component.** `ProductVariantRow` receives `[group]` and `[index]`; the editor
  only handles add/duplicate/remove. The row owns its nested attributes array.
- **Two pieces enforce SKU uniqueness.** `variantSkuValidator` counts sibling values, so a
  `formControlName` registration microtask (which calls `updateValueAndValidity`) cannot erase the
  marker; `syncVariantErrors` re-scans the whole array on every value change to refresh the row
  Angular did not re-validate. The same split applies to duplicate attribute keys. Comparison is
  trimmed and case-insensitive.
- **`rows` must return a fresh array.** `FormArray.controls` is the same mutable array; returning it
  from a `computed` makes `Object.is` say “unchanged” and the `@for` never re-renders. `rows` returns
  `[...controls]` and depends on a `version` signal bumped by the array subscription.
- **Base price seeds new rows, never old ones.** `add()`/`duplicate()` read `basePrice()`; an
  existing row's price is data and is not rewritten when the main tab changes (tc 4).
- **Removal goes through `ConfirmService`.** The row emits `remove`; the editor awaits the shared
  dialog, re-checks `at(index) === group` after the await, then calls `removeAt`. The label prefers
  the SKU and falls back to the row number.
- **Attributes are open key/value pairs.** `createAttributeGroup` validates a pair only when one half
  is filled; `variantAttributes()` skips empty/half pairs and turns the array into
  `ProductVariantInput.attributes`. Duplicate keys are rejected because the payload is a record.
- **`track group`, not `$index`.** Existing rows keep their DOM node when another is inserted or
  removed, so focus survives (tc 9).
- **`variantsPayload()` is the F13 boundary.** It coerces cleared numeric inputs to 0 and `''` image
  URLs to `null`; F13 should send its result, not raw form values.

### Stock fields: one rule, one number (BO-F12)

- **`stockLevel(stock, threshold)` in `features/products/product-stock.ts` is the only comparison.**
  It returns `out` / `low` / `ok`; `STOCK_LEVEL_META` holds the label and pill class for each. The
  products table and the create form both call it, so «کم‌موجودی» cannot mean two things in one
  product. Zero is `out`, not `low`: an empty shelf and a shelf that is running out are different
  messages and different colours.
- **`ProductListItem.lowStockThreshold` is required, not optional.** The row badge is
  `stock <= lowStockThreshold`; a missing value would silently render every row healthy — the same
  false all-clear the dashboard's low-stock card was burned by. The mock returns it in every list
  row (`toListItem`), and `POST`/`PUT` echo it back.
- **Variant rows own the total.** `ProductCreate.syncInventory()` writes `sumVariantStock(variants)`
  into the `stock` control with `emitEvent: false` whenever the array is non-empty: F13 sends one
  number, and the manual field cannot contradict the rows. Not emitting keeps it out of a loop and
  out of the dirty flag (the variant edit already set that). Removing the last row hands the field
  back with its last value.
- **The inventory tab has no manual availability toggle.** Arino's radio pair is replaced by a
  computed pill from the same two numbers; a hand-set «ناموجود» next to a stock of 12 would be a
  second source of truth for one question.
- **Storybook opens the tab for you.** `ProductCreateStories.Inventory` uses a host that fills the
  required main-tab fields and calls the page's `selectTab`, because the tab strip refuses to move
  forward over an invalid tab and a story cannot type.

### Submitting the create form (BO-F13)

- **`toCreateProductDto(form)` is the payload builder, and it is pure.** It trims text, turns the
  empty brand sentinel `''` into `null`, coerces cleared number inputs to 0, and reads the two
  `FormArray`s through `variantsPayload()` / `imagesPayload()`. `save()` therefore stays a sequence
  (validate → POST → route) and the mapping is tested without a TestBed.
- **`blob:` image URLs never leave the browser.** They are valid only inside the tab that made them,
  so the DTO keeps a gallery row only when its URL resolves; the bytes travel separately through
  `imageFiles()` in the upload step.
- **The three answers are three endings.** 201 → `saved` flag, success toast, navigate to
  `/products/{id}/edit`; 422 with `fields` → `applyServerErrors` + the tab that owns the field opens;
  anything else → `saveError`, which renders the «تلاش دوباره» banner. The interceptor already toasted
  the last case and deliberately does not toast validation errors, so no failure is reported twice.
- **`saved` is what turns the unsaved-changes guard off.** The form is dirty the moment it is valid,
  so without the flag the redirect after a successful create would be blocked by the page's own
  `CanDeactivate` guard. A failed save leaves it false — the user's typing is still protected.
- **`clearServerErrors()` runs before every submit.** A `server` error makes the control invalid,
  which would block the retry that tc 7 asks for; clearing the key re-runs local validation and lets
  an only-server-rejected value go back to the API. A locally wrong value still stops at the form.
- **`submitting` is the double-submit guard, and `pLoading` is how it reaches the DOM.** The guard runs
  first (a second click is a no-op), and the directive writes the native `disabled` so Enter/Space
  cannot fire either.
- **Mock-side validation is deterministic.** `POST /products` answers 422 for an empty name, an
  existing slug, or an existing SKU — enough to exercise the field mapping without a backend, and it
  never mutates the fixtures, so one test cannot poison the next.
- **Service stubs used by specs and stories now need `create()`.** A page that injects
  `ProductsService` and calls it cannot be mounted against a stub that only implements the lookups.

### Editing a product (BO-F14)

- **One form, two modes.** `:id/edit` renders `ProductCreate` with a resolver instead of a second
  page: the wizard, payload builder, validators and error mapping are already there, and a separate
  edit component would have to keep all four tabs in step with it. The `edit` input is a wrapper
  (`{ product }` or `{ error }`) because `null` already means "create route".
- **Hydrate before the first paint.** The resolver fetches the full record, so the page never shows
  an empty form that fills in later — a user typing during that window would lose the text.
  `hydrate()` rebuilds the variant and gallery arrays with the same factories the add buttons use,
  then marks the form pristine and clears `hasChanges`, or the leave guard would fire on a page the
  user has not edited.
- **`slugEdited` is set before hydration.** A saved slug is data; leaving the name→slug watcher
  armed would rewrite the URL of a live product the moment somebody renames it.
- **A 404 redirects, a 500 does not.** The resolver returns `RedirectCommand('/404')` for a missing
  id (tc 5) and `{ error }` for anything else, which the page renders as a retry block (tc 6). An
  empty form on a failed load would let the user create a duplicate of the product that exists.
- **Retry needs TWO router settings.** `navigateByUrl(url, { onSameUrlNavigation: 'reload' })` plus
  `runGuardsAndResolvers: 'always'` on the route; miss either and the resolver is never re-run.
- **Saving in edit mode PUTs and stays.** After a successful `PUT` the form becomes the new
  baseline (`markAsPristine` + `hasChanges = false`), so a re-save without changes is legal (tc 10)
  and leaving does not ask about stored edits.

### Deleting a product (BO-F15)

- **Soft delete, and the mock knows it.** `DELETE /products/:id` keeps the fixture and adds the id
  to a module-level `DELETED_IDS` set; `filterProducts` and the detail lookup skip it. Without that,
  the optimistic row came back on the very next refetch and the feature could not be seen at all.
  `resetMockDeleted()` is the test seam, called in the mock spec's `beforeEach` so one test cannot
  hide a product from the next.
- **The dialog names the variant count.** `ProductListItem.variantsCount` is computed from the
  export's REAL variants (`toVariants()` fabricates a placeholder row, and warning about an invented
  one would be a lie). Zero gets the plain sentence instead of «۰ واریانت» (tc 7).
- **Cancel is a true no-op.** `confirm` resolving false returns before the overlay, the request and
  the toast (tc 2).
- **The row leaves before the answer arrives and comes back on failure.** `removedIds` is the
  optimistic overlay; the success toast fires only after the server agrees (tc 3/4/5).
- **A missing id on delete is a 404**, mapped to `ApiError` like any other failure (tc 10).
- **Restore is out of scope.** tc 9 is conditional ("if designed"); there is no deleted-products
  list in the API contract, so no restore column was invented.

### Slug generation and uniqueness (BO-F16)

- **`slugify` is the only generator, and it is pure.** Dictionary first (`لپ‌تاپ` → `laptop`), then a
  letter map, then a `[a-z0-9-]` sweep capped at 80. The name→slug watcher now emits (it used to
  write with `emitEvent: false`), which is what lets the uniqueness check see the generated value.
- **The check is debounced 400 ms and `switchMap`ped.** A slow answer for an older value cannot paint
  «آزاد» over the current one. `excludeId` carries the edited product so its own slug is not a
  conflict with itself.
- **The server owns the suggestion.** `GET /products/slug-check` answers
  `{ available, suggestion }` and the suggestion is always usable (`slug-2`, `slug-3`, … trimmed to
  80). The client never builds one, and the mock implements the same contract.
- **A failed check is quiet.** It must not disable saving: the API still answers 422 on POST/PUT if
  the slug is really taken, and F13's mapping puts the message on the field.
- **Edit mode keeps the slug** — `slugEdited` is set during hydration, so renaming a live product
  cannot silently rewrite its URL (tc 6).
- **Copy is best-effort.** `navigator.clipboard` may be missing or blocked; the button then simply
  does not flip to «کپی شد». No error toast for a convenience action.

### Category tree (BO-G01)

- **The tree endpoint is `?tree=true`, not a second shape guess.** `CategoriesService.tree()` asks
  for nested data explicitly; the flat `/categories` list stays what the product form's select
  reads. A single endpoint with a flag is the contract, so neither consumer can accidentally get the
  other shape.
- **The mock owns the hierarchy, the icon and the count.** `MOCK_CATEGORIES` gained four children
  (two under «لوازم تحریر», two under «لوازم جانبی موبایل»); `categoryTree()` nests them by
  `parentId`, sorts by `order`, counts products from `catalogue()` and maps a slug→icon table,
  falling back to `pi pi-folder`. The function is recursive, so a third level needs no change.
- **Filtering is pure and keeps ancestors.** `filterTree` (own spec, no TestBed) keeps a node when
  it or a descendant matches, and keeps all children of a matching parent. Dropping a non-matching
  parent would leave its matching child at depth 0, which reads like a bug.
- **Phone layout is a scrolling card, not a scrolling page.** The tree sits in a `max-h-[70vh]
overflow-auto` wrapper; the page itself must never scroll sideways (BO-B17).
- **`ProductCount` counts only direct children.** A parent's number is its own products; summing the
  subtree would need a different label, and «۱۲ محصول» that includes children is misleading when the
  child already prints ۷.
- **Always expanded.** `p-tree` gets `expanded: true` on every node: tc 1 asks for two visible levels,
  and clicking each row to see one level is not a tree.
- **The component sorts; it does not trust the response.** `toTreeNodes` sorts each level by `order`
  before mapping, so a backend that forgets (or a fixture written out of order) cannot leak onto the
  screen. The mock sorts too, but only the client-side sort is under test.
- **Keyboard rides on the row, not on PrimeNG's toggler.** v21 renders the only toggle button with
  `tabindex="-1"` and leaves the node itself unfocusable, so a keyboard user cannot reach the tree at
  all. The row wrapper is `tabindex="0"` with `aria-expanded`, and Enter/Space forwards a click to
  that button so the component's own expand/collapse logic still runs.
- **The toggler icon is a template.** PrimeNG's default chevron points right when collapsed, which
  reads as "go back" in RTL; a `togglericon` template prints `pi-chevron-left` (collapsed) and
  `pi-chevron-down` (open).
- **The tree's background is a token override, not a repaint.** The preset paints `.p-tree` with
  `--p-tree-background` (a near-black in dark mode), so the element carries
  `style="--p-tree-background: transparent"` and the card's surface shows through.
- **An empty tree is not rendered.** PrimeNG prints its own English «No results found» inside an
  empty `value`, which would sit under our Persian empty state; the wrapper is only mounted when
  `nodes().length > 0`.
- **Icon names are checked against the shipped PrimeIcons.** `pi-hdd` and `pi-battery-half` do not
  exist in the font and render as blank space; storage uses `pi-database` and batteries `pi-bolt`.

### Category create/edit (BO-G02)

- **One dialog, two modes.** The page opens it with `editing = null` (create) or a node (edit); the
  form component owns no overlay, so a spec and a story can mount it without animation providers.
- **Duplicate names are a per-level rule.** The page passes `siblings` — the roots, or the children
  of the node's parent — so a child may legally repeat a root's name. Both the form and the mock
  enforce it; the server stays the authority because two tabs can race.
- **Slug uniqueness is global, name uniqueness is local.** A slug is a URL, so the mock checks it
  against every category; the form maps the 422 under the field and keeps the dialog open.
- **`slugify` moved to `@shared/utils/slugify`.** Products and categories both build slugs from
  Persian names, and a feature may not import from another feature. The word dictionary gained the
  category nouns; `جانبی` maps to an empty segment so «لوازم جانبی» does not become
  `accessories-accessories`.
- **Saving refetches the tree.** Patching the array locally would let the client drift from the
  server's order and product counts; one `load()` after the dialog closes keeps a single source of
  truth and makes the new row's icon appear (tc 7/10).
- **The mock store is mutable and resettable.** `MOCK_CATEGORIES` stays the frozen seed;
  `CATEGORIES` takes icons, descriptions and writes, and `resetMockState()` rebuilds it, so a spec
  that renames a category cannot leak into the next one.
- **Positions are assigned per level, from 1.** `nextCategoryOrder(parentId)` is `max(sibling
order) + 1`; the form defaults to the page's `nextOrder()` and the validator rejects 0. The old
  fallback (`CATEGORIES.length + 1`) counted BOTH levels, so a new root could land on a number a
  root already had and the client-side sort had no tie-breaker — the «ترتیب گنگ» the user saw.
- **Drag & drop is Angular CDK, not `p-tree` and not hand-rolled HTML5.** The page renders two
  levels as plain lists: one `cdkDropList` for the roots and one per parent, inside a
  `cdkDropListGroup`. CDK supplies the floating preview, the placeholder, the slide animation,
  touch support, Escape-to-cancel, keyboard dragging and the "released outside any list -> back
  where it was" behaviour; a hand-rolled pointer drag had none of those and could get stuck.
- **`p-tree` is gone from this page.** Its toggler is `tabindex="-1"`, its empty state prints English
  text, its chevron points right in RTL, and its node template fought the phone layout. The lists are
  ordinary markup: one row line — icon level with the title, the name owns the flexible column, and
  the count, the status pill and the pencil sit together at the end; 44px controls on a phone.
- **`cdkDropListEnterPredicate` guards the second level.** A child list accepts only a node with no
  children, so a third level cannot be dropped into existence; the API repeats the rule (plus a cycle
  check) and answers 422 for a hand-made request.
- **A drop sends `{ parentId, order }` through `PATCH /categories/:id`.** `order` is the 1-based slot
  the row landed on, and the server renumbers both the old and the new level — the client never
  patches a list of positions.

### Sales chart and Chart.js testing (BO-E03)

- **Chart.js runs in jsdom via Proxy context mock:** `UIChart` from PrimeNG mounts `<p-chart>`
  and passes canvas to `new Chart(canvas, ...)`. In jsdom, `getContext('2d')` and
  `ResizeObserver` are not provided natively. Specs mock `getContext('2d')` with a Proxy
  returning no-op functions for methods like `resetTransform()` and binds `ctx.canvas = this`
  to keep Chart.js from failing or printing console errors.
- **Range switches cancel in-flight queries (tc 9):** `Dashboard.salesChartData` uses
  `range$.pipe(switchMap(...))`. When the user rapidly toggles between 7 and 30 days,
  the previous HTTP request is cancelled automatically, avoiding race conditions.

### Low-stock card, and the one-number rule (BO-E05)

- **One threshold, exported once.** `LOW_STOCK_THRESHOLD` lives in
  `features/dashboard/dashboard.config.ts` and is used by the service's query default
  (`?threshold=`), the widget's `threshold` input default, and — mirrored as a local constant —
  the mock fixture. Before the review there were three separate numbers (5 in the service, 5 in
  the widget, **6** in `MOCK_LOW_STOCK`), so a stock-6 product was fetched, then silently
  filtered out by the card. `fixtures.spec.ts` now pins the fixture to the constant.
- **The card filters too, even though the API does.** `filteredItems()` re-applies
  `stock <= threshold` and sorts ascending (tc 1, tc 9). A response that ignores the query
  parameter must not be able to print a healthy product in a "running out" card.
- **`null` and `[]` are different answers.** `null` is "no response yet" (skeleton); `[]` is
  "the shelves are fine" (green check, tc 7). The card reads both through `showSkeleton()`;
  rendering the empty state for `null` printed a false all-clear at every page load.
- **The edit control is a `<button>` that emits, not a link that also emits.** It used to be
  `<a [routerLink]="['/products', id]" (click)="onEdit(id)">` _and_ the page navigated in the
  handler: one click, two navigations (the second arrives as `NavigationSkipped`) and two
  analytics events the day anyone adds them. The widget emits `editClick`; the page routes.
- **Self-fetching widgets refetch after a retry.** `Dashboard.reload$` is a `BehaviorSubject`
  that emits at construction and again when the page observes `NavigationStart` → `NavigationEnd`.
  Do not hang the fetch off `router.events` alone: the page is created _during_ the navigation
  that resolves its route, so that stream either misses the creating `NavigationEnd` (no data at
  all) or catches it and fetches twice on first paint.
- **No runtime values in `features/*/models/`.** A model file must be types only. The table
  columns were exported as a `const` from `models/dashboard.model.ts`, which made that file
  reachable from both the lazy `dashboard-routes` chunk and the eager bundle; the bundler put it
  in a shared async chunk and `RecentOrders` read the constant before it was initialised —
  `undefined`, an empty `<thead>`, and BO-E04 tc 6 failing _only_ when the whole suite ran
  together. The columns now live in `recent-orders.ts`, and the one shared number
  (`LOW_STOCK_THRESHOLD`) moved to `dashboard.config.ts`.
- **The dashboard has one sales number, not two.** «فروش امروز» (`summary.totalSales`) and the
  last bar of «آمار فروش» answer the same question, so the fixtures derive both from one series
  (`TODAY_SALES` in `core/mock/fixtures/index.ts`) and `salesChangePercent` from the last two
  bars. They used to be written by hand, 1,284,500,000 against an 84,000,000 bar.
  The two WIDGETS stay — the tile is today's snapshot with a trend, the chart is the 7/30-day
  series, and the reference template has both — but they can no longer disagree, because there
  is only one series behind them. If a reader ever reports "two sales statistics", check the
  numbers first: a mismatch means a fixture was hand-written again, not that a card is extra.

### Two bars per period, and cards that fill their cell (BO-E03/E05 layout pass)

- **The sales chart draws two series, on two axes.** `SalesChartPoint` carries `value` (revenue,
  in **Toman**) and `orders` (a count). They cannot share a scale — 14-35 million against 8-25
  would flatten the counts into the axis — so `orders` is `position: 'left'` and `revenue` is
  `'right'`, and **only one of them draws grid lines** (`revenue.grid.display = false`); two sets
  of horizontal rules is a fence, not a grid. Revenue stays in Toman in the dataset so the tooltip
  can print an exact amount; only the _tick callback_ divides by a million. The tooltip branches
  on `dataset.yAxisID`, which is what stops a count from being printed with «تومان».
- **`orders` is derived from `value`, never hand-written.** `ordersFor(sales)` in
  `core/mock/fixtures/index.ts` is `sales / 1_800_000` (min 1), so the two bars of a group tell
  one story. Same rule as `totalSales`: two numbers describing one day must not be able to
  disagree, and `fixtures.spec.ts` pins the derivation.
- **A grid stretches the CELL, not the card inside it.** Every KPI tile is a grid item, but
  `app-stat-card`'s host is `display: block` with no height and the `<article>` was only as tall
  as its content — so «کاربران», the one tile with no footer, ended a line higher than the three
  beside it. The fix is `h-full` on the article plus `flex flex-col` + `mt-auto` on the footer,
  which also puts all four dividers on one baseline instead of each following its own text.
- **A custom element is `display: inline` until told otherwise.** `app-sales-chart` and
  `app-low-stock` had no `:host` rule, so `h-full` on their root `<div>` resolved against an
  inline box and did nothing — the chart kept a fixed `h-72` while the stock list grew with its
  rows, and the two ended at different heights. The page now passes `class="block h-full"` on the
  host, the card root is `flex h-full flex-col`, and the plot area is `flex-1` with `min-h-72` as
  a **floor** (not a height): the extra space goes to the chart, not to a blank strip under it.
  jsdom has no layout, so `stat-card.spec`, `low-stock.spec` (tc 8d) and `sales-chart.spec` pin
  these classes instead.

### One formatter per kind of value, and a panel that prints (BO-E06)

- **A pipe is a wrapper, not the implementation.** `persianDate`, `toman` and `persianDigits`
  each delegate to an exported function — `formatPersianDate`, `formatToman`,
  `formatDigits`. A pipe can only be used from a template, and the sales chart builds its axis
  labels and tooltip lines in TypeScript, where a pipe cannot reach. Before BO-E06 that file
  carried its own `Intl.DateTimeFormat` and called `toLocaleString('fa-IR')` three times: two
  formatters, so one amount could render one way in a table and another way in a tooltip.
  **Never write a third one.** From `.html` use the pipe, from `.ts` import the function, and
  the specs pin `pipe.transform(x) === formatX(x)` so they cannot drift back apart.
- **The currency word is spelled once.** `TOMAN_UNIT` in `toman.pipe.ts` feeds the `toman`
  pipe, the chart's legend and axis title, and the KPI tile's `unit` input. It used to be the
  literal «تومان» in four files — which is how one card ends up saying «تومان» and the next
  «ریال» after somebody edits one of them.
- **A component that re-exports a module constant must use a getter.** `protected get
tomanUnit() { return TOMAN_UNIT; }`, never `readonly tomanUnit = TOMAN_UNIT`. A field
  initialiser runs at construction, and `toman.pipe.ts` is reachable from both the eager spec
  graph and the lazy `dashboard-routes` chunk, so the bundler hoists it into a shared async
  chunk and the binding can still be unset — the tile rendered `۱٬۲۸۴٬۵۰۰٬۰۰۰` with no unit,
  and only when the whole suite ran. Same hazard as `RECENT_ORDER_COLS`; see the note below.
- **`dayMonth` exists for chart axes only.** `'short'` renders `۱۴۰۵/۰۷/۲۶`, which is a date,
  not a label; a 7-day window has one year, so printing it seven times is noise. It is a
  member of the closed `PersianDateStyle` union, not a free-form format string.
- **`tabular-nums` on any column of amounts.** Persian numerals are not all the same width,
  so a price column drifts without it. Long text cells get `max-w-40 truncate` plus
  `[title]`, or a long customer name pushes the status badge out of the row.
- **Printing is a layout mode, not an afterthought.** The shell is `flex h-screen
overflow-hidden` with a scrolling `main`, which on paper is exactly one screenful. The
  templates carry `print:hidden` on the aside/topbar/drawer and `print:block print:h-auto
print:overflow-visible` on the root; grids carry `print:grid-cols-*`. What a utility cannot
  say lives in the `@media print` block of `src/styles/tailwind.css`: `@page A4 margin 12mm`,
  `print-color-adjust: exact` (without it Chrome drops the low-stock badges' tints, which is
  the one piece of information that card carries), `thead { display: table-header-group }`
  and `tr, article { break-inside: avoid }`. **Check it with Ctrl+P, not with a screenshot** —
  jsdom has no pagination.

### Production environment is checked only by a production build

`environment.prod.ts` is swapped in by `fileReplacements`, so nothing in `ng test`, `ng lint`,
`prettier` or `build-storybook` ever compiles it — `satisfies Environment` in the dev file does
not check the prod file. BO-B06 added `SITE_URL` to the model and to `environment.ts` only, and
`main` shipped with a production build that did not compile. **Run
`ng build --configuration production` before merging anything that touches `environments/`.**

Also note the current state of the bundle: the `initial` budget (500 kB warning / 750 kB error
in `angular.json`) is exceeded on main and has been for several tasks — **787.47 kB before
BO-E05, 788.61 kB after it, 788.75 kB after the two-bar chart, 790.22 kB after BO-E06** (the
dashboard lives in the lazy chunk, which went from 241.83 to ~249.75 kB). `npm run build`
therefore exits non-zero on a
budget error that predates the task, and it is the ONLY thing that fails: `npm test`,
`npm run lint`, `format:check` and `build-storybook` are green. Raising the ceiling is a
`build`-scoped decision; it should not be silenced by bumping the limit inside a feature task,
and the numbers above are what a future `build` task should start from.

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

### Component selection - PrimeNG first

Before writing a widget, a menu, a dialog, a toggle or a table, check whether PrimeNG already
ships it. The rule, applied at the start of every task and checked in review:

- **Use the component before anything hand-rolled.** `p-dialog` for modals, `p-select` for
  dropdowns (never a native `<select>`), `p-toggleswitch` for booleans, `p-table` for tables,
  `p-tree` for trees, `p-menu` for popup menus, `p-tooltip` for hints, `p-toast` through
  `ToastService`. A hand-built copy of one of these is a finding, not a style choice.
- **Use the directive before the component wrapper.** `pInputText`, `pTextarea`, `p-iconfield` +
  `p-inputicon`, `pLoading`. The chrome (border, focus ring, dark mode) comes from the preset, so a
  `rounded-lg border …` class string beside it is a second copy that will drift.
- **Style through the preset, not around it.** Prefer PT (`[pt]`), the design tokens
  (`--p-tree-background`, `dt()` variables) or the documented extension point; `::ng-deep` and
  hand-written shadow DOM overrides need a line explaining why the preset cannot do it.
- **When PrimeNG's version cannot express the requirement, say so and take the nearest installed
  dependency.** `@angular/cdk` is already a dependency; do not add a new one for a widget PrimeNG
  covers. The exception must be written down here and in a code comment - a reviewer who cannot
  see the reason will read it as a mistake. Known exceptions:
  - **Category tree drag & drop (BO-G03)** uses `cdkDropList`, not `p-tree`: the page needs one
    drop container per level (roots + each parent's children) and `p-tree` exposes none; its
    toggler is also `tabindex="-1"`, its empty state prints English and its node template fought
    the 375px layout. The list markup is ours, the drag behaviour is CDK's.
- **If the PrimeNG component exists but is incomplete, extend it rather than replace it.** The
  `[pButton]` directive's `loading` does not disable the button natively, so `pLoading` sets the
  attribute on top instead of a new button component. Same pattern for a missing input: a small
  wrapper/directive, never a parallel widget.
- **Never upgrade PrimeNG to 22 to get a feature.** It brings the PrimeUI license banner (see the
  top of this file); a missing feature is worth a documented exception, a licensed upgrade is not.

### Forms are PrimeNG everywhere, and the pointer cursor is one global rule

Form controls render through PrimeNG, never as bare native elements. The preset owns the
field chrome (border, background, focus ring, dark mode), so a hand-rolled
`rounded-lg border …` class string on an input is a second copy of the theme that drifts
the day the preset changes. `FormField` already follows this; every feature template must
too.

- **Dropdowns are `p-select`.** A native `<select>` is not allowed — filter bars and
  page-size pickers included. The established field pattern: `inputId` matching the
  `<label for>`, `class="w-full"` plus `styleClass="w-full"`, and `appendTo="body"` so the
  overlay escapes an `overflow-hidden` card. Options are `SelectOption` `{label, value}`
  objects — and they must be a MUTABLE array; PrimeNG's `[options]` input is typed `any[]`,
  so a `readonly` one fails template type-checking (TS4104).
- **A filter that means "everything" declares an explicit «همه …» option with value `''`.**
  Do not reach for `showClear` instead: its clear button emits `null`, not `''`, and the
  URL contract drops empty strings, not nulls.
- **`[ngModel]` inside a `<form>` needs a `name` attribute** (or `ngModelOptions`
  `{standalone: true}`), or Angular throws NG01352. The filter bar binds `[ngModel]`
  one-way for the label and acts on `(onChange)` — the URL signal state stays the single
  writer.
- **Text inputs carry `pInputText`, textareas `pTextarea`**, and the long
  border/background/focus class strings are then DELETED, not kept beside the directive.
  RTL-only concerns stay in the class list (`dir="ltr"`, `text-left`, `font-mono`).
- **`pInputText` is a directive, so the component must import `InputText`.** A template
  that writes `pInputText` without the import compiles (unknown attributes are allowed),
  but the class list never arrives: the field loses its border and padding, and an
  iconfield glyph lands on the placeholder. The products search box shipped that way.
  The same trap applies to `pTextarea`, `p-select` and `p-iconfield` — an unknown
  _attribute_ is silent, an unknown _element_ is not.
- **A field with a leading icon uses `p-iconfield` + `p-inputicon`** (the products search
  box), not an absolutely-positioned `<i>` fighting the theme's padding.
- **Pointer cursor comes from ONE base-layer rule** in `src/styles/tailwind.css` (`a`,
  `button:not(:disabled)`, `[role='button']:not([aria-disabled='true'])`, `[role='tab']`).
  Do not sprinkle `cursor-pointer` utilities per element; disabled controls keep their
  per-template `disabled:cursor-not-allowed`.
- **Every new task applies this from the first template it touches**; touching an older
  page includes converting its controls. PrimeNG test note: the v21 Select puts `inputId`
  on the label `<span>` itself, so a spec asserts `#id.p-select-label` (same element), and
  drives values by emitting the component's `onChange` output.

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
| `ErrorPage`         | `shared/components/error-page/`          | `shared-errorpage--docs`        |
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

`ErrorPage` is the first **route component** in the catalogue — it is mounted from `app.routes.ts`
and never from a template. Three rules come out of it:

- **One component, a copy table.** The 404 and the 403 differ in two strings and one number, so
  the layout lives in the component and the sentences in `ERROR_COPY`, keyed by code. `code` is
  `number`, not `403 | 404`: route `data` is untyped, so a closed union would compile and then
  index a table with no entry. The lookup falls back to a generic pair instead.
- **No wrapper component.** `app.config.ts` registers `withComponentInputBinding()`, so
  `data.code` binds straight to `input.required<number>()`. A test router has to ask for it
  explicitly — `provideRouter(routes, withComponentInputBinding())` — or the route matches and
  then throws **NG0950** while rendering.
- **Error routes carry `data.code` and no `data.breadcrumb`.** An error page is not a location in
  the hierarchy, so a crumb pointing at it would be a dead end. `breadcrumb.spec.ts` exempts
  routes by `data.code` rather than by path, so a second one (`maintenance`, `server-error`) is
  exempt the moment it is added, while a feature route that forgets `breadcrumb` still fails.

The back action is conditional on `history.state.navigationId > 1` (the router writes it,
starting at 1 for the first navigation). A back button on a page the user deep-linked to either
does nothing or leaves the site.

**Not covered because they do not exist yet:** `src/app/features/**` and
`src/app/core/guards/` — both folders are empty. `/forbidden` is already routed and waiting for
BO-D07's role guard; the first guard to land gets an MDX page the same way a pipe or a
directive does.

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

### `Canvas of` needs one title for the docs page and its stories

An MDX page that imports a CSF file and renders `<Canvas of={Stories.Default} />` must use the
**same title** in its `<Meta>` and in the stories file. The docs context resolves a story export by
looking it up in the CSF attached to that title; if the docs page is `Features/Products` and the
stories are `Features/Products/ProductList`, the object is treated as a component and the page dies
with _"Invalid value passed to the 'of' prop … component or unknown"_. When the MDX page is the
docs, give the stories the matching title and leave `tags: ['autodocs']` off — otherwise two docs
entries fight for the same `…--docs` id. String story IDs are **not** accepted by this `Canvas`
version; it only maps story exports/inputs.

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
