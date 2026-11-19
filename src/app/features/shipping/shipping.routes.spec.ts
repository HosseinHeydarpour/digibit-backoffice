import { permissionGuard } from '@core/guards/permission.guard';

import { SHIPPING_ROUTES } from './shipping.routes';

describe('SHIPPING_ROUTES (BO-K01)', () => {
  it('declares the view permission the sidebar item carries', () => {
    expect(SHIPPING_ROUTES[0].data?.['permission']).toBe('shipping.view');
  });

  it('guards the route', () => {
    expect(SHIPPING_ROUTES[0].canActivate).toContain(permissionGuard);
  });

  it('carries a title and a breadcrumb label', () => {
    expect(SHIPPING_ROUTES[0].title).toBe('روش‌های ارسال');
    expect(SHIPPING_ROUTES[0].data?.['breadcrumb']).toBe('روش‌های ارسال');
  });
});
