import { TestBed } from '@angular/core/testing';

import { LoggerService } from './logger';

describe('LoggerService (BO-C09)', () => {
  let service: LoggerService;

  beforeEach(() => {
    service = TestBed.inject(LoggerService);
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('writes each level with its tag', () => {
    service.debug('d');
    service.info('i');
    service.warn('w');
    service.error('e');

    expect(console.debug).toHaveBeenCalledWith('[debug] d');
    expect(console.info).toHaveBeenCalledWith('[info] i');
    expect(console.warn).toHaveBeenCalledWith('[warn] w');
    expect(console.error).toHaveBeenCalledWith('[error] e');
  });

  it('passes a structured context next to the message', () => {
    service.error('request failed', { status: 500, code: 'SERVER' });

    expect(console.error).toHaveBeenCalledWith('[error] request failed', {
      status: 500,
      code: 'SERVER',
    });
  });
});
