// src/app/features/pages/services/pages.service.ts
//
// The fixed-page API surface (BO-L08). Fixed pages cannot be created or
// deleted; the editor only saves content.

import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/services/api';
import { Observable } from 'rxjs';

import type { ContentPage, ContentPageInput } from '../models/content-page.model';

const PAGES_PATH = '/content-pages';

@Injectable({ providedIn: 'root' })
export class PagesService {
  private readonly api = inject(ApiService);

  list(): Observable<ContentPage[]> {
    return this.api.get<ContentPage[]>(PAGES_PATH);
  }

  get(slug: string): Observable<ContentPage> {
    return this.api.get<ContentPage>(`${PAGES_PATH}/${encodeURIComponent(slug)}`);
  }

  update(slug: string, input: ContentPageInput): Observable<ContentPage> {
    return this.api.put<ContentPage>(`${PAGES_PATH}/${encodeURIComponent(slug)}`, input);
  }
}
