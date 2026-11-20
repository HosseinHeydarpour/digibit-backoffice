import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PERMISSIONS } from '@core/auth/permissions.token';

import { PermissionsService } from './permissions.service';

describe('PermissionsService (BO-C08)', () => {
  let grants: ReturnType<typeof signal<readonly string[]>>;
  let service: PermissionsService;

  beforeEach(() => {
    grants = signal<readonly string[]>([]);
    TestBed.configureTestingModule({
      providers: [{ provide: PERMISSIONS, useValue: grants }],
    });
    service = TestBed.inject(PermissionsService);
  });

  it('is fail-closed when nothing was granted', () => {
    expect(service.hasPermission('products.view')).toBe(false);
    expect(service.hasAny(['products.view', 'orders.view'])).toBe(false);
  });

  it('answers a single grant and an OR list', () => {
    service.set(['orders.view']);

    expect(service.hasPermission('orders.view')).toBe(true);
    expect(service.hasPermission('products.view')).toBe(false);
    expect(service.hasAny(['products.view', 'orders.view'])).toBe(true);
  });

  it('expands a manage grant into its view counterpart', () => {
    service.set(['products.manage']);

    expect(service.hasPermission('products.manage')).toBe(true);
    expect(service.hasPermission('products.view')).toBe(true);
  });

  it('treats the wildcard as every known grant', () => {
    service.set(['*']);

    expect(service.hasPermission('products.view')).toBe(true);
    expect(service.hasPermission('settings.write')).toBe(true);
    expect(service.hasPermission('not.a.real.permission')).toBe(false);
  });

  it('clears the grants on logout', () => {
    service.set(['products.view']);
    service.clear();

    expect(service.permissions()).toEqual([]);
    expect(service.hasPermission('products.view')).toBe(false);
  });

  it('exposes the same list the rest of the app reads', () => {
    service.set(['orders.view']);

    expect(service.permissions()).toContain('orders.view');
    expect(grants()).toContain('orders.view');
  });
});
