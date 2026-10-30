import type { CategoryNode } from '../models/category.model';

import { filterTree } from './category-filter';

const node = (
  id: string,
  name: string,
  slug = id,
  children: CategoryNode[] = [],
): CategoryNode => ({
  id,
  parentId: null,
  name,
  slug,
  icon: null,
  order: 1,
  isActive: true,
  description: '',
  productCount: 0,
  children,
});

const TREE: readonly CategoryNode[] = [
  node('a', 'لوازم تحریر', 'stationery', [
    node('a1', 'دفتر و کاغذ', 'paper'),
    node('a2', 'خودکار', 'pens'),
  ]),
  node('b', 'گوشی موبایل', 'phones', [node('b1', 'قاب گوشی', 'cases')]),
  node('c', 'باطری', 'batteries'),
];

describe('filterTree (BO-G01 tc 6)', () => {
  it('returns the same tree for an empty or whitespace query', () => {
    expect(filterTree(TREE, '')).toBe(TREE);
    expect(filterTree(TREE, '   ')).toBe(TREE);
  });

  it('keeps a matching leaf under its parent', () => {
    const result = filterTree(TREE, 'قاب');

    expect(result.map((n) => n.id)).toEqual(['b']);
    expect(result[0].children.map((n) => n.id)).toEqual(['b1']);
  });

  it('keeps all children of a matching parent', () => {
    const result = filterTree(TREE, 'لوازم');

    expect(result.map((n) => n.id)).toEqual(['a']);
    expect(result[0].children.map((n) => n.id)).toEqual(['a1', 'a2']);
  });

  it('matches the slug as well as the name', () => {
    expect(filterTree(TREE, 'batter').map((n) => n.id)).toEqual(['c']);
  });

  it('drops branches that do not match at all', () => {
    expect(filterTree(TREE, 'ناموجود')).toEqual([]);
  });
});
