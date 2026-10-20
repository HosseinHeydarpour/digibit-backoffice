// src/app/features/products/services/products.service.ts
//
// A stand-in data source so the list page renders before BO-F05 wires the real
// API. The strategy is UI-first with the API mocked: the component holds NO
// fixture — it asks the service, so swapping this `of(FIXTURES)` for an HTTP
// `list(query)` later changes nothing above it.
//
// BO-F05 replaces `list()` with the typed CRUD (`list`/`get`/`create`/`update`/
// `remove`/`setStatus`) and a `buildQuery` that serialises the filter/pagination
// state BO-F03/F04 add. The method signature here (`Observable<readonly
// ProductListItem[]>`) is already that shape, so the page does not change.

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import type { ProductListItem } from '../models/product.model';

/** In-memory rows for the F02 scaffold. Lives with the service, not the page. */
const PRODUCT_FIXTURES: readonly ProductListItem[] = [
  {
    id: 'p-1001',
    name: 'کیبورد مکانیکی ریزر BlackWidow',
    categoryName: 'لوازم جانبی',
    brandName: 'ریزر',
    price: 1_850_000,
    stock: 0,
    status: 'published',
    createdAt: 1729142400000,
  },
  {
    id: 'p-1002',
    name: 'ماوس گیمینگ لاجیتک G502',
    categoryName: 'لوازم جانبی',
    brandName: 'لاجیتک',
    price: 920_000,
    stock: 3,
    status: 'published',
    createdAt: 1729056000000,
  },
  {
    id: 'p-1003',
    name: 'هدفون بی‌سیم سونی WH-1000XM5',
    categoryName: 'صوتی',
    brandName: 'سونی',
    price: 2_100_000,
    stock: 12,
    status: 'draft',
    createdAt: 1728969600000,
  },
  {
    id: 'p-1004',
    name: 'مانیتور ۲۴ اینچ ال‌جی UltraGear',
    categoryName: 'نمایشگر',
    brandName: 'ال‌جی',
    price: 8_400_000,
    stock: 25,
    status: 'inactive',
    createdAt: 1728883200000,
  },
];

@Injectable({ providedIn: 'root' })
export class ProductsService {
  /** F02 scaffold: three published/draft/inactive rows so every pill shows. */
  list(): Observable<readonly ProductListItem[]> {
    return of(PRODUCT_FIXTURES);
  }
}
