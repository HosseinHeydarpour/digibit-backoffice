import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { environment } from '@env/environment';
import type { PageMeta } from '@shared/models';
import { delay, of, throwError } from 'rxjs';

import * as fixtures from './fixtures';

/** Header a caller sets to opt a request into mocking. */
export const MOCK_HEADER = 'X-Mock';

interface MockResolution {
  body: unknown;
  status: number;
}

/** Anything with a `.get()` — `HttpParams` satisfies this, so does a Map. */
interface ParamReader {
  get(key: string): string | null;
}

/**
 * Answers requests from local fixtures instead of the network.
 *
 * Registered in app.config.ts only when `environment.useMockApi` is true, which is
 * what keeps this file and its fixtures out of the production bundle.
 *
 * Returns `null` from the resolver when it does not recognise the URL, in which
 * case the request passes through to the real backend untouched.
 */
export const mockInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.headers.get(MOCK_HEADER) !== '1') {
    return next(req);
  }

  const resolved = resolve(req.method, req.url, req.params);
  if (!resolved) {
    return next(req);
  }

  const delayMs = environment.mockDelayMs;

  if (resolved.status >= 400) {
    return throwError(
      () =>
        new HttpErrorResponse({
          status: resolved.status,
          statusText: 'Mocked Error',
          url: req.url,
          error: resolved.body,
        }),
    ).pipe(delay(delayMs));
  }

  return of(new HttpResponse({ status: resolved.status, body: resolved.body, url: req.url })).pipe(
    delay(delayMs),
  );
};

/** `/api/v1/products/12` → ['products', '12'] — strips the base URL and query. */
function segments(url: string): string[] {
  const path = url.split('?')[0].replace(/^https?:\/\/[^/]+/, '');
  return path
    .replace(/^\/api\/v1\/?/, '')
    .split('/')
    .filter(Boolean);
}

/**
 * Paginate a list exactly the way the real API does, honouring page/pageSize and
 * returning the envelope shape from ARCHITECTURE.md §4.
 */
function paginate<T>(items: T[], page: number, pageSize: number): { data: T[]; meta: PageMeta } {
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    meta: { page, pageSize, total: items.length },
  };
}

function num(params: ParamReader, key: string, fallback: number): number {
  const raw = params.get(key);
  const parsed = raw === null ? NaN : Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Test-only escape hatch: `?__mockStatus=500` forces an error response. */
function forcedStatus(params: ParamReader): number | null {
  const raw = params.get('__mockStatus');
  const parsed = raw === null ? NaN : Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Matches an item by id across fixtures whose ids are typed differently.
 * Local `find` callbacks stay typed without widening every fixture to `any`.
 */
function byId<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

function resolve(method: string, url: string, params: ParamReader): MockResolution | null {
  const status = forcedStatus(params);
  // Four segments are destructured so a future `/x/:id/:sub` route needs no change.
  const [module, id, sub] = segments(url);
  void sub;
  const page = num(params, 'page', 1);
  const pageSize = num(params, 'pageSize', environment.DEFAULT_PAGE_SIZE);

  const list = (items: unknown[]): MockResolution => ({
    status: 200,
    body: { ...paginate(items, page, pageSize), message: '' },
  });

  const single = (item: unknown): MockResolution => ({
    status: 200,
    body: { data: item, message: '' },
  });

  const notFound: MockResolution = {
    status: 404,
    body: { error: { code: 'NOT_FOUND', message: 'موردی با این شناسه یافت نشد.' } },
  };

  // A forced status simulates a failure before any routing happens.
  if (status !== null) {
    return {
      status,
      body: { error: { code: 'MOCK_ERROR', message: `خطای شبیه‌سازی‌شده ${status}` } },
    };
  }

  switch (module) {
    case 'dashboard':
      if (id === 'summary') return single(fixtures.MOCK_DASHBOARD_SUMMARY);
      if (id === 'sales-chart') return single(fixtures.MOCK_SALES_CHART);
      if (id === 'recent-orders') return list(fixtures.MOCK_ORDERS.slice(0, 8));
      if (id === 'low-stock') return list(fixtures.MOCK_LOW_STOCK);
      return notFound;

    case 'products': {
      if (!id) return list(fixtures.MOCK_PRODUCTS);
      // `new` and every write verb echo a sample row so form screens have something to bind.
      if (id === 'new' || method !== 'GET') return single(fixtures.MOCK_PRODUCTS[0]);
      const found = byId(fixtures.MOCK_PRODUCTS, id);
      return found ? single(found) : notFound;
    }

    case 'categories':
      return list(fixtures.MOCK_CATEGORIES);
    case 'brands':
      return list(fixtures.MOCK_BRANDS);
    case 'coupons':
      return list(fixtures.MOCK_COUPONS);
    case 'shipping-methods':
      return list(fixtures.MOCK_SHIPPING_METHODS);
    case 'banners':
      return list(fixtures.MOCK_BANNERS);

    case 'orders': {
      if (!id) return list(fixtures.MOCK_ORDERS);
      const found = byId(fixtures.MOCK_ORDERS, id);
      return found ? single(found) : notFound;
    }

    case 'customers': {
      if (!id) return list(fixtures.MOCK_CUSTOMERS);
      const found = byId(fixtures.MOCK_CUSTOMERS, id);
      return found ? single(found) : notFound;
    }

    case 'comments':
      return list(fixtures.MOCK_COMMENTS);

    case 'tickets': {
      if (!id) return list(fixtures.MOCK_TICKETS);
      const found = byId(fixtures.MOCK_TICKETS, id);
      return found ? single(found) : notFound;
    }

    case 'settings':
      return single(fixtures.MOCK_SETTINGS);

    default:
      return null; // unrecognised → pass through to the real backend
  }
}
