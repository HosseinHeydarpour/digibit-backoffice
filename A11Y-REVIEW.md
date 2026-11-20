# Accessibility review (BO-P10)

Reviewed against the shared kit and the feature pages; the automated axe pass in Storybook
(`a11y.test: 'todo'`) reports violations without failing the build.

## Checked

- **Labels:** every form control goes through `FormField` or pairs a real `<label for>` with its
  input id. Icon-only buttons carry `aria-label` (refresh, print, delete, row kebab, badge).
- **Keyboard:** sidebar, tabs, dialogs, selects and the composer are reachable by Tab; Enter sends
  a ticket reply, Shift+Enter adds a line, Space toggles switches.
- **Focus:** `focus-visible` rings use the brand colour; dialog focus is handled by PrimeNG.
- **Tables:** every table has a `<thead>` with `<th scope="col">`; status is never colour-only —
  the text pill is always present.
- **Errors:** form errors render under the field; the error block uses `role="alert"`, empty
  states use `role="status"`.
- **Contrast:** the Arino palette is used through PrimeNG tokens; text on the brand orange is
  white (4.5:1+), muted text is `gray-500`/`gray-400` on the matching surface.
- **Print:** the invoice is a real sheet with headers, not a screenshot.

## Open items

- Axe now runs in Playwright against the real app (`e2e/a11y.spec.ts`) for `/dashboard` and
  `/profile`: no serious or critical violations. Expanding the page list is the next step.
- ~~The mobile drawer's static `aria-hidden` defect~~ — fixed: the panel now binds
  `[attr.aria-hidden]="!isOpen()"`, so the open dialog is in the accessibility tree.
- Real-device screen-reader pass (NVDA/VoiceOver) is still manual.
