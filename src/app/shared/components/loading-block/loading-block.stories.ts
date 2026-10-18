import { Component, input } from '@angular/core';
import { Meta, StoryObj } from '@storybook/angular';

import { LoadingBlock } from './loading-block';
import type { LoadingVariant } from './loading-block';

/**
 * A host so the Controls panel is real.
 *
 * The block is a wrapper: it projects the caller's markup and swaps in a
 * placeholder. Storybook cannot project content through `args` alone, so this
 * host supplies a fixed card grid as the projected content and forwards every
 * input. With `loading` true that content is never rendered, which is what makes
 * one host enough for all five variants.
 */
@Component({
  selector: 'app-loading-block-story',
  imports: [LoadingBlock],
  template: `
    <app-loading-block
      [loading]="loading()"
      [variant]="variant()"
      [rows]="rows()"
      [columns]="columns()"
      [fields]="fields()"
    >
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        @for (card of [1, 2, 3, 4]; track card) {
          <div
            class="rounded-xl border border-gray-200 bg-white p-6 shadow-md dark:border-gray-700 dark:bg-gray-800"
          >
            <p class="text-sm text-gray-500 dark:text-gray-400">کارت {{ card }}</p>
            <p class="mt-2 text-2xl font-bold text-dark dark:text-light">{{ card * 125 }}</p>
          </div>
        }
      </div>
    </app-loading-block>
  `,
})
class LoadingBlockStory {
  readonly loading = input<boolean>(true);
  readonly variant = input<LoadingVariant>('cards');
  readonly rows = input<number>(5);
  readonly columns = input<number>(4);
  readonly fields = input<number>(3);
}

const meta: Meta<LoadingBlock> = {
  title: 'Shared/LoadingBlock',
  component: LoadingBlock,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['cards', 'table', 'form', 'list', 'text'],
    },
    rows: { control: { type: 'number', min: 1, max: 12 } },
    columns: { control: { type: 'number', min: 1, max: 6 } },
    fields: { control: { type: 'number', min: 1, max: 8 } },
  },
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: [
          'The «the real content is on its way» block: your markup while `loading` is false, and a',
          'skeleton that **mirrors** it while `loading` is true.',
          '',
          '**Use case** — every list, table, card row or form that fetches before it can render.',
          'Reach for it instead of writing `@if (loading()) { … } @else { … }` by hand. Do **not**',
          'use it for a whole-page route transition: a route that has not resolved yet has no layout',
          'to mirror, and the router’s own view transition is the right mechanism there.',
          '',
          '**How to use** — project the real markup and bind `[loading]`. `variant` picks the shape,',
          'and `rows` / `columns` / `fields` size it to the content that is coming. The one rule that',
          'matters: **the counts must match the real page size**, because that is what keeps the page',
          'height stable when the data lands.',
          '',
          '**Logic** — the wrapper exists because the hand-written `@if`/`@else` pair drifts. Someone',
          'changes the table’s padding, nobody changes the skeleton, and every load produces a jump.',
          'Keeping the real markup in one place and the placeholder in one place means the only thing',
          'that can drift is the variant name — and that is a closed union, so a typo is a compile',
          'error.',
          '',
          'The block owns **no surface of its own** and adds **no wrapper element** in either state.',
          'The caller’s card, table or section is the surface; nesting a second one would show a',
          'border inside a border. `@if`/`@else` is used rather than `[class.hidden]` so the real',
          'content is not even instantiated while loading — its `@for` does not run and its API',
          'calls do not fire.',
          '',
          '`role="status"` + `aria-busy="true"` sits on the container, not on the placeholders.',
          'PrimeNG’s `p-skeleton` hard-codes `aria-hidden="true"` on its host, which is correct — a',
          'rectangle with no text has nothing to announce — so the announcement has to come from the',
          'container: one polite sentence instead of a screen reader walking twenty silent boxes.',
          '',
          'The skeleton colours are **Aura’s**, including the dark pair (`rgba(255,255,255,0.06)`',
          'base, `0.04` sweep). Nothing here overrides them, so the placeholder cannot get out of',
          'step with the card surface — toggle the Theme toolbar and watch it follow.',
        ].join('\n'),
      },
    },
  },
};
export default meta;
type Story = StoryObj<LoadingBlock>;

