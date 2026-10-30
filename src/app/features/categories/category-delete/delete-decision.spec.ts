import type { CategoryNode } from '../models/category.model';

import { deleteDecision } from './delete-decision';

/** A node with the fields the decision reads; everything else is filler. */
function node(overrides: Partial<CategoryNode> = {}): CategoryNode {
  return {
    id: 'c-1',
    parentId: null,
    name: 'دسته',
    slug: 'cat',
    icon: null,
    order: 1,
    isActive: true,
    description: '',
    productCount: 0,
    children: [],
    ...overrides,
  };
}

describe('deleteDecision (BO-G04 tc 6)', () => {
  it('protects the default «بدون دسته‌بندی» bucket', () => {
    expect(deleteDecision(node({ isDefault: true, productCount: 3 }))).toEqual({
      kind: 'protected',
    });
  });

  it('offers a plain confirmation for an empty leaf', () => {
    expect(deleteDecision(node())).toEqual({ kind: 'simple', productCount: 0 });
  });

  it('does not block a leaf that holds products: it reports them', () => {
    expect(deleteDecision(node({ productCount: 3 }))).toEqual({
      kind: 'simple',
      productCount: 3,
    });
  });

  it('offers the children choice on an empty parent', () => {
    expect(
      deleteDecision(
        node({
          children: [node({ id: 'c-2', parentId: 'c-1' }), node({ id: 'c-3', parentId: 'c-1' })],
        }),
      ),
    ).toEqual({ kind: 'children', childCount: 2, productCount: 0 });
  });

  it('counts the products of the children too, so the warning is honest', () => {
    expect(
      deleteDecision(
        node({
          productCount: 2,
          children: [
            node({ id: 'c-2', parentId: 'c-1', productCount: 3 }),
            node({ id: 'c-3', parentId: 'c-1' }),
          ],
        }),
      ),
    ).toEqual({ kind: 'children', childCount: 2, productCount: 5 });
  });

  it('walks deeper than one level when counting products', () => {
    const grandChild = node({ id: 'c-3', parentId: 'c-2', productCount: 4 });

    expect(
      deleteDecision(
        node({ children: [node({ id: 'c-2', parentId: 'c-1', children: [grandChild] })] }),
      ),
    ).toEqual({ kind: 'children', childCount: 1, productCount: 4 });
  });
});
