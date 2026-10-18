/**
 * Shape of the runtime configuration.
 *
 * Every environment file is checked with `satisfies Environment`, so a missing
 * or misspelled key is a compile error rather than a runtime `undefined` that
 * only shows up as a broken request in the browser.
 *
 * Nothing secret belongs here. These files ship to the client verbatim, so
 * anything added is public by definition.
 */
export interface Environment {
  /** Angular's own build flag — true only in the production bundle. */
  readonly production: boolean;

  /** Root of the back office API. All endpoints live under `/api/v1`. */
  readonly API_BASE_URL: string;

  /** Shown in the browser title and the header. */
  readonly APP_NAME: string;

  /**
   * Root of the shop front. The topbar's «بازگشت به سایت» opens it in a new
   * tab, which is why it is an absolute URL and not a route of this app: the
   * panel is a separate deployment, so a relative value would navigate inside
   * the admin panel instead (BO-B06).
   */
  readonly SITE_URL: string;

  /** localStorage key holding the access token. */
  readonly TOKEN_STORAGE_KEY: string;

  /** Default rows per page for every p-table in the app. */
  readonly DEFAULT_PAGE_SIZE: number;

  /**
   * When true the mock interceptor answers instead of the network.
   * Dev only — must stay false in environment.prod.ts, which is what keeps the
   * fixtures out of the production bundle.
   */
  readonly useMockApi: boolean;

  /** Simulated response delay in ms, so loading and skeleton states are visible. */
  readonly mockDelayMs: number;
}
