import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { NEVER, Observable, of, throwError } from 'rxjs';

import type { ShippingMethod } from '../models/shipping-method.model';
import { ShippingService } from '../services/shipping.service';

import { ShippingList } from './shipping-list';

const METHODS: readonly ShippingMethod[] = [
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
];

class StaticShippingService implements Pick<ShippingService, 'list'> {
  list(): Observable<ShippingMethod[]> {
    return of([...METHODS]);
  }
}

class FlakyShippingService implements Pick<ShippingService, 'list'> {
  private failed = false;

  list(): Observable<ShippingMethod[]> {
    if (this.failed) return of([...METHODS]);

    this.failed = true;

    return throwError(() => new Error('offline'));
  }
}

const meta: Meta<ShippingList> = {
  title: 'Features/Shipping',
  component: ShippingList,
  decorators: [
    applicationConfig({
      providers: [
        provideRouter([]),
        { provide: PERMISSIONS, useValue: signal(['shipping.view', 'shipping.manage']) },
      ],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'Shipping methods (BO-K01..K06): name, cost, free threshold, delivery window, the',
          'default badge and the enable switch.',
          '',
          '**Two invariants the server owns.** The default method cannot be disabled or deleted,',
          'and at least one method stays active; the client warns before asking and the mock',
          'answers 409 if a stale row tries anyway.',
          '',
          '**A used method is switched off, not erased.** Deleting a method that appears in an',
          'order keeps the row as inactive, so old order reports still name it.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<ShippingList>;

/** Five methods: default, free, no-threshold, disabled. */
export const Default: Story = {
  render: () => ({
    template: '<app-shipping-list />',
    moduleMetadata: {
      providers: [{ provide: ShippingService, useValue: new StaticShippingService() }],
    },
  }),
};

/** The first paint: skeleton rows, no layout jump. */
export const Loading: Story = {
  render: () => ({
    template: '<app-shipping-list />',
    moduleMetadata: {
      providers: [{ provide: ShippingService, useValue: { list: () => NEVER } }],
    },
  }),
};

/** No method defined yet. */
export const Empty: Story = {
  render: () => ({
    template: '<app-shipping-list />',
    moduleMetadata: {
      providers: [{ provide: ShippingService, useValue: { list: () => of([]) } }],
    },
  }),
};

/** The fetch rejected; retry answers. */
export const RequestFailed: Story = {
  render: () => ({
    template: '<app-shipping-list />',
    moduleMetadata: {
      providers: [{ provide: ShippingService, useValue: new FlakyShippingService() }],
    },
  }),
};
