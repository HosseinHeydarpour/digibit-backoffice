import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import { ApiError } from '@shared/models';
import type { ApiResponse, Page } from '@shared/models';
import { Observable, catchError, map, throwError } from 'rxjs';

/** Anything HttpParams accepts as a value. */
export type QueryValue = string | number | boolean | null | undefined;

/**
 * Sent on every request. Angular does not set `Accept` itself, so without this
 * a server doing content negotiation could answer with HTML instead of JSON.
 */
const JSON_HEADERS = new HttpHeaders({ Accept: 'application/json' });

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.API_BASE_URL;

  get<T>(path: string, params?: Record<string, QueryValue>): Observable<T> {
    return this.http
      .get<ApiResponse<T>>(this.url(path), {
        params: toHttpParams(params),
        headers: JSON_HEADERS,
      })
      .pipe(map(unwrap), catchError(toApiError));
  }

  /** GET a list endpoint and flatten envelope + meta into a `Page<T>`. */
  getPage<T>(path: string, params?: Record<string, QueryValue>): Observable<Page<T>> {
    return this.http
      .get<ApiResponse<T[]>>(this.url(path), {
        params: toHttpParams(params),
        headers: JSON_HEADERS,
      })
      .pipe(map(toPage), catchError(toApiError));
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .post<ApiResponse<T>>(this.url(path), body, { headers: JSON_HEADERS })
      .pipe(map(unwrap), catchError(toApiError));
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .put<ApiResponse<T>>(this.url(path), body, { headers: JSON_HEADERS })
      .pipe(map(unwrap), catchError(toApiError));
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .patch<ApiResponse<T>>(this.url(path), body, { headers: JSON_HEADERS })
      .pipe(map(unwrap), catchError(toApiError));
  }

  delete<T>(path: string): Observable<T> {
    return this.http
      .delete<ApiResponse<T>>(this.url(path), { headers: JSON_HEADERS })
      .pipe(map(unwrap), catchError(toApiError));
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
 */
export function toHttpParams(params?: Record<string, QueryValue>): HttpParams | undefined {
  if (!params) return undefined;

  let httpParams = new HttpParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue;
    httpParams = httpParams.set(key, String(value));
  }
  return httpParams;
}

/** Normalise any failure into an ApiError so callers only handle one type. */
function toApiError(error: unknown): Observable<never> {
  // Already normalised — e.g. `unwrap()` rejects a malformed body. Re-wrapping it
  // here would erase the specific code and downgrade it to UNKNOWN.
  if (error instanceof ApiError) {
    return throwError(() => error);
  }

  if (error instanceof HttpErrorResponse) {
    // status 0 = network down / CORS / request blocked, not a server response.
    if (error.status === 0) {
      return throwError(() => new ApiError('NETWORK', 'ارتباط با سرور برقرار نشد.', 0));
    }
    const body = error.error as {
      error?: { code?: string; message?: string; fields?: Record<string, string[]> };
    } | null;
    return throwError(
      () =>
        new ApiError(
          body?.error?.code ?? 'HTTP_' + error.status,
          body?.error?.message ?? 'خطای نامشخص در ارتباط با سرور.',
          error.status,
          body?.error?.fields,
        ),
    );
  }
  // Non-HTTP failure (e.g. a JSON parse error thrown by map()).
  return throwError(() => new ApiError('UNKNOWN', 'خطای غیرمنتظره رخ داد.', -1));
}
