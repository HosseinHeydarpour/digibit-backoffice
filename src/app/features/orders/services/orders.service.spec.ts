import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import { ApiError } from '@shared/models';
import { firstValueFrom } from 'rxjs';

import type { Order, OrderListItem } from '../models/order.model';

import { OrdersService, buildQuery } from './orders.service';

const LIST_ITEM: OrderListItem = {
  id: '7',
  code: 'ORD-14006',
  customerId: '3',
  customerName: 'مریم حسینی',
  status: 'processing',
  total: 1_940_000,
  itemCount: 3,
  createdAt: 1728969600000,
};

const ORDER: Order = {
  ...LIST_ITEM,
  items: [
    {
      id: '7-item-1',
      productId: 'p-1',
      productName: 'فلش مموری سندیسک',
      productImage: null,
      variantName: '۶۴ گیگ',
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
    paidAt: 1728970200000,
  },
  statusHistory: [
    { id: '7-h1', status: 'pending', note: null, createdAt: 1728969600000 },
    { id: '7-h2', status: 'paid', note: null, createdAt: 1728976800000 },
  ],
};

describe('buildQuery (BO-H01)', () => {
  it('serialises text, range, paging and sort into the exact query string', () => {
    const params = buildQuery({
      query: '  رضایی  ',
      customerId: ' 42 ',
      status: 'shipped',
      from: 1_728_000_000_000,
      to: 1_729_000_000_000,
      page: 2,
      pageSize: 10,
      sort: 'total',
      dir: 'desc',
    });

    expect(params.get('query')).toBe('رضایی');
    expect(params.get('customerId')).toBe('42');
    expect(params.get('status')).toBe('shipped');
    expect(params.get('from')).toBe('1728000000000');
    expect(params.get('to')).toBe('1729000000000');
    expect(params.get('page')).toBe('2');
    expect(params.get('pageSize')).toBe('10');
    expect(params.get('sort')).toBe('total');
    expect(params.get('dir')).toBe('desc');
  });

  it('drops null, undefined, whitespace and non-positive paging values', () => {
    const params = buildQuery({
      query: '   ',
      status: undefined,
      from: Number.NaN,
      to: Number.POSITIVE_INFINITY,
      page: 0,
      pageSize: -1,
    });

    expect(params.keys()).toEqual([]);
  });

  it('keeps epoch 0 as a valid range bound but drops negative millis', () => {
    expect(buildQuery({ from: 0 }).get('from')).toBe('0');
    expect(buildQuery({ from: -5 }).has('from')).toBe(false);
    expect(buildQuery({ to: -5 }).has('to')).toBe(false);
  });

  it('only sends dir when a sort is present, and defaults it to asc', () => {
    const withoutSort = buildQuery({ dir: 'desc' });
    expect(withoutSort.has('dir')).toBe(false);

    const withSort = buildQuery({ sort: 'createdAt' });
    expect(withSort.get('sort')).toBe('createdAt');
    expect(withSort.get('dir')).toBe('asc');
  });
});

describe('OrdersService (BO-H01)', () => {
  let service: OrdersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OrdersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list() calls GET /orders with the built query and returns a Page', async () => {
    const resultPromise = firstValueFrom(service.list({ query: 'مریم', page: 2, pageSize: 10 }));

    const req = httpMock.expectOne(
      (request) => request.url === `${environment.API_BASE_URL}/orders`,
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('query')).toBe('مریم');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('10');

    req.flush({ data: [LIST_ITEM], meta: { page: 2, pageSize: 10, total: 28 } });

    const page = await resultPromise;
    expect(page.items).toEqual([LIST_ITEM]);
    expect(page.total).toBe(28);
    expect(page.page).toBe(2);
    expect(page.pageSize).toBe(10);
  });

  it('get() calls GET /orders/:id and unwraps the full record', async () => {
    const resultPromise = firstValueFrom(service.get('7'));

    const req = httpMock.expectOne(`${environment.API_BASE_URL}/orders/7`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: ORDER, message: '' });

    await expect(resultPromise).resolves.toEqual(ORDER);
  });

  it('get() encodes an id that contains URL characters', async () => {
    const resultPromise = firstValueFrom(service.get('a/b'));

    const req = httpMock.expectOne(`${environment.API_BASE_URL}/orders/a%2Fb`);
    req.flush({ data: ORDER, message: '' });

    await expect(resultPromise).resolves.toEqual(ORDER);
  });

  it('normalises a 404 into an ApiError with status 404', async () => {
    const resultPromise = firstValueFrom(service.get('missing'));

    httpMock
      .expectOne(`${environment.API_BASE_URL}/orders/missing`)
      .flush(
        { error: { code: 'NOT_FOUND', message: 'موردی با این شناسه یافت نشد.' } },
        { status: 404, statusText: 'Not Found' },
      );

    await expect(resultPromise).rejects.toBeInstanceOf(ApiError);
    await expect(resultPromise).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});
