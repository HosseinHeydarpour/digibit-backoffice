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
  it('blocks a category that holds products of its own', () => {
    expect(deleteDecision(node({ productCount: 3 }))).toEqual({
      kind: 'blocked',
      productCount: 3,
    });
  });

  it('blocks even when the node also has children', () => {
    const parent = node({ productCount: 2, children: [node({ id: 'c-2', parentId: 'c-1' })] });

    expect(deleteDecision(parent)).toEqual({ kind: 'blocked', productCount: 2 });
  });

  it('offers only a confirmation for an empty leaf', () => {
    expect(deleteDecision(node())).toEqual({ kind: 'simple' });
  });

  it('offers the transfer choice for an empty parent, and cascade stays possible', () => {
    expect(
      deleteDecision(
        node({
          children: [node({ id: 'c-2', parentId: 'c-1' }), node({ id: 'c-3', parentId: 'c-1' })],
        }),
      ),
    ).toEqual({ kind: 'children', childCount: 2, childProducts: 0 });
  });

  it('counts the products of the children, so a cascade cannot orphan them', () => {
    expect(
      deleteDecision(
        node({
          children: [
            node({ id: 'c-2', parentId: 'c-1', productCount: 3 }),
            node({ id: 'c-3', parentId: 'c-1' }),
          ],
        }),
      ),
    ).toEqual({ kind: 'children', childCount: 2, childProducts: 3 });
  });

  it('walks deeper than one level when counting products', () => {
    const grandChild = node({ id: 'c-3', parentId: 'c-2', productCount: 4 });

    expect(
      deleteDecision(
        node({ children: [node({ id: 'c-2', parentId: 'c-1', children: [grandChild] })] }),
      ),
    ).toEqual({ kind: 'children', childCount: 1, childProducts: 4 });
  });
});
