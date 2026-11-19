import { Meta, StoryObj } from '@storybook/angular';

import type { OrderStatusHistoryEntry } from '../models/order.model';

import { OrderTimeline } from './order-timeline';

const HISTORY: OrderStatusHistoryEntry[] = [
  { id: 'h1', status: 'pending', note: null, createdAt: 1_728_000_000_000 },
  { id: 'h2', status: 'paid', note: null, createdAt: 1_728_003_600_000 },
  { id: 'h3', status: 'processing', note: null, createdAt: 1_728_007_200_000 },
];

const meta: Meta<OrderTimeline> = {
  title: 'Features/Orders/Timeline',
  component: OrderTimeline,
  parameters: {
    docs: {
      description: {
        component: [
          'The five-step order flow (BO-H05). Past steps are green, the current one is brand',
          'coloured, future ones are hollow. Cancelled and returned orders render one red row',
          'with the reason instead of walking the flow.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<OrderTimeline>;

/** The current step is «در حال پردازش». */
export const Processing: Story = { args: { status: 'processing', history: HISTORY } };

/** A cancelled order with its reason. */
export const Cancelled: Story = {
  args: {
    status: 'cancelled',
    history: [
      ...HISTORY,
      { id: 'h4', status: 'cancelled', note: 'انصراف مشتری', createdAt: 1_728_010_000_000 },
    ],
  },
};
