import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Production stand-in for `mock.interceptor.ts`.
 *
 * `fileReplacements` in angular.json swaps this file in whenever the production
 * configuration is built. That is what actually keeps the interceptor and its
 * ~9 KB of fixtures out of the shipped bundle — a runtime `if (useMockApi)`
 * guard would still pull them in, because the bundler cannot know the flag is
 * constant while it is reading it from a mutable object.
 *
 * Exports the same names as the mock version so app.config.ts imports one path
 * and never branches on the environment.
 */
export const MOCK_HEADER = 'X-Mock';

/** Never registered — `useMockApi` is false in every production environment. */
export const mockInterceptor: HttpInterceptorFn = (req, next) => next(req);
