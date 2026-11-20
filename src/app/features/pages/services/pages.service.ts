// src/app/features/pages/services/pages.service.ts
//
// The fixed-page API surface (BO-L08). Fixed pages cannot be created or
// deleted; the editor only saves content.

import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/services/api';
import { Observable, map } from 'rxjs';

import type { ContentPage, ContentPageInput } from '../models/content-page.model';

const PAGES_PATH = '/pages';
const ADMIN_PAGES_PATH = '/admin/pages';

type ContentPageRaw = Omit<ContentPage, 'updatedAt'> & { updatedAt: string | number };

function mapPage(raw: ContentPageRaw): ContentPage {
  return {
    ...raw,
    metaTitle: raw.metaTitle ?? '',
    metaDescription: raw.metaDescription ?? '',
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.parse(raw.updatedAt) || 0,
  };
}

@Injectable({ providedIn: 'root' })
export class PagesService {
  private readonly api = inject(ApiService);

  list(): Observable<ContentPage[]> {
    return this.api.get<ContentPageRaw[]>(ADMIN_PAGES_PATH).pipe(map((rows) => rows.map(mapPage)));
  }

  get(slug: string): Observable<ContentPage> {
    return this.api
      .get<ContentPageRaw>(`${PAGES_PATH}/${encodeURIComponent(slug)}`)
      .pipe(map(mapPage));
  }

  update(slug: string, input: ContentPageInput): Observable<ContentPage> {
    return this.api
      .put<ContentPageRaw>(`${ADMIN_PAGES_PATH}/${encodeURIComponent(slug)}`, input)
      .pipe(map(mapPage));
  }
}
