import { TestBed } from '@angular/core/testing';

import { LoadingService } from './loading';

describe('LoadingService (BO-C05)', () => {
  let service: LoadingService;

  beforeEach(() => {
    service = TestBed.inject(LoadingService);
  });

  it('is idle with no request', () => {
    expect(service.active()).toBe(false);
  });

  it('stays active until every parallel request finishes', () => {
    service.start();
    service.start();
    expect(service.active()).toBe(true);

    service.stop();
    expect(service.active()).toBe(true);

    service.stop();
    expect(service.active()).toBe(false);
  });

  it('never goes below zero', () => {
    service.stop();
    service.start();

    expect(service.active()).toBe(true);

    service.stop();
    expect(service.active()).toBe(false);
  });
});
