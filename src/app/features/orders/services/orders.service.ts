// src/app/features/orders/services/orders.service.ts
//
// The orders API surface (BO-H01; BO-H09 adds the mutation methods on top).
//
// The storefront's order endpoints speak PascalCase statuses and ISO dates, so
// this service is where those become the panel's lowercase `OrderStatus` and
// UTC milliseconds. Keeping that translation here means every page binds the
// same model the mock used to answer with.

import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/services/api';
import type { EntityId, Page } from '@shared/models';
import { ORDER_STATUS_API, orderStatusFromApi } from '@shared/models';
import { map, type Observable } from 'rxjs';

import type {
  Order,
  OrderCancelInput,
  OrderListItem,
  OrderQuery,
  OrderStatusChange,
} from '../models/order.model';

const ORDERS_PATH = '/orders';

/** A backend timestamp (ISO string) → epoch ms, or `0` when absent. */
function millis(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  return typeof value === 'number' ? value : Date.parse(value) || 0;
}

function nullableMillis(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return millis(value);
}

export function buildQuery(query: OrderQuery = {}): HttpParams {
  let params = new HttpParams();

  const setText = (key: string, value: string | null | undefined): void => {
    if (value === null || value === undefined) {
      return;
    }

    const text = value.trim();
    if (text === '') {
      return;
    }

    params = params.set(key, text);
  };

  const setPositive = (key: string, value: number | undefined): void => {
    if (value === undefined || !Number.isFinite(value) || value <= 0) {
      return;
    }

    params = params.set(key, String(value));
  };

  const setMillis = (key: string, value: number | undefined): void => {
    if (value === undefined || !Number.isFinite(value) || value < 0) {
      return;
    }

    params = params.set(key, String(value));
  };

  setText('query', query.query);
  setText('customerId', query.customerId);
  setText('status', query.status ? ORDER_STATUS_API[query.status] : undefined);
  setMillis('from', query.from);
  setMillis('to', query.to);
  setPositive('page', query.page);
  setPositive('pageSize', query.pageSize);
  setText('sort', query.sort);

  if (query.sort) {
    setText('dir', query.dir ?? 'asc');
  }

  return params;
}

/** One list row, normalised to the panel's model. */
export function mapOrderListItem(raw: {
  id: string;
  code: string;
  customerId?: string;
  customerName?: string;
  status: string;
  total: number;
  itemCount?: number;
  createdAt: string | number;
}): OrderListItem {
  return {
    id: raw.id,
    code: raw.code,
    customerId: raw.customerId ?? '',
    customerName: raw.customerName ?? '',
    status: orderStatusFromApi(raw.status),
    total: raw.total,
    itemCount: raw.itemCount ?? 0,
    createdAt: millis(raw.createdAt),
  };
}

/** The full record, with ISO dates flattened to millis and `history` renamed. */
export function mapOrder(raw: {
  id: string;
  code: string;
  customerId?: string;
  customerName?: string;
  status: string;
  total: number;
  subtotal?: number;
  discount?: number;
  shippingCost?: number;
  shippingMethod?: string;
  itemCount?: number;
  createdAt: string | number;
  address?: Record<string, string>;
  payment?: {
    method?: string;
    gateway?: string | null;
    trackingCode?: string | null;
    paidAt?: string | number | null;
  };
  items?: {
    id: string;
    productId?: string;
    productName: string;
    productImage?: string | null;
    variantName?: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice?: number;
  }[];
  history?: { id: string; status: string; note?: string | null; createdAt: string | number }[];
  statusHistory?: {
    id: string;
    status: string;
    note?: string | null;
    createdAt: string | number;
  }[];
}): Order {
  const address = raw.address ?? {};

  return {
    ...mapOrderListItem(raw),
    items: (raw.items ?? []).map((item) => ({
      id: item.id,
      productId: item.productId ?? '',
      productName: item.productName,
      productImage: item.productImage ?? null,
      variantName: item.variantName ?? null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice ?? item.unitPrice * item.quantity,
    })),
    subtotal: raw.subtotal ?? 0,
    discount: raw.discount ?? 0,
    shippingCost: raw.shippingCost ?? 0,
    shippingMethod: raw.shippingMethod ?? '',
    address: {
      fullName: address['fullName'] ?? '',
      phone: address['phone'] ?? '',
      province: address['province'] ?? '',
      city: address['city'] ?? '',
      postalCode: address['postalCode'] ?? '',
      address: address['address'] ?? '',
    },
    payment: {
      method: raw.payment?.method ?? 'online',
      gateway: raw.payment?.gateway ?? null,
      trackingCode: raw.payment?.trackingCode ?? null,
      paidAt: nullableMillis(raw.payment?.paidAt),
    },
    statusHistory: (raw.history ?? raw.statusHistory ?? []).map((entry) => ({
      id: entry.id,
      status: orderStatusFromApi(entry.status),
      note: entry.note ?? null,
      createdAt: millis(entry.createdAt),
    })),
  };
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly api = inject(ApiService);

  list(query: OrderQuery = {}): Observable<Page<OrderListItem>> {
    return this.api
      .getPage<Parameters<typeof mapOrderListItem>[0]>(ORDERS_PATH, buildQuery(query))
      .pipe(map((page) => ({ ...page, items: page.items.map(mapOrderListItem) })));
  }

  get(id: EntityId): Observable<Order> {
    return this.api
      .get<Parameters<typeof mapOrder>[0]>(`${ORDERS_PATH}/${encodeURIComponent(id)}`)
      .pipe(map(mapOrder));
  }

  changeStatus(id: EntityId, input: OrderStatusChange): Observable<Order> {
    return this.api
      .patch<Parameters<typeof mapOrder>[0]>(`${ORDERS_PATH}/${encodeURIComponent(id)}/status`, {
        status: ORDER_STATUS_API[input.status],
        note: input.note,
      })
      .pipe(map(mapOrder));
  }

  cancel(id: EntityId, input: OrderCancelInput): Observable<Order> {
    return this.api
      .post<Parameters<typeof mapOrder>[0]>(
        `${ORDERS_PATH}/${encodeURIComponent(id)}/cancel`,
        input,
      )
      .pipe(map(mapOrder));
  }
}
