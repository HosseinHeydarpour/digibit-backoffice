import { Injectable, inject } from '@angular/core';
import type { Signal } from '@angular/core';

import { expandPermissions } from './permission-catalog';
import { PERMISSIONS } from './permissions.token';

/**
 * The one reader of the signed-in user's grants.
 *
 * `PERMISSIONS` stays the storage (a signal the auth service writes); this
 * service is the API the guard, the directive and any component should use, so
 * "is this allowed?" is answered by one implementation. It also hides the
 * wildcard: a SuperAdmin receives `*` from `/auth/me`, and every caller would
 * otherwise have to remember to treat it as "all".
 */
@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly grants = inject(PERMISSIONS);

  /** The current grants, for a caller that needs to render the list itself. */
  readonly permissions: Signal<readonly string[]> = this.grants.asReadonly();

  hasPermission(permission: string): boolean {
    if (permission === '') {
      return false;
    }

    const granted = this.grants();

    return granted.includes(permission) || granted.includes('*');
  }

  /** OR semantics: any one of the given permissions is enough. */
  hasAny(permissions: readonly string[]): boolean {
    return permissions.some((permission) => this.hasPermission(permission));
  }

  /** Replace the grants from `/auth/me`; the wildcard and `.manage` expand here. */
  set(permissions: readonly string[]): void {
    this.grants.set(expandPermissions(permissions));
  }

  /** Drop every grant on logout or an expired session. */
  clear(): void {
    this.grants.set([]);
  }
}
