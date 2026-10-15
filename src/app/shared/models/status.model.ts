/**
 * The active/inactive flag shared by nearly every admin entity
 * (Product, Category, Brand, Coupon, ShippingMethod, Banner).
 */
export interface Activable {
  isActive: boolean;
}

/** Persian labels for the flag, kept in one place so wording never drifts. */
export const ACTIVE_LABELS: Record<'active' | 'inactive', string> = {
  active: 'فعال',
  inactive: 'غیرفعال',
};
