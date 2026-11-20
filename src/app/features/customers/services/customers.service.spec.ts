import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import { ApiError } from '@shared/models';
import { firstValueFrom } from 'rxjs';

import type { Customer, CustomerListItem } from '../models/customer.model';

import { CustomersService, RECENT_ORDERS_LIMIT, buildCustomerQuery } from './customers.service';

const LIST_ITEM: CustomerListItem = {
  id: '3',
  fullName: 'مریم حسینی',
  phone: '09121000003',
  email: 'customer3@example.com',
  status: 'active',
  orderCount: 4,
  totalSpent: 7_600_000,
  createdAt: 1_728_000_000_000,
};

const CUSTOMER: Customer = {
  ...LIST_ITEM,
  addresses: [
    {
      id: '3-1',
      title: 'خانه',
      province: 'تهران',
      city: 'تهران',
      street: 'خیابان ولیعصر، پلاک ۱۲',
      postalCode: '1234567890',
      receiver: 'مریم حسینی',
      phone: '09121000003',
      isDefault: true,
    },
  ],
};

describe('buildCustomerQuery (BO-I04)', () => {
  it('serialises text, status, paging and sort into the exact query string', () => {
    const params = buildCustomerQuery({
      query: '  مریم  ',
      status: 'blocked',
      page: 2,
      pageSize: 10,
      sort: 'createdAt',
      dir: 'desc',
    });

    expect(params.toString()).toBe(
      'query=%D9%85%D8%B1%DB%8C%D9%85&status=blocked&page=2&pageSize=10&sort=createdAt&dir=desc',
    );
  });

  it('drops empty text, a missing status, non-positive paging and a bare direction', () => {
    const params = buildCustomerQuery({ query: '   ', page: 0, pageSize: -1, dir: 'desc' });

    expect(params.toString()).toBe('');
  });
});

describe('CustomersService (BO-I04)', () => {
  let service: CustomersService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CustomersService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists customers with the built query and unwraps the page envelope', async () => {
    const promise = firstValueFrom(service.list({ query: 'مریم', status: 'active', page: 2 }));

    const request = http.expectOne(
      (req) =>
        req.url === `${environment.API_BASE_URL}/customers` &&
        req.params.get('query') === 'مریم' &&
        req.params.get('status') === 'active' &&
        req.params.get('page') === '2',
    );
    expect(request.request.method).toBe('GET');

    request.flush({
      data: [LIST_ITEM],
      meta: { page: 2, pageSize: 20, total: 21 },
      message: '',
    });

    const page = await promise;
    expect(page.items).toEqual([LIST_ITEM]);
    expect(page.total).toBe(21);
  });

  it('gets one customer with their addresses', async () => {
    const promise = firstValueFrom(service.get('3'));

    http
      .expectOne(`${environment.API_BASE_URL}/customers/3`)
      .flush({ data: CUSTOMER, message: '' });

    expect((await promise).addresses.length).toBe(1);
  });

  it('asks /orders for the profile with customerId, newest first', async () => {
    const promise = firstValueFrom(service.lastOrders('3'));

    const request = http.expectOne(
      (req) =>
        req.url === `${environment.API_BASE_URL}/orders` &&
        req.params.get('customerId') === '3' &&
        req.params.get('pageSize') === String(RECENT_ORDERS_LIMIT) &&
        req.params.get('sort') === 'createdAt' &&
        req.params.get('dir') === 'desc',
    );

    request.flush({ data: [], meta: { page: 1, pageSize: 5, total: 0 }, message: '' });

    expect((await promise).total).toBe(0);
  });

  it('sends the target status, not a flip instruction', async () => {
    const promise = firstValueFrom(service.setStatus('3', true));

    const request = http.expectOne(`${environment.API_BASE_URL}/customers/3/status`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ blocked: true });

    request.flush({ data: { ...CUSTOMER, status: 'blocked' }, message: '' });

    expect((await promise).status).toBe('blocked');
  });

  it('turns a 404 into an ApiError that carries the status', async () => {
    const promise = firstValueFrom(service.get('9999'));

    http
      .expectOne(`${environment.API_BASE_URL}/customers/9999`)
      .flush(
        { error: { code: 'NOT_FOUND', message: 'کاربری با این شناسه دریافت نشد.' } },
        { status: 404, statusText: 'Not Found' },
      );

    const error = await promise.catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404 });
  });

  it('turns a network failure into a NETWORK ApiError', async () => {
    vi.useFakeTimers();
    try {
      const promise = firstValueFrom(service.get('3'));

      http.expectOne(`${environment.API_BASE_URL}/customers/3`).error(new ProgressEvent('error'));
      vi.advanceTimersByTime(800);
      http.expectOne(`${environment.API_BASE_URL}/customers/3`).error(new ProgressEvent('error'));

      await expect(promise).rejects.toMatchObject({ code: 'NETWORK', status: 0 });
    } finally {
      vi.useRealTimers();
    }
  });
});
