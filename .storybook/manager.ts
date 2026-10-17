// .storybook/manager.ts
//
// Branding for the Storybook *manager* — the chrome around the canvas: the
// sidebar, the toolbar, the addons panel. Storybook calls this file once, in
// the manager context, before the UI mounts.
//
// WHY A SEPARATE FILE FROM `preview.ts`
// -------------------------------------
// The manager and the preview are two different bundles. `preview.ts` runs
// inside the story iframe (it configures Angular providers and the toolbar);
// this file runs in the surrounding shell and can only touch chrome-level
// settings. A theme set here cannot reach a story, and vice versa.
//
// WHY IT MATCHES THE OS, NOT THE TOOLBAR
// --------------------------------------
// The toolbar's light/dark toggle is a *preview* global — it flips `.app-dark`
// on the story's `<html>` and nothing else. The manager has no way to observe
// it without a custom addon that bridges the two channels. Rather than ship a
// half-working sync, the chrome follows `prefers-color-scheme`, which is what
// a user has already told their OS. That keeps the chrome predictable and the
// story independent: toggling the toolbar to Dark in a light chrome is a
// deliberate side-by-side comparison, not a bug.

import { addons } from 'storybook/manager-api';
import { getPreferredColorScheme } from 'storybook/theming';

import { darkTheme, lightTheme } from './theme';

const prefersDark = getPreferredColorScheme() === 'dark';

addons.setConfig({
  /**
   * The branded theme. `create()` in `theme.ts` is what puts the brand orange on
   * the selected sidebar entry, the active tab and the focus rings — the places
   * a user actually reads as "whose tool is this".
   */
  theme: prefersDark ? darkTheme : lightTheme,

  /**
   * Controls panel at the bottom rather than the right.
   *
   * The app is RTL Persian, so the right edge is the reading-start edge and the
   * sidebar already owns it. A right-hand panel squeezes the canvas from the
   * side the eye starts at; the bottom edge is free in both directions.
   */
  layout: {
    panelPosition: 'bottom',
    showToolbar: true,
    showPanel: true,
  },
});
