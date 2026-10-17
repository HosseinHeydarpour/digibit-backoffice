// .storybook/theme.ts
//
// The Storybook chrome, branded to match the back office.
//
// WHY THIS FILE EXISTS
// --------------------
// Storybook ships a neutral grey UI. An unbranded Storybook next to a
// brand-orange admin panel reads as "somebody else's tool bolted on". Every
// colour below is lifted from the same two sources the app itself uses, so the
// docs and the product can never drift apart:
//
//   - `src/styles/tailwind.css`  -> the `@theme` design tokens
//   - `src/app/app.config.ts`    -> the PrimeNG preset (`DigibitPreset`)
//
// If the brand colour ever changes, it changes in those two places AND here.
// There is no way to import them at runtime — `tailwind.css` is not a JS module
// and the preset lives inside the app's own bundle — so this file mirrors them
// and is the one copy that has to be kept honest by hand.
//
// `create()` is used rather than `themes.light`/`themes.dark` so the brand
// colour reaches every control: the selected sidebar item, the active tab, the
// focus ring, the toolbar. `themes.*` would only let us override a handful of
// fields and the accent would stay Storybook blue.

import { create } from 'storybook/theming';
import type { ThemeVarsPartial } from 'storybook/theming';

/**
 * The brand palette. One object, so the manager theme and the docs theme are
 * guaranteed to agree on what "primary" means.
 *
 * Keys mirror `@theme` in `src/styles/tailwind.css`:
 * `--color-primary`, `--color-light`, `--color-background-dark`, …
 */
export const BRAND = {
  /** `--color-primary` — the Digibit orange. Same value as `--p-primary-500`. */
  primary: '#FF8229',
  /** `--color-primary-dark` — hover/pressed state. */
  primaryDark: '#b76122',
  /** `--color-success`. */
  success: '#10B981',
  /** `--color-danger`. */
  danger: '#EF4444',
  /** `--color-warning`. */
  warning: '#F59E0B',
  /** `--color-info`. */
  info: '#3B82F6',

  /** `--color-light` — the app's light page background. */
  light: '#F8FAFC',
  /** `--color-background-dark` — the app's dark page background. */
  backgroundDark: '#0F172A',
  /** `--color-card-dark` — the dark surface for cards and bars. */
  cardDark: '#1E293B',
  /** `--color-dark` — light-mode body text. */
  dark: '#1E293B',
  /** `--color-text-dark` — dark-mode body text. */
  textDark: '#F8FAFC',
  /** Muted grey, matching Tailwind's `gray-500`/`gray-400` pair. */
  muted: '#6B7280',
  mutedDark: '#94A3B8',
  /** Hairline borders, matching `gray-200` / `gray-700`. */
  border: '#E5E7EB',
  borderDark: '#334155',
  /** Pure surfaces. */
  white: '#FFFFFF',
} as const;

/**
 * The app's own font stack, so Persian sample text in the Storybook chrome
 * renders in the same face as the panel.
 *
 * `/fonts/PeydaWebFaNum-*.woff2` is served from the site root (see AGENTS.md
 * "Fonts"); Storybook serves `public/` via `staticDirs`, so the same paths
 * resolve here. The fallbacks matter for the *manager* UI, which is mostly
 * Latin: `Tahoma`/`system-ui` keep the English chrome legible while Payda
 * covers the Persian labels.
 */
const FONT_BASE = "'Payda', 'Yekan Bakh', Tahoma, system-ui, -apple-system, 'Segoe UI', sans-serif";

/** Monospace, for the code samples in the docs pages. */
const FONT_CODE =
  "'JetBrains Mono', 'Fira Code', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace";

/**
 * An inline SVG logo — the sidebar's own mark, so the Storybook header matches
 * `layout/sidebar/sidebar.html`.
 *
 * Inlined as a data URI rather than shipped as a file: it is 400 bytes, it has
 * to work in light and dark, and a data URI cannot 404. The `#` of the brand
 * colour is percent-encoded (`%23`) because an unescaped `#` would truncate the
 * URI at the fragment.
 */
export const BRAND_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23FF8229'/%3E%3Cpath d='M16 6.2l2.15 6.3 6.3 2.15-6.3 2.15L16 23.1l-2.15-6.3-6.3-2.15 6.3-2.15z' fill='white'/%3E%3C/svg%3E";

