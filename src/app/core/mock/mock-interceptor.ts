import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { environment } from '@env/environment';
import type { PageMeta } from '@shared/models';
import { delay, of, throwError } from 'rxjs';

import * as fixtures from './fixtures';

/** Header a caller sets to opt a request into mocking. */
export const MOCK_HEADER = 'X-Mock';

interface MockResolution {
  body: unknown;
  status: number;
}

/** Anything with a `.get()` — `HttpParams` satisfies this, so does a Map. */
interface ParamReader {
  get(key: string): string | null;
}

/**
 * Answers requests from local fixtures instead of the network.
 *
 * Registered in app.config.ts only when `environment.useMockApi` is true, which is
 * what keeps this file and its fixtures out of the production bundle.
 *
 * Returns `null` from the resolver when it does not recognise the URL, in which
 * case the request passes through to the real backend untouched.
 */
export const mockInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.headers.get(MOCK_HEADER) !== '1') {
    return next(req);
  }

  const resolved = resolve(req.method, req.url, req.params, req.body);
  if (!resolved) {
    return next(req);
  }

  const delayMs = environment.mockDelayMs;

  if (resolved.status >= 400) {
    return throwError(
      () =>
        new HttpErrorResponse({
          status: resolved.status,
          statusText: 'Mocked Error',
          url: req.url,
          error: resolved.body,
        }),
    ).pipe(delay(delayMs));
  }

  return of(new HttpResponse({ status: resolved.status, body: resolved.body, url: req.url })).pipe(
    delay(delayMs),
  );
};

/** `/api/v1/products/12` → ['products', '12'] — strips the base URL and query. */
function segments(url: string): string[] {
  const path = url.split('?')[0].replace(/^https?:\/\/[^/]+/, '');
  return path
    .replace(/^\/api\/v1\/?/, '')
    .split('/')
    .filter(Boolean);
}

/**
 * Paginate a list exactly the way the real API does, honouring page/pageSize and
 * returning the envelope shape from ARCHITECTURE.md §4.
 */
function paginate<T>(items: T[], page: number, pageSize: number): { data: T[]; meta: PageMeta } {
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    meta: { page, pageSize, total: items.length },
  };
}

