// src/app/core/interceptors/error-interceptor.spec.ts
//
// The interceptor is the boundary that decides whether a failure is worth
// interrupting the user for. What is asserted here is that decision — toast or
// stay quiet — plus the promise that it reports without swallowing: the caller
// still receives the same normalised error it would have received without it.
//
// `ToastService.error` is replaced by a recorder rather than `MessageService.add`,
// because the decision under test is "does this failure reach the toast", and the
// wording of the message is the service's business (toast.spec.ts).
//
// No `vi` anywhere, for the same reason as every other spec in this repo: only
// `vitest/globals` types are wired. A TestBed provider override records the calls
// just as well.

import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiService } from '@core/services/api';
import { ToastService } from '@core/services/toast';
import { ApiError } from '@shared/models';
import { MessageService } from 'primeng/api';

import { errorInterceptor } from './error-interceptor';

/** Records what the interceptor asked the toast to report. */
class RecordingToastService {
  readonly errors: string[] = [];

  error(summary: string): void {
    this.errors.push(summary);
  }
}

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let toast: RecordingToastService;

  beforeEach(() => {
    toast = new RecordingToastService();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        MessageService,
        // The spy is registered for the real service too, so a stray call to a
        // method the recorder does not implement fails loudly instead of
        // silently doing nothing.
        { provide: ToastService, useValue: toast },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('toasts the message the server sent when a request fails (tc 8)', () => {
    let error: ApiError | undefined;
    http.get('/api/v1/products').subscribe({ error: (e: ApiError) => (error = e) });

    httpMock
      .expectOne('/api/v1/products')
      .flush(
        { error: { code: 'SERVER', message: 'خطای غیرمنتظره در سرور.' } },
        { status: 500, statusText: 'Server Error' },
      );

    expect(toast.errors).toEqual(['خطای غیرمنتظره در سرور.']);

    // Reported, not swallowed: the caller gets the normalised error it would
    // have got with no interceptor registered.
    expect(error).toBeInstanceOf(ApiError);
    expect(error?.code).toBe('SERVER');
    expect(error?.status).toBe(500);
  });

  it('stays quiet for a validation error, which the form reports field by field (tc 8)', () => {
    http.post('/api/v1/products', {}).subscribe({ error: () => undefined });

    httpMock
      .expectOne('/api/v1/products')
      .flush(
        { error: { code: 'VALIDATION', message: 'داده نامعتبر', fields: { name: ['الزامی'] } } },
        { status: 400, statusText: 'Bad Request' },
      );

    // Toasting this as well would report the same failure twice, and the toast
    // copy cannot point at the field that has to be corrected.
    expect(toast.errors).toEqual([]);
  });

  it('toasts a failure that never reached the server (tc 8)', () => {
    http.get('/api/v1/products').subscribe({ error: () => undefined });

    httpMock.expectOne('/api/v1/products').error(new ProgressEvent('error'));

    expect(toast.errors).toEqual(['ارتباط با سرور برقرار نشد.']);
  });

  it('leaves a successful response alone', () => {
    http.get('/api/v1/products').subscribe();
    httpMock.expectOne('/api/v1/products').flush({ data: [] });

    expect(toast.errors).toEqual([]);
  });

  it('composes with ApiService, which normalises a second time without changing anything', () => {
    // The interceptor runs first and rethrows an ApiError; ApiService's own
    // `catchError` then sees an ApiError and passes it through. Two
    // normalisations of one failure must not produce two different errors.
    const api = TestBed.inject(ApiService);
    let error: ApiError | undefined;

    api.get('/products').subscribe({ error: (e: ApiError) => (error = e) });

    httpMock
      .expectOne((request) => request.url.endsWith('/products'))
      .flush(
        { error: { code: 'NOT_FOUND', message: 'محصول یافت نشد.' } },
        { status: 404, statusText: 'Not Found' },
      );

    expect(toast.errors).toEqual(['محصول یافت نشد.']);
    expect(error).toBeInstanceOf(ApiError);
    expect(error?.code).toBe('NOT_FOUND');
  });
});
