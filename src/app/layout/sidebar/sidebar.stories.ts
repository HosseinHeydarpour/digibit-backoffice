import { Component, signal } from '@angular/core';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { MENU_PERMISSIONS } from '@layout/sidebar/menu';
import { Meta, StoryObj } from '@storybook/angular';

import { Sidebar } from './sidebar';

/**
 * The permission list a story hands to the sidebar.
 *
 * The real token is injected from `app.config.ts` and, in production, is fed by
 * `/auth/me`. Storybook has no session, so each story provides its own list —
 * which is also the clearest way to demonstrate what `filterMenu()` does.
 */
const permissions = (values: readonly string[]) => ({
  provide: PERMISSIONS,
  useValue: signal(values),
});

/**
 * The sidebar paints no height of its own — it is `h-full` inside whatever box
 * the shell gives it. The host supplies one so the story has a real frame
 * instead of collapsing to its content.
 */
@Component({
  selector: 'app-sidebar-story',
  imports: [Sidebar],
  template: `
    <div
      class="h-[600px] w-72 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
    >
      <app-sidebar />
    </div>
  `,
})
class SidebarStory {}

const meta: Meta<Sidebar> = {
  title: 'Layout/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: [
          'The navigation panel: a logo row and the permission-filtered menu, grouped into',
          '«فروشگاه», «سفارش‌ها», «محتوا» and «سیستم».',
          '',
          '**Use case** — rendered once by `MainLayout` as the persistent desktop sidebar, and',
          'again inside `SidebarDrawer` as the mobile one. The same component serves both because',
          'it carries no width of its own: the `w-72` lives on the shell\u2019s `<aside>` and the',
          'drawer lets it fill the panel.',
          '',
          '**How to use** — it takes no inputs. It injects the `PERMISSIONS` token and derives its',
          'menu with `filterMenu(MENU, permissions())`. To add an entry, edit `MENU`; to change',
          'who sees it, change the item\u2019s `permission`.',
          '',
          '**Logic** — the menu is a `computed`, so a new permission signal (a re-login) rebuilds',
          'it with no imperative refresh. `filterMenu` is pure and never mutates the shared `MENU`',
          'constant, which is what stops one account\u2019s access leaking into the next render.',
          'The component does not navigate on its own \u2014 `<a routerLink>` does that \u2014 it only',
          'announces the click through `itemActivated`, which the drawer listens to so it can close.',
        ].join('\n'),
      },
    },
  },
};
export default meta;
type Story = StoryObj<Sidebar>;

/** Every permission `MENU` references — all four groups, every item. */
export const FullAccess: Story = {
  render: () => ({
    template: `<app-sidebar-story />`,
    moduleMetadata: { imports: [SidebarStory], providers: [permissions(MENU_PERMISSIONS)] },
  }),
};

/**
 * A product manager: `products.view` only.
 *
 * Note that three groups disappear entirely — «سفارش‌ها», «محتوا» and «سیستم»
 * have no item left, and `filterMenu` drops a group whose items all vanish so no
 * heading renders above an empty list.
 */
export const ProductsOnly: Story = {
  render: () => ({
    template: `<app-sidebar-story />`,
    moduleMetadata: { imports: [SidebarStory], providers: [permissions(['products.view'])] },
  }),
};

/**
 * A brand-new account with no grants at all.
 *
 * «پیشخوان» has no `permission` on purpose, so the dashboard stays reachable for
 * every signed-in user — including one whose grants are empty. This is the story
 * that proves the menu is never completely blank.
 */
export const NoGrants: Story = {
  render: () => ({
    template: `<app-sidebar-story />`,
    moduleMetadata: { imports: [SidebarStory], providers: [permissions([])] },
  }),
};

/**
 * A permission the menu does not recognise.
 *
 * `filterMenu` ignores unknown strings rather than failing, because the list
 * arrives from the server at runtime and cannot be constrained by the
 * `Permission` union. The result is identical to `NoGrants`.
 */
export const UnknownPermission: Story = {
  render: () => ({
    template: `<app-sidebar-story />`,
    moduleMetadata: {
      imports: [SidebarStory],
      providers: [permissions(['products.view', 'something.else'])],
    },
  }),
};
