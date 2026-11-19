// src/app/features/customers/customer-status.ts
//
// One status → label + pill mapping for the list and the profile (BO-I01/I02).
// The same two words must not read differently on the two screens, and the
// classes live here because they are runtime values (`models/` stays types-only).

import type { CustomerStatus } from './models/customer.model';

/** Persian label for an account status. */
export function customerStatusLabel(status: CustomerStatus): string {
  return status === 'active' ? 'فعال' : 'مسدود';
}

/**
 * The pill classes, dark mode included: green for an account that can sign in,
 * red for one that was blocked. The same palette the order badges use, so a
 * blocked customer reads as "stopped", not as a new colour to learn.
 */
export function customerStatusBadgeClass(status: CustomerStatus): string {
  return status === 'active'
    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
}
