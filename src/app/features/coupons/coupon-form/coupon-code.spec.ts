import { generateCouponCode } from './coupon-code';

describe('generateCouponCode (BO-J02)', () => {
  it('produces an English uppercase code with the OFF prefix', () => {
    const code = generateCouponCode(6, () => 0.5);

    expect(code).toMatch(/^OFF-[A-Z0-9]{6}$/);
  });

  it('never uses the four confusable characters', () => {
    for (let index = 0; index < 200; index += 1) {
      const code = generateCouponCode(12);

      expect(code.slice(4)).not.toMatch(/[IO01]/);
    }
  });

  it('is deterministic for a pinned random source', () => {
    expect(generateCouponCode(4, () => 0)).toBe('OFF-AAAA');
    expect(generateCouponCode(4, () => 0.999)).toBe('OFF-9999');
  });

  it('stays inside the 20-character server limit', () => {
    expect(generateCouponCode(16).length).toBe(20);
  });
});
