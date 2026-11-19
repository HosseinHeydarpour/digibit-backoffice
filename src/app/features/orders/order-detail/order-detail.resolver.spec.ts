import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter, RedirectCommand, Router } from '@angular/router';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import type { Order } from '../models/order.model';

import { ORDER_DETAIL_ERROR, orderDetailResolver } from './order-detail.resolver';

const ORDER: Order = {
  id: '7',
  code: 'ORD-14006',
  customerId: '3',
  customerName: 'مریم حسینی',
  status: 'paid',
  total: 1_745_000,
  itemCount: 2,
  createdAt: 1_729_152_000_000,
  items: [
    {
      id: '7-item-1',
      productId: 'p-1',
      productName: 'فلش مموری سندیسک',
      productImage: null,
      variantName: null,
      quantity: 2,
      unitPrice: 850_000,
      totalPrice: 1_700_000,
    },
  ],
  subtotal: 1_700_000,
  discount: 0,
  shippingCost: 45_000,
  shippingMethod: 'پست پیشتاز',
  address: {
    fullName: 'مریم حسینی',
    phone: '09121022222',
    province: 'تهران',
    city: 'تهران',
    postalCode: '1100000000',
    address: 'خیابان ولیعصر، پلاک ۱۲',
  },
  payment: {
    method: 'پرداخت آنلاین',
    gateway: 'زرین‌پال',
    trackingCode: '202600007919',
    paidAt: 1_729_152_600_000,
  },
  statusHistory: [
    { id: '7-h1', status: 'pending', note: null, createdAt: 1_729_152_000_000 },
    { id: '7-h2', status: 'paid', note: null, createdAt: 1_729_159_200_000 },
  ],
};

/** The two arguments a resolver receives; only the param map is read. */
function snapshot(id: string): [ActivatedRouteSnapshot, RouterStateSnapshot] {
  return [
    { paramMap: convertToParamMap({ id }) } as ActivatedRouteSnapshot,
    {} as RouterStateSnapshot,
  ];
}

describe('orderDetailResolver (BO-H01)', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function resolve(id: string) {
    return TestBed.runInInjectionContext(() =>
      orderDetailResolver(...snapshot(id)),
    ) as Promise<unknown>;
  }

  it('returns the full order the API answers with', async () => {
    const result = resolve('7');

    const request = httpMock.expectOne((r) => r.url.endsWith('/orders/7'));
    expect(request.request.method).toBe('GET');
    request.flush({ data: ORDER, message: '' });

    await expect(result).resolves.toEqual({ order: ORDER });
  });

  it('an unknown id redirects to the 404 page instead of an empty detail', async () => {
    const result = resolve('missing');

    httpMock
      .expectOne((r) => r.url.endsWith('/orders/missing'))
      .flush(
        { error: { code: 'NOT_FOUND', message: 'موردی با این شناسه یافت نشد.' } },
        { status: 404, statusText: 'Not Found' },
      );

    const resolved = await result;

    expect(resolved).toBeInstanceOf(RedirectCommand);
    expect((resolved as RedirectCommand).redirectTo.toString()).toBe(
      TestBed.inject(Router).createUrlTree(['/404']).toString(),
    );
  });

  it('any other failure resolves to the error sentence, never a rejection', async () => {
    const result = resolve('7');

    httpMock
      .expectOne((r) => r.url.endsWith('/orders/7'))
      .flush(
        { error: { code: 'SERVER', message: 'خطای سرور' } },
        { status: 500, statusText: 'err' },
      );

    await expect(result).resolves.toEqual({ error: ORDER_DETAIL_ERROR });
  });
});