function num(params: ParamReader, key: string, fallback: number): number {
  const raw = params.get(key);
  const parsed = raw === null ? NaN : Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Test-only escape hatch: `?__mockStatus=500` forces an error response. */
function forcedStatus(params: ParamReader): number | null {
  const raw = params.get('__mockStatus');
  const parsed = raw === null ? NaN : Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Matches an item by id across fixtures whose ids are typed differently.
 * Local `find` callbacks stay typed without widening every fixture to `any`.
 */
function byId<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

/** `{ data, message }` — the shape `ApiService.get` unwraps. */
function ok(data: unknown, message = ''): MockResolution {
  return { status: 200, body: { data, message } };
}

/** Same envelope with 201, so a create is distinguishable from a read. */
function created(data: unknown, message = ''): MockResolution {
  return { status: 201, body: { data, message } };
}

/** A paged list: `{ data, meta, message }` exactly as the API returns it. */
function paged(items: unknown[], page: number, pageSize: number): MockResolution {
  return { status: 200, body: { ...paginate(items, page, pageSize), message: '' } };
}

const NOT_FOUND: MockResolution = {
  status: 404,
  body: { error: { code: 'NOT_FOUND', message: 'موردی با این شناسه یافت نشد.' } },
};

function resolve(
  method: string,
  url: string,
  params: ParamReader,
  body: unknown,
): MockResolution | null {
  const status = forcedStatus(params);
  // The third segment is used by `/products/:id/status`; other modules ignore it.
  const [module, id, sub] = segments(url);
  const page = num(params, 'page', 1);
  const pageSize = num(params, 'pageSize', environment.DEFAULT_PAGE_SIZE);

  // A forced status simulates a failure before any routing happens.
  if (status !== null) {
    return {
      status,
      body: { error: { code: 'MOCK_ERROR', message: `خطای شبیه‌سازی‌شده ${status}` } },
    };
  }

  switch (module) {
    case 'dashboard':
      if (id === 'summary') return ok(fixtures.MOCK_DASHBOARD_SUMMARY);
      if (id === 'sales-chart') {
        const days = num(params, 'days', 7);
        return ok(fixtures.getMockSalesChart(days));
      }
      if (id === 'recent-orders') return paged(fixtures.MOCK_ORDERS.slice(0, 8), page, pageSize);
      if (id === 'low-stock') return paged(fixtures.MOCK_LOW_STOCK, page, pageSize);
      return NOT_FOUND;

    case 'products':
      return resolveProducts(method, id, sub, params, body, page, pageSize);

    case 'categories':
      return paged(fixtures.MOCK_CATEGORIES, page, pageSize);
    case 'brands':
      return paged(fixtures.MOCK_BRANDS, page, pageSize);
    case 'coupons':
      return paged(fixtures.MOCK_COUPONS, page, pageSize);
    case 'shipping-methods':
      return paged(fixtures.MOCK_SHIPPING_METHODS, page, pageSize);
    case 'banners':
      return paged(fixtures.MOCK_BANNERS, page, pageSize);

    case 'orders': {
      if (!id) return paged(fixtures.MOCK_ORDERS, page, pageSize);
      const found = byId(fixtures.MOCK_ORDERS, id);
      return found ? ok(found) : NOT_FOUND;
    }

    case 'customers': {
      if (!id) return paged(fixtures.MOCK_CUSTOMERS, page, pageSize);
      const found = byId(fixtures.MOCK_CUSTOMERS, id);
      return found ? ok(found) : NOT_FOUND;
    }

    case 'comments':
      return paged(fixtures.MOCK_COMMENTS, page, pageSize);

    case 'tickets': {
      if (!id) return paged(fixtures.MOCK_TICKETS, page, pageSize);
      const found = byId(fixtures.MOCK_TICKETS, id);
      return found ? ok(found) : NOT_FOUND;
    }

    case 'settings':
      return ok(fixtures.MOCK_SETTINGS);

    default:
      return null; // unrecognised → pass through to the real backend
  }
}

/**
 * The products module's in-memory CRUD.
 *
 * `GET /products` applies the same four filters BO-F03 will put in the URL, then
 * paginates and maps the fixture to the flattened list row. `GET /products/:id`
 * returns the full record (variants and gallery) so BO-F14's form can bind every
 * tab from one response.
 */
function resolveProducts(
  method: string,
  id: string | undefined,
  sub: string | undefined,
  params: ParamReader,
  body: unknown,
  page: number,
  pageSize: number,
): MockResolution {
  if (!id) {
    if (method === 'POST') {
      const rejected = validateNewProduct(body);

      if (rejected) {
        return rejected;
      }

      return created(toProduct(createProduct(body)), 'محصول با موفقیت ایجاد شد.');
    }

    return paged(filterProducts(params), page, pageSize);
  }

  // `/products/new` is a form route, not a record; the create screen only needs
  // a blank-ish shape to bind. Keep the old behaviour for compatibility.
  const found = id === 'new' ? fixtures.MOCK_PRODUCTS[0] : byId(fixtures.MOCK_PRODUCTS, id);
  if (!found) {
    return NOT_FOUND;
  }

  if (method === 'DELETE') {
    return ok({ id: found.id }, 'محصول حذف شد.');
  }

  if (method === 'PATCH' && sub === 'status') {
    return ok(toProduct(updateProduct(found, body)), 'وضعیت محصول به‌روزرسانی شد.');
  }

  if (method === 'PUT' || method === 'PATCH') {
    return ok(toProduct(updateProduct(found, body)), 'محصول به‌روزرسانی شد.');
  }

  return ok(toProduct(found));
}

type ProductSortKey = 'name' | 'price' | 'stock' | 'createdAt';

function isSortKey(value: string | null): value is ProductSortKey {
  return value === 'name' || value === 'price' || value === 'stock' || value === 'createdAt';
}

function filterProducts(params: ParamReader): Record<string, unknown>[] {
  const text = (params.get('query') ?? '').trim().toLowerCase();
  const categoryId = params.get('categoryId');
  const brandId = params.get('brandId');
  const status = params.get('status');
  const sort = params.get('sort');
  const direction = params.get('dir') === 'desc' ? -1 : 1;

  let rows = fixtures.MOCK_PRODUCTS.filter((product) => {
    const haystack = `${product.name} ${product.slug} ${product.sku}`.toLowerCase();

    return (
      (text === '' || haystack.includes(text)) &&
      (categoryId === null || product.categoryId === categoryId) &&
      (brandId === null || product.brandId === brandId) &&
      (status === null || product.status === status)
    );
  });

  if (isSortKey(sort)) {
    rows = [...rows].sort((a, b) => {
      if (sort === 'name') {
        return a.name.localeCompare(b.name, 'fa') * direction;
      }

      return (a[sort] - b[sort]) * direction;
    });
  }

  return rows.map(toListItem);
}

function categoryName(id: string): string {
  return fixtures.MOCK_CATEGORIES.find((category) => category.id === id)?.name ?? '—';
}

function brandName(id: string): string {
  return fixtures.MOCK_BRANDS.find((brand) => brand.id === id)?.name ?? '—';
}

/**
 * The 422 a real `POST /products` answers when the payload is wrong (BO-F13 tc 3).
 *
 * Three rules are enough to make the form's error mapping demonstrable, and they
 * are the three a user actually hits: no name, a slug already in the catalogue,
 * and a SKU already in the catalogue. The message goes in `error.message` (the
 * banner) and each field in `error.fields` (the control), which is exactly the
 * envelope `ApiError` was built from.
 *
 * TRACE: `{ name: '', slug: 'product-1', sku: 'SKU-1001' }` →
 *   `{ error: { code: 'VALIDATION', message: 'اطلاعات محصول معتبر نیست.',
 *               fields: { name: ['…'], slug: ['…'], sku: ['…'] } } }` with 422.
 */
function validateNewProduct(body: unknown): MockResolution | null {
  const data = asRecord(body);
  const slug = text(data['slug'], '');
  const sku = text(data['sku'], '');
  const fields: Record<string, string[]> = {};

  if (text(data['name'], '') === '') {
    fields['name'] = ['نام محصول الزامی است.'];
  }

  if (slug === '') {
    fields['slug'] = ['نامک (slug) الزامی است.'];
  } else if (fixtures.MOCK_PRODUCTS.some((product) => product.slug === slug)) {
    fields['slug'] = ['این نامک قبلاً استفاده شده است.'];
  }

  if (sku !== '' && fixtures.MOCK_PRODUCTS.some((product) => product.sku === sku)) {
    fields['sku'] = ['این کد محصول قبلاً ثبت شده است.'];
  }

  if (Object.keys(fields).length === 0) {
    return null;
  }

  return {
    status: 422,
    body: { error: { code: 'VALIDATION', message: 'اطلاعات محصول معتبر نیست.', fields } },
  };
}

/** The flattened row `GET /products` returns. */
function toListItem(product: fixtures.MockProduct): Record<string, unknown> {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    categoryId: product.categoryId,
    categoryName: categoryName(product.categoryId),
    brandId: product.brandId,
    // An unbranded row (no brand named in the source export) reads «—».
    brandName: product.brandId === null ? '—' : brandName(product.brandId),
    price: product.price,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    status: product.status,
    createdAt: product.createdAt,
  };
}

/** The source's raw HTML reduced to the 160-code-point short-description field. */
function shortDescription(product: fixtures.MockProduct): string {
  const plain = product.description
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain === '' ? `${product.name} — توضیح کوتاه نمونه.` : plain.slice(0, 160);
}

/**
 * The variants the source export carries, mapped to the panel's variant shape
 * (`attributes` is an open record; a capacity like «64 گیگ» reads as the
 * `گزینه` key). A product without variations keeps one placeholder row so the
 * edit form's variants tab always has something to bind.
 */
function toVariants(product: fixtures.MockProduct): Record<string, unknown>[] {
  if (product.variants.length === 0) {
    return [
      {
        id: `${product.id}-variant-1`,
        sku: `${product.sku}-1`,
        attributes: { رنگ: 'مشکی', سایز: 'استاندارد' },
        price: product.price,
        stock: product.stock,
        imageUrl: null,
      },
    ];
  }

  return product.variants.map((variant, index) => ({
    id: variant.id,
    sku: `${product.sku}-${index + 1}`,
    attributes: { گزینه: variant.name },
    price: variant.price,
    stock: variant.quantity,
    imageUrl: null,
  }));
}

/** The full record `GET /products/:id` returns. */
function toProduct(product: fixtures.MockProduct): Record<string, unknown> {
  return {
    ...toListItem(product),
    slug: product.slug,
    shortDescription: shortDescription(product),
    description: product.description || `${product.name} — توضیحات کامل نمونه برای محیط آزمایشی.`,
    colors: product.colors,
    isSpecialOffer: product.isSpecialOffer,
    images: [
      {
        id: `${product.id}-img-1`,
        // The shop's real photo (a WebP data URL) when it has one; otherwise the
        // old placeholder path, which 404s silently exactly as before.
        url: product.image || `/mock/products/${product.id}-1.jpg`,
        alt: product.name,
        isPrimary: true,
        order: 1,
      },
    ],
    variants: toVariants(product),
    updatedAt: product.createdAt,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback;
}

/** Like `text`, but the fallback may be `null` — a row with no brand. */
function brandRef(value: unknown, fallback: string | null): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback;
}

function amount(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isStatus(value: unknown): value is fixtures.MockProductStatus {
  return value === 'published' || value === 'draft' || value === 'inactive';
}

/**
 * Build the record a `POST /products` would create.
 *
 * The mock does not persist it — the fixture array is frozen data, and a write
 * that mutates module state would make one test affect the next. Echoing a
 * deterministic record is enough for the create screen to navigate to an edit
 * page; the real backend is the one that assigns and stores the id.
 */
function createProduct(body: unknown): fixtures.MockProduct {
  const data = asRecord(body);
  const base = fixtures.MOCK_PRODUCTS[0];
  const nextId = String(fixtures.MOCK_PRODUCTS.length + 1);

  return {
    id: nextId,
    name: text(data['name'], base.name),
    sku: text(data['sku'], `SKU-${2000 + Number(nextId)}`),
    slug: text(data['slug'], `product-${nextId}`),
    categoryId: text(data['categoryId'], base.categoryId),
    brandId: brandRef(data['brandId'], base.brandId),
    price: amount(data['price'], base.price),
    stock: amount(data['stock'], 0),
    lowStockThreshold: amount(data['lowStockThreshold'], base.lowStockThreshold),
    status: isStatus(data['status']) ? data['status'] : 'draft',
    createdAt: fixtures.FIXTURE_NOW,
    // Fields the create payload does not carry (BO-F13's DTO has no colours,
    // gallery or offer flag) start as the source export's empty defaults.
    image: '',
    colors: [],
    variants: [],
    description: '',
    isSpecialOffer: false,
  };
}

/** Merge the editable fields a `PUT`/`PATCH` sent over the existing record. */
function updateProduct(product: fixtures.MockProduct, body: unknown): fixtures.MockProduct {
  const data = asRecord(body);

  return {
    ...product,
    name: text(data['name'], product.name),
    sku: text(data['sku'], product.sku),
    slug: text(data['slug'], product.slug),
    categoryId: text(data['categoryId'], product.categoryId),
    brandId: brandRef(data['brandId'], product.brandId),
    price: amount(data['price'], product.price),
    stock: amount(data['stock'], product.stock),
    lowStockThreshold: amount(data['lowStockThreshold'], product.lowStockThreshold),
    status: isStatus(data['status']) ? data['status'] : product.status,
  };
}
