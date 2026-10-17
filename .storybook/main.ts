import type { StorybookConfig } from '@storybook/angular';
import remarkGfm from 'remark-gfm';

import { contextIncludeSeparatorFix } from './webpack-context-include-fix';

/**
 * Storybook 11's Angular framework reads the project's build configuration
 * (tsConfig, styles, assets) from an Angular target rather than from this file.
 * That target is declared in `angular.json` (`backoffice:storybook` /
 * `backoffice:build-storybook`), so Storybook must be started through the
 * Angular CLI:
 *
 *   npm run storybook          -> ng run backoffice:storybook
 *   npm run build-storybook    -> ng run backoffice:build-storybook
 *
 * See ARCHITECTURE.md §11 for the full setup and why the plain `storybook` CLI
 * cannot work here.
 */
const config: StorybookConfig = {
  /**
   * Two globs on purpose:
   * - `*.mdx` are the hand-written docs pages (Introduction, Foundations,
   *   Conventions, and one page per service).
   * - `*.stories.ts` are the component stories.
   *
   * `docs` and `story` entries both land in the same sidebar tree, which is what
   * lets a component's usage notes sit next to its rendered examples.
   */
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|ts)'],

  /**
   * `addon-docs` renders the autodocs pages and the MDX files.
   * `addon-a11y` runs axe on every story (see the `a11y` parameter in
   * preview.ts). There is no `addon-essentials`: its features were folded into
   * Storybook core in v9, and the package itself is still published at v8 —
   * installing it would downgrade half the toolchain.
   *
   * `remarkGfm` is not optional here. MDX compiles CommonMark only, and GitHub
   * tables are an *extension*: without this plugin every `| a | b |` table in
   * the docs compiles to a single `<p>` of literal pipes, which is exactly what
   * the API pages looked like. Storybook does not ship the plugin — the only
   * hooks it exposes are `rehypePlugins` (rehype-slug, rehype-external-links) —
   * so it has to be added by hand.
   */
  addons: [
    {
      name: '@storybook/addon-docs',
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
    '@storybook/addon-a11y',
  ],

  framework: {
    name: '@storybook/angular',
    options: {},
  },

  /** `public/` holds the Payda woff2 files, served from the site root. */
  staticDirs: ['../public'],

  core: {
    disableTelemetry: true,
  },

  /**
   * Silences one specific, well-understood warning.
   *
   * `@ngtools/webpack` reports every file listed in the tsconfig's `include`
   * that it does not see as a webpack entry point:
   *
   *   "… is part of the TypeScript compilation but it's unused."
   *
   * Storybook's own entry is generated at build time, so every story file
   * matches that description and a clean build printed 24 of these. They are
   * advisory, they are unavoidable with the webpack-based Angular builder, and
   * they hide real warnings — so the exact message is filtered here rather than
   * the whole warning channel being turned off with `quiet`.
   *
   * The stories must stay in `include`: without them `@ngtools/webpack` cannot
   * type-check them and fails with "missing from the TypeScript compilation".
   *
   * The second half of this hook repairs the `webpackInclude` filters that
   * Storybook generates for the dev server; without it no story renders on
   * Windows. The plugin carries its own explanation.
   */
  webpackFinal: async (webpackConfig) => ({
    ...webpackConfig,
    plugins: [...(webpackConfig.plugins ?? []), contextIncludeSeparatorFix()],
    ignoreWarnings: [
      ...(webpackConfig.ignoreWarnings ?? []),
      /is part of the TypeScript compilation but it's unused/,
    ],
  }),
};

export default config;
