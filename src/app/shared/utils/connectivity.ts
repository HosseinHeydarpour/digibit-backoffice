// src/app/shared/utils/connectivity.ts
//
// The one offline hint the optimistic toggles check before they flip (BO-G07).

/**
 * Is the browser online? Both the category tree and the brand list ask before
 * an optimistic status change, so the user is told instead of watching a row
 * flip and flip back.
 *
 * shortcut: `navigator.onLine` reports a network interface, not a reachable API;
 * a request can still fail while this says true. It is a cheap UX guard only —
 * the server error path remains the real protection.
 */
export function isOnline(): boolean {
  return navigator.onLine !== false;
}

/** The one sentence both toggles show when the guard refuses (BO-G07). */
export const OFFLINE_MESSAGE = 'اتصال اینترنت برقرار نیست؛ وضعیت تغییر نکرد.';
