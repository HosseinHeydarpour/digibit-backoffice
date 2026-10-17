import { Component, inject, signal } from '@angular/core';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { MENU_PERMISSIONS } from '@layout/sidebar/menu';
import { SidebarDrawerState } from '@layout/sidebar-drawer/sidebar-drawer.state';
import { Meta, StoryObj, moduleMetadata } from '@storybook/angular';
import { INITIAL_VIEWPORTS } from 'storybook/viewport';

import { SidebarDrawer } from './sidebar-drawer';

/**
 * A host that drives the drawer through the real `SidebarDrawerState`, the same
 * way `MainLayout` drives it from the topbar's `menuToggle`.
 */
@Component({
  selector: 'app-sidebar-drawer-story',
  imports: [SidebarDrawer],
  template: `
    <app-sidebar-drawer />

    <div
      class="flex min-h-screen flex-col items-center justify-center gap-4 bg-light p-6 text-center dark:bg-background-dark"
    >
      <p class="text-sm text-gray-500 dark:text-gray-400">
        عرض ۳۷۵ پیکسل — منوی همبرگری زیر ۹۹۲ پیکسل فعال می‌شود
      </p>
      <button
        type="button"
        (click)="open()"
        class="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white"
      >
        باز کردن منو
      </button>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        Escape، کلیک روی پس‌زمینه، یا انتخاب یک آیتم آن را می‌بندد.
      </p>
    </div>
  `,
})
class SidebarDrawerStory {
  private readonly drawer = inject(SidebarDrawerState);

  protected open(): void {
    this.drawer.open();
  }
}

const meta: Meta<SidebarDrawer> = {
  title: 'Layout/SidebarDrawer',
  component: SidebarDrawer,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    /**
     * The drawer is `lg:hidden` — it is a mobile affordance, and the desktop
     * sidebar replaces it at 992px. A viewport wider than that would render the
     * story as a blank page, so the story is pinned to a phone width.
     */
    viewport: { options: INITIAL_VIEWPORTS },
    docs: {
      description: {
        component: [
          'The mobile offcanvas sidebar: a full-screen overlay plus a sliding panel that reuses',
          '`Sidebar` as its content.',
          '',
          '**Use case** — below 992px the persistent sidebar is hidden and this is the only way to',
          'reach navigation. It is never available at desktop width, because the hamburger that',
          'opens it is itself `lg:hidden`.',
          '',
          '**How to use** — it takes no inputs and is opened through `SidebarDrawerState`, not by a',
          'parent flipping a local flag. `MainLayout` wires `Topbar.menuToggle` to `open()`.',
          '',
          '**Logic** — the open/closed state lives in a service rather than on `MainLayout` because',
          'the hamburger is in `Topbar` and the drawer is beside it, and neither should own the',
          'other. It also survives the two components ceasing to be siblings, which happens as soon',
          'as the user dropdown lands.',
          '',
          'The panel is a **separate element** from the static sidebar, as in the design reference,',
          'and it is driven by a signal instead of the reference\u2019s global',
          '`toggleOffcanvas()`/`closeOffcanvas()` functions \u2014 the bound Tailwind classes are the',
          'same, so the motion is identical; only the trigger differs.',
          '',
          'While open it locks background scroll, traps focus into the panel, and closes on Escape.',
          'It also closes when a menu item is activated, otherwise the panel would stay on top of the',
          'page it just opened.',
          '',
          '> **Known accessibility issue.** The panel wrapper carries a static `aria-hidden="true"`',
          '> in `sidebar-drawer.html`, which puts the `role="dialog"` inside an aria-hidden subtree',
          '> \u2014 so when the drawer is open it is invisible to screen readers. It should be',
          '> `[attr.aria-hidden]="!isOpen()"`. Flagged rather than changed, because it alters',
          '> component behaviour.',
        ].join('\n'),
      },
    },
  },
  globals: { viewport: { value: 'iphone6' } },
  decorators: [
    moduleMetadata({ providers: [{ provide: PERMISSIONS, useValue: signal(MENU_PERMISSIONS) }] }),
  ],
};
export default meta;
type Story = StoryObj<SidebarDrawer>;

/** Click «باز کردن منو», then close it with Escape, the overlay, or a menu item. */
export const OpenAndClose: Story = {
  render: () => ({
    template: `<app-sidebar-drawer-story />`,
    moduleMetadata: { imports: [SidebarDrawerStory] },
  }),
};
