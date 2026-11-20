import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LoadingService } from '@core/services/loading';
import { firstValueFrom } from 'rxjs';

import { loadingInterceptor } from './loading-interceptor';

describe('loadingInterceptor (BO-C05)', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let loading: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([loadingInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    loading = TestBed.inject(LoadingService);
  });

  afterEach(() => http.verify());

  async function request(url: string): Promise<void> {
    const promise = firstValueFrom(client.get(url));
    const call = http.expectOne(url);

    expect(loading.active()).toBe(true);
    call.flush({ data: {} });

    await promise;
  }

  it('shows the bar for a normal request and hides it on success', async () => {
    await request('/api/v1/products');

    expect(loading.active()).toBe(false);
  });

  it('hides the bar on failure too', async () => {
    const promise = firstValueFrom(client.get('/api/v1/products'));
    const call = http.expectOne('/api/v1/products');

    expect(loading.active()).toBe(true);
    call.flush({ message: 'failed' }, { status: 500, statusText: 'err' });

    await promise.catch(() => null);
    expect(loading.active()).toBe(false);
  });

  it('does not show the bar for an auth request', async () => {
    const promise = firstValueFrom(client.post('/api/v1/auth/admin/login', {}));
    const call = http.expectOne('/api/v1/auth/admin/login');

    expect(loading.active()).toBe(false);
    call.flush({ data: {} });

    await promise;
  });
});
