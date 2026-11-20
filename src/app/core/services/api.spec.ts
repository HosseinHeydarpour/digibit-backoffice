import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import { ApiError } from '@shared/models';
import { firstValueFrom } from 'rxjs';

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

  it('maps a network failure (status 0) to ApiError after one retry', async () => {
    vi.useFakeTimers();
    try {
      const promise = firstValueFrom(api.get<Product>('/products/1'));

      httpMock
        .expectOne(`${environment.API_BASE_URL}/products/1`)
        .error(new ProgressEvent('error'));

      vi.advanceTimersByTime(800);

      httpMock
        .expectOne(`${environment.API_BASE_URL}/products/1`)
        .error(new ProgressEvent('error'));

      const error = await promise.catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ code: 'NETWORK', status: 0 });
    } finally {
      vi.useRealTimers();
    }
  });

  it('accepts a flat (non-envelope) response and a flat page', () => {
    let result: Product | undefined;
    let page: { items: Product[]; total: number } | undefined;

    api.get<Product>('/products/1').subscribe((r) => (result = r));
    httpMock.expectOne(`${environment.API_BASE_URL}/products/1`).flush({ id: '1', name: 'x' });

    api.getPage<Product>('/products').subscribe((p) => (page = p));
    httpMock
      .expectOne((r) => r.url.endsWith('/products'))
      .flush({ items: [{ id: '1', name: 'x' }], total: 1, page: 1, pageSize: 20 });

    expect(result).toEqual({ id: '1', name: 'x' });
    expect(page?.items.length).toBe(1);
    expect(page?.total).toBe(1);
  });

  it('maps a flat { message } error to ApiError', () => {
    let error: ApiError | undefined;
    api.post<Product>('/products', {}).subscribe({ error: (e) => (error = e) });

    httpMock
      .expectOne((r) => r.url.endsWith('/products'))
      .flush({ message: 'کد تکراری است.' }, { status: 409, statusText: 'Conflict' });

    expect(error).toBeInstanceOf(ApiError);
    expect(error?.status).toBe(409);
    expect(error?.message).toBe('کد تکراری است.');
  });

  it('prefixes a path that omits the leading slash', () => {
    api.get<Product>('products/1').subscribe();
    httpMock
      .expectOne(`${environment.API_BASE_URL}/products/1`)
      .flush({ data: { id: '1', name: 'x' } });
  });
  it('retries a transient GET once after a short pause (BO-C10)', async () => {
    vi.useFakeTimers();
    try {
      const promise = firstValueFrom(api.get<Product>('/products/1'));

      httpMock
        .expectOne(`${environment.API_BASE_URL}/products/1`)
        .flush({ message: 'boom' }, { status: 503, statusText: 'unavailable' });

      vi.advanceTimersByTime(800);

      httpMock.expectOne(`${environment.API_BASE_URL}/products/1`).flush({ id: '1', name: 'x' });

      await expect(promise).resolves.toEqual({ id: '1', name: 'x' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not retry a 4xx (BO-C10)', () => {
    let error: ApiError | undefined;
    api.get<Product>('/products/1').subscribe({ error: (e) => (error = e) });

    httpMock
      .expectOne(`${environment.API_BASE_URL}/products/1`)
      .flush({ message: 'missing' }, { status: 404, statusText: 'Not Found' });

    httpMock.expectNone(`${environment.API_BASE_URL}/products/1`);
    expect(error?.status).toBe(404);
  });

  it('does not retry a mutation (BO-C10)', () => {
    let error: ApiError | undefined;
    api.post<Product>('/products', {}).subscribe({ error: (e) => (error = e) });

    httpMock
      .expectOne(`${environment.API_BASE_URL}/products`)
      .flush({ message: 'boom' }, { status: 503, statusText: 'unavailable' });

    httpMock.expectNone(`${environment.API_BASE_URL}/products`);
    expect(error?.status).toBe(503);
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
