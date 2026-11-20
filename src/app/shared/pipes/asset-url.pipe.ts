import { Pipe } from '@angular/core';
import type { PipeTransform } from '@angular/core';
import { environment } from '@env/environment';

/** '' when the API base is same-origin (`/api/v1`), otherwise the API origin. */
export function assetOrigin(apiBaseUrl: string): string {
  return /^https?:\/\//i.test(apiBaseUrl) ? new URL(apiBaseUrl).origin : '';
}

const API_ORIGIN = assetOrigin(environment.API_BASE_URL);

/**
 * Resolves a server-relative image path (`/media/...`, `/assets/...`) against
 * the API origin, and leaves absolute and blob URLs untouched.
 */
export function resolveAssetUrl(url: string | null | undefined): string {
  if (!url) {
    return '';
  }

  return url.startsWith('/') ? `${API_ORIGIN}${url}` : url;
}

@Pipe({ name: 'assetUrl' })
export class AssetUrlPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return resolveAssetUrl(value);
  }
}
