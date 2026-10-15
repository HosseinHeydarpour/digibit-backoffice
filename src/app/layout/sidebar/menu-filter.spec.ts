import { MENU, MENU_PERMISSIONS } from './menu';
import { filterMenu } from './menu-filter';
import type { MenuGroup } from './menu.model';

/** Flatten to `[groupLabel, itemLabel]` pairs so assertions read clearly. */
const flatten = (groups: readonly MenuGroup[]): string[][] =>
  groups.map((g) => [g.label, ...g.items.map((i) => i.label)]);

const labels = (groups: readonly MenuGroup[]): string[] =>
  groups.flatMap((g) => g.items.map((i) => i.label));

const groupLabels = (groups: readonly MenuGroup[]): string[] => groups.map((g) => g.label);

describe('filterMenu', () => {
  it('keeps only items the user has permission for (tc 1)', () => {
    const result = filterMenu(MENU, ['products.view']);

    expect(labels(result)).toEqual(['پیشخوان', 'محصولات', 'دسته‌بندی‌ها', 'برندها']);
    // The thing being tested is absence, not presence.
    expect(labels(result)).not.toContain('سفارش‌ها');
    expect(labels(result)).not.toContain('تنظیمات');
  });

  it('shows every item when all permissions are granted (tc 2)', () => {
    const result = filterMenu(MENU, MENU_PERMISSIONS);

    expect(result).toHaveLength(MENU.length);
    expect(labels(result)).toHaveLength(12);
  });

  it('shows only the permitted parts for a Support role (tc 3)', () => {
    // Support = tickets/comments/customers, per ARCHITECTURE.md §6.
    const result = filterMenu(MENU, ['tickets.view', 'comments.view', 'customers.view']);

    expect(labels(result)).toEqual(['پیشخوان', 'مشتریان', 'نظرات', 'پشتیبانی']);
    // A module Support cannot reach must be gone entirely.
    expect(labels(result)).not.toContain('محصولات');
    expect(labels(result)).not.toContain('تنظیمات');
  });

  it('drops a group whose items all disappear', () => {
    // No orders permission, so the whole «سفارش‌ها» group should vanish rather
    // than render a heading above an empty list.
    const result = filterMenu(MENU, ['products.view']);

    expect(groupLabels(result)).not.toContain('سفارش‌ها');
    expect(groupLabels(result)).toContain('فروشگاه');
  });

  it('keeps the dashboard for a user with no permissions at all', () => {
    // The dashboard carries no permission on purpose. A naive
    // `item.permission && !has(...)` filter would drop it and leave a blank
    // sidebar for every zero-grant user.
    const result = filterMenu(MENU, []);

    expect(labels(result)).toEqual(['پیشخوان']);
    expect(groupLabels(result)).toEqual(['فروشگاه']);
  });

  it('never mutates the input menu (tc 5)', () => {
    // MENU is module-level and shared. An in-place filter would leak one
    // user's access into the next render.
    const before = JSON.stringify(MENU);

    filterMenu(MENU, []);
    filterMenu(MENU, MENU_PERMISSIONS);
    filterMenu(MENU, ['products.view']);

    expect(JSON.stringify(MENU)).toBe(before);
    expect(labels(MENU)).toHaveLength(12);
  });

  it('returns new objects rather than the input references', () => {
    const result = filterMenu(MENU, MENU_PERMISSIONS);

    expect(result).not.toBe(MENU);
    expect(result[0]).not.toBe(MENU[0]);
    expect(result[0].items).not.toBe(MENU[0].items);
  });

  it('is order-stable and does not resurrect items across calls (tc 9)', () => {
    // Simulates switching accounts: a narrow result must not widen the next
    // one, which is what a mutation bug looks like in practice.
    const first = filterMenu(MENU, []);
    const second = filterMenu(MENU, MENU_PERMISSIONS);
    const third = filterMenu(MENU, []);

    expect(first).toEqual(third);
    expect(labels(second)).toHaveLength(12);
  });

  it('ignores unknown permissions without throwing (tc 10)', () => {
    const result = filterMenu(MENU, ['nonexistent.permission', 'products.view']);

    expect(labels(result)).toEqual(['پیشخوان', 'محصولات', 'دسته‌بندی‌ها', 'برندها']);
  });

  it('tolerates an empty menu', () => {
    expect(filterMenu([], ['products.view'])).toEqual([]);
  });

  it('every permission in MENU is a known permission', () => {
    // Guards against a typo silently becoming a public item.
    const declared = new Set<string>(MENU_PERMISSIONS);
    expect(declared.size).toBeGreaterThan(0);

    for (const group of MENU) {
      for (const item of group.items) {
        if (item.permission !== undefined) {
          expect(declared.has(item.permission), `${item.label} -> ${item.permission}`).toBe(true);
        }
      }
    }
  });

  it('documents which items are public', () => {
    // Pinning this makes an accidental permission removal a test failure.
    const publicItems = MENU.flatMap((g) => g.items)
      .filter((i) => i.permission === undefined)
      .map((i) => i.label);

    expect(publicItems).toEqual(['پیشخوان']);
  });

  it('flatten helper keeps group/item shape for readability', () => {
    expect(flatten(filterMenu(MENU, ['products.view']))[0][0]).toBe('فروشگاه');
  });
});
