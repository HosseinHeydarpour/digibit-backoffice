/**
 * Permission strings use the `<module>.<action>` format from ARCHITECTURE.md §6.
 *
 * Declared as a union rather than `string` on purpose: a misspelled permission
 * in MENU would otherwise never match a real grant, and because a missing
 * permission means "public", the item would render for everyone. Typing it
 * turns that silent privilege escalation into a compile error.
 */
export type Permission =
  | 'products.view'
  | 'orders.view'
  | 'customers.view'
  | 'content.view'
  | 'comments.view'
  | 'tickets.view'
  | 'settings.write';

export interface MenuItem {
  readonly label: string;
  readonly icon: string;
  readonly routerLink: string;
  /**
   * Omitted means the item is visible to every authenticated user — that is
   * how «پیشخوان» stays reachable for a role with no grants at all.
   */
  readonly permission?: Permission;
}

export interface MenuGroup {
  readonly label: string;
  readonly items: readonly MenuItem[];
}
