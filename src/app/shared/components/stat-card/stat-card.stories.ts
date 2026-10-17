import { Meta, StoryObj } from '@storybook/angular';

import { StatCard } from './stat-card';

const meta: Meta<StatCard> = {
  title: 'Shared/StatCard',
  component: StatCard,
  tags: ['autodocs'],
  argTypes: {
    cardClick: { action: 'cardClick' },
    tone: {
      control: 'inline-radio',
      options: ['neutral', 'positive', 'negative', 'warning'],
    },
    trend: { control: 'inline-radio', options: ['up', 'down', 'neutral'] },
  },
  parameters: {
    docs: {
      description: {
        component: [
          'One KPI tile: a label, a big value, an optional unit, an icon bubble, and a footer strip',
          'that is either a trend pill or a progress bar.',
          '',
          '**Use case** — reach for this when a single number needs a name, a direction and a unit in',
          'one scannable block: the dashboard summary row, or the header of a list page. Do **not**',
          'use it inside a table or a detail card — a tile is a destination, not a cell, and a grid of',
          'tiles in a form makes the form unreadable.',
          '',
          '**How to use** — `value` and `label` are the only required inputs; everything else is',
          'optional and the card degrades gracefully. `value` is a **pre-formatted string**',
          '(«۴۲٬۸۵۰٬۰۰۰»), never a number: the component knows nothing about currencies or calendars,',
          'which is what keeps it a pure function of its inputs. Turn on `actionable` and bind',
          '`(cardClick)` only when the tile leads somewhere.',
          '',
          '**Logic** — `tone` and `trend` are deliberately separate. A tile can count users going**up**',
          'while the bubble is **red**, because direction and accent answer different questions:',
          '`trend` is which way the number moved, `tone` is whether that is good news. The design',
          'reference uses them independently and so does this.',
          '',
          'Every colour lives in a lookup table (`TONE_STYLES`, `TREND_STYLES`) rather than in the',
          'template, because a class such as `dark:text-green-400` contains a `:` and',
          '`bg-green-900/30` contains a `/` — neither can be bound through `[class.x]`. Binding the',
          'whole list (`[class]="bubbleClasses()"`) works, and Angular merges it with any static',
          '`class` on the same element, so layout stays in the template and colour stays in the table.',
          '',
          '`actionable` is an explicit input and not a detected listener because `output()` returns',
          'an `OutputEmitterRef`, whose public API is only `emit()` and `subscribe()` — there is no way',
          'to ask it whether anybody is listening. A boolean input is the honest version: the caller',
          'says what the tile *is*, and the template stays a pure function of its inputs.',
        ].join('\n'),
      },
    },
  },
};
export default meta;
type Story = StoryObj<StatCard>;

/** Reference card 1 — sales, brand-orange bubble, an up-trend pill. */
export const SalesToday: Story = {
  args: {
    value: '۴۲٬۸۵۰٬۰۰۰',
    unit: 'تومان',
    label: 'فروش امروز',
    icon: 'pi pi-dollar',
    tone: 'neutral',
    footerText: 'افزایش ۱۲٪ نسبت به دیروز',
    trend: 'up',
    trendPercent: '۱۲٪',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The default shape: `tone: neutral` (the brand orange) with a green up-pill. Note the ' +
          'percentage appears twice — spelled out in `footerText` and again as the scannable pill. ' +
          'That is the reference\u2019s own pattern, not a duplication to remove.',
      },
    },
  },
};

/** Reference card 2 — new users, green bubble. */
export const NewUsers: Story = {
  args: {
    value: '۱۴۷',
    label: 'کاربران جدید',
    icon: 'pi pi-users',
    tone: 'positive',
    footerText: '۱۵ کاربر فعال امروز',
    trend: 'up',
    trendPercent: '۸٪',
  },
  parameters: {
    docs: {
      description: {
        story: 'No `unit`: a plain count needs none, and the value line drops to just the number.',
      },
    },
  },
};

