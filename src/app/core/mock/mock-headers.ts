import { HttpHeaders } from '@angular/common/http';
import { environment } from '@env/environment';

import { MOCK_HEADER } from './mock.interceptor';

/**
 * Headers to attach to a request. In mock mode this adds `X-Mock: 1` so the
 * interceptor answers; otherwise it returns the headers untouched. Callers
 * invoke this once and never branch on the environment themselves.
 *
 * Note this is a *runtime* switch on purpose: unlike the interceptor, it must
 * exist in every build because `ApiService` imports it unconditionally. Only the
 * fixtures and the interceptor body are compiled out of production, via the
 * `fileReplacements` entry in angular.json.
 */
export function mockHeaders(base?: HttpHeaders): HttpHeaders {
  const headers = base ?? new HttpHeaders();
  return environment.useMockApi ? headers.set(MOCK_HEADER, '1') : headers;
}
