import { Meta, StoryObj } from '@storybook/angular';

import { StarRating } from './star-rating';

const meta: Meta<StarRating> = {
  title: 'Shared/StarRating',
  component: StarRating,
  parameters: {
    docs: {
      description: {
        component: [
          'A 1..5 product rating as five stars (BO-N04). Half values render a half star;',
          '`null` renders five empty stars and «بدون امتیاز», and the number sits beside them.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<StarRating>;

/** Five stars. */
export const Full: Story = { args: { rating: 5 } };

/** The half-star case. */
export const Half: Story = { args: { rating: 3.5 } };

/** One star. */
export const One: Story = { args: { rating: 1 } };

/** A review without a score. */
export const NoRating: Story = { args: { rating: null } };
