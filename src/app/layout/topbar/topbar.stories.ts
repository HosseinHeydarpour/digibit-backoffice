import { Component, signal } from '@angular/core';
import { PageTitleService } from '@core/services/page-title';
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

const meta: Meta<Topbar> = {
  title: 'Layout/Topbar',
  component: Topbar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          'The header of the shell: the mobile hamburger, the current page heading, and the',
          'light/dark switch.',
          '',
          '**Use case** — it is rendered once by `MainLayout`; no page mounts it. It is the only',
          'place the theme switch exists, so a page must never add a second one.',
          '',
          '**How to use** — it takes no inputs. A page sets its heading by declaring `data.title`',
          'on its route; the topbar reads it through `PageTitleService`.',
          '',
          '**Logic** — it does not know a drawer exists. The hamburger emits `menuToggle` and',
          '`MainLayout` decides what that means, which is why the topbar has no dependency on the',
          'sidebar and can be rendered on its own.',
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
