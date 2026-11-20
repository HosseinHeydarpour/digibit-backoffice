/**
 * The grants the panel knows how to use.
 *
 * The server owns the real list; this exists because a SuperAdmin signs in with
 * the wildcard `*` and every `permission ===` check in the UI would otherwise
 * read it as "no grant at all". Expanding it once, at the auth boundary, keeps
 * the menu, the guards and the buttons working without teaching each of them
 * about the wildcard.
 *
 * `X.manage` also grants `X.view`: the backend's roles carry the write grant
 * for a module and no separate read one, and a manager who can change a product
 * must be able to open the page that lists it.
 */
export const ALL_PERMISSIONS: readonly string[] = [
  'products.view',
  'products.manage',
  'orders.view',
  'orders.manage',
  'customers.view',
  'customers.block',
  'coupons.view',
  'coupons.manage',
  'shipping.view',
  'shipping.manage',
  'content.view',
  'content.manage',
  'comments.view',
  'comments.moderate',
  'tickets.view',
  'tickets.manage',
  'settings.write',
  'reports.view',
  'media.manage',
  'admins.manage',
  'contacts.manage',
];

/** Turn the server's grant list into the strings the UI compares against. */
export function expandPermissions(granted: readonly string[]): readonly string[] {
  if (granted.includes('*')) {
    return ALL_PERMISSIONS;
  }

  const expanded = new Set(granted);

  for (const permission of granted) {
    if (permission.endsWith('.manage')) {
      expanded.add(permission.replace(/\.manage$/, '.view'));
    }
  }

  return [...expanded];
}
