// src/app/features/banners/services/banners.service.ts
//
// The banners API surface (BO-L01..L07).
//
// `list` returns one ordered array (the page groups by position), reorder is a
// BATCH call (`{ position, ids }`) so the server renumbers a whole slot in one
// transaction, and `upload` sends the file to the shared `/media` endpoint at
// save time (the form keeps only a blob: preview until then).

import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/services/api';
import type { EntityId } from '@shared/models';
import { Observable } from 'rxjs';

import type { Banner, BannerInput, BannerOrderInput } from '../models/banner.model';

const BANNERS_PATH = '/banners';

export interface BannerUploadResult {
  readonly url: string;
}

@Injectable({ providedIn: 'root' })
export class BannersService {
  private readonly api = inject(ApiService);

  /** `GET /banners` → every banner in display order. */
  list(): Observable<Banner[]> {
    return this.api.get<Banner[]>(BANNERS_PATH);
  }

  /** `GET /banners/:id` → one banner. */
  get(id: EntityId): Observable<Banner> {
    return this.api.get<Banner>(`${BANNERS_PATH}/${encodeURIComponent(id)}`);
  }

  /** `POST /banners` → the created banner; order/isActive default server-side. */
  create(input: BannerInput): Observable<Banner> {
    return this.api.post<Banner>(BANNERS_PATH, input);
  }

  /** `PUT /banners/:id` → the updated banner. */
  update(id: EntityId, input: BannerInput): Observable<Banner> {
    return this.api.put<Banner>(`${BANNERS_PATH}/${encodeURIComponent(id)}`, input);
  }

  /** `PATCH …/:id/status` — the target state, not a flip. */
  setStatus(id: EntityId, isActive: boolean): Observable<Banner> {
    return this.api.patch<Banner>(`${BANNERS_PATH}/${encodeURIComponent(id)}/status`, {
      isActive,
    });
  }

  /**
   * `DELETE /banners/:id` → the row is gone.
   *
   * The mock only drops the record; the real server also removes the uploaded
   * file when no other banner uses it (contract §1.4).
   */
  remove(id: EntityId): Observable<{ deleted: boolean }> {
    return this.api.delete<{ deleted: boolean }>(`${BANNERS_PATH}/${encodeURIComponent(id)}`);
  }

  /** `PATCH /banners/order` — one batch per position, never one request per row. */
  reorder(input: BannerOrderInput): Observable<Banner[]> {
    return this.api.patch<Banner[]>(`${BANNERS_PATH}/order`, input);
  }

  /** `POST /media` with one image → `{ url }` (the CDN in production). */
  upload(file: File): Observable<BannerUploadResult> {
    const body = new FormData();
    body.append('file', file);

    return this.api.post<BannerUploadResult>('/media', body);
  }
}
