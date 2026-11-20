import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';

import type { Coupon, CouponInput } from '../models/coupon.model';

import { CouponsService, buildCouponQuery } from './coupons.service';

const COUPON: Coupon = {
  id: '1',
  code: 'WELCOME10',
  type: 'percent',
  value: 10,
  minCart: 0,
  maxUses: 1000,
  maxUsesPerUser: 1,
  usedCount: 120,
  from: 1_700_000_000_000,
  to: 1_900_000_000_000,
  description: 'تخفیف اولین خرید',
  isActive: true,
  createdAt: 1_700_000_000_000,
};

const INPUT: CouponInput = {
  code: 'NEW20',
  type: 'percent',
  value: 20,
  minCart: 500_000,
  maxUses: 100,
  maxUsesPerUser: 2,
  from: 1_700_000_000_000,
  to: 1_900_000_000_000,
  description: '',
};

describe('buildCouponQuery (BO-J01)', () => {
  it('serialises text, status and paging, trimming the text', () => {
    const params = buildCouponQuery({ query: ' OFF ', status: 'expired', page: 2, pageSize: 10 });

    expect(params.toString()).toBe('query=OFF&status=expired&page=2&pageSize=10');
  });

  it('drops an empty query, a missing status and non-positive paging', () => {
    expect(buildCouponQuery({ query: '  ', page: 0, pageSize: -1 }).toString()).toBe('');
  });
});

describe('CouponsService (BO-J01)', () => {
  let service: CouponsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CouponsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists coupons with the built query', async () => {
    const promise = firstValueFrom(service.list({ status: 'active', page: 2 }));

    const request = http.expectOne(
      (req) =>
        req.url === `${environment.API_BASE_URL}/coupons` &&
        req.params.get('status') === 'active' &&
        req.params.get('page') === '2',
    );

    request.flush({ data: [COUPON], meta: { page: 2, pageSize: 10, total: 11 }, message: '' });

    expect((await promise).total).toBe(11);
  });

  it('posts a new coupon', async () => {
    const promise = firstValueFrom(service.create(INPUT));

    const request = http.expectOne(`${environment.API_BASE_URL}/coupons`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      ...INPUT,
      from: new Date(INPUT.from).toISOString(),
      to: new Date(INPUT.to).toISOString(),
    });

    request.flush(
      { data: { ...COUPON, id: '13', code: 'NEW20' }, message: '' },
      { status: 201, statusText: 'Created' },
    );

    expect((await promise).id).toBe('13');
  });

  it('puts an edited coupon', async () => {
    const promise = firstValueFrom(service.update('1', INPUT));

    const request = http.expectOne(`${environment.API_BASE_URL}/coupons/1`);
    expect(request.request.method).toBe('PUT');

    request.flush({ data: { ...COUPON, ...INPUT }, message: '' });

    expect((await promise).code).toBe('NEW20');
  });

  it('patches the target status, not a flip', async () => {
    const promise = firstValueFrom(service.setStatus('1', false));

    const request = http.expectOne(`${environment.API_BASE_URL}/coupons/1/status`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ isActive: false });

    request.flush({ data: { ...COUPON, isActive: false }, message: '' });

    expect((await promise).isActive).toBe(false);
  });

  it('deletes and returns the server decision (BO-J06)', async () => {
    const promise = firstValueFrom(service.remove('1'));

    const request = http.expectOne(`${environment.API_BASE_URL}/coupons/1`);
    expect(request.request.method).toBe('DELETE');

    request.flush({
      data: { deleted: false, coupon: { ...COUPON, isActive: false } },
      message: '',
    });

    const result = await promise;

    expect(result.deleted).toBe(false);
    expect(result.coupon?.isActive).toBe(false);
  });
});
