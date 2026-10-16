import { HttpClient } from '@angular/common/http';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

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

  it('provides PrimeNG ConfirmationService for the confirm dialog (BO-B11)', () => {
    // Not `providedIn: 'root'` — unlike PrimeNG's config service — so dropping
    // this line breaks every `ConfirmService.confirm()` call at runtime, not at
    // build time. That is exactly the kind of failure this spec exists to catch.
    expect(TestBed.inject(ConfirmationService)).toBeTruthy();
  });

  it('provides PrimeNG MessageService for the toast (BO-B12)', () => {
    // Same trap, one level down: the toast host subscribes to this service in
    // its constructor, so a missing registration is a NullInjectorError at
    // runtime — the first time a feature reports anything, not at build time.
    expect(TestBed.inject(MessageService)).toBeTruthy();
  });
});
