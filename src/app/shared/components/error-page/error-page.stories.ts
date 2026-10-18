import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { Meta, StoryObj } from '@storybook/angular';
import { INITIAL_VIEWPORTS } from 'storybook/viewport';

import { ErrorPage } from './error-page';

/**
 * A `Location` that reports a real previous page.
 *
 * The back action is decided in `ngOnInit` from `Location.getState()`, which is
 * not an input, so no arg can drive it. Rather than fake the router, this is
 * scoped to a **host component's** own injector — `ErrorPage` is created inside
 * it and resolves `Location` from there, while `Router` (which injects `Location`
 * itself) keeps the real one from the root injector. A story-level provider
 * would replace `Location` for the whole preview and break navigation.
 */
const BACK_LOCATION = {
  getState: () => ({ navigationId: 3 }),
  back: () => undefined,
};

/** Host that mounts the page with a previous page in history. */
@Component({
  selector: 'app-error-page-back-story',
  imports: [ErrorPage],
  providers: [{ provide: Location, useValue: BACK_LOCATION }],
  template: '<app-error-page [code]="404" />',
})
class ErrorPageBackStory {}

const meta: Meta<ErrorPage> = {
  title: 'Shared/ErrorPage',
  component: ErrorPage,
  tags: ['autodocs'],
  argTypes: {
    code: {
      control: 'number',
      description:
        'HTTP-style status code. `403` and `404` have their own copy; anything else falls back to a generic pair.',
    },
  },
  args: { code: 404 },
  parameters: {
    layout: 'padded',
    viewport: { options: INITIAL_VIEWPORTS },
    docs: {
      description: {
        component: [
          'The page a route lands on when there is nothing to show: «صفحه یافت نشد» for an',
          'unknown URL, «دسترسی ندارید» for a refused navigation. A watermark code, one sentence,',
          'and a way out.',
          '',
          '**Use case** — it is wired from `app.routes.ts`, not from a template: the wildcard route',
          'renders it for an unmatched URL, and `/forbidden` is where the role guard will send a',
          'user who lacks a permission. Reach for it **only** as a route component.',
          '',
          '**Do not reach for it** for an empty list or a failed search — that is `EmptyState`,',
          'which sits *inside* a page. This one replaces the page, so using it for a filtered table',
          'would throw away the filter controls the user needs to undo the filter.',
          '',
          '**How to use** — two route entries, no wrapper component:',
          '',
          '```ts',
          "{ path: 'forbidden', component: ErrorPage, data: { code: 403 }, title: 'دسترسی غیرمجاز' },",
          "{ path: '**', component: ErrorPage, data: { code: 404 }, title: 'صفحه یافت نشد' },",
          '```',
          '',
          '**Logic** — the 404 and the 403 differ in two strings and one number, so there is one',
          'component and an `ERROR_COPY` table keyed by code, not two pages. Two templates would drift',
          'the moment somebody restyles the action row.',
          '',
          '`code` arrives through route `data`, which works because `app.config.ts` registers',
          '`withComponentInputBinding()`. It is typed `number` rather than `403 | 404`: route `data`',
          'is untyped, so a closed union would look safe and then lie — `data: { code: 500 }` would',
          'compile and index a table with no entry. The lookup falls back to a generic pair instead,',
          'which is the honest handling of an open input.',
          '',
          'The primary action is always rendered — an error page with no way out is a dead end. The',
          'secondary «بازگشت به صفحهٔ قبل» is conditional: the router records `navigationId` in',
          '`history.state`, starting at 1 for the first navigation in the session, so anything above',
          '1 means the user genuinely arrived from inside the panel. A back button on a deep link',
          'either does nothing or leaves the site.',
          '',
          'The watermark is `aria-hidden` and the code is instead announced by a visually-hidden',
          'prefix inside the `<h1>`, so a screen reader hears «۴۰۴ — صفحه یافت نشد» once, in that',
          'order, instead of the code twice.',
        ].join('\n'),
      },
    },
  },
};
export default meta;
type Story = StoryObj<ErrorPage>;

/** The wildcard route — a URL that matches nothing. */
export const NotFound: Story = {
  args: { code: 404 },
  parameters: {
    docs: {
      description: {
        story:
          'The most common case, and the one the catch-all route produces. The back action is ' +
          'absent here because a story has no in-app history — see `WithBackAction`.',
      },
    },
  },
};

/** `/forbidden` — what BO-D07\u2019s role guard will navigate to. */
export const Forbidden: Story = {
  args: { code: 403 },
  parameters: {
    docs: {
      description: {
        story:
          'Same layout, different copy: «به این صفحه دسترسی ندارید» plus the line telling the user ' +
          'to contact an administrator. This is the only difference between the two pages, which ' +
          'is the whole argument for one component.',
      },
    },
  },
};

/**
 * A code with no entry in `ERROR_COPY`.
 *
 * Proves the fallback: the page still renders, with a generic sentence, instead
 * of showing an empty heading.
 */
export const UnknownCode: Story = {
  args: { code: 500 },
  parameters: {
    docs: {
      description: {
        story:
          'A status the app cannot produce today. Worth keeping as the regression guard for the ' +
          '`number`-not-union decision — a closed `403 | 404` would have made this story ' +
          'impossible to write.',
      },
    },
  },
};

/**
 * With a real previous page in history, so the secondary action renders.
 *
 * The page is mounted through a host component that provides its own `Location`,
 * because the back action is decided in `ngOnInit` and is not an input.
 */
export const WithBackAction: Story = {
  render: () => ({
    template: '<app-error-page-back-story />',
    moduleMetadata: { imports: [ErrorPageBackStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          '`navigationId: 3` is what a user who clicked through the panel has in `history.state`. ' +
          'The fake `Location` lives on the host component\u2019s injector rather than on the story, ' +
          'so it cannot reach the preview\u2019s real router.',
      },
    },
  },
};

/** 320px — the two actions have to wrap instead of overflowing. */
export const NarrowViewport: Story = {
  args: { code: 404 },
  globals: { viewport: { value: 'iphone5' } },
  parameters: {
    docs: {
      description: {
        story:
          'At 320px the action row stacks. `flex-wrap` plus `px-4` on the column is the whole of ' +
          'the narrow-screen handling — the centred column needs no breakpoint of its own.',
      },
    },
  },
};

/** Inside a `<main>`-shaped region, which is the only place it ever renders. */
export const InsideMain: Story = {
  args: {},
  render: () => ({
    template: `
      <div class="rounded-xl bg-gray-50 p-6 dark:bg-gray-900">
        <app-error-page [code]="403" />
      </div>
    `,
    moduleMetadata: { imports: [ErrorPage] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'The page paints no background of its own, so it inherits the routed area\u2019s surface ' +
          '(`bg-gray-50 dark:bg-gray-900` on `<main>`). Shown here on that surface, in both themes ' +
          'via the toolbar — the watermark is `gray-200` on light and `gray-700` on dark for ' +
          'exactly this reason.',
      },
    },
  },
};
