import { HttpClient } from '@angular/common/http';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { appConfig } from './app.config';

/**
 * Boots the real application config in a TestBed and asserts the core providers
 * resolve.
 *
 * The point is to catch a NullInjectorError at test time rather than at runtime:
 * if someone drops `provideHttpClient` or the LOCALE_ID registration, these fail
 * immediately instead of the app blowing up on first navigation.
 */
describe('appConfig', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...appConfig.providers] });
  });

  it('provides HttpClient', () => {
    expect(TestBed.inject(HttpClient)).toBeTruthy();
  });

  it('provides the Router', () => {
    expect(TestBed.inject(Router)).toBeTruthy();
  });

  it('registers the Persian locale', () => {
    expect(TestBed.inject(LOCALE_ID)).toBe('fa-IR');
  });
});
