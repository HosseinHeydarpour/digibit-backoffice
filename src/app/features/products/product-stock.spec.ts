import { STOCK_LEVEL_META, stockLevel } from './product-stock';

describe('stockLevel (BO-F12)', () => {
  it('tc 5: treats the threshold itself as low, one above it as ok', () => {
    expect(stockLevel(5, 5)).toBe('low');
    expect(stockLevel(4, 5)).toBe('low');
    expect(stockLevel(6, 5)).toBe('ok');
  });

  it('tc 5: zero and negative stock read as out, never as low', () => {
    expect(stockLevel(0, 5)).toBe('out');
    expect(stockLevel(-3, 5)).toBe('out');
    expect(stockLevel(Number.NaN, 5)).toBe('out');
  });

  it('a threshold of zero warns only when the shelf is empty', () => {
    expect(stockLevel(0, 0)).toBe('out');
    expect(stockLevel(1, 0)).toBe('ok');
  });

  it('gives every level a Persian label and a pill class', () => {
    expect(STOCK_LEVEL_META.out.label).toBe('ناموجود');
    expect(STOCK_LEVEL_META.low.label).toBe('کم‌موجودی');
    expect(STOCK_LEVEL_META.ok.label).toBe('موجود');
    expect(STOCK_LEVEL_META.low.badgeClass).toContain('amber');
    expect(STOCK_LEVEL_META.out.badgeClass).toContain('red');
  });
});
