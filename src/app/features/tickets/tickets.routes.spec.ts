import { permissionGuard } from '@core/guards/permission.guard';

import { TICKETS_ROUTES } from './tickets.routes';

describe('TICKETS_ROUTES (BO-O01)', () => {
  it('declares tickets.view and guards the route', () => {
    expect(TICKETS_ROUTES[0].data?.['permission']).toBe('tickets.view');
    expect(TICKETS_ROUTES[0].canActivate).toContain(permissionGuard);
  });
});
