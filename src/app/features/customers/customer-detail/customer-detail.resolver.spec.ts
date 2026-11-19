import { TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter } from '@angular/router';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApiError } from '@shared/models';
import { Observable, of, throwError } from 'rxjs';

import type { Customer, CustomerOrderSummary } from '../models/customer.model';
import { CustomersService } from '../services/customers.service';

import { CUSTOMER_DETAIL_ERROR, customerDetailResolver } from './customer-detail.resolver';

const CUSTOMER: Customer = {
  id: '3',
  fullName: 'مریم حسینی',
  phone: '09121000003',
  email: 'customer3@example.com',
  status: 'active',
  orderCount: 2,
  totalSpent: 3_200_000,
  createdAt: 1_728_000_000_000,
  addresses: [],
};

const ORDERS: readonly CustomerOrderSummary[] = [
  {
    id: '1',
    code: 'ORD-14000',
    status: 'delivered',
    total: 1_600_000,
    createdAt: 1_728_000_000_000,
  },
];

class CustomersServiceStub {
  getError: unknown = null;

  lastOrdersError: unknown = null;

  getCalls = 0;

  lastOrdersCalls = 0;

  get(): Observable<Customer> {
    this.getCalls += 1;

    return this.getError ? throwError(() => this.getError) : of(CUSTOMER);
  }

  lastOrders(): Observable<{ items: readonly CustomerOrderSummary[]; total: number }> {
    this.lastOrdersCalls += 1;

    return this.lastOrdersError
      ? throwError(() => this.lastOrdersError)
      : of({ items: ORDERS, total: ORDERS.length });
  }
}

function run(id: string): ReturnType<typeof customerDetailResolver> {
  const route = { paramMap: convertToParamMap({ id }) } as unknown as ActivatedRouteSnapshot;

  return TestBed.runInInjectionContext(() =>
    customerDetailResolver(route, {} as RouterStateSnapshot),
  );
}

describe('customerDetailResolver (BO-I02)', () => {
  let service: CustomersServiceStub;

  beforeEach(() => {
    service = new CustomersServiceStub();

    TestBed.configureTestingModule({
      providers: [{ provide: CustomersService, useValue: service }, provideRouter([])],
    });
  });

  it('loads the customer and the last orders together', async () => {
    const result = await run('3');

    expect(service.getCalls).toBe(1);
    expect(service.lastOrdersCalls).toBe(1);
    expect(result).toEqual({ customer: CUSTOMER, orders: ORDERS });
  });

  it('turns a 404 into a redirect to the 404 page', async () => {
    service.getError = new ApiError('NOT_FOUND', 'missing', 404);

    const result = await run('9999');

    expect(result.constructor.name).toBe('RedirectCommand');
  });

  it('keeps the page for any other failure and hands it the sentence', async () => {
    service.lastOrdersError = new ApiError('HTTP_500', 'boom', 500);

    const result = await run('3');

    expect(result).toEqual({ error: CUSTOMER_DETAIL_ERROR });
  });
});
