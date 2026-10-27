import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import { ApiError } from '@shared/models';
import { firstValueFrom } from 'rxjs';

import type { CreateProductDto, Product, ProductListItem } from '../models/product.model';

import { ProductsService, buildQuery } from './products.service';

const LIST_ITEM: ProductListItem = {
  id: '7',
  name: 'هدفون بی‌سیم سونی',
  sku: 'SKU-1007',
  categoryName: 'لوازم برقی',
  brandName: 'سونی',
  price: 2_100_000,
  stock: 12,
  lowStockThreshold: 5,
  status: 'published',
  createdAt: 1728969600000,
};

const PRODUCT: Product = {
  id: '7',
  name: 'هدفون بی‌سیم سونی',
  slug: 'sony-wireless-headphones',
  sku: 'SKU-1007',
  categoryId: '3',
  categoryName: 'لوازم برقی',
  brandId: '5',
  brandName: 'سونی',
  shortDescription: 'هدفون حرفه‌ای',
  description: 'هدفون بی‌سیم با حذف نویز فعال.',
  price: 2_100_000,
  stock: 12,
  lowStockThreshold: 5,
  status: 'published',
  images: [{ id: 'img-1', url: '/mock/7-1.jpg', alt: 'هدفون سونی', isPrimary: true, order: 1 }],
  variants: [
    {
      id: 'variant-1',
      sku: 'SKU-1007-1',
      attributes: { رنگ: 'مشکی', سایز: 'استاندارد' },
      price: 2_100_000,
      stock: 12,
      imageUrl: null,
    },
  ],
  createdAt: 1728969600000,
  updatedAt: 1728969600000,
};

function createDto(): CreateProductDto {
  return {
    name: 'هدفون بی‌سیم سونی',
    slug: 'sony-wireless-headphones',
    sku: 'SKU-1007',
    categoryId: '3',
    brandId: '5',
    shortDescription: 'هدفون حرفه‌ای',
    description: 'هدفون بی‌سیم با حذف نویز فعال.',
    price: 2_100_000,
    stock: 12,
    lowStockThreshold: 5,
    status: 'published',
  };
}

describe('buildQuery (BO-F05 tc 1, tc 10)', () => {
  it('serialises filters, paging and sort into the exact query string', () => {
    const params = buildQuery({
      query: '  کیف  ',
      categoryId: '2',
      brandId: null,
      status: 'draft',
      page: 2,
      pageSize: 20,
      sort: 'price',
      dir: 'desc',
    });

    expect(params.get('query')).toBe('کیف');
    expect(params.get('categoryId')).toBe('2');
    expect(params.has('brandId')).toBe(false);
    expect(params.get('status')).toBe('draft');
    expect(params.get('page')).toBe('2');
    expect(params.get('pageSize')).toBe('20');
    expect(params.get('sort')).toBe('price');
    expect(params.get('dir')).toBe('desc');
  });

  it('drops null, undefined, whitespace and non-positive paging values', () => {
    const params = buildQuery({
      query: '   ',
      categoryId: null,
      brandId: undefined,
      status: null,
      page: 0,
      pageSize: -1,
    });

    expect(params.keys()).toEqual([]);
  });

  it('only sends dir when a sort is present, and defaults it to asc', () => {
    const withoutSort = buildQuery({ dir: 'desc' });
    expect(withoutSort.has('dir')).toBe(false);

    const withSort = buildQuery({ sort: 'name' });
    expect(withSort.get('sort')).toBe('name');
    expect(withSort.get('dir')).toBe('asc');
  });
});

