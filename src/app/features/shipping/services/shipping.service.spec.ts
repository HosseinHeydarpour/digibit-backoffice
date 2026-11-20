import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';

import type { ShippingMethod, ShippingMethodInput } from '../models/shipping-method.model';

import { ShippingService } from './shipping.service';

const METHOD: ShippingMethod = {
  id: '1',
  name: 'پست پیشتاز',
  cost: 45_000,
  freeFrom: 1_000_000,
  minDays: 2,
  maxDays: 4,
  isDefault: false,
  isActive: true,
  order: 1,
};

const INPUT: ShippingMethodInput = {
  name: 'پیک تهران',
  cost: 85_000,
  freeFrom: null,
  minDays: 1,
  maxDays: 1,
};

describe('ShippingService (BO-K05)', () => {
  let service: ShippingService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ShippingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists the methods as one ordered array', async () => {
    const promise = firstValueFrom(service.list());

    http
      .expectOne(
        (request) =>
          request.url === `${environment.API_BASE_URL}/shipping-methods` &&
          request.params.get('includeInactive') === 'true',
      )
      .flush({ data: [METHOD], message: '' });

    expect((await promise).length).toBe(1);
  });

  it('posts a new method', async () => {
    const promise = firstValueFrom(service.create(INPUT));

    const request = http.expectOne(`${environment.API_BASE_URL}/shipping-methods`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(INPUT);

    request.flush(
      { data: { ...METHOD, ...INPUT, id: '7' }, message: '' },
      { status: 201, statusText: 'Created' },
    );

    expect((await promise).id).toBe('7');
  });

  it('puts an edited method', async () => {
    const promise = firstValueFrom(service.update('1', INPUT));

    const request = http.expectOne(`${environment.API_BASE_URL}/shipping-methods/1`);
    expect(request.request.method).toBe('PUT');

    request.flush({ data: { ...METHOD, ...INPUT }, message: '' });

    expect((await promise).name).toBe('پیک تهران');
  });

  it('deletes and returns the server decision', async () => {
    const promise = firstValueFrom(service.remove('1'));

    const request = http.expectOne(`${environment.API_BASE_URL}/shipping-methods/1`);
    expect(request.request.method).toBe('DELETE');

    request.flush({
      data: { deleted: false, method: { ...METHOD, isActive: false } },
      message: '',
    });

    expect((await promise).deleted).toBe(false);
  });

  it('patches the target status and the default flag', async () => {
    const status = firstValueFrom(service.setStatus('1', false));

    const statusRequest = http.expectOne(`${environment.API_BASE_URL}/shipping-methods/1/status`);
    expect(statusRequest.request.body).toEqual({ isActive: false });
    statusRequest.flush({ data: { ...METHOD, isActive: false }, message: '' });
    expect((await status).isActive).toBe(false);

    const defaultRequest = firstValueFrom(service.setDefault('1'));
    const req = http.expectOne(`${environment.API_BASE_URL}/shipping-methods/1/default`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ data: { ...METHOD, isDefault: true }, message: '' });
    expect((await defaultRequest).isDefault).toBe(true);
  });
});
