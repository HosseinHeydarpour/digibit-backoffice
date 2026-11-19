// src/app/features/shipping/services/shipping.service.ts
//
// The shipping API surface (BO-K05).
//
// `list` returns the array, not a `Page`: the shop has a handful of methods and
// the checkout needs them as one ordered set. `setDefault` is its own call so
// the server can clear the previous default in the same transaction; the client
// never patches two rows to move the flag.

import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/services/api';
import type { EntityId } from '@shared/models';
import { Observable } from 'rxjs';

import type {
  ShippingDeleteResult,
  ShippingMethod,
  ShippingMethodInput,
} from '../models/shipping-method.model';

const SHIPPING_PATH = '/shipping-methods';

/**
 * Shipping methods reads and writes.
 *
 * Failures arrive as the global `ApiError`; the form maps a 422's `fields` under
 * the inputs, and a delete answers `deleted: false` when a method used by orders
 * was only switched off.
 */
@Injectable({ providedIn: 'root' })
export class ShippingService {
  private readonly api = inject(ApiService);

  /** `GET /shipping-methods` → every method in display order. */
  list(): Observable<ShippingMethod[]> {
    return this.api.get<ShippingMethod[]>(SHIPPING_PATH);
  }

  /** `POST /shipping-methods` → the created method (order/active are server-owned). */
  create(input: ShippingMethodInput): Observable<ShippingMethod> {
    return this.api.post<ShippingMethod>(SHIPPING_PATH, input);
  }

  /** `PUT /shipping-methods/:id` → the updated method. */
  update(id: EntityId, input: ShippingMethodInput): Observable<ShippingMethod> {
    return this.api.put<ShippingMethod>(`${SHIPPING_PATH}/${encodeURIComponent(id)}`, input);
  }

  /** `DELETE /shipping-methods/:id` → removed, or switched off when orders use it. */
  remove(id: EntityId): Observable<ShippingDeleteResult> {
    return this.api.delete<ShippingDeleteResult>(`${SHIPPING_PATH}/${encodeURIComponent(id)}`);
  }

  /** `PATCH …/:id/status` — target state, not a flip. */
  setStatus(id: EntityId, isActive: boolean): Observable<ShippingMethod> {
    return this.api.patch<ShippingMethod>(`${SHIPPING_PATH}/${encodeURIComponent(id)}/status`, {
      isActive,
    });
  }

  /** `PATCH …/:id/default` — the server clears the previous default. */
  setDefault(id: EntityId): Observable<ShippingMethod> {
    return this.api.patch<ShippingMethod>(`${SHIPPING_PATH}/${encodeURIComponent(id)}/default`, {});
  }
}
