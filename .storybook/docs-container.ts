import { DocsContainer, type DocsContainerProps } from '@storybook/addon-docs/blocks';
import { createElement, useEffect, useState, type PropsWithChildren, type ReactNode } from 'react';
import { GLOBALS_UPDATED } from 'storybook/internal/core-events';
import type { ThemeVars } from 'storybook/theming';

import { docsThemes } from './theme';

/**
 * Persian direction and dark mode for the docs pages.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The two things the docs pages need most are the two a parameter cannot give
 * them:
 *
 * 1. **Direction.** The preview decorator in `preview.ts` sets `dir` on
 *    `<html>`, but decorators only run for *stories*. A hand-written MDX page
 *    such as `src/docs/core/ApiService.mdx` renders no story at all, so the
 *    decorator never fires and the page stays LTR — Persian paragraphs, tables
 *    and headings then lay out in the wrong direction, and mixed Persian/English
 *    lines break in the wrong place.
 * 2. **Theme.** `parameters.docs.theme` is read once, when the config is
 *    assembled. The Theme toolbar is a *global*, so a parameter can never follow
 *    it: switching to Dark repainted the canvas and left the docs page light.
 *
 * `docs.container` is the supported seam for both. Storybook renders every docs
 * page through the component below, and `DocsContainer` takes the theme as a
 * prop, so both can be decided at render time from the current globals.
 *
 * HOW THE GLOBALS ARE READ
 * ------------------------
 * Three attempts, the third of which is the one that works. Both earlier ones
 * are worth not repeating, because each looked correct and silently failed:
 *
 * - **`DocsContextProps` has no `globals`.** It is `storyById`, `channel`,
 *   `projectAnnotations` and friends. `projectAnnotations.initialGlobals` is
 *   reachable but holds the *defaults* — on a `theme:dark` deep link it still
 *   reported `light`, so the docs page painted white.
 * - **The preview channel is not enough either.** `globalsUpdated` fires for a
 *   global that changes *while this component is mounted*; it does not fire for
 *   one that was already applied when the page loaded, and `channel.last()`
 *   does not hold it. Measured: with `?globals=theme:dark` the story canvas went
 *   dark and `wrapperBg` stayed `rgb(255, 255, 255)`.
 * - **`useGlobals()` from `storybook/preview-api` cannot be used here.** It calls
 *   the story-context hook, which throws outside a story render, and a docs page
 *   is not one. Measured: the page stopped rendering at all.
 *
 * What does work is the place Storybook itself keeps the toolbar state. The
 * manager persists every toolbar change into its own URL and rebuilds the
 * preview's `src` from it, so the preview document is navigated to
 * `iframe.html?id=…&viewMode=docs&globals=theme:dark` — measured, in the static
 * build, for stories and docs alike. So the current globals are parsed straight
 * out of `location.search`, which is correct on first paint, for a deep link and
 * for a reload after the toolbar was used.
 *
 * The `globalsUpdated` listener is kept as the second source: it re-renders the
 * page when a global changes *after* mount, which is the case the URL parsing
 * above cannot see until the manager re-navigates the iframe.
 */

/** The toolbar globals this file reads, plus whatever else Storybook sends. */
type GlobalsRecord = Record<string, unknown>;

let latestGlobals: GlobalsRecord = {};

/**
 * The toolbar globals carried in this document's URL, as Storybook encodes them.
 *
 * The manager puts every global into the preview iframe's `src` as
 * `globals=theme:dark,direction:ltr` — one `key:value` pair per global,
 * comma-separated. Only the keys this app defines are picked out, so an unknown
 * key cannot smuggle itself in, and a value containing a separator (which none
 * of ours do) is simply not supported.
 */
export function globalsFromUrl(search: string): GlobalsRecord {
  const raw = new URLSearchParams(search).get('globals');
  if (!raw) return {};

  const globals: GlobalsRecord = {};
  for (const pair of raw.split(',')) {
    const separator = pair.indexOf(':');
    if (separator <= 0) continue;
    const key = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    // The two axes the toolbar owns; anything else is somebody else's concern.
    if (key === 'direction' || key === 'theme') globals[key] = value;
  }
  return globals;
}

/**
 * The direction and docs theme for a set of globals.
 *
 * Pure, and exported so it can be checked without a browser. RTL is the
 * shipping configuration, so anything that is not an explicit `ltr` is treated
 * as RTL — the same fail-safe default the preview decorator uses.
 */
export function resolveDocsAppearance(globals: GlobalsRecord): {
  dir: 'rtl' | 'ltr';
  theme: ThemeVars;
} {
  return {
    dir: globals['direction'] === 'ltr' ? 'ltr' : 'rtl',
    theme: globals['theme'] === 'dark' ? docsThemes.dark : docsThemes.light,
  };
}

/**
 * Pulls `globals` out of a `globalsUpdated` payload without trusting its shape.
 *
 * The channel is untyped at this boundary — the payload crosses from Storybook
 * core — so it is narrowed here rather than cast.
 */
function readGlobals(payload: unknown): GlobalsRecord {
  if (payload && typeof payload === 'object' && 'globals' in payload) {
    const { globals } = payload as { globals?: unknown };
    if (globals && typeof globals === 'object') return globals as GlobalsRecord;
  }
  return {};
}

/**
 * The docs page wrapper, assigned to `parameters.docs.container` in
 * `preview.ts`. See the file header for why it exists.
 */
export function BrandedDocsContainer({
  children,
  context,
}: PropsWithChildren<DocsContainerProps>): ReactNode {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const { channel } = context;
    const onGlobalsUpdated = (payload: unknown): void => {
      latestGlobals = readGlobals(payload);
      forceRender((revision) => revision + 1);
    };

    channel.on(GLOBALS_UPDATED, onGlobalsUpdated);
    return () => channel.off(GLOBALS_UPDATED, onGlobalsUpdated);
  }, [context]);

  const globals: GlobalsRecord = {
    ...context.projectAnnotations.initialGlobals,
    ...(typeof location !== 'undefined' ? globalsFromUrl(location.search) : {}),
    ...latestGlobals,
  };
  const { dir, theme } = resolveDocsAppearance(globals);

  return createElement('div', { dir }, createElement(DocsContainer, { context, theme }, children));
}
