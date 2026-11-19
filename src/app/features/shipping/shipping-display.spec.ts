import { deliveryWindow, freeFromLabel, shippingCostLabel } from './shipping-display';

describe('shipping display (BO-K01)', () => {
  it('prints a one-day window without a range', () => {
    expect(deliveryWindow({ minDays: 1, maxDays: 1 })).toBe('۱ روز');
    expect(deliveryWindow({ minDays: 2, maxDays: 4 })).toBe('۲ تا ۴ روز');
  });

  it('prints a zero cost as free', () => {
    expect(shippingCostLabel({ cost: 0 })).toBe('رایگان');
    expect(shippingCostLabel({ cost: 45_000 })).toContain('تومان');
  });

  it('keeps the three free-threshold states distinct', () => {
    expect(freeFromLabel(null)).toBe('بدون آستانه');
    expect(freeFromLabel(0)).toBe('همیشه رایگان');
    expect(freeFromLabel(1_000_000)).toContain('از');
  });
});
