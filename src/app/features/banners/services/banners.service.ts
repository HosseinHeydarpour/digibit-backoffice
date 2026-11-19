// src/app/features/banners/services/banners.service.ts
//
// The banners read surface (BO-L01). Upload, create/edit, reorder and delete
// arrive in BO-L02..L07 on top of this file.

import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/services/api';
import { Observable } from 'rxjs';

import type { Banner } from '../models/banner.model';

const BANNERS_PATH = '/banners';

@Injectable({ providedIn: 'root' })
export class BannersService {
  private readonly api = inject(ApiService);

  /** `GET /banners` → every banner in display order. */
  list(): Observable<Banner[]> {
    return this.api.get<Banner[]>(BANNERS_PATH);
  }
}
