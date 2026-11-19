import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { provideRouter } from '@angular/router';
import { UrlTree } from '@angular/router';
import { PERMISSIONS } from '@core/auth/permissions.token';

import { permissionGuard } from './permission.guard';

function run(permission: string | undefined, grants: readonly string[]): true | UrlTree {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: PERMISSIONS, useValue: signal(grants) }],
  });

  const route = {
    data: permission === undefined ? {} : { permission },
  } as unknown as ActivatedRouteSnapshot;

  return TestBed.runInInjectionContext(() => permissionGuard(route, {} as RouterStateSnapshot)) as
    true | UrlTree;
}

describe('permissionGuard (BO-I06)', () => {
  it('allows a route whose permission is granted', () => {
    expect(run('customers.view', ['customers.view', 'orders.view'])).toBe(true);
  });

  it('sends a user without the grant to /forbidden', () => {
    const result = run('customers.view', ['orders.view']);

    expect(result).toBeInstanceOf(UrlTree);
    expect(result.toString()).toBe('/forbidden');
  });

  it('fails closed when the grant set is the empty default', () => {
    const result = run('customers.block', []);

    expect(result).toBeInstanceOf(UrlTree);
  });

  it('lets a route without a declared permission pass, like a public menu item', () => {
    expect(run(undefined, [])).toBe(true);
  });
});
