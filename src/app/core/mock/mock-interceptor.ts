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
      const rejected = validateProduct(body);

      if (rejected) {
        return rejected;
      }

      const product = createProduct(body);
      CREATED_PRODUCTS.push(product);

      return created(toProduct(product), 'محصول با موفقیت ایجاد شد.');
    }

    return paged(filterProducts(params), page, pageSize);
  }

  // `/products/new` is a form route, not a record; the create screen only needs
  // a blank-ish shape to bind. Keep the old behaviour for compatibility.
  const found = id === 'new' ? fixtures.MOCK_PRODUCTS[0] : byId(catalogue(), id);
  if (!found || DELETED_IDS.has(found.id)) {
    return NOT_FOUND;
  }

  if (method === 'DELETE') {
    // Soft delete: the row stays in the fixture, every read starts hiding it.
    DELETED_IDS.add(found.id);

    return ok({ id: found.id }, 'محصول حذف شد.');
  }

  if (method === 'PATCH' && sub === 'status') {
    const updated = updateProduct(found, body);
    const index = CREATED_PRODUCTS.findIndex((product) => product.id === updated.id);
    if (index >= 0) {
      CREATED_PRODUCTS[index] = updated;
    }

    return ok(toProduct(updated), 'وضعیت محصول به‌روزرسانی شد.');
  }

  if (method === 'PUT' || method === 'PATCH') {
    // BO-F14: an update carries a slug too, so the same uniqueness rules apply —
    // skipping the product being edited, which owns its own slug and SKU.
    const rejected = validateProduct(body, found.id);

    if (rejected) {
      return rejected;
    }

    const updated = updateProduct(found, body);
    const index = CREATED_PRODUCTS.findIndex((product) => product.id === updated.id);
    if (index >= 0) {
      CREATED_PRODUCTS[index] = updated;
    }

    return ok(toProduct(updated), 'محصول به‌روزرسانی شد.');
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

  let rows = catalogue().filter((product) => {
    const haystack = `${product.name} ${product.slug} ${product.sku}`.toLowerCase();

    return (
      !DELETED_IDS.has(product.id) &&
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
 * The 422 a real product endpoint answers when the payload is wrong (BO-F13 tc 3,
 * BO-F14 tc 13).
 *
 * Three rules are enough to make the form's error mapping demonstrable, and they
 * are the three a user actually hits: no name, a slug already in the catalogue,
 * and a SKU already in the catalogue. The message goes in `error.message` (the
 * banner) and each field in `error.fields` (the control), which is exactly the
 * envelope `ApiError` was built from.
 *
 * `selfId` is the product being UPDATED: it owns its current slug and SKU, so an
 * edit that resends them unchanged is not a duplicate. Without it, every save on
 * the edit page would 422 on its own values.
 *
 * TRACE: `{ name: '', slug: 'product-1', sku: 'SKU-1001' }` →
 *   `{ error: { code: 'VALIDATION', message: 'اطلاعات محصول معتبر نیست.',
 *               fields: { name: ['…'], slug: ['…'], sku: ['…'] } } }` with 422.
 */
function validateProduct(body: unknown, selfId?: string): MockResolution | null {
  const data = asRecord(body);
  const slug = text(data['slug'], '');
  const sku = text(data['sku'], '');
  const fields: Record<string, string[]> = {};
  const others = fixtures.MOCK_PRODUCTS.filter((product) => product.id !== selfId);

  if (text(data['name'], '') === '') {
    fields['name'] = ['نام محصول الزامی است.'];
  }

  if (slug === '') {
    fields['slug'] = ['نامک (slug) الزامی است.'];
  } else if (others.some((product) => product.slug === slug)) {
    fields['slug'] = ['این نامک قبلاً استفاده شده است.'];
  }

  if (sku !== '' && others.some((product) => product.sku === sku)) {
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
    // The REAL variants of the export; `toVariants()` fabricates one row for a
    // variant-less product, and warning about that invented row would be a lie.
    variantsCount: product.variants.length,
    status: product.status,
    createdAt: product.createdAt,
  };
}

/**
 * Ids soft-deleted this session (BO-F15).
 *
 * The API soft-deletes: the record stays in the table but every read hides it.
 * A mock that answers DELETE with 200 and then keeps returning the row cannot
 * demonstrate the feature at all — the optimistic row came back on the refetch.
 * The set is deliberately module-level (one browser session = one mock backend)
 * and is cleared by `resetMockState()` for tests, so one spec cannot leak a
 * deleted product into the next.
 *
 * TRACE — `DELETE /products/mvdx…` on «طلق و شیرازه»:
 *
 *   1. `resolveProducts` finds the fixture, `found.id` is not in the set yet.
 *   2. `DELETED_IDS.add(found.id)`; the response is 200 `{ data: { id } }`.
 *   3. The list's refetch calls `filterProducts`, whose `!DELETED_IDS.has(id)`
 *      drops the row, so `total` shrinks by one and the row cannot come back.
 *   4. `GET /products/mvdx…` now answers 404 (the `found || deleted` check), which
 *      is what the edit route's resolver turns into the 404 page.
 *   5. `resetMockState()` in a spec's `beforeEach` empties the set, so the next
 *      spec sees the full catalogue again.
 */
const DELETED_IDS = new Set<string>();

/** Test seam: forget every write this session (soft deletes and new products). */
export function resetMockState(): void {
  DELETED_IDS.clear();
  CREATED_PRODUCTS.length = 0;
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
 * Products created this session (BO-F13/F15 demo).
 *
 * Kept apart from `MOCK_PRODUCTS` (the frozen shop export) so a test can clear
 * what a previous test created: `resetMockState()` empties both this list and
 * `DELETED_IDS`. Persisting is what makes the create flow demonstrable — without
 * it the redirect after «ذخیره» landed on `/404` and the new product never
 * appeared in the list.
 *
 * TRACE — «محصول تست افزودن»:
 *
 *   1. `POST /products` builds the record (id `1001`), pushes it here and
 *      answers 201 with the full product.
 *   2. The form navigates to `/products/1001/edit`; the edit resolver's
 *      `GET /products/1001` finds it in `catalogue()` instead of 404ing.
 *   3. Back on `/products`, `filterProducts` reads `catalogue()`, so the new row
 *      is in the list and the search finds it by name or SKU.
 *   4. `PUT` replaces that entry in place; `DELETE` hides it (soft delete).
 */
const CREATED_PRODUCTS: fixtures.MockProduct[] = [];

/** Every product the mock knows about: the export plus this session's writes. */
function catalogue(): fixtures.MockProduct[] {
  return [...fixtures.MOCK_PRODUCTS, ...CREATED_PRODUCTS];
}

/**
 * Build the record a `POST /products` would create.
 *
 * The variants and the first image the form sent are stored too, so the edit
 * page that the redirect opens shows what was typed instead of the fabricated
 * placeholder row `toVariants()` otherwise produces.
 */
function createProduct(body: unknown): fixtures.MockProduct {
  const data = asRecord(body);
  const base = fixtures.MOCK_PRODUCTS[0];
  const nextId = String(1000 + CREATED_PRODUCTS.length + 1);

  return {
    id: nextId,
    name: text(data['name'], base.name),
    sku: text(data['sku'], `SKU-${nextId}`),
    slug: text(data['slug'], `product-${nextId}`),
    categoryId: text(data['categoryId'], base.categoryId),
    brandId: brandRef(data['brandId'], base.brandId),
    price: amount(data['price'], base.price),
    stock: amount(data['stock'], 0),
    lowStockThreshold: amount(data['lowStockThreshold'], base.lowStockThreshold),
    status: isStatus(data['status']) ? data['status'] : 'draft',
    createdAt: fixtures.FIXTURE_NOW,
    // Fields the create payload does not carry (BO-F13's DTO has no colours or
    // offer flag) start as the source export's empty defaults.
    image: firstImageUrl(data['images']),
    colors: [],
    variants: toMockVariants(data['variants'], nextId),
    description: '',
    isSpecialOffer: false,
  };
}

/** The first gallery URL the form sent, or '' when it sent none. */
function firstImageUrl(value: unknown): string {
  if (!Array.isArray(value)) {
    return '';
  }

  const first = value.find((image) => typeof image?.url === 'string' && image.url.trim() !== '');

  return typeof first?.url === 'string' ? first.url.trim() : '';
}

/** `ProductVariantInput[]` → the fixture's flatter variant shape. */
function toMockVariants(value: unknown, productId: string): fixtures.MockProduct['variants'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((variant, index) => {
    const data = asRecord(variant);
    const attributes = asRecord(data['attributes']);
    const label = Object.values(attributes)
      .filter((part): part is string => typeof part === 'string')
      .join(' / ');

    return {
      id: `${productId}-v${index + 1}`,
      name: label === '' ? `واریانت ${index + 1}` : label,
      price: amount(data['price'], 0),
      quantity: amount(data['stock'], 0),
    };
  });
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
