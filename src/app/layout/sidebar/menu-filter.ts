import type { MenuGroup } from './menu.model';

/**
 * Derive the menu a user with `permissions` is allowed to see.
 *
 * Pure: it returns new arrays and never touches the input, because `MENU` is a
 * module-level constant shared by the whole app. Filtering in place would leak
 * one user's access into the next render — the classic symptom is a menu that
 * only breaks after switching accounts.
 *
 * Two rules:
 * - An item with no `permission` is public to any signed-in user.
 * - A group whose items all disappear is dropped too, so no heading renders
 *   above an empty list.
 *
 * SECURITY: this only hides navigation. Until BO-D07 (route guard) lands, a
 * hidden route is still reachable by typing its URL, and the real boundary is
 * server-side validation — ARCHITECTURE.md §6 is explicit about that. Never
 * treat a filtered menu as access control.
 */
export function filterMenu(
  groups: readonly MenuGroup[],
  permissions: readonly string[],
): MenuGroup[] {
  const granted = new Set(permissions);

  return groups
    .map((group) => ({
      label: group.label,
      items: group.items.filter(
        (item) => item.permission === undefined || granted.has(item.permission),
      ),
    }))
    .filter((group) => group.items.length > 0);
}
