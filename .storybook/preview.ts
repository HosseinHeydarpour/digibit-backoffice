import { applicationConfig, type Preview } from '@storybook/angular';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { LOCALE_ID } from '@angular/core';
import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';

import { BrandedDocsContainer } from './docs-container';
import { BRAND } from './theme';

/**
 * Aura with the Digibit brand orange substituted into the primary palette — the
 * exact preset from src/app/app.config.ts, so components render with the same
 * brand colour in Storybook as they do in the app.
 */
const DigibitPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fff4ec',
      100: '#ffe4d1',
      200: '#ffc9a3',
      300: '#ffae75',
      400: '#ff9847',
      500: '#ff8229',
      600: '#d96b1f',
      700: '#b76122',
      800: '#8c4a1a',
      900: '#6b3814',
      950: '#3d1f0a',
    },
  },
});

/**
 * Global styles are NOT imported here: the Angular builder target in
 * `angular.json` reuses the app's own build options, so `primeicons.css` and
 * `src/styles.scss` (Tailwind + Payda fonts) are already compiled and injected
 * into the preview iframe. Importing them again would double-load them.
 */

const preview: Preview = {
  decorators: [
    /**
     * Mirrors `app.config.ts`. Anything a component injects has to be provided
     * here too, or the story fails with a NullInjectorError the moment it
     * touches that dependency:
     *
     *   LOCALE_ID               Persian dates/numbers via the built-in Intl data
     *   provideHttpClient       every feature service reaches the API through it
     *   provideRouter([])       RouterLink / routerLinkActive in Sidebar, Breadcrumb
     *   providePrimeNG          the brand preset + the `.app-dark` selector
     *   MessageService          NOT root-provided by PrimeNG — ToastService needs it
     *   ConfirmationService     NOT root-provided either — ConfirmService needs it
     */
    applicationConfig({
      providers: [
        { provide: LOCALE_ID, useValue: 'fa-IR' },
        provideHttpClient(withFetch()),
        provideRouter([]),
        providePrimeNG({
          theme: {
            preset: DigibitPreset,
            options: { darkModeSelector: '.app-dark' },
          },
        }),
        ConfirmationService,
        MessageService,
      ],
    }),

    /**
     * Applies the toolbar's Direction + Theme globals to the preview document.
     *
     * These are the two axes every story has to be checked on, and neither is
     * reachable from a story's own template: `dir` belongs on `<html>` and the
     * dark class is read by PrimeNG's `darkModeSelector: '.app-dark'` plus
     * Tailwind's `dark:` variant (bound to the same class in `tailwind.css`).
     * Setting them here means a story never has to know the mechanism.
     *
     * The canvas colour comes from the same `BRAND` tokens the manager theme
     * uses, so the chrome and the canvas cannot drift apart.
     */
    (storyFn, context) => {
      const dir = (context.globals['direction'] as string | undefined) ?? 'rtl';
      const dark = context.globals['theme'] === 'dark';

      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('dir', dir);
        document.documentElement.classList.toggle('app-dark', dark);
        document.body.style.background = dark ? BRAND.backgroundDark : BRAND.light;
        document.body.style.color = dark ? BRAND.textDark : BRAND.dark;
      }

      return storyFn();
    },
  ],

  /**
   * The two axes every story is checked on. Exposed as toolbar switches rather
   * than per-story args because they are properties of the *environment*, not
   * of the component under test.
   */
  globalTypes: {
    direction: {
      description: 'Text direction — RTL is the shipping configuration',
      defaultValue: 'rtl',
      toolbar: {
        title: 'Direction',
        icon: 'transfer',
        items: [
          { value: 'rtl', title: 'RTL (فارسی)' },
          { value: 'ltr', title: 'LTR (diagnostic)' },
        ],
        dynamicTitle: true,
      },
    },
    theme: {
      description: 'Colour scheme — drives `.app-dark`',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },

  parameters: {
    /**
     * `centered` is the right default for a component library: a stat card or a
     * datepicker alone on an empty canvas reads as a component. Full-page
     * components (MainLayout, PageHeader, ToastHost) opt back into `fullscreen`
     * in their own stories.
     */
    layout: 'centered',

    /**
     * Sidebar order. Storybook sorts by the title path, and anything not listed
     * falls to the end alphabetically — so the reading order is: orientation,
     * then the shared kit, then the shell, then the non-visual core.
     *
     * These are the **first segments** of the `title` in each story/MDX file, so
     * they have to match `Shared/StatCard`, `Layout/Topbar`, `Core/ApiService`
     * and so on exactly. A typo here silently reorders the sidebar rather than
     * failing, which is why the list is worth checking when a new root is added.
     */
    options: {
      storySort: {
        order: ['Introduction', 'Foundations', 'Conventions', 'Shared', 'Layout', 'Core'],
      },
    },

    /**
     * The docs page wrapper.
     *
     * Neither of the two things the docs pages need can be a plain parameter:
     * the preview decorator above only runs for *stories*, so a pure MDX page
     * never gets `dir`, and `parameters.docs.theme` is resolved once and cannot
     * follow the Theme toolbar. Both are decided at render time here.
     *
     * See `.storybook/docs-container.ts` for the mechanism and
     * `.storybook/theme.ts` for the two palettes.
     */
    docs: {
      container: BrandedDocsContainer,
      /** Set on the docs page root, so the browser shapes Persian text correctly. */
      lang: 'fa',
    },

    controls: {
      expanded: true,
      /** Alphabetical is the only order a reviewer can predict. */
      sort: 'alpha',
    },

    /**
     * Accessibility is checked on every story by `@storybook/addon-a11y`.
     * `todo` reports violations in the panel without failing the build — the
     * right level while the feature pages are still being built. Raise it to
     * `error` once the panel is complete.
     */
    a11y: {
      test: 'todo',
    },
  },
};

export default preview;
