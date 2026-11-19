import { permissionGuard } from '@core/guards/permission.guard';

import { ticketDetailResolver } from './ticket-detail/ticket-detail.resolver';
import { TICKETS_ROUTES } from './tickets.routes';

describe('TICKETS_ROUTES (BO-O01)', () => {
  it('declares tickets.view and guards the route', () => {
    expect(TICKETS_ROUTES[0].data?.['permission']).toBe('tickets.view');
    expect(TICKETS_ROUTES[0].canActivate).toContain(permissionGuard);
  });

  it('mounts the detail at /tickets/:id with a resolver and retry support', () => {
    expect(TICKETS_ROUTES[1].path).toBe(':id');
    expect(TICKETS_ROUTES[1].resolve?.['detail']).toBe(ticketDetailResolver);
    expect(TICKETS_ROUTES[1].runGuardsAndResolvers).toBe('always');
  });
});