/** The card-row placeholder — a dashboard’s KPI strip. */
export const Cards: Story = {
  args: { loading: true, variant: 'cards', columns: 4 },
  render: (args) => ({
    props: args,
    template: `<app-loading-block-story
      [loading]="loading"
      [variant]="variant"
      [rows]="rows"
      [columns]="columns"
      [fields]="fields"
    />`,
    moduleMetadata: { imports: [LoadingBlockStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'The grid classes in the placeholder ARE the real grid — `grid-cols-1 sm:grid-cols-2 ' +
          'xl:grid-cols-4`. That is the whole mechanism behind "the skeleton reflects the layout": ' +
          'resize the canvas and the placeholder and the content collapse at the same widths, so ' +
          'nothing reflows when the data arrives.',
      },
    },
  },
};

/** The table placeholder — five rows and a static header band. */
export const Table: Story = {
  args: { loading: true, variant: 'table', rows: 5 },
  render: (args) => ({
    props: args,
    template: `<app-loading-block-story
      [loading]="loading"
      [variant]="variant"
      [rows]="rows"
      [columns]="columns"
      [fields]="fields"
    />`,
    moduleMetadata: { imports: [LoadingBlockStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'The header band does **not** pulse while the rows do. A table header is persistent ' +
          'furniture, not data — animating it would imply it is also waiting for something. The ' +
          'leading circle is the avatar/thumb column nearly every list in this panel has.',
      },
    },
  },
};

/** The form placeholder — three label+field pairs and a submit row. */
export const Form: Story = {
  args: { loading: true, variant: 'form', fields: 3 },
  render: (args) => ({
    props: args,
    template: `<app-loading-block-story
      [loading]="loading"
      [variant]="variant"
      [rows]="rows"
      [columns]="columns"
      [fields]="fields"
    />`,
    moduleMetadata: { imports: [LoadingBlockStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'The label bar is short and thin, the field is tall — that shape difference is what makes ' +
          'a form readable at a glance. Two identical bars would read as a list. The 2.5rem field ' +
          'height is the one the Aura theme gives a real input, so the rhythm matches.',
      },
    },
  },
};

/** The feed placeholder — stacked rows with a leading circle and two text lines. */
export const List: Story = {
  args: { loading: true, variant: 'list', rows: 4 },
  render: (args) => ({
    props: args,
    template: `<app-loading-block-story
      [loading]="loading"
      [variant]="variant"
      [rows]="rows"
      [columns]="columns"
      [fields]="fields"
    />`,
    moduleMetadata: { imports: [LoadingBlockStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'The same problem as `Table` without a header — an activity stream, a comment list, a ' +
          'timeline.',
      },
    },
  },
};

/** The paragraph placeholder — a detail page or a description field. */
export const Text: Story = {
  args: { loading: true, variant: 'text', rows: 4 },
  render: (args) => ({
    props: args,
    template: `<app-loading-block-story
      [loading]="loading"
      [variant]="variant"
      [rows]="rows"
      [columns]="columns"
      [fields]="fields"
    />`,
    moduleMetadata: { imports: [LoadingBlockStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'The last line is short on purpose. Real prose does not fill its final row to the edge, ' +
          'and a full-width last line is the single detail that makes a skeleton read as fake. ' +
          '`text` is also the `@switch` default, so an unknown variant renders this rather than an ' +
          'empty screen.',
      },
    },
  },
};

/**
 * The loaded state — the same block with `loading` false.
 *
 * Compare with `Cards`: the placeholder is gone, the projected grid is on screen,
 * and no wrapper element was added in either state.
 */
export const Loaded: Story = {
  args: { loading: false, variant: 'cards', columns: 4 },
  render: (args) => ({
    props: args,
    template: `<app-loading-block-story
      [loading]="loading"
      [variant]="variant"
      [rows]="rows"
      [columns]="columns"
      [fields]="fields"
    />`,
    moduleMetadata: { imports: [LoadingBlockStory] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'This is what `[loading]="false"` renders — the caller’s own grid, untouched. Nothing is ' +
          'added around it: no box, no padding, no extra `<div>`. That is why the block can wrap a ' +
          '`<p-table>` or a card row without fighting either one’s surface. Flip the `loading` ' +
          'control to watch the two states replace each other.',
      },
    },
  },
};

/**
 * A whole page in its loading state: a KPI row, a table, a form and a feed.
 *
 * This is the composition the block is designed for — four independent loads, each
 * with its own placeholder shape, all mirroring the real layout.
 */
export const InContext: Story = {
  args: {},
  render: () => ({
    template: `
      <div class="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <app-loading-block [loading]="true" variant="cards" [columns]="4">
          <p class="text-sm text-gray-500">کارت‌ها</p>
        </app-loading-block>

        <app-loading-block [loading]="true" variant="table" [rows]="5">
          <p class="text-sm text-gray-500">جدول</p>
        </app-loading-block>

        <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <app-loading-block [loading]="true" variant="form" [fields]="3">
            <p class="text-sm text-gray-500">فرم</p>
          </app-loading-block>
          <app-loading-block [loading]="true" variant="list" [rows]="4">
            <p class="text-sm text-gray-500">فهرست</p>
          </app-loading-block>
        </div>
      </div>
    `,
    moduleMetadata: { imports: [LoadingBlock] },
  }),
  parameters: {
    docs: {
      description: {
        story:
          'Four blocks, four shapes, one page. Each one announces itself once, so a screen reader ' +
          'hears "loading" four times rather than hearing every individual rectangle — which is ' +
          'the reason the `role="status"` lives on the container.',
      },
    },
  },
};