/** Shown in the sidebar header and the browser tab. */
const BRAND_TITLE = 'دیجی‌بیت مارکت — پنل مدیریت';

/**
 * Fields shared by both manager themes.
 *
 * `base` is omitted from the type because it is the one field that must differ
 * between the two variants — everything else is genuinely common, so it is
 * written once here and cannot drift.
 */
const SHARED: Omit<ThemeVarsPartial, 'base'> = {
  colorPrimary: BRAND.primary,
  colorSecondary: BRAND.primaryDark,

  // The app is RTL Persian, so the chrome follows it.
  fontBase: FONT_BASE,
  fontCode: FONT_CODE,

  // 12px matches the app's `rounded-xl` at the panel scale; Storybook's default
  // is 4px, which reads as a different product.
  appBorderRadius: 12,
  inputBorderRadius: 8,

  brandTitle: BRAND_TITLE,
  brandUrl: './',
  brandImage: BRAND_IMAGE,
  brandTarget: '_self',
};

/**
 * Light chrome — the app's `bg-light` surface with `text-dark` text.
 *
 * `appPreviewBg` is the canvas the stories render on. It is deliberately the
 * same `#F8FAFC` the real app uses, so a component never looks better or worse
 * in Storybook than it does in the panel.
 */
export const lightTheme = create({
  ...SHARED,
  base: 'light',

  appBg: BRAND.light,
  appContentBg: BRAND.white,
  appPreviewBg: BRAND.light,
  appHoverBg: 'rgba(255, 130, 41, 0.08)',
  appBorderColor: BRAND.border,

  barBg: BRAND.white,
  barTextColor: BRAND.muted,
  barHoverColor: BRAND.primary,
  barSelectedColor: BRAND.primary,

  textColor: BRAND.dark,
  textMutedColor: BRAND.muted,
  textInverseColor: BRAND.white,

  buttonBg: BRAND.white,
  buttonBorder: BRAND.border,
  booleanBg: BRAND.border,
  booleanSelectedBg: BRAND.primary,

  inputBg: BRAND.white,
  inputBorder: BRAND.border,
  inputTextColor: BRAND.dark,
});

/**
 * Dark chrome — the app's `background-dark` / `card-dark` pair.
 *
 * These are the exact values `darkModeSelector: '.app-dark'` switches the panel
 * to, so toggling the toolbar to "Dark" and switching the Storybook UI to dark
 * produce one continuous surface rather than two greys that nearly match.
 */
export const darkTheme = create({
  ...SHARED,
  base: 'dark',

  appBg: BRAND.backgroundDark,
  appContentBg: BRAND.cardDark,
  appPreviewBg: BRAND.backgroundDark,
  appHoverBg: 'rgba(255, 130, 41, 0.16)',
  appBorderColor: BRAND.borderDark,

  barBg: BRAND.cardDark,
  barTextColor: BRAND.mutedDark,
  barHoverColor: BRAND.primary,
  barSelectedColor: BRAND.primary,

  textColor: BRAND.textDark,
  textMutedColor: BRAND.mutedDark,
  textInverseColor: BRAND.dark,

  buttonBg: BRAND.cardDark,
  buttonBorder: BRAND.borderDark,
  booleanBg: BRAND.borderDark,
  booleanSelectedBg: BRAND.primary,

  inputBg: BRAND.cardDark,
  inputBorder: BRAND.borderDark,
  inputTextColor: BRAND.textDark,
});

/**
 * The docs-page themes, keyed by the Theme toolbar global.
 *
 * Docs pages are the part of Storybook people actually read, so they are where
 * branding earns its keep: an orange heading rule and an orange sidebar accent
 * tie the documentation to the product it documents.
 *
 * These are the SAME two objects the manager uses rather than a third palette —
 * one pair to keep in sync, and a docs page that goes dark exactly when the
 * preview canvas does.
 *
 * They are selected in `.storybook/docs-container.ts` rather than through
 * `parameters.docs.theme`, because a parameter is resolved once at config time
 * and a toolbar switch is a global that changes afterwards.
 */
export const docsThemes = { light: lightTheme, dark: darkTheme } as const;
