// src/app/features/dashboard/sales-chart/sales-chart.stories.ts
import { Meta, StoryObj } from '@storybook/angular';

import type { SalesChartPoint } from '../models/dashboard.model';

import { SalesChart } from './sales-chart';

const SAMPLE_7_DAYS: SalesChartPoint[] = [
  { date: '2026-10-12', value: 14_000_000 },
  { date: '2026-10-13', value: 18_500_000 },
  { date: '2026-10-14', value: 22_000_000 },
  { date: '2026-10-15', value: 16_000_000 },
  { date: '2026-10-16', value: 29_000_000 },
  { date: '2026-10-17', value: 21_000_000 },
  { date: '2026-10-18', value: 35_000_000 },
];

const SAMPLE_30_DAYS: SalesChartPoint[] = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const dayStr = day < 10 ? `0${day}` : `${day}`;
  return {
    date: `2026-09-${dayStr}`,
    value: 10_000_000 + ((i * 37) % 17) * 2_500_000,
  };
});

const meta: Meta<SalesChart> = {
  title: 'Features/Dashboard/SalesChart',
  component: SalesChart,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Sales Chart widget (BO-E03) displaying 7-day and 30-day store performance using PrimeNG UIChart with Jalali dates and RTL/FaNum formatting.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<SalesChart>;

export const SevenDays: Story = {
  args: {
    data: SAMPLE_7_DAYS,
    range: 7,
    loading: false,
  },
};

export const ThirtyDays: Story = {
  args: {
    data: SAMPLE_30_DAYS,
    range: 30,
    loading: false,
  },
};

export const Loading: Story = {
  args: {
    data: null,
    range: 7,
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    data: [],
    range: 7,
    loading: false,
  },
};
