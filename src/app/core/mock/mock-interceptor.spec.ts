import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import type { ApiResponse, PageMeta } from '@shared/models';
import { catchError, firstValueFrom, of } from 'rxjs';

import { MOCK_HEADER, mockInterceptor } from './mock-interceptor';

describe('mockInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([mockInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('answers from fixtures when X-Mock: 1 is set', async () => {
    const body = await firstValueFrom(
      http.get<ApiResponse<unknown[]>>('/api/v1/products', { headers: { [MOCK_HEADER]: '1' } }),
    );

    // no httpMock.expectOne — nothing reached the network
    expect(body.data.length).toBe(20);
  });

  it('passes through to the network without the header', () => {
    http.get('/api/v1/products').subscribe();
    const req = httpMock.expectOne('/api/v1/products');
    expect(req.request.headers.has(MOCK_HEADER)).toBe(false);
    req.flush({ data: [] });
  });

  it('returns the real envelope shape', async () => {
    const body = await firstValueFrom(
      http.get<ApiResponse<unknown[]>>('/api/v1/products', { headers: { [MOCK_HEADER]: '1' } }),
    );

    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('meta');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.message).toBe('');
  });

  it('paginates using page and pageSize', async () => {
    const body = await firstValueFrom(
      http.get<ApiResponse<unknown[]>>('/api/v1/products', {
        headers: { [MOCK_HEADER]: '1' },
        params: { page: 2, pageSize: 5 },
      }),
    );

    const meta = body.meta as PageMeta;
    expect(body.data.length).toBe(5);
    expect(meta.page).toBe(2);
    expect(meta.pageSize).toBe(5);
    expect(meta.total).toBe(20);
  });

  it('filters products by Persian name and by Latin SKU (BO-F03 tc 1, tc 10)', async () => {
    const byName = await firstValueFrom(
      http.get<ApiResponse<{ name: string }[]>>('/api/v1/products', {
        headers: { [MOCK_HEADER]: '1' },
        params: { query: 'هدفون' },
      }),
    );

    expect(byName.data).toHaveLength(1);
    expect(byName.data[0].name).toContain('هدفون');

    const bySku = await firstValueFrom(
      http.get<ApiResponse<{ sku: string }[]>>('/api/v1/products', {
        headers: { [MOCK_HEADER]: '1' },
        params: { query: 'SKU-1004' },
      }),
    );

    expect(bySku.data).toHaveLength(1);
    expect(bySku.data[0].sku).toBe('SKU-1004');
  });

  it('combines category and status filters (BO-F03 tc 3, tc 4)', async () => {
    const body = await firstValueFrom(
      http.get<ApiResponse<{ categoryId: string; status: string }[]>>('/api/v1/products', {
        headers: { [MOCK_HEADER]: '1' },
        params: { categoryId: '4', status: 'inactive' },
      }),
    );

    expect(body.data.length).toBeGreaterThan(0);
    for (const row of body.data) {
      expect(row.categoryId).toBe('4');
      expect(row.status).toBe('inactive');
    }
  });

  it('applies the configured artificial delay', async () => {
    // A loading state is only trustworthy if the response is genuinely async.
    // Awaiting the observable proves the delay elapses instead of resolving inline.
    const started = performance.now();
    await firstValueFrom(http.get('/api/v1/products', { headers: { [MOCK_HEADER]: '1' } }));
    const elapsed = performance.now() - started;

    expect(elapsed).toBeGreaterThanOrEqual(environment.mockDelayMs * 0.5);
  });

  it('simulates a 500 with __mockStatus', async () => {
    const error = await firstValueFrom(
      http
        .get<HttpErrorResponse>('/api/v1/products', {
          headers: { [MOCK_HEADER]: '1' },
          params: { __mockStatus: 500 },
        })
        .pipe(catchError((e) => of<HttpErrorResponse>(e as HttpErrorResponse))),
    );

    expect(error.status).toBe(500);
  });

  it('returns 404 for an unknown id', async () => {
    const error = await firstValueFrom(
      http
        .get<HttpErrorResponse>('/api/v1/products/does-not-exist', {
          headers: { [MOCK_HEADER]: '1' },
        })
        .pipe(catchError((e) => of<HttpErrorResponse>(e as HttpErrorResponse))),
    );

    expect(error.status).toBe(404);
  });

  it('serves every one of the 12 modules', async () => {
    const urls = [
      '/api/v1/dashboard/summary',
      '/api/v1/products',
      '/api/v1/categories',
      '/api/v1/brands',
      '/api/v1/orders',
      '/api/v1/customers',
      '/api/v1/coupons',
      '/api/v1/shipping-methods',
      '/api/v1/banners',
      '/api/v1/settings',
      '/api/v1/comments',
      '/api/v1/tickets',
    ];

    for (const url of urls) {
      // Rejects on 404, which is what makes this a real assertion rather than
      // a check that the value is merely non-undefined.
      const result = await firstValueFrom(
        http.get<ApiResponse<unknown>>(url, { headers: { [MOCK_HEADER]: '1' } }),
      );
      expect(result, url).toBeDefined();
    }
  });

  it('leaves an unrecognised url to the network', () => {
    http.get('/api/v1/unknown-module', { headers: { [MOCK_HEADER]: '1' } }).subscribe();
    httpMock.expectOne('/api/v1/unknown-module').flush({ data: [] });
  });
});