/** Reference card 3 — products, red bubble. */
export const Products: Story = {
  args: {
    value: '۳۲',
    label: 'تعداد محصولات',
    icon: 'pi pi-box',
    tone: 'negative',
    footerText: 'کاهش ۲ مورد نسبت به هفته پیش',
    trend: 'down',
    trendPercent: '۲٪',
  },
  parameters: {
    docs: {
      description: {
        story: 'A down-trend: red pill, down arrow, red bubble.',
      },
    },
  },
};

/** Reference card 4 — orders, amber bubble with a progress bar. */
export const Orders: Story = {
  args: {
    value: '۸۵',
    label: 'سفارشات جدید',
    icon: 'pi pi-shopping-cart',
    tone: 'warning',
    progress: 85,
    progressText: '۸۵٪ تحویل شده',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Passing `progress` swaps the footer from the text/pill row to the bar variant. ' +
          '`progressText` is the small percentage beside the bar, coloured with the card\u2019s `tone`.',
      },
    },
  },
};

/**
 * The minimum valid tile: two required inputs and nothing else.
 *
 * No bubble (not an empty circle), no footer, no divider — the footer strip
 * hides itself entirely when it has nothing to show, rather than leaving a
 * gap where it would have been.
 */
export const Minimal: Story = {
  args: {
    value: '۱۴۷',
    label: 'تعداد محصولات',
  },
};

/** A neutral trend — a grey pill with no arrow, because there is no direction to point at. */
export const NeutralTrend: Story = {
  args: {
    value: '۱٬۲۰۴',
    label: 'بازدید صفحه',
    icon: 'pi pi-eye',
    tone: 'neutral',
    footerText: 'بدون تغییر نسبت به دیروز',
    trend: 'neutral',
    trendPercent: '۰٪',
  },
};

/**
 * `progress: 0` is a real value — an empty bar is drawn.
 *
 * This is the case that distinguishes "no progress data" from "no progress
 * made". The bar disappears only when the input is `undefined`.
 */
export const ZeroProgress: Story = {
  args: {
    value: '۰',
    label: 'سفارشات ارسال‌شده امروز',
    icon: 'pi pi-truck',
    tone: 'neutral',
    progress: 0,
    progressText: '۰٪',
  },
};

/**
 * Out-of-range progress is clamped, so a bad number cannot draw a bar that
 * overflows its track. `140` renders as a full bar.
 */
export const ClampedProgress: Story = {
  args: {
    value: '۱۴۰',
    label: 'سفارشات پردازش‌شده',
    icon: 'pi pi-check-circle',
    tone: 'positive',
    progress: 140,
    progressText: '۱۰۰٪',
  },
};

/**
 * The opt-in clickable variant.
 *
 * `actionable: true` adds a pointer cursor, a keyboard focus stop, Enter/Space
 * activation and a visible focus ring. Leave it off — the default — and the tile
 * is inert: no cursor, no focus stop, never a fake button. Tab to this card and
 * press Enter to fire `cardClick`.
 */
export const Actionable: Story = {
  args: {
    value: '۳۸',
    label: 'سفارشات جدید',
    icon: 'pi pi-shopping-cart',
    tone: 'neutral',
    actionable: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Bind `(cardClick)` together with `[actionable]="true"`. The output fires only when the ' +
          'tile is marked actionable, so a read-only tile can never emit.',
      },
    },
  },
};

/** All four tones side by side, at a glance. */
export const AllTones: Story = {
  args: {},
  render: () => ({
    template: `
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <app-stat-card value="۴۲٬۸۵۰٬۰۰۰" unit="تومان" label="خنثی (برند)" icon="pi pi-dollar" tone="neutral" />
        <app-stat-card value="۱۴۷" label="مثبت" icon="pi pi-users" tone="positive" />
        <app-stat-card value="۳۲" label="منفی" icon="pi pi-box" tone="negative" />
        <app-stat-card value="۸۵" label="هشدار" icon="pi pi-shopping-cart" tone="warning" />
      </div>
    `,
    moduleMetadata: { imports: [StatCard] },
  }),
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story:
          'The four accent colours together. Each tone paints three things — the bubble, the bar ' +
          'fill and the bar label — and all three come from one `TONE_STYLES` entry so they cannot ' +
          'drift apart.',
      },
    },
  },
};
