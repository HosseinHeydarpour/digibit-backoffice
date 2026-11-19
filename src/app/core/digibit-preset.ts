import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

/**
 * Aura with the Digibit brand colour substituted into the primary palette.
 *
 * Every PrimeNG component reads `--p-primary-*` from this, so the brand orange
 * reaches buttons, tables and focus rings without any per-component overrides.
 * The value matches `--color-primary` in src/styles/tailwind.css.
 *
 * The dark `formField.background` override exists because Aura's dark scheme
 * paints fields with `{surface.950}` (near-black #020617), which reads as a
 * black hole on the project's #1e293b dark cards. The project palette is
 * slate, so the field sits on slate-700, the same tone the pre-PrimeNG inputs
 * carried as `dark:bg-gray-700`. Light mode keeps Aura's `{surface.0}`; every
 * other form-field token (borders, placeholder, focus) is untouched.
 *
 * The app and Storybook both import this file. Keeping one preset is what stops
 * the preview from falling back to Aura's black dark-mode fields while the app
 * shows slate.
 */
export const DIGIBIT_PRESET = definePreset(Aura, {
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
    colorScheme: {
      dark: {
        formField: {
          background: '#334155',
        },
      },
    },
  },
  components: {
    // Tooltips wear the project's slate surfaces, not Aura's zinc tokens: #1e293b
    // is `--color-dark` on light, #334155 is the dark form-field tone, and
    // #f8fafc is `--color-text-primary-dark`. 20rem gives a long customer name
    // room; the 8px radius matches the fields.
    tooltip: {
      root: {
        maxWidth: '20rem',
        borderRadius: '0.5rem',
      },
      colorScheme: {
        light: {
          root: {
            background: '#1e293b',
            color: '#f8fafc',
          },
        },
        dark: {
          root: {
            background: '#334155',
            color: '#f8fafc',
          },
        },
      },
    },
  },
});
