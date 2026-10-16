import { HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { mockHeaders } from '@core/mock/mock-headers';
import { mockInterceptor } from '@core/mock/mock-interceptor';
import { environment } from '@env/environment';
import { ApiError } from '@shared/models';

import { ApiService, toHttpParams } from './api';

interface Product {
  id: string;
  name: string;
}

describe('ApiService', () => {
  let api: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('uses the base URL from the environment', () => {
    api.get<Product>('/products/1').subscribe();
    const req = httpMock.expectOne(`${environment.API_BASE_URL}/products/1`);
    expect(req.request.url).toContain('/api/v1');
    req.flush({ data: { id: '1', name: 'x' } });
  });

  it('unwraps the data field', () => {
    let result: Product | undefined;
    api.get<Product>('/products/1').subscribe((r) => (result = r));

    httpMock
      .expectOne(`${environment.API_BASE_URL}/products/1`)
      .flush({ data: { id: 'p1', name: 'کیف' }, meta: undefined, message: 'ok' });

    expect(result).toEqual({ id: 'p1', name: 'کیف' });
  });

  it('sends Accept: application/json', () => {
    api.get<Product>('/products/1').subscribe();
    const req = httpMock.expectOne(`${environment.API_BASE_URL}/products/1`);
    expect(req.request.headers.get('Accept')).toBe('application/json');
    req.flush({ data: { id: '1', name: 'x' } });
  });

  it('serialises query params and drops empty ones', () => {
    api
      .getPage<Product>('/products', {
        query: 'کیف',
        page: 1,
        pageSize: 20,
        brandId: null,
        status: '',
        active: true,
      })
      .subscribe();

    const req = httpMock.expectOne((r) => r.url.endsWith('/products'));
    expect(req.request.params.get('query')).toBe('کیف');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('active')).toBe('true');
    expect(req.request.params.has('brandId')).toBe(false);
    expect(req.request.params.has('status')).toBe(false);
    req.flush({ data: [], meta: { page: 1, pageSize: 20, total: 0 } });
  });

  it('flattens the envelope and meta into a Page', () => {
    let page: { items: Product[]; total: number; page: number; pageSize: number } | undefined;
    api.getPage<Product>('/products').subscribe((p) => (page = p));

    httpMock
      .expectOne((r) => r.url.endsWith('/products'))
      .flush({
        data: [
          { id: '1', name: 'a' },
          { id: '2', name: 'b' },
        ],
        meta: { page: 2, pageSize: 20, total: 137 },
      });

    expect(page?.items.length).toBe(2);
    expect(page?.total).toBe(137);
    expect(page?.page).toBe(2);
    expect(page?.pageSize).toBe(20);
  });

  it('falls back to defaults when meta is missing', () => {
    let page: { total: number; page: number; pageSize: number } | undefined;
    api.getPage<Product>('/products').subscribe((p) => (page = p));

    httpMock
      .expectOne((r) => r.url.endsWith('/products'))
      .flush({ data: [{ id: '1', name: 'a' }] });

    expect(page?.total).toBe(1);
    expect(page?.page).toBe(1);
    expect(page?.pageSize).toBe(environment.DEFAULT_PAGE_SIZE);
  });

  it('maps an error envelope to ApiError with fields', () => {
    let error: ApiError | undefined;
    api.post<Product>('/products', {}).subscribe({ error: (e) => (error = e) });

    httpMock
      .expectOne((r) => r.url.endsWith('/products'))
      .flush(
        { error: { code: 'VALIDATION', message: 'داده نامعتبر', fields: { name: ['الزامی'] } } },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(error).toBeInstanceOf(ApiError);
    expect(error?.code).toBe('VALIDATION');
    expect(error?.status).toBe(400);
    expect(error?.fieldError('name')).toBe('الزامی');
    expect(error?.isValidation).toBe(true);
  });

  it('maps a network failure (status 0) to ApiError', () => {
    let error: ApiError | undefined;
    api.get<Product>('/products/1').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${environment.API_BASE_URL}/products/1`).error(new ProgressEvent('error'));

    expect(error?.code).toBe('NETWORK');
    expect(error?.status).toBe(0);
  });

  it('rejects a malformed (non-envelope) response', () => {
    let error: ApiError | undefined;
    api.get<Product>('/products/1').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${environment.API_BASE_URL}/products/1`).flush('<html>oops</html>');

    expect(error).toBeInstanceOf(ApiError);
    expect(error?.code).toBe('MALFORMED');
  });

  it('prefixes a path that omits the leading slash', () => {
    api.get<Product>('products/1').subscribe();
    httpMock
      .expectOne(`${environment.API_BASE_URL}/products/1`)
      .flush({ data: { id: '1', name: 'x' } });
  });
});

describe('ApiService ↔ mock backend contract', () => {
  /**
   * The mock interceptor only answers requests that carry `X-Mock: 1`, and
   * `ApiService` is the single place every feature service builds a request.
   * If these two ever drift apart, mock mode fails silently: requests quietly
   * go to a backend that does not exist yet and the UI looks broken for reasons
   * that have nothing to do with the UI. These tests pin that contract down.
   */
  let api: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([mockInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    api = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('attaches the mock header while useMockApi is on', () => {
    // Asserted on the builder rather than on a flushed request, because by the
    // time a request is observable the interceptor has already consumed the
    // header. This is the boundary ApiService relies on.
    expect(environment.useMockApi).toBe(true);
    expect(mockHeaders().get('X-Mock')).toBe('1');
  });

  it('sends no header once useMockApi is off', () => {
    const original = environment.useMockApi;
    Object.defineProperty(environment, 'useMockApi', { value: false, configurable: true });
    try {
      expect(mockHeaders().has('X-Mock')).toBe(false);
    } finally {
      Object.defineProperty(environment, 'useMockApi', { value: original, configurable: true });
    }
  });

  it('still carries Accept: application/json alongside the mock header', () => {
    // Adding X-Mock must not clobber the Accept header the real API needs.
    const headers = mockHeaders(new HttpHeaders({ Accept: 'application/json' }));
    expect(headers.get('Accept')).toBe('application/json');
    expect(headers.get('X-Mock')).toBe('1');
  });

  it('never reaches the network in mock mode', () => {
    // The whole point of C07: no request should be pending for the test to flush.
    api.getPage<Product>('/products').subscribe();
    expect(httpMock.match(() => true).length).toBe(0);
  });
});

describe('toHttpParams', () => {
  it('returns undefined when there is nothing to send', () => {
    expect(toHttpParams()).toBeUndefined();
  });

  it('skips null, undefined and empty strings', () => {
    const params = toHttpParams({ a: null, b: undefined, c: '', d: 'ok' });
    expect(params?.has('a')).toBe(false);
    expect(params?.has('b')).toBe(false);
    expect(params?.has('c')).toBe(false);
    expect(params?.get('d')).toBe('ok');
  });

  it('keeps falsy-but-meaningful values', () => {
    const params = toHttpParams({ zero: 0, no: false });
    expect(params?.get('zero')).toBe('0');
    expect(params?.get('no')).toBe('false');
  });
});
