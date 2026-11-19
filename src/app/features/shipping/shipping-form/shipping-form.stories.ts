import { provideRouter } from '@angular/router';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';

import type { ShippingMethod } from '../models/shipping-method.model';

import { ShippingForm } from './shipping-form';

const METHOD: ShippingMethod = {
  id: '1',
  name: 'پست پیشتاز',
  cost: 45_000,
  freeFrom: 1_000_000,
  minDays: 2,
  maxDays: 4,
  isDefault: false,
  isActive: true,
  order: 1,
};

const meta: Meta<ShippingForm> = {
  title: 'Features/Shipping/Form',
  component: ShippingForm,
  decorators: [applicationConfig({ providers: [provideRouter([])] })],
  parameters: {
    docs: {
      description: {
        component: [
          'Shipping create/edit form (BO-K02/K06): name, base cost, optional free threshold and',
          'a two-field delivery window.',
          '',
          '**A free threshold below the cost is a warning**, not an error: the values save, and a',
          'yellow line points out that no order would actually ship free.',
          '',
          '**Validation errors appear after `touched`**, and a server 422 lands under its field',
          'through `fieldError()`.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<ShippingForm>;

/** Create: 2 to 4 days, no cost, no free threshold. */
export const Create: Story = {
  args: { method: null },
};

/** Edit: the same form hydrated from a record. */
export const Edit: Story = {
  args: { method: METHOD },
};
