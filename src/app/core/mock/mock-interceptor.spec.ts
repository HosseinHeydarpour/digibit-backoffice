import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import type { ApiResponse, PageMeta } from '@shared/models';
import { catchError, firstValueFrom, of } from 'rxjs';

import { MOCK_HEADER, mockInterceptor, resetMockState } from './mock-interceptor';

describe('mockInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    // The soft-delete set is module state: one spec must not hide a product
    // from the next (BO-F15).
    resetMockState();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([mockInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('answers from fixtures when X-Mock: 1 is set', async () => {
    const body = await firstValueFrom(
      http.get<ApiResponse<unknown[]>>('/api/v1/products', {
        headers: { [MOCK_HEADER]: '1' },
        // The whole export in one page — the default page size is 20.
        params: { pageSize: 100 },
      }),
    );

    // no httpMock.expectOne — nothing reached the network.
    // 99 = the real shop export in products-data.ts.
    expect(body.data.length).toBe(99);
  });

  it('passes through to the network without the header', () => {
    http.get('/api/v1/products').subscribe();
    const req = httpMock.expectOne('/api/v1/products');
    expect(req.request.headers.has(MOCK_HEADER)).toBe(false);
    req.flush({ data: [] });
  });

  it('returns the real envelope shape', async () => {
    const body = await firstValueFrom(
      http.get<ApiResponse<unknown[]>>('/api/v1/products', { headers: { [MOCK_HEADER]: '1' } }),
    );

    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('meta');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.message).toBe('');
  });

  it('paginates using page and pageSize', async () => {
    const body = await firstValueFrom(
      http.get<ApiResponse<unknown[]>>('/api/v1/products', {
        headers: { [MOCK_HEADER]: '1' },
        params: { page: 2, pageSize: 5 },
      }),
    );

    const meta = body.meta as PageMeta;
    expect(body.data.length).toBe(5);
    expect(meta.page).toBe(2);
    expect(meta.pageSize).toBe(5);
    expect(meta.total).toBe(99);
  });

  it('gives every list row the threshold its low-stock badge compares against (BO-F12)', async () => {
    const body = await firstValueFrom(
      http.get<ApiResponse<{ stock: number; lowStockThreshold: number }[]>>('/api/v1/products', {
        headers: { [MOCK_HEADER]: '1' },
        params: { pageSize: 100 },
      }),
    );

    // The badge is `stock <= lowStockThreshold`; an undefined threshold would
    // silently print a healthy row, so the field is pinned for every row.
    for (const row of body.data) {
      expect(typeof row.stock).toBe('number');
      expect(typeof row.lowStockThreshold).toBe('number');
    }
  });

  it('filters products by Persian name and by Latin SKU (BO-F03 tc 1, tc 10)', async () => {
    // «غلط گیر» names exactly one row of the shop export («غلط گیر قلمی») —
    // deliberately a two-word term: a single word can sit inside another
    // («طلق» also matches «دفتر طلقی»).
    const byName = await firstValueFrom(
      http.get<ApiResponse<{ name: string }[]>>('/api/v1/products', {
        headers: { [MOCK_HEADER]: '1' },
        params: { query: 'غلط گیر' },
      }),
    );

    expect(byName.data).toHaveLength(1);
    expect(byName.data[0].name).toContain('غلط گیر');

    const bySku = await firstValueFrom(
      http.get<ApiResponse<{ sku: string }[]>>('/api/v1/products', {
        headers: { [MOCK_HEADER]: '1' },
        params: { query: 'SKU-1004' },
      }),
    );

    expect(bySku.data).toHaveLength(1);
    expect(bySku.data[0].sku).toBe('SKU-1004');
  });

  it('combines category and status filters (BO-F03 tc 3, tc 4)', async () => {
    const body = await firstValueFrom(
      http.get<ApiResponse<{ categoryId: string; status: string }[]>>('/api/v1/products', {
        headers: { [MOCK_HEADER]: '1' },
        params: { categoryId: 'pcat-stationery', status: 'inactive' },
      }),
    );

    expect(body.data.length).toBeGreaterThan(0);
    for (const row of body.data) {
      expect(row.categoryId).toBe('pcat-stationery');
      expect(row.status).toBe('inactive');
    }
  });

  it('sorts by price descending and by createdAt ascending (BO-F04 tc 3, tc 4)', async () => {
    const byPrice = await firstValueFrom(
      http.get<ApiResponse<{ price: number }[]>>('/api/v1/products', {
        headers: { [MOCK_HEADER]: '1' },
        params: { sort: 'price', dir: 'desc', pageSize: 100 },
      }),
    );

    for (let index = 1; index < byPrice.data.length; index += 1) {
      expect(byPrice.data[index - 1].price).toBeGreaterThanOrEqual(byPrice.data[index].price);
    }

    const byDate = await firstValueFrom(
      http.get<ApiResponse<{ createdAt: number }[]>>('/api/v1/products', {
        headers: { [MOCK_HEADER]: '1' },
        params: { sort: 'createdAt', dir: 'asc', pageSize: 100 },
      }),
    );

    for (let index = 1; index < byDate.data.length; index += 1) {
      expect(byDate.data[index - 1].createdAt).toBeLessThanOrEqual(byDate.data[index].createdAt);
    }
  });

  it('applies the configured artificial delay', async () => {
    // A loading state is only trustworthy if the response is genuinely async.
    // Awaiting the observable proves the delay elapses instead of resolving inline.
    const started = performance.now();
    await firstValueFrom(http.get('/api/v1/products', { headers: { [MOCK_HEADER]: '1' } }));
    const elapsed = performance.now() - started;

    expect(elapsed).toBeGreaterThanOrEqual(environment.mockDelayMs * 0.5);
  });

  it('simulates a 500 with __mockStatus', async () => {
    const error = await firstValueFrom(
      http
        .get<HttpErrorResponse>('/api/v1/products', {
          headers: { [MOCK_HEADER]: '1' },
          params: { __mockStatus: 500 },
        })
        .pipe(catchError((e) => of<HttpErrorResponse>(e as HttpErrorResponse))),
    );

    expect(error.status).toBe(500);
  });

  it('returns 404 for an unknown id', async () => {
    const error = await firstValueFrom(
      http
        .get<HttpErrorResponse>('/api/v1/products/does-not-exist', {
          headers: { [MOCK_HEADER]: '1' },
        })
        .pipe(catchError((e) => of<HttpErrorResponse>(e as HttpErrorResponse))),
    );

    expect(error.status).toBe(404);
  });

  it('serves every one of the 12 modules', async () => {
    const urls = [
      '/api/v1/dashboard/summary',
      '/api/v1/products',
      '/api/v1/categories',
      '/api/v1/brands',
      '/api/v1/orders',
      '/api/v1/customers',
      '/api/v1/coupons',
      '/api/v1/shipping-methods',
      '/api/v1/banners',
      '/api/v1/settings',
      '/api/v1/comments',
      '/api/v1/tickets',
    ];

    for (const url of urls) {
      // Rejects on 404, which is what makes this a real assertion rather than
      // a check that the value is merely non-undefined.
      const result = await firstValueFrom(
        http.get<ApiResponse<unknown>>(url, { headers: { [MOCK_HEADER]: '1' } }),
      );
      expect(result, url).toBeDefined();
    }
  });

  it('leaves an unrecognised url to the network', () => {
    http.get('/api/v1/unknown-module', { headers: { [MOCK_HEADER]: '1' } }).subscribe();
    httpMock.expectOne('/api/v1/unknown-module').flush({ data: [] });
  });

  // ─── POST /products (BO-F13) ──────────────────────────────────────────────

  /** The body a valid create sends; `overrides` breaks one field at a time. */
  function draft(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      name: 'محصول تازه',
      slug: 'brand-new-product',
      sku: 'SKU-NEW-1',
      categoryId: 'pcat-stationery',
      brandId: null,
      shortDescription: 'کوتاه',
      description: 'توضیح',
      price: 100_000,
      stock: 3,
      lowStockThreshold: 5,
      status: 'draft',
      variants: [],
      ...overrides,
    };
  }

  it('creates a product and answers 201 with the server id (BO-F13 tc 1)', async () => {
    const body = await firstValueFrom(
      http.post<ApiResponse<{ id: string; name: string }>>('/api/v1/products', draft(), {
        headers: { [MOCK_HEADER]: '1' },
      }),
    );

    expect(body.data.name).toBe('محصول تازه');
    expect(body.data.id).toBeTruthy();
    expect(body.message).toContain('ایجاد شد');
  });

  it('rejects an existing slug with a 422 field map (BO-F13 tc 3)', async () => {
    // Read one real slug from the DETAIL endpoint: the list row deliberately
    // does not carry a slug (the table never renders it).
    const first = await firstValueFrom(
      http.get<ApiResponse<{ id: string }[]>>('/api/v1/products', {
        headers: { [MOCK_HEADER]: '1' },
        params: { pageSize: 1 },
      }),
    );

    const detail = await firstValueFrom(
      http.get<ApiResponse<{ slug: string }>>(`/api/v1/products/${first.data[0].id}`, {
        headers: { [MOCK_HEADER]: '1' },
      }),
    );

    const error = await firstValueFrom(
      http
        .post<HttpErrorResponse>('/api/v1/products', draft({ slug: detail.data.slug }), {
          headers: { [MOCK_HEADER]: '1' },
        })
        .pipe(catchError((e: HttpErrorResponse) => of(e))),
    );

    expect(error.status).toBe(422);
    expect(error.error.error.code).toBe('VALIDATION');
    expect(error.error.error.fields.slug[0]).toContain('قبلاً');
  });

  it('rejects an empty name and a duplicate SKU in the same envelope', async () => {
    const error = await firstValueFrom(
      http
        .post<HttpErrorResponse>('/api/v1/products', draft({ name: '', sku: 'SKU-1001' }), {
          headers: { [MOCK_HEADER]: '1' },
        })
        .pipe(catchError((e: HttpErrorResponse) => of(e))),
    );

    expect(error.status).toBe(422);
    expect(error.error.error.fields.name[0]).toBe('نام محصول الزامی است.');
    expect(error.error.error.fields.sku[0]).toContain('قبلاً');
  });
  it('rejects a duplicate slug on UPDATE but accepts the product own values', async () => {
    const ids = await firstValueFrom(
      http.get<ApiResponse<{ id: string }[]>>('/api/v1/products', {
        headers: { [MOCK_HEADER]: '1' },
        params: { pageSize: 2 },
      }),
    );

    const detail = (id: string) =>
      firstValueFrom(
        http.get<ApiResponse<Record<string, unknown> & { slug: string }>>(
          `/api/v1/products/${id}`,
          {
            headers: { [MOCK_HEADER]: '1' },
          },
        ),
      );

    const first = (await detail(ids.data[0].id)).data;
    const second = (await detail(ids.data[1].id)).data;

    // Resending its own slug is not a duplicate (BO-F14 tc 10).
    const own = await firstValueFrom(
      http.put<ApiResponse<{ slug: string }>>(`/api/v1/products/${ids.data[0].id}`, first, {
        headers: { [MOCK_HEADER]: '1' },
      }),
    );
    expect(own.data.slug).toBe(first.slug);

    // Taking another product's slug is (BO-F14 tc 13).
    const clash = await firstValueFrom(
      http
        .put<HttpErrorResponse>(
          `/api/v1/products/${ids.data[0].id}`,
          { ...first, slug: second.slug },
          {
            headers: { [MOCK_HEADER]: '1' },
          },
        )
        .pipe(catchError((e: HttpErrorResponse) => of(e))),
    );

    expect(clash.status).toBe(422);
    expect(clash.error.error.fields.slug[0]).toContain('قبلاً');
  });
  it('soft-deletes a product: every read hides it afterwards (BO-F15)', async () => {
    const list = await firstValueFrom(
      http.get<ApiResponse<{ id: string }[]>>('/api/v1/products', {
        headers: { [MOCK_HEADER]: '1' },
        params: { pageSize: 1 },
      }),
    );

    const id = list.data[0].id;

    const deleted = await firstValueFrom(
      http.delete<ApiResponse<{ id: string }>>(`/api/v1/products/${id}`, {
        headers: { [MOCK_HEADER]: '1' },
      }),
    );
    expect(deleted.data.id).toBe(id);

    // The list no longer contains it (tc 3/8)…
    const after = await firstValueFrom(
      http.get<ApiResponse<{ id: string }[]>>('/api/v1/products', {
        headers: { [MOCK_HEADER]: '1' },
        params: { pageSize: 100 },
      }),
    );
    expect(after.data.some((row) => row.id === id)).toBe(false);

    // …and its detail answers 404, like the real soft-deleting endpoint.
    const gone = await firstValueFrom(
      http
        .get<HttpErrorResponse>(`/api/v1/products/${id}`, { headers: { [MOCK_HEADER]: '1' } })
        .pipe(catchError((e: HttpErrorResponse) => of(e))),
    );
    expect(gone.status).toBe(404);
  });

  it('answers 404 when deleting an id that is already gone (BO-F15 tc 10)', async () => {
    const missing = await firstValueFrom(
      http
        .delete<HttpErrorResponse>('/api/v1/products/does-not-exist', {
          headers: { [MOCK_HEADER]: '1' },
        })
        .pipe(catchError((e: HttpErrorResponse) => of(e))),
    );

    expect(missing.status).toBe(404);
  });
  it('keeps a created product: it shows up in the list and on its detail page', async () => {
    const created = await firstValueFrom(
      http.post<ApiResponse<{ id: string; name: string; slug: string; variants: unknown[] }>>(
        '/api/v1/products',
        draft({ slug: 'created-this-session', name: 'محصول تازهٔ تست' }),
        { headers: { [MOCK_HEADER]: '1' } },
      ),
    );

    // The list the user returns to contains it (the bug this pins).
    const list = await firstValueFrom(
      http.get<ApiResponse<{ id: string; name: string }[]>>('/api/v1/products', {
        headers: { [MOCK_HEADER]: '1' },
        params: { pageSize: 200 },
      }),
    );
    expect(list.data.some((row) => row.id === created.data.id)).toBe(true);

    // …and the redirect target `/products/:id/edit` resolves instead of 404ing.
    const detail = await firstValueFrom(
      http.get<ApiResponse<{ id: string }>>(`/api/v1/products/${created.data.id}`, {
        headers: { [MOCK_HEADER]: '1' },
      }),
    );
    expect(detail.data.id).toBe(created.data.id);
  });

  it('updates a created product in place', async () => {
    const created = await firstValueFrom(
      http.post<ApiResponse<{ id: string }>>(
        '/api/v1/products',
        draft({ slug: 'created-edit-me', name: 'قبل از ویرایش' }),
        { headers: { [MOCK_HEADER]: '1' } },
      ),
    );

    await firstValueFrom(
      http.put<ApiResponse<unknown>>(
        `/api/v1/products/${created.data.id}`,
        draft({ slug: 'created-edit-me', name: 'بعد از ویرایش' }),
        { headers: { [MOCK_HEADER]: '1' } },
      ),
    );

    const detail = await firstValueFrom(
      http.get<ApiResponse<{ name: string }>>(`/api/v1/products/${created.data.id}`, {
        headers: { [MOCK_HEADER]: '1' },
      }),
    );
    expect(detail.data.name).toBe('بعد از ویرایش');
  });
  it('answers the slug check with the availability and a free alternative (BO-F16)', async () => {
    const first = await firstValueFrom(
      http.get<ApiResponse<{ id: string; slug: string }[]>>('/api/v1/products', {
        headers: { [MOCK_HEADER]: '1' },
        params: { pageSize: 1 },
      }),
    );

    const detail = await firstValueFrom(
      http.get<ApiResponse<{ slug: string }>>(`/api/v1/products/${first.data[0].id}`, {
        headers: { [MOCK_HEADER]: '1' },
      }),
    );

    const taken = await firstValueFrom(
      http.get<ApiResponse<{ available: boolean; suggestion: string }>>(
        '/api/v1/products/slug-check',
        {
          headers: { [MOCK_HEADER]: '1' },
          params: { slug: detail.data.slug },
        },
      ),
    );
    expect(taken.data.available).toBe(false);
    expect(taken.data.suggestion).toBe(`${detail.data.slug}-2`);

    // The same slug is free when it belongs to the product being edited.
    const own = await firstValueFrom(
      http.get<ApiResponse<{ available: boolean }>>('/api/v1/products/slug-check', {
        headers: { [MOCK_HEADER]: '1' },
        params: { slug: detail.data.slug, excludeId: first.data[0].id },
      }),
    );
    expect(own.data.available).toBe(true);

    const free = await firstValueFrom(
      http.get<ApiResponse<{ available: boolean }>>('/api/v1/products/slug-check', {
        headers: { [MOCK_HEADER]: '1' },
        params: { slug: 'nobody-uses-this-slug' },
      }),
    );
    expect(free.data.available).toBe(true);
  });
  it('returns the nested category tree for ?tree=true (BO-G01)', async () => {
    const body = await firstValueFrom(
      http.get<
        ApiResponse<
          { id: string; slug: string; icon: string; productCount: number; children: unknown[] }[]
        >
      >('/api/v1/categories', { headers: { [MOCK_HEADER]: '1' }, params: { tree: 'true' } }),
    );

    const stationery = body.data.find((node) => node.slug === 'stationery');

    expect(stationery).toBeTruthy();
    expect(stationery!.children.length).toBe(2);
    expect(typeof stationery!.productCount).toBe('number');
    expect(stationery!.icon).toContain('pi pi-');

    // Every node is a root or a child of one — never orphaned.
    const ids = new Set(body.data.map((node) => node.id));
    for (const node of body.data) {
      expect(node.children.length).toBeGreaterThanOrEqual(0);
    }
    expect(ids.size).toBe(body.data.length);
  });

  it('keeps the flat category list for the product form', async () => {
    const body = await firstValueFrom(
      http.get<ApiResponse<{ id: string; parentId: string | null }[]>>('/api/v1/categories', {
        headers: { [MOCK_HEADER]: '1' },
      }),
    );

    expect(body.data.some((row) => row.parentId === null)).toBe(true);
    expect(body.data.some((row) => row.parentId !== null)).toBe(true);
  });
  it('creates a category and shows it in the tree (BO-G02 tc 1/7)', async () => {
    const created = await firstValueFrom(
      http.post<ApiResponse<{ id: string; name: string }>>(
        '/api/v1/categories',
        {
          name: 'لوازم اداری',
          slug: 'office',
          icon: 'pi pi-book',
          order: 9,
          isActive: true,
          description: '',
          parentId: null,
        },
        { headers: { [MOCK_HEADER]: '1' } },
      ),
    );

    expect(created.data.name).toBe('لوازم اداری');

    const tree = await firstValueFrom(
      http.get<ApiResponse<{ id: string; children: { id: string }[] }[]>>('/api/v1/categories', {
        headers: { [MOCK_HEADER]: '1' },
        params: { tree: 'true' },
      }),
    );

    const node = tree.data.find((root) => root.id === created.data.id);
    expect(node).toBeTruthy();
    expect(node!.children).toEqual([]);
  });

  it('rejects a duplicate category name at the same level (BO-G02 tc 4)', async () => {
    const error = await firstValueFrom(
      http
        .post<HttpErrorResponse>(
          '/api/v1/categories',
          { name: 'لوازم تحریر', slug: 'stationery-2', order: 9, isActive: true, parentId: null },
          { headers: { [MOCK_HEADER]: '1' } },
        )
        .pipe(catchError((e: HttpErrorResponse) => of(e))),
    );

    expect(error.status).toBe(422);
    expect(error.error.error.fields.name[0]).toContain('همین سطح');
  });

  it('updates a category and rejects a slug another node owns (BO-G02 tc 2/5)', async () => {
    const tree = await firstValueFrom(
      http.get<ApiResponse<{ id: string; slug: string }[]>>('/api/v1/categories', {
        headers: { [MOCK_HEADER]: '1' },
        params: { tree: 'true' },
      }),
    );

    const [first, second] = tree.data;

    const renamed = await firstValueFrom(
      http.put<ApiResponse<{ name: string }>>(
        `/api/v1/categories/${first.id}`,
        { name: 'نام تازه', slug: first.slug, order: 1, isActive: true, parentId: null },
        { headers: { [MOCK_HEADER]: '1' } },
      ),
    );
    expect(renamed.data.name).toBe('نام تازه');

    const clash = await firstValueFrom(
      http
        .put<HttpErrorResponse>(
          `/api/v1/categories/${first.id}`,
          { name: 'نام تازه', slug: second.slug, order: 1, isActive: true, parentId: null },
          { headers: { [MOCK_HEADER]: '1' } },
        )
        .pipe(catchError((e: HttpErrorResponse) => of(e))),
    );

    expect(clash.status).toBe(422);
    expect(clash.error.error.fields.slug[0]).toContain('قبلاً');
  });
  it('appends a new category after its siblings (BO-G03 ordering)', async () => {
    const created = await firstValueFrom(
      http.post<ApiResponse<{ id: string; order: number; parentId: string | null }>>(
        '/api/v1/categories',
        { name: 'آخرین دسته', slug: 'last-one', isActive: true },
        { headers: { [MOCK_HEADER]: '1' } },
      ),
    );

    // The seed has roots 1..9, so the new root is 10 — not `CATEGORIES.length + 1`
    // (which counted children too and collided with existing positions).
    expect(created.data.order).toBe(10);
    expect(created.data.parentId).toBeNull();
  });

  it('moves a category under a root and appends its position there', async () => {
    const moved = await firstValueFrom(
      http.patch<ApiResponse<{ parentId: string }>>(
        '/api/v1/categories/pcat-cables',
        { parentId: 'pcat-stationery' },
        { headers: { [MOCK_HEADER]: '1' } },
      ),
    );

    expect(moved.data.parentId).toBe('pcat-stationery');
    expect(moved.data).toMatchObject({ order: 3 }); // after the two stationery children
  });

  it('refuses a third level and a cycle (BO-G03)', async () => {
    const thirdLevel = await firstValueFrom(
      http
        .patch<HttpErrorResponse>(
          '/api/v1/categories/pcat-cables',
          { parentId: 'pcat-stationery-paper' },
          { headers: { [MOCK_HEADER]: '1' } },
        )
        .pipe(catchError((e: HttpErrorResponse) => of(e))),
    );
    expect(thirdLevel.status).toBe(422);

    const cycle = await firstValueFrom(
      http
        .patch<HttpErrorResponse>(
          '/api/v1/categories/pcat-stationery',
          { parentId: 'pcat-stationery' },
          { headers: { [MOCK_HEADER]: '1' } },
        )
        .pipe(catchError((e: HttpErrorResponse) => of(e))),
    );
    expect(cycle.status).toBe(422);

    const parentWithKids = await firstValueFrom(
      http
        .patch<HttpErrorResponse>(
          '/api/v1/categories/pcat-stationery',
          { parentId: 'pcat-storage' },
          { headers: { [MOCK_HEADER]: '1' } },
        )
        .pipe(catchError((e: HttpErrorResponse) => of(e))),
    );
    expect(parentWithKids.status).toBe(422);
  });
  it('manual order is a slot: setting 1 moves the old first row to 2 (BO-G03)', async () => {
    const tree = await firstValueFrom(
      http.get<ApiResponse<{ id: string; name: string; slug: string; order: number }[]>>(
        '/api/v1/categories',
        { headers: { [MOCK_HEADER]: '1' }, params: { tree: 'true' } },
      ),
    );

    const [first, second] = tree.data;

    await firstValueFrom(
      http.put<ApiResponse<unknown>>(
        `/api/v1/categories/${second.id}`,
        { name: second.name, slug: second.slug, order: 1, isActive: true, parentId: null },
        { headers: { [MOCK_HEADER]: '1' } },
      ),
    );

    const after = await firstValueFrom(
      http.get<ApiResponse<{ id: string; order: number }[]>>('/api/v1/categories', {
        headers: { [MOCK_HEADER]: '1' },
        params: { tree: 'true' },
      }),
    );

    expect(after.data[0].id).toBe(second.id);
    expect(after.data[0].order).toBe(1);
    expect(after.data.find((node) => node.id === first.id)!.order).toBe(2);
  });
  it('an order-only PATCH reorders the level (BO-G03)', async () => {
    await firstValueFrom(
      http.patch<ApiResponse<unknown>>(
        '/api/v1/categories/pcat-cables',
        { order: 1 },
        { headers: { [MOCK_HEADER]: '1' } },
      ),
    );

    const after = await firstValueFrom(
      http.get<ApiResponse<{ id: string; order: number }[]>>('/api/v1/categories', {
        headers: { [MOCK_HEADER]: '1' },
        params: { tree: 'true' },
      }),
    );

    expect(after.data[0].id).toBe('pcat-cables');
    expect(after.data[0].order).toBe(1);
    expect(after.data.find((node) => node.id === 'pcat-stationery')!.order).toBe(2);
  });

  it('moves the products of a deleted category to the default bucket (BO-G04 tc 2)', async () => {
    const before = await firstValueFrom(
      http.get<ApiResponse<{ id: string; productCount: number }[]>>('/api/v1/categories', {
        headers: { [MOCK_HEADER]: '1' },
        params: { tree: 'true' },
      }),
    );
    const defaultBefore = before.data.find((node) => node.id === 'pcat-uncategorized')!;
    const categoryBefore = before.data.find((node) => node.id === 'pcat-accessories')!;

    await firstValueFrom(
      http.delete<ApiResponse<unknown>>('/api/v1/categories/pcat-accessories', {
        headers: { [MOCK_HEADER]: '1' },
        params: { strategy: 'transfer' },
      }),
    );

    const after = await firstValueFrom(
      http.get<ApiResponse<{ id: string; productCount: number }[]>>('/api/v1/categories', {
        headers: { [MOCK_HEADER]: '1' },
        params: { tree: 'true' },
      }),
    );

    expect(after.data.map((node) => node.id)).not.toContain('pcat-accessories');
    expect(after.data.find((node) => node.id === 'pcat-uncategorized')!.productCount).toBe(
      defaultBefore.productCount + categoryBefore.productCount,
    );
  });

  it('refuses to delete the default bucket (tc 1)', async () => {
    const refused = await firstValueFrom(
      http
        .delete<HttpErrorResponse>('/api/v1/categories/pcat-uncategorized', {
          headers: { [MOCK_HEADER]: '1' },
          params: { strategy: 'transfer' },
        })
        .pipe(catchError((error: HttpErrorResponse) => of(error))),
    );

    expect(refused.status).toBe(409);
    expect(refused.error.error.message).toContain('پیش‌فرض');
  });

  it('transfers the children of a deleted parent and closes the gap (tc 3/7)', async () => {
    const parent = await createCategory('والد آزمایشی', 'test-parent');
    const child = await createCategory('فرزند آزمایشی', 'test-child', parent);

    await firstValueFrom(
      http.delete<ApiResponse<{ deleted: string[] }>>(`/api/v1/categories/${parent}`, {
        headers: { [MOCK_HEADER]: '1' },
        params: { strategy: 'transfer' },
      }),
    );

    const tree = await firstValueFrom(
      http.get<ApiResponse<{ id: string; parentId: string | null; order: number }[]>>(
        '/api/v1/categories',
        { headers: { [MOCK_HEADER]: '1' }, params: { tree: 'true' } },
      ),
    );

    const moved = tree.data.find((node) => node.id === child);
    expect(moved).toMatchObject({ parentId: null });
    // Roots stay 1..N with no hole where the deleted row was.
    expect(tree.data.map((node) => node.order)).toEqual(tree.data.map((_, index) => index + 1));
  });

  it('deletes the whole branch with cascade (tc 4)', async () => {
    const parent = await createCategory('والد حذف تودرتو', 'cascade-parent');
    const child = await createCategory('فرزند حذف تودرتو', 'cascade-child', parent);

    await firstValueFrom(
      http.delete<ApiResponse<{ deleted: string[] }>>(`/api/v1/categories/${parent}`, {
        headers: { [MOCK_HEADER]: '1' },
        params: { strategy: 'cascade' },
      }),
    );

    const tree = await firstValueFrom(
      http.get<ApiResponse<{ id: string }[]>>('/api/v1/categories', {
        headers: { [MOCK_HEADER]: '1' },
        params: { tree: 'true' },
      }),
    );

    const ids = tree.data.map((node) => node.id);
    expect(ids).not.toContain(parent);
    expect(ids).not.toContain(child);
  });

  it('frees the slug of a deleted category (tc 8)', async () => {
    await firstValueFrom(
      http.delete<ApiResponse<unknown>>('/api/v1/categories/pcat-stationery-paper', {
        headers: { [MOCK_HEADER]: '1' },
        params: { strategy: 'transfer' },
      }),
    );

    const reused = await firstValueFrom(
      http.post<ApiResponse<{ id: string; slug: string }>>(
        '/api/v1/categories',
        { name: 'دفتر و کاغذ جدید', slug: 'paper', isActive: true },
        { headers: { [MOCK_HEADER]: '1' } },
      ),
    );

    expect(reused.data.slug).toBe('paper');
  });

  it('keeps the products of a promoted child on transfer (tc 10)', async () => {
    const parent = await createCategory('والد دارای کالا', 'busy-parent');
    const child = await createCategory('فرزند دارای کالا', 'busy-child', parent);

    // One real product in the child, so the branch is not empty. Created rather
    // than patched: the seed rows are frozen, and `POST` is what persists.
    const created = await firstValueFrom(
      http.post<ApiResponse<{ id: string }>>(
        '/api/v1/products',
        {
          name: 'کالای تستی حذف دسته',
          slug: 'delete-test-product',
          sku: 'SKU-DELETE-TEST',
          categoryId: child,
          price: 100_000,
        },
        { headers: { [MOCK_HEADER]: '1' } },
      ),
    );
    const productId = created.data.id;

    await firstValueFrom(
      http.delete<ApiResponse<unknown>>(`/api/v1/categories/${parent}`, {
        headers: { [MOCK_HEADER]: '1' },
        params: { strategy: 'transfer' },
      }),
    );

    const moved = await firstValueFrom(
      http.get<ApiResponse<{ id: string }[]>>('/api/v1/products', {
        headers: { [MOCK_HEADER]: '1' },
        params: { categoryId: child },
      }),
    );

    // The child survived, so its product did not move anywhere.
    expect(moved.data.map((item) => item.id)).toEqual([productId]);
  });

  it('re-buckets the products of a cascaded branch (tc 10)', async () => {
    const parent = await createCategory('والد آبشار', 'cascade-busy-parent');
    const child = await createCategory('فرزند آبشار', 'cascade-busy-child', parent);

    const created = await firstValueFrom(
      http.post<ApiResponse<{ id: string }>>(
        '/api/v1/products',
        {
          name: 'کالای آبشاری',
          slug: 'cascade-product',
          sku: 'SKU-CASCADE',
          categoryId: child,
          price: 100_000,
        },
        { headers: { [MOCK_HEADER]: '1' } },
      ),
    );

    await firstValueFrom(
      http.delete<ApiResponse<unknown>>(`/api/v1/categories/${parent}`, {
        headers: { [MOCK_HEADER]: '1' },
        params: { strategy: 'cascade' },
      }),
    );

    const moved = await firstValueFrom(
      http.get<ApiResponse<{ id: string }[]>>('/api/v1/products', {
        headers: { [MOCK_HEADER]: '1' },
        params: { categoryId: 'pcat-uncategorized' },
      }),
    );

    expect(moved.data.map((item) => item.id)).toContain(created.data.id);
  });

  /** `POST /categories` with only the fields the mock needs. */
  async function createCategory(name: string, slug: string, parentId?: string): Promise<string> {
    const created = await firstValueFrom(
      http.post<ApiResponse<{ id: string }>>(
        '/api/v1/categories',
        { name, slug, isActive: true, parentId: parentId ?? null },
        { headers: { [MOCK_HEADER]: '1' } },
      ),
    );

    return created.data.id;
  }
});
