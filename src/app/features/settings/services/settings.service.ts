// src/app/features/settings/services/settings.service.ts
//
// The settings API (BO-M01..M07). One GET and one PUT for the whole page: the
// four tabs are one transaction, and the bar's "save all" is literally that.
// Secrets travel only when the admin types a new one.

import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/services/api';
import { Observable } from 'rxjs';

import type { Settings, SettingsUpdate } from '../models/settings.model';

const SETTINGS_PATH = '/settings';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly api = inject(ApiService);

  /** `GET /settings` → masked secrets, never the raw keys. */
  get(): Observable<Settings> {
    return this.api.get<Settings>(SETTINGS_PATH);
  }

  /** `PUT /settings` → the saved, re-masked settings. */
  save(update: SettingsUpdate): Observable<Settings> {
    return this.api.put<Settings>(SETTINGS_PATH, update);
  }

  /** `POST /settings/sms/test` → sends one OTP to the admin. */
  testSms(): Observable<{ message: string }> {
    return this.api.post<{ message: string }>(`${SETTINGS_PATH}/sms/test`, {});
  }

  /** `POST /media` with the store logo → the stored URL. */
  uploadLogo(file: File): Observable<{ url: string }> {
    const body = new FormData();
    body.append('file', file);

    return this.api.post<{ url: string }>('/media', body);
  }
}
