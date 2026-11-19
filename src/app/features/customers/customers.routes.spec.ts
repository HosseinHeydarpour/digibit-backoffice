import { permissionGuard } from '@core/guards/permission.guard';

import { CUSTOMERS_ROUTES } from './customers.routes';

describe('CUSTOMERS_ROUTES (BO-I01, BO-I06)', () => {
  it('declares the view permission the sidebar item carries', () => {
    expect(CUSTOMERS_ROUTES[0].data?.['permission']).toBe('customers.view');
  });

  it('guards the route, so a hidden menu item is not the only boundary', () => {
    expect(CUSTOMERS_ROUTES[0].canActivate).toContain(permissionGuard);
  });

  it('carries a page title and a breadcrumb label', () => {
    expect(CUSTOMERS_ROUTES[0].title).toBe('مشتریان');
    expect(CUSTOMERS_ROUTES[0].data?.['breadcrumb']).toBe('مشتریان');
  });
});