describe('ProductsService (BO-F05)', () => {
  let service: ProductsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('tc 1: list() calls GET /products with the built query and returns a Page', async () => {
    const resultPromise = firstValueFrom(service.list({ query: 'سونی', page: 2, pageSize: 10 }));

    const req = httpMock.expectOne(
      (request) => request.url === `${environment.API_BASE_URL}/products`,
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('query')).toBe('سونی');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('10');

    req.flush({ data: [LIST_ITEM], meta: { page: 2, pageSize: 10, total: 11 } });

    const page = await resultPromise;
    expect(page.items).toEqual([LIST_ITEM]);
    expect(page.total).toBe(11);
    expect(page.page).toBe(2);
    expect(page.pageSize).toBe(10);
  });

  it('tc 2: get(id) calls GET /products/:id and unwraps the full product', async () => {
    const resultPromise = firstValueFrom(service.get('7'));

    const req = httpMock.expectOne(`${environment.API_BASE_URL}/products/7`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: PRODUCT });

    const product = await resultPromise;
    expect(product).toEqual(PRODUCT);
  });

  it('tc 3: create(dto) POSTs the payload and returns the created record', async () => {
    const dto = createDto();
    const resultPromise = firstValueFrom(service.create(dto));

    const req = httpMock.expectOne(`${environment.API_BASE_URL}/products`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ data: PRODUCT }, { status: 201, statusText: 'Created' });

    expect((await resultPromise).id).toBe(PRODUCT.id);
  });

  it('tc 4: update(id, dto) PUTs the payload', async () => {
    const dto = { name: 'هدفون سونی — نسخهٔ جدید' };
    const resultPromise = firstValueFrom(service.update('7', dto));

    const req = httpMock.expectOne(`${environment.API_BASE_URL}/products/7`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(dto);
    req.flush({ data: { ...PRODUCT, name: dto.name } });

    expect((await resultPromise).name).toBe(dto.name);
  });

  it('tc 5: remove(id) DELETEs the record and resolves void', async () => {
    const resultPromise = firstValueFrom(service.remove('7'));

    const req = httpMock.expectOne(`${environment.API_BASE_URL}/products/7`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ data: { id: '7' }, message: 'محصول حذف شد.' });

    await expect(resultPromise).resolves.toBeUndefined();
  });

  it('tc 6: setStatus(id, status) PATCHes the dedicated status endpoint', async () => {
    const resultPromise = firstValueFrom(service.setStatus('7', 'inactive'));

    const req = httpMock.expectOne(`${environment.API_BASE_URL}/products/7/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'inactive' });
    req.flush({ data: { ...PRODUCT, status: 'inactive' } });

    expect((await resultPromise).status).toBe('inactive');
  });

  it('tc 9: a 404 from get() surfaces as the typed ApiError', async () => {
    const resultPromise = firstValueFrom(service.get('does-not-exist'));

    httpMock
      .expectOne(`${environment.API_BASE_URL}/products/does-not-exist`)
      .flush(
        { error: { code: 'NOT_FOUND', message: 'موردی با این شناسه یافت نشد.' } },
        { status: 404, statusText: 'Not Found' },
      );

    const error = await resultPromise.catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('tc 10: the default list() sends no query string at all', async () => {
    const resultPromise = firstValueFrom(service.list());

    const req = httpMock.expectOne(
      (request) => request.url === `${environment.API_BASE_URL}/products`,
    );
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ data: [], meta: { page: 1, pageSize: 20, total: 0 } });

    await resultPromise;
  });

  it('F03: categories() reads the lookup page and hides an inactive option', async () => {
    const resultPromise = firstValueFrom(service.categories());

    const req = httpMock.expectOne(
      (request) => request.url === `${environment.API_BASE_URL}/categories`,
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('pageSize')).toBe('100');

    req.flush({
      data: [
        { id: '3', name: 'لوازم برقی', isActive: true },
        { id: '9', name: 'دستهٔ حذف‌شده', isActive: false },
      ],
      meta: { page: 1, pageSize: 100, total: 2 },
    });

    expect(await resultPromise).toEqual([{ id: '3', name: 'لوازم برقی', isActive: true }]);
  });

  it('F03: brands() reads the lookup page and hides an inactive option', async () => {
    const resultPromise = firstValueFrom(service.brands());

    const req = httpMock.expectOne(
      (request) => request.url === `${environment.API_BASE_URL}/brands`,
    );
    expect(req.request.params.get('pageSize')).toBe('100');

    req.flush({
      data: [
        { id: '5', name: 'سونی', isActive: true },
        { id: '9', name: 'برند حذف‌شده', isActive: false },
      ],
      meta: { page: 1, pageSize: 100, total: 2 },
    });

    expect(await resultPromise).toEqual([{ id: '5', name: 'سونی', isActive: true }]);
  });
});
