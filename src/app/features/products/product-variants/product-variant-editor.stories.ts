import { ChangeDetectionStrategy, Component, OnInit, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { ProductVariantEditor } from './product-variant-editor';
import { createVariantArray, createVariantGroup } from './variant-form';
import type { VariantSeed } from './variant-form';

/**
 * The editor is a form control consumer, so the story owns a real FormGroup.
 *
 * Seeding happens in `ngOnInit`, not in the constructor: an `input()` is only
 * populated after Angular binds it, and the story's `rows` arg is an input. The
 * child editor's own `ngOnInit` runs first, so its `valueChanges` subscription is
 * already listening when these pushes arrive — which is also what makes the
 * duplicate-SKU story show its warning on first paint.
 */
@Component({
  selector: 'app-variant-editor-story',
  imports: [ReactiveFormsModule, ProductVariantEditor],
  template: `
    <form
      [formGroup]="form"
      (submit)="$event.preventDefault()"
      class="mx-auto w-full max-w-5xl p-4"
    >
      <app-product-variant-editor [variants]="variants" [basePrice]="basePrice()" />
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class VariantEditorStory implements OnInit {
  readonly rows = input<readonly VariantSeed[]>([]);

  readonly basePrice = input(2_100_000);

  private readonly fb = inject(FormBuilder);

  readonly variants = createVariantArray(this.fb);

  readonly form = this.fb.group({ variants: this.variants });

  ngOnInit(): void {
    for (const seed of this.rows()) {
      this.variants.push(createVariantGroup(this.fb, { basePrice: this.basePrice(), seed }));
    }
  }
}

const meta: Meta<VariantEditorStory> = {
  title: 'Features/Products/Variants',
  component: VariantEditorStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: [
          'Variant editor (BO-F10). One `FormArray` of `FormGroup` rows: SKU, price,',
          'stock, an optional image URL and an open key/value attribute list (`رنگ`, `سایز`,',
          'or anything the catalogue needs).',
          '',
          'The first row takes the product base price; later rows take it too, but an existing',
          'row is never rewritten. A duplicated row gets the next free SKU (`SONY-1` →',
          '`SONY-1-2`), so «تکرار» never creates an instant validation error.',
          '',
          'Duplicate SKUs are cross-row facts: the editor re-scans the whole array on every',
          'value change and marks every colliding row. Removal uses the shared confirmation',
          'service, not `window.confirm`.',
          '',
          '`Empty` shows the first-run state; `DuplicateSku` shows the cross-row warning;',
          '`Prefilled` is the shape BO-F14 will hydrate from `GET /products/:id`.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<VariantEditorStory>;

/** Two complete rows — the demo state. */
export const Default: Story = {
  args: {
    rows: [
      {
        sku: 'SONY-WH1000-BLK',
        attributes: { رنگ: 'مشکی', سایز: 'استاندارد' },
        price: 2_100_000,
        stock: 12,
        imageUrl: '/mock/products/sony-1.jpg',
      },
      {
        sku: 'SONY-WH1000-WHT',
        attributes: { رنگ: 'سفید', سایز: 'استاندارد' },
        price: 2_250_000,
        stock: 3,
      },
    ],
  },
};

/** First run: the min-one rule is explained by the empty state, not a red banner. */
export const Empty: Story = {
  args: { rows: [] },
};

/** Two rows with the same SKU in different case — both are marked. */
export const DuplicateSku: Story = {
  args: {
    rows: [
      {
        sku: 'RAZER-KB-01',
        attributes: { رنگ: 'مشکی' },
        price: 1_850_000,
        stock: 5,
      },
      {
        sku: 'razer-kb-01',
        attributes: { رنگ: 'سفید' },
        price: 1_850_000,
        stock: 2,
      },
    ],
  },
};

/** The data shape BO-F14 restores: every value comes from the API, none is generated. */
export const Prefilled: Story = {
  args: {
    rows: [
      {
        sku: 'ASUS-VIVO-16',
        attributes: { رنگ: 'خاکستری', سایز: '16 اینچ', حافظه: '16 گیگابایت' },
        price: 38_500_000,
        stock: 7,
        imageUrl: '/mock/products/asus-1.jpg',
      },
    ],
  },
};
