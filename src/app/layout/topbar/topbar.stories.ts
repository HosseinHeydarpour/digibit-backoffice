import { Component, signal } from '@angular/core';
import { CURRENT_USER } from '@core/auth/current-user.token';
import { PageTitleService } from '@core/services/page-title';
import { SessionService } from '@core/services/session';
import { SessionUser } from '@shared/models';
import { Meta, StoryObj } from '@storybook/angular';

import { Topbar } from './topbar';

/**
 * A host that supplies a page heading.
 *
 * Storybook has no route state, so `PageTitleService` cannot read a real
 * `data.title` here — with no routes it falls back to «پنل مدیریت», which is
 * what the `Default` story shows. To demonstrate a real heading the service is
 * replaced with a stub carrying the same shape.
 */
@Component({
  selector: 'app-topbar-story',
  imports: [Topbar],
  template: `<app-topbar />`,
  providers: [{ provide: PageTitleService, useFactory: () => ({ title: signal('محصولات') }) }],
})
class TopbarStory {}

const STORY_USER: SessionUser = {
  id: 'u-1',
  fullName: 'مدیر سیستم',
  email: 'admin@digibit.market',
  avatarUrl: null,
};

/**
 * A host that supplies both a page heading and a signed-in user.
 *
 * The topbar has no login page yet, so `CURRENT_USER` cannot come from a real
 * session here. Two things must be provided together, and the reason is a
 * trap worth naming: `SessionService` is `providedIn: 'root'`, so overriding
 * only `CURRENT_USER` on this host does nothing — the root singleton resolves
 * the token from the *root* injector, whose default is `null`, and the trigger
 * silently never renders. Listing `SessionService` here forces a host-scoped
 * instance, and that one reads the host's token.
 *
 * The same pairing is what keeps the story honest in the other direction: the
 * token's default is `null`, so every other story — and every topbar spec —
 * sees the anonymous shell.
 */
@Component({
  selector: 'app-topbar-profile-story',
  imports: [Topbar],
  template: `<app-topbar />`,
  providers: [
    { provide: PageTitleService, useFactory: () => ({ title: signal('محصولات') }) },
    { provide: CURRENT_USER, useValue: signal<SessionUser | null>(STORY_USER) },
    SessionService,
  ],
})
class TopbarProfileStory {}

const meta: Meta<Topbar> = {
  title: 'Layout/Topbar',
  component: Topbar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          'The header of the shell: the mobile hamburger, the current page heading, the',
          'light/dark switch, and the account dropdown.',
          '',
          '**Use case** — it is rendered once by `MainLayout`; no page mounts it. It is the only',
          'place the theme switch and the account menu exist, so a page must never add a second',
          'one.',
          '',
          '**How to use** — it takes no inputs. A page sets its heading by declaring `data.title`',
          'on its route; the topbar reads it through `PageTitleService`. The account entry reads',
          'the signed-in user from the `CURRENT_USER` token, which defaults to `null` — with no',
          'user there is no dropdown, and the header renders exactly as before.',
          '',
          '**Logic** — it does not know a drawer exists. The hamburger emits `menuToggle` and',
          '`MainLayout` decides what that means, which is why the topbar has no dependency on the',
          'sidebar and can be rendered on its own. Nor does it know how a session begins: the',
          'dropdown reads a signal injected by `CURRENT_USER` and swaps providers without',
          'touching this component.',
        ].join('\n'),
      },
    },
  },
};
export default meta;
type Story = StoryObj<Topbar>;

/** The real service with no routes matched — the heading falls back to «پنل مدیریت». */
export const Default: Story = {
  args: {},
};

/** A route that declares `data.title: 'محصولات'`. */
export const WithPageTitle: Story = {
  render: () => ({
    template: `<app-topbar-story />`,
    moduleMetadata: { imports: [TopbarStory] },
  }),
};

/**
 * The theme switch works live — click it and the whole preview flips, because
 * `ThemeService` is the real service and the toolbar's Theme switch reads the
 * same `.app-dark` class. Try it together with the toolbar to confirm both
 * paths land on the same state.
 */
export const ThemeSwitchIsLive: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'Click the sun/moon button: the preview flips immediately. The toolbar Theme switch ' +
          'writes the same class, so the two must never disagree.',
      },
    },
  },
};

/**
 * The account dropdown with a signed-in user.
 *
 * Click the avatar/name block to open it. «پروفایل من» and «تنظیمات» are
 * `routerLink`s, «بازگشت به سایت» opens `SITE_URL` in a new tab, and «خروج»
 * runs `SessionService.logout()` — in mock mode it clears the signal and
 * navigates to `/login`, so the trigger disappears as you watch.
 */
export const WithProfileMenu: Story = {
  render: () => ({
    template: `<app-topbar-profile-story />`,
    moduleMetadata: { imports: [TopbarProfileStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'Click the account block to open the dropdown. «خروج» clears the CURRENT_USER signal, ' +
          'so the trigger vanishes immediately — the header returns to the anonymous layout.',
      },
    },
  },
};
