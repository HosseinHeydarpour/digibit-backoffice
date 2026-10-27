import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter, RedirectCommand, Router } from '@angular/router';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import type { Product } from '../models/product.model';

import { PRODUCT_EDIT_ERROR, productEditResolver } from './product-edit.resolver';

const PRODUCT: Product = {
  id: '7',
  name: 'هدفون سونی',
  slug: 'sony-wh1000',
  sku: 'SKU-7',
  categoryId: '3',
  categoryName: 'صوتی',
  brandId: null,
  brandName: null,
  shortDescription: '',
  description: '',
  price: 2_100_000,
  stock: 4,
  lowStockThreshold: 5,
  status: 'draft',
  images: [],
  variants: [],
  createdAt: 1_729_152_000_000,
};

/** The two arguments a resolver receives; only the param map is read. */
function snapshot(id: string): [ActivatedRouteSnapshot, RouterStateSnapshot] {
  return [
    { paramMap: convertToParamMap({ id }) } as ActivatedRouteSnapshot,
    {} as RouterStateSnapshot,
  ];
}

describe('productEditResolver (BO-F14)', () => {
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
      productEditResolver(...snapshot(id)),
    ) as Promise<unknown>;
  }

  it('tc 1/8: returns the full product the API answers with', async () => {
    const result = resolve('7');

    const request = httpMock.expectOne((r) => r.url.endsWith('/products/7'));
    expect(request.request.method).toBe('GET');
    request.flush({ data: PRODUCT, message: '' });

    await expect(result).resolves.toEqual({ product: PRODUCT });
  });

  it('tc 5: an unknown id redirects to the 404 page instead of an empty form', async () => {
    const result = resolve('missing');

    httpMock
      .expectOne((r) => r.url.endsWith('/products/missing'))
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

  it('tc 6: any other failure resolves to the error sentence, never a rejection', async () => {
    const result = resolve('7');

    httpMock
      .expectOne((r) => r.url.endsWith('/products/7'))
      .flush(
        { error: { code: 'SERVER', message: 'خطای سرور' } },
        { status: 500, statusText: 'err' },
      );

    await expect(result).resolves.toEqual({ error: PRODUCT_EDIT_ERROR });
  });
});
