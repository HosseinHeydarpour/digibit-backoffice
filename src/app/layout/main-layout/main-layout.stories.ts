import { signal } from '@angular/core';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { MENU_PERMISSIONS } from '@layout/sidebar/menu';
import { Meta, StoryObj, moduleMetadata } from '@storybook/angular';
import { INITIAL_VIEWPORTS } from 'storybook/viewport';

import { MainLayout } from './main-layout';

const meta: Meta<MainLayout> = {
  title: 'Layout/MainLayout',
  component: MainLayout,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    viewport: { options: INITIAL_VIEWPORTS },
    docs: {
      description: {
        component: [
          'The persistent shell around every authenticated page: the sidebar and the topbar are',
          'rendered **once** here, and only the `<router-outlet>` swaps on navigation.',
          '',
          '**Use case** — it is the route component for the authenticated area. Nothing else mounts',
          'it, and a feature page never imports it.',
          '',
          '**How to use** — a feature route is declared as a **child** of the layout route, so it',
          'renders inside `<main>`. The layout itself takes no inputs.',
          '',
          '**Logic** — because the shell is not re-created on navigation, the sidebar keeps its',
          'scroll position and the topbar does not flicker; only the `<main>` contents change. At',
          'desktop width the sidebar sits permanently in the `<aside>`; below 992px the `<aside>` is',
          '`hidden` and the topbar\u2019s hamburger is the only entry point, emitting `menuToggle` which',
          'this component maps to `openDrawer()`.',
          '',
          'The drawer is rendered **outside** the `overflow-hidden` shell so its slide-in cannot be',
          'clipped during the transition.',
          '',
          '> **Note.** The routed area is still empty, so the four `<app-empty-state>` cards below',
          '> are a temporary visual sample (BO-B13) and are deleted with the import when real pages',
          '> land. They are what makes this story worth looking at today.',
        ].join('\n'),
      },
    },
  },
  decorators: [
    moduleMetadata({ providers: [{ provide: PERMISSIONS, useValue: signal(MENU_PERMISSIONS) }] }),
  ],
};
export default meta;
type Story = StoryObj<MainLayout>;

/**
 * Desktop width — the sidebar is permanent and the hamburger is hidden.
 *
 * Because `MainLayout` is `h-screen`, this story is best viewed with the
 * fullscreen layout; the whole shell fits the canvas.
 */
export const Desktop: Story = {
  args: {},
};

/**
 * Phone width (375px) — the sidebar is gone and the hamburger is the only way in.
 *
 * Tap it to open the drawer. This is the pair of states that has to be checked
 * together: at any width exactly one of the two affordances must be available.
 */
export const Mobile: Story = {
  args: {},
  globals: { viewport: { value: 'iphone6' } },
  parameters: {
    docs: {
      description: {
        story:
          'The sidebar is `hidden lg:flex` and the hamburger is `lg:hidden`, so the two change ' +
          'over at exactly the same width — `--breakpoint-lg: 992px` in `src/styles/tailwind.css`, ' +
          'not Tailwind\u2019s default 1024px. Using the default would leave a 992-1023px viewport ' +
          'with neither control.',
      },
    },
  },
};

/**
 * A tablet width (768px) — still mobile, but wide enough that the drawer opens
 * to its `sm:w-100` panel rather than the `w-[80%]` one.
 */
export const Tablet: Story = {
  args: {},
  globals: { viewport: { value: 'ipad' } },
};
