import type { ProductCategoryOption } from '../models/product.model';

import { buildCategoryOptions } from './category-options';

const CATEGORIES: readonly ProductCategoryOption[] = [
  { id: '1', name: 'لوازم برقی', parentId: null, isActive: true },
  { id: '2', name: 'صوتی', parentId: '1', isActive: true },
  { id: '3', name: 'هدفون', parentId: '2', isActive: true },
  { id: '4', name: 'دستهٔ حذف‌شده', parentId: '1', isActive: false },
];

describe('buildCategoryOptions (BO-F09)', () => {
  it('tc 1: builds the full path and level for every active category', () => {
    const options = buildCategoryOptions(CATEGORIES);

    expect(options.find((option) => option.id === '1')).toMatchObject({
      path: 'لوازم برقی',
      level: 0,
    });
    expect(options.find((option) => option.id === '2')).toMatchObject({
      path: 'لوازم برقی / صوتی',
      level: 1,
    });
    expect(options.find((option) => option.id === '3')).toMatchObject({
      path: 'لوازم برقی / صوتی / هدفون',
      level: 2,
    });
  });

  it('tc 10: drops an inactive category', () => {
    expect(buildCategoryOptions(CATEGORIES).map((option) => option.id)).not.toContain('4');
  });

  it('treats a missing parent as a root instead of rendering undefined', () => {
    const options = buildCategoryOptions([
      { id: '9', name: 'بدون والد', parentId: 'missing', isActive: true },
    ]);

    expect(options[0]).toMatchObject({ path: 'بدون والد', level: 0 });
  });

  it('sorts the options by their Persian path', () => {
    const options = buildCategoryOptions(CATEGORIES);
    const paths = options.map((option) => option.path);

    expect(paths).toEqual([...paths].sort((a, b) => a.localeCompare(b, 'fa')));
  });

  it('handles an empty lookup', () => {
    expect(buildCategoryOptions([])).toEqual([]);
  });
});
