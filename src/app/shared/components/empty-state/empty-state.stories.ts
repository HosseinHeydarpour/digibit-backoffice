import { Meta, StoryObj } from '@storybook/angular';

import { EmptyState } from './empty-state';

const meta: Meta<EmptyState> = {
  title: 'Shared/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  argTypes: {
    action: { action: 'action' },
  },
  parameters: {
    docs: {
      description: {
        component: [
          'The panel\u2019s «there is nothing here» block: a large muted glyph, a sentence saying',
          'what is missing, an optional second line saying what to do about it, and an optional',
          'primary button that does it.',
          '',
          '**Use case** — every list that can be empty, and every search that can return nothing.',
          'Reach for it whenever a page would otherwise render a blank area, because a blank area',
          'reads as a broken page rather than an empty one.',
          '',
          '**How to use** — it paints **no surface of its own**; the caller owns the box. Put it',
          'inside a card, a table\u2019s empty template, or a plain section. Every input has a default,',
          'so `<app-empty-state />` is already valid and speaks the neutral wording. Override `title`',
          'when the *reason* matters more than the fact, and add `actionLabel` when there is a way',
          'out.',
          '',
          '**Logic** — the defaults **are** the two common cases: a list with no rows («موردی برای',
          'نمایش وجود ندارد») and a search with no hits («نتیجه‌ای یافت نشد»). If `title` were',
          'required, every search page would restate a sentence the component already knows, and one',
          'of the two would drift.',
          '',
          '`actionLabel` is the switch that decides whether a button exists — not the `action`',
          'output. `output()` returns an `OutputEmitterRef`, whose public API is `emit()` and',
          '`subscribe()`, so there is no way to ask it whether anybody is listening. Driving the',
          'button from the label means an absent or `null` label needs no separate branch, and a',
          'caller who binds `(action)` but forgets the label gets no button rather than a dead one.',
          '',
          'The block is `role="status"`, not `role="alert"`. An empty state is the **result of a',
          'load**, not an interruption: `alert` makes a screen reader cut off whatever it was',
          'reading, while `status` announces politely at the next pause — the right weight for',
          '«نتیجه‌ای یافت نشد».',
        ].join('\n'),
      },
    },
  },
};
export default meta;
type Story = StoryObj<EmptyState>;

/**
 * Nothing configured at all.
 *
 * The bare default: the neutral `pi pi-inbox` glyph and the generic sentence.
 * Every input has a default, so this is a valid call site — useful in a shared
 * table wrapper that does not know what the list contains.
 */
export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'The glyph is a closed box because it says "nothing was put here", which is true of every ' +
          'caller. Callers that deserve a sharper glyph — a search, a filter — pass one.',
      },
    },
  },
};

/**
 * A search with no hits — the second of the two common cases.
 *
 * The glyph is sharper and the sentence is different, because the **way out** is
 * different: there is nothing to create here, so no button is offered.
 */
export const SearchNoResults: Story = {
  args: {
    icon: 'pi pi-search',
    title: 'نتیجه‌ای یافت نشد',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Compare with `EmptyList`: same component, different wording. A user needs to know which ' +
          'of the two empty states they are looking at, because the fix differs — clear the search, ' +
          'or add the first record.',
      },
    },
  },
};

/** A list with a way out — `actionLabel` is what makes the button exist. */
export const EmptyList: Story = {
  args: {
    title: 'هنوز محصولی ثبت نشده',
    description: 'اولین کالای فروشگاه را اضافه کنید.',
    actionLabel: 'افزودن محصول',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The button renders because `actionLabel` is set. Navigation stays the caller\u2019s ' +
          'business — a shared block has no business knowing about the router — so bind `(action)` ' +
          'to a handler that navigates or opens a form.',
      },
    },
  },
};

/**
 * Title only — no description.
 *
 * No paragraph is rendered at all (not an empty one), so there is no leftover
 * margin where it would have been.
 */
export const TitleOnly: Story = {
  args: {
    title: 'سفارشی برای امروز ثبت نشده',
  },
};

/**
 * `[actionLabel]="null"` behaves exactly like omitting it.
 *
 * The signal is simply falsy, so there is no separate null branch to forget.
 * This is the case a shared table wrapper hits when it passes an optional
 * "create" label straight through.
 */
export const NullActionLabel: Story = {
  args: {
    title: 'موردی برای نمایش وجود ندارد',
    actionLabel: null,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Same rendering as `Default` plus a title. Worth keeping as a story because it is the ' +
          'regression guard for the "no separate null branch" claim.',
      },
    },
  },
};

/**
 * A filtered list that came back empty — a third wording, and a button that
 * clears the filter rather than creating a record.
 */
export const FilteredNoResults: Story = {
  args: {
    icon: 'pi pi-filter',
    title: 'فیلتری اعمال نشد',
    description: 'برای دیدن همهٔ محصولات، فیلترها را پاک کنید.',
    actionLabel: 'پاک کردن فیلترها',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The case that makes the "override the title" design worth having: three empty states, ' +
          'three different sentences, one component.',
      },
    },
  },
};

/** All four states together, each in its own card — which is how a page uses it. */
export const InContext: Story = {
  args: {},
  render: () => ({
    template: `
      <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div class="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <app-empty-state
            title="هنوز محصولی ثبت نشده"
            description="اولین کالای فروشگاه را اضافه کنید تا در این فهرست نمایش داده شود."
            actionLabel="افزودن محصول"
          />
        </div>
        <div class="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <app-empty-state icon="pi pi-search" title="نتیجه‌ای یافت نشد" />
        </div>
        <div class="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <app-empty-state title="سفارشی برای امروز ثبت نشده" />
        </div>
        <div class="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <app-empty-state />
        </div>
      </div>
    `,
    moduleMetadata: { imports: [EmptyState] },
  }),
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story:
          'The component paints no background or border of its own, so each one is wrapped in a ' +
          'card here. That is exactly what a page does — and it is why the component can also be ' +
          'dropped into a `<p-table>` empty template without fighting the table\u2019s own surface.',
      },
    },
  },
};
