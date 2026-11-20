import type { APIRequestContext, APIResponse } from '@playwright/test';

/** The dev API the panel is configured against. */
export const API = 'http://localhost:5072/api/v1';

export const ADMIN = {
  email: 'admin@digibit.local',
  password: 'Admin@12345',
} as const;

function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function json<T>(response: APIResponse): Promise<T> {
  if (!response.ok()) {
    throw new Error(`${response.url()} → ${response.status()} ${await response.text()}`);
  }

  return (await response.json()) as T;
}

/** The seeded administrator's access token. */
export async function adminToken(request: APIRequestContext): Promise<string> {
  const response = await request.post(`${API}/auth/admin/login`, { data: ADMIN });
  const body = await json<{ accessToken: string }>(response);

  return body.accessToken;
}

/** A category for the product form; the first existing one is reused. */
export async function ensureCategory(request: APIRequestContext, token: string): Promise<string> {
  const list = await json<Array<{ id: string }>>(
    await request.get(`${API}/categories`, { headers: bearer(token) }),
  );

  if (list.length > 0) {
    return list[0]!.id;
  }

  const created = await json<{ id: string }>(
    await request.post(`${API}/categories`, {
      headers: bearer(token),
      data: { name: 'دسته تست', slug: `e2e-category-${Date.now()}`, isActive: true },
    }),
  );

  return created.id;
}

/** An active shipping method, created on the first run. */
export async function ensureShipping(request: APIRequestContext, token: string): Promise<string> {
  const list = await json<Array<{ id: string }>>(
    await request.get(`${API}/shipping-methods?includeInactive=true`, {
      headers: bearer(token),
    }),
  );

  if (list.length > 0) {
    return list[0]!.id;
  }

  const created = await json<{ id: string }>(
    await request.post(`${API}/shipping-methods`, {
      headers: bearer(token),
      data: {
        name: 'ارسال تست',
        cost: 50000,
        freeFrom: null,
        minDays: 1,
        maxDays: 3,
        isDefault: true,
        isActive: true,
      },
    }),
  );

  return created.id;
}

/**
 * One published product with stock, created fresh so an earlier run's sold-out
 * variant cannot make checkout fail.
 */
async function seedProduct(
  request: APIRequestContext,
  token: string,
): Promise<{ productId: string; variantId: string }> {
  const categoryId = await ensureCategory(request, token);
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const product = await json<{
    id: string;
    variants: Array<{ id: string }>;
  }>(
    await request.post(`${API}/products`, {
      headers: bearer(token),
      data: {
        name: `محصول تست ${suffix}`,
        slug: `e2e-product-${suffix}`,
        sku: `E2E-${suffix}`,
        categoryId,
        description: 'محصول ساخته‌شده برای تست e2e',
        price: 1_000_000,
        stock: 10,
        lowStockThreshold: 2,
        status: 'published',
        variants: [
          {
            sku: `E2E-${suffix}`,
            price: 1_000_000,
            stock: 10,
            attributes: { color: 'مشکی' },
          },
        ],
      },
    }),
  );

  return { productId: product.id, variantId: product.variants[0]!.id };
}

/**
 * An order in `Processing`, which is where BO-P09's UI flow starts.
 *
 * The customer side is real: OTP login → cart → checkout → two admin status
 * transitions. The unique phone avoids the OTP cooldown between tests.
 */
export async function seedProcessingOrder(
  request: APIRequestContext,
  adminAccessToken: string,
): Promise<string> {
  const { variantId } = await seedProduct(request, adminAccessToken);
  const shippingId = await ensureShipping(request, adminAccessToken);
  const phone = `09${String(Date.now()).slice(-9)}`;

  const otp = await json<{ debugCode?: string }>(
    await request.post(`${API}/auth/otp/send`, { data: { phone } }),
  );

  if (!otp.debugCode) {
    throw new Error('OTP debugCode is missing; run the API in Development.');
  }

  const customer = await json<{ accessToken: string }>(
    await request.post(`${API}/auth/otp/verify`, {
      data: { phone, code: otp.debugCode },
    }),
  );
  const customerHeaders = bearer(customer.accessToken);

  await json(
    await request.post(`${API}/cart/items`, {
      headers: customerHeaders,
      data: { variantId, quantity: 1 },
    }),
  );

  const order = await json<{ id: string }>(
    await request.post(`${API}/orders/checkout`, {
      headers: customerHeaders,
      data: {
        address: {
          fullName: 'مشتری تست',
          phone,
          province: 'تهران',
          city: 'تهران',
          postalCode: '1234567890',
          address: 'خیابان تست، پلاک ۱',
        },
        shippingMethodId: shippingId,
      },
    }),
  );

  for (const status of ['Paid', 'Processing']) {
    await json(
      await request.patch(`${API}/orders/${order.id}/status`, {
        headers: bearer(adminAccessToken),
        data: { status },
      }),
    );
  }

  return order.id;
}
