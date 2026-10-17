import type { Compiler } from 'webpack';

/**
 * Windows workaround: Storybook's `webpackInclude` filters reject every story
 * file, which breaks the dev server with `Cannot find module './docs/…'`.
 *
 * ## Symptom
 *
 * `npm run storybook` fails to render any story:
 *
 *   Cannot find module './docs/Conventions.mdx'
 *   Cannot find module './app/shared/components/breadcrumb/breadcrumb.stories.ts'
 *
 * The name in the message is only the first entry of the generated import list,
 * so every section of the sidebar looks broken. `npm run build-storybook` is
 * unaffected.
 *
 * ## Mechanism
 *
 * The dev server never imports the story files directly. Storybook writes a
 * virtual module (`storybook-stories.js`) holding one dynamic import per
 * `stories` glob — `toImportFn` in `@storybook/core-webpack`:
 *
 *   async (path) => import(
 *     // webpackInclude: /(?!.*node_modules)(?:\/src\/...\.stories\.(js|ts))$/
 *     './src/' + pathRemainder
 *   );
 *
 * Webpack turns that partial expression into a *context module* and applies
 * `webpackInclude` as the context's `include` filter. `ContextModuleFactory`
 * then tests the filter against an absolute path it assembles with `path.join`:
 *
 *   const subResource = join(fs, directory, segment);
 *   ... stat.isFile() && (!include || include.test(subResource))
 *
 * On Windows `subResource` is `D:\…\src\docs\Conventions.mdx`, while the regex
 * Storybook generates (`webpackIncludeRegexp`) is built from a forward-slash
 * glob and only accepts `/src/…`. Nothing matches, the context map comes out
 * empty, and every `import()` rejects at *runtime* with the context-relative
 * key webpack could not find — the message quoted above.
 *
 * Measured against this repo: the generated filter admits 12 MDX + 11 story
 * files (23) on POSIX and **0 of 143** files on Windows. Those 23 are exactly
 * the 23 `importPath` values in the static `storybook-static/index.json`.
 *
 * `build-storybook` never creates the virtual module, so it never builds a
 * context and never runs the filter — that is why only the dev server breaks,
 * and why the static build stayed green while every story failed at runtime.
 *
 * ## Fix
 *
 * Widen every separator in the filter to `[\\/]`. This only ever *adds*
 * matches: on POSIX no path contains a backslash, so the same 23 files still
 * match; on Windows the backslash paths now match too. It is applied on every
 * platform rather than behind a `process.platform` check so that local and CI
 * runs exercise one code path.
 *
 * Remove this file once Storybook fixes `webpackIncludeRegexp` upstream.
 * `11.0.0-alpha.6` is the newest published version, so there is nothing to
 * upgrade to today.
 */
const PLUGIN_NAME = 'backoffice-storybook-context-include-fix';

/**
 * Accepts `\` as well as `/` wherever the filter expects a separator.
 *
 * These regexes come from `globToRegexp`, so every separator is an escaped `/`
 * (`\/`). `[^/]` inside a character class is deliberately left alone: it is a
 * "rest of the path" wildcard and must keep matching Windows separators too.
 */
function widenPathSeparators(include: RegExp): RegExp {
  return new RegExp(include.source.replace(/\\\//g, '[\\\\/]'), include.flags);
}

/**
 * Adds the missing separator tolerance to Storybook's `webpackInclude`
 * filters. See the file header for the full story.
 */
export function contextIncludeSeparatorFix(): { apply(compiler: Compiler): void } {
  return {
    apply(compiler: Compiler): void {
      compiler.hooks.compilation.tap(PLUGIN_NAME, (_compilation, { contextModuleFactory }) => {
        contextModuleFactory.hooks.afterResolve.tap(PLUGIN_NAME, (data) => {
          if (data.include instanceof RegExp) {
            data.include = widenPathSeparators(data.include);
          }

          // `afterResolve` is an AsyncSeriesWaterfallHook: returning the data
          // keeps it. Returning nothing would make webpack treat the context
          // module as ignored and drop every story.
          return data;
        });
      });
    },
  };
}
