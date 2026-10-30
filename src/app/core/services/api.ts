import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { mockHeaders } from '@core/mock/mock-headers';
import { environment } from '@env/environment';
import { ApiError } from '@shared/models';
import type { ApiResponse, Page } from '@shared/models';
import { Observable, catchError, map, throwError } from 'rxjs';

/** Anything HttpParams accepts as a value. */
export type QueryValue = string | number | boolean | null | undefined;

/**
 * A query can arrive as a plain record (the common case) or as an already-built
 * `HttpParams`. The second form exists for feature-level builders such as
 * `buildQuery` in the products service, which own the "drop empty values" rule
 * themselves; re-encoding their result through a record would lose that rule.
 */
export type QueryParams = Record<string, QueryValue> | HttpParams;

/**
 * Sent on every request. Angular does not set `Accept` itself, so without this
 * a server doing content negotiation could answer with HTML instead of JSON.
 *
 * `mockHeaders()` layers `X-Mock: 1` on top while `environment.useMockApi` is
 * true, which is what makes the mock interceptor answer instead of the network.
 * Doing it here — at the single place every request is built — means no feature
 * service has to know whether a backend exists yet.
 */
const JSON_HEADERS = mockHeaders(new HttpHeaders({ Accept: 'application/json' }));

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.API_BASE_URL;

  get<T>(path: string, params?: QueryParams): Observable<T> {
    return this.http
      .get<ApiResponse<T>>(this.url(path), {
        params: toHttpParams(params),
        headers: JSON_HEADERS,
      })
      .pipe(map(unwrap), catchError(throwApiError));
  }

  /** GET a list endpoint and flatten envelope + meta into a `Page<T>`. */
  getPage<T>(path: string, params?: QueryParams): Observable<Page<T>> {
    return this.http
      .get<ApiResponse<T[]>>(this.url(path), {
        params: toHttpParams(params),
        headers: JSON_HEADERS,
      })
      .pipe(map(toPage), catchError(throwApiError));
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .post<ApiResponse<T>>(this.url(path), body, { headers: JSON_HEADERS })
      .pipe(map(unwrap), catchError(throwApiError));
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .put<ApiResponse<T>>(this.url(path), body, { headers: JSON_HEADERS })
      .pipe(map(unwrap), catchError(throwApiError));
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .patch<ApiResponse<T>>(this.url(path), body, { headers: JSON_HEADERS })
      .pipe(map(unwrap), catchError(throwApiError));
  }

  /**
   * DELETE, with an optional query.
   *
   * The query is not decorative: a delete often carries a MODE rather than a
   * body (`?strategy=transfer` on a category), and a body on a DELETE is legal
   * but dropped by some proxies. Same shape as `get`, so a caller never builds a
   * URL by hand.
   */
  delete<T>(path: string, params?: QueryParams): Observable<T> {
    return this.http
      .delete<ApiResponse<T>>(this.url(path), {
        params: toHttpParams(params),
        headers: JSON_HEADERS,
      })
      .pipe(map(unwrap), catchError(throwApiError));
  }

  private url(path: string): string {
    // Tolerate both '/products' and 'products' from callers.
    return `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }
}

function unwrap<T>(response: ApiResponse<T>): T {
  if (response === null || typeof response !== 'object' || !('data' in response)) {
    throw new ApiError('MALFORMED', 'پاسخ سرور قابل خواندن نبود.', 200);
  }
  return response.data;
}

function toPage<T>(response: ApiResponse<T[]>): Page<T> {
  return {
    items: response.data ?? [],
    total: response.meta?.total ?? response.data?.length ?? 0,
    page: response.meta?.page ?? 1,
    pageSize: response.meta?.pageSize ?? environment.DEFAULT_PAGE_SIZE,
  };
}

/**
 * Build HttpParams, dropping null/undefined/empty so a cleared filter is
 * genuinely absent from the URL rather than sent as `?query=`.
 *
 * An `HttpParams` argument is returned as-is: a feature builder that already
 * produced one (see `QueryParams`) has applied the same rule with more context,
 * and copying it through a record would be lossy.
 */
export function toHttpParams(params?: QueryParams): HttpParams | undefined {
  if (!params) return undefined;
  if (params instanceof HttpParams) return params;

  let httpParams = new HttpParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue;
    httpParams = httpParams.set(key, String(value));
  }
  return httpParams;
}

/**
 * Normalise any failure into an ApiError so callers only handle one type.
 *
 * Exported because the error interceptor (BO-B12) has to report the very same
 * message the caller receives: the corner of the screen and an inline error must
 * not disagree about one failure, and a second copy of this rule would drift.
 */
export function toApiError(error: unknown): ApiError {
  // Already normalised — e.g. `unwrap()` rejects a malformed body, or the error
  // interceptor has already been through here. Re-wrapping it would erase the
  // specific code and downgrade it to UNKNOWN.
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof HttpErrorResponse) {
    // status 0 = network down / CORS / request blocked, not a server response.
    if (error.status === 0) {
      return new ApiError('NETWORK', 'ارتباط با سرور برقرار نشد.', 0);
    }
    const body = error.error as {
      error?: { code?: string; message?: string; fields?: Record<string, string[]> };
    } | null;
    return new ApiError(
      body?.error?.code ?? 'HTTP_' + error.status,
      body?.error?.message ?? 'خطای نامشخص در ارتباط با سرور.',
      error.status,
      body?.error?.fields,
    );
  }
  // Non-HTTP failure (e.g. a JSON parse error thrown by map()).
  return new ApiError('UNKNOWN', 'خطای غیرمنتظره رخ داد.', -1);
}

/** `catchError` handler: throws the normalised error rather than returning it. */
function throwApiError(error: unknown): Observable<never> {
  return throwError(() => toApiError(error));
}
