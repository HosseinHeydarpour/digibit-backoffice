# AGENTS.md

Instructions for AI agents (and humans) working in this repository.
Read this before making changes — the commit rules are **enforced by git hooks**, not suggestions.

## Project at a glance

|                    |                                                                            |
| ------------------ | -------------------------------------------------------------------------- |
| Framework          | Angular 22 — standalone components, signals, no NgModules                  |
| Language           | TypeScript (strict), no `any`                                              |
| Styling            | SCSS + PrimeNG tokens. Tailwind is **not** used                            |
| Tests              | Vitest via `@angular/build:unit-test` (`npm test`)                         |
| Node / npm         | Node 24.x, npm 11.x                                                        |
| Language of the UI | Persian (Farsi), full RTL (`dir="rtl"`)                                    |
| Architecture       | `ARCHITECTURE.md` (kept in `tasks and arc/backoffice/`, outside this repo) |
| Task list          | `TASKS-PHASE-1.md` (same folder)                                           |

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
| `chore`    | anything else that does not touch src (e.g. tooling)             |
| `revert`   | reverting a previous commit                                      |

### Allowed scopes

`auth`, `dashboard`, `products`, `categories`, `brands`, `orders`, `customers`,
`coupons`, `shipping`, `banners`, `settings`, `comments`, `tickets`,
`core`, `shared`, `layout`, `build`, `ci`, `deps`, `docs`

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
chore(deps): bump primeng to 22.1.2
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

## Local tooling

| Command                | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `npm start`            | dev server on http://localhost:4200             |
| `npm run build`        | production build into `dist/backoffice/browser` |
| `npm test`             | Vitest unit tests                               |
| `npm run format`       | format the whole repo with Prettier             |
| `npm run format:check` | check formatting without writing                |

Formatting is applied automatically to staged files by the `pre-commit` hook
(Husky + lint-staged), and commit messages are validated by the `commit-msg` hook.
