// src/app/core/mock/fixtures/shipping.fixture.ts
//
// The shipping methods the checkout offers (BO-K01..K06).
//
// Six rows cover every case the screen needs: a default, a free method, a
// method with no free threshold, a disabled one, and both 0 and non-zero costs.
// `order` is the display order the up/down controls (K01 tc 10) will manage.

export interface MockShippingMethod {
  readonly id: string;
  name: string;
  /** Base cost in Toman; 0 is a free method and is legal. */
  cost: number;
  /** Cart total from which shipping is free; `null` = never. */
  freeFrom: number | null;
  minDays: number;
  maxDays: number;
  /** Exactly one method is the checkout default (K03/K05). */
  isDefault: boolean;
  isActive: boolean;
  order: number;
}

export const MOCK_SHIPPING_METHODS: readonly MockShippingMethod[] = [
  {
    id: '1',
    name: 'پست پیشتاز',
    cost: 45_000,
    freeFrom: 1_000_000,
    minDays: 2,
    maxDays: 4,
    isDefault: false,
    isActive: true,
    order: 1,
  },
  {
    id: '2',
    name: 'تیپاکس',
    cost: 60_000,
    freeFrom: 2_000_000,
    minDays: 1,
    maxDays: 2,
    isDefault: true,
    isActive: true,
    order: 2,
  },
  {
    id: '3',
    name: 'پیک تهران',
    cost: 85_000,
    freeFrom: null,
    minDays: 1,
    maxDays: 1,
    isDefault: false,
    isActive: true,
    order: 3,
  },
  {
    id: '4',
    name: 'تحویل حضوری',
    cost: 0,
    freeFrom: null,
    minDays: 1,
    maxDays: 3,
    isDefault: false,
    isActive: true,
    order: 4,
  },
  {
    id: '5',
    name: 'پست سفارشی',
    cost: 55_000,
    freeFrom: 1_500_000,
    minDays: 3,
    maxDays: 7,
    isDefault: false,
    isActive: false,
    order: 5,
  },
  {
    id: '6',
    name: 'ارسال رایگان',
    cost: 0,
    freeFrom: 0,
    minDays: 3,
    maxDays: 6,
    isDefault: false,
    isActive: true,
    order: 6,
  },
];
