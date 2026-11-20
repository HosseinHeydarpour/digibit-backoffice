// src/app/features/banners/services/banners.service.ts
//
// The banners API surface (BO-L01..L07).
//
// The storefront's banner endpoint answers ISO dates; the panel's model speaks
// UTC milliseconds, so the translation lives here, once.

import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/services/api';
import type { EntityId } from '@shared/models';
import { Observable, map } from 'rxjs';

import type { Banner, BannerInput, BannerOrderInput } from '../models/banner.model';

const BANNERS_PATH = '/banners';

export interface BannerUploadResult {
  readonly url: string;
}

type BannerRaw = Omit<Banner, 'from' | 'to'> & { from: string | number; to: string | number };

function millis(value: string | number): number {
  return typeof value === 'number' ? value : Date.parse(value) || 0;
}

function mapBanner(raw: BannerRaw): Banner {
  return { ...raw, from: millis(raw.from), to: millis(raw.to) };
}

function toPayload(input: BannerInput): unknown {
  return {
    ...input,
    from: new Date(input.from).toISOString(),
    to: new Date(input.to).toISOString(),
  };
}

@Injectable({ providedIn: 'root' })
export class BannersService {
  private readonly api = inject(ApiService);

  /** `GET /banners?includeInactive=true` → every banner, including scheduled ones. */
  list(): Observable<Banner[]> {
    return this.api
      .get<BannerRaw[]>(BANNERS_PATH, { includeInactive: true })
      .pipe(map((rows) => rows.map(mapBanner)));
  }

  /** `GET /banners/:id` → one banner. */
  get(id: EntityId): Observable<Banner> {
    return this.api
      .get<BannerRaw>(`${BANNERS_PATH}/${encodeURIComponent(id)}`)
      .pipe(map(mapBanner));
  }

  /** `POST /banners` → the created banner; order/isActive default server-side. */
  create(input: BannerInput): Observable<Banner> {
    return this.api.post<BannerRaw>(BANNERS_PATH, toPayload(input)).pipe(map(mapBanner));
  }

  /** `PUT /banners/:id` → the updated banner. */
  update(id: EntityId, input: BannerInput): Observable<Banner> {
    return this.api
      .put<BannerRaw>(`${BANNERS_PATH}/${encodeURIComponent(id)}`, toPayload(input))
      .pipe(map(mapBanner));
  }

  /** `PATCH …/:id/status` — the target state, not a flip. */
  setStatus(id: EntityId, isActive: boolean): Observable<Banner> {
    return this.api
      .patch<BannerRaw>(`${BANNERS_PATH}/${encodeURIComponent(id)}/status`, { isActive })
      .pipe(map(mapBanner));
  }

  /**
   * `DELETE /banners/:id` → the row is gone.
   *
   * The real server also removes the uploaded file when no other banner uses it
   * (contract §1.4).
   */
  remove(id: EntityId): Observable<void> {
    return this.api.delete<void>(`${BANNERS_PATH}/${encodeURIComponent(id)}`);
  }

  /** `PUT /banners/order` — one batch per position, never one request per row. */
  reorder(input: BannerOrderInput): Observable<unknown> {
    return this.api.put<unknown>(`${BANNERS_PATH}/order`, input);
  }

  /** `POST /media` with one image → `{ url }` (the CDN in production). */
  upload(file: File): Observable<BannerUploadResult> {
    const body = new FormData();
    body.append('file', file);

    return this.api.post<BannerUploadResult>('/media', body);
  }
}
