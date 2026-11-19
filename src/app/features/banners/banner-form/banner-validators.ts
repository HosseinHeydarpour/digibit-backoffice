// src/app/features/banners/banner-form/banner-validators.ts
//
// BO-L03/L05's rules, pure and testable without a TestBed.
//
// `mode` is a real control: the form either points at an internal route
// (`/products`) or an absolute URL (`https://…`), and the ACTIVE field is the
// one that gets the error. A single free-text link would let `/products` and
// `products` look identical until the browser 404s.

import type { AbstractControl, ValidationErrors } from '@angular/forms';

export const BANNER_TITLE_MIN = 3;
export const BANNER_TITLE_MAX = 60;

export function bannerTitleValidator(control: AbstractControl): ValidationErrors | null {
  const title = String(control.value ?? '').trim();

  if (title === '') {
    return null;
  }

  if (title.length < BANNER_TITLE_MIN) {
    return { titleShort: true };
  }

  return title.length > BANNER_TITLE_MAX ? { titleLong: true } : null;
}

/** Alt text is accessibility copy, not a duplicate of the title. */
export function bannerAltValidator(control: AbstractControl): ValidationErrors | null {
  const alt = String(control.value ?? '').trim();

  if (alt === '') {
    return null;
  }

  return alt.length > 100 ? { altLong: true } : null;
}

/** The active link field must be a route or an absolute http(s) URL. */
export function bannerLinkValidator(group: AbstractControl): ValidationErrors | null {
  const mode = group.get('mode')?.value;
  const internal = group.get('internalLink');
  const external = group.get('externalLink');

  if (!internal || !external) {
    return null;
  }

  setFieldError(internal, 'link', false);
  setFieldError(external, 'link', false);

  if (mode === 'internal') {
    setFieldError(internal, 'link', !String(internal.value ?? '').startsWith('/'));
  } else {
    setFieldError(external, 'link', !/^https?:\/\/\S+$/.test(String(external.value ?? '')));
  }

  return null;
}

/** The end of the window must not be before its start. */
export function bannerDateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const control = group.get('to');

  if (!control) {
    return null;
  }

  const from = dateMillis(group.get('from')?.value);
  const to = dateMillis(control.value);

  setFieldError(control, 'afterFrom', from !== null && to !== null && to < from);

  return null;
}

function setFieldError(control: AbstractControl, key: string, invalid: boolean): void {
  const errors = { ...(control.errors ?? {}) };

  delete errors[key];

  if (invalid) {
    errors[key] = true;
  }

  control.setErrors(Object.keys(errors).length > 0 ? errors : null);
}

/** `YYYY-MM-DD` → local millis, or null for absent/unparseable. */
function dateMillis(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime()) ? null : date.getTime();
}
