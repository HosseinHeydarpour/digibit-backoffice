import { ChangeDetectionStrategy, Component, OnInit, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { createImageArray, createImageGroup } from './gallery-form';
import type { ImageSeed } from './gallery-form';
import { ProductGalleryUploader } from './product-gallery-uploader';

/**
 * The uploader edits a page-owned FormArray, so the story owns a real one.
 *
 * Seeding happens in `ngOnInit` for the same reason as the variant story: an
 * `input()` is only populated after Angular binds it, and the child's own
 * `ngOnInit` runs first — its `valueChanges` subscription is already listening
 * when these pushes arrive, so the first paint shows the badges and the
 * counter.
 */
@Component({
  selector: 'app-gallery-story',
  imports: [ReactiveFormsModule, ProductGalleryUploader],
  template: `
    <form
      [formGroup]="form"
      (submit)="$event.preventDefault()"
      class="mx-auto w-full max-w-5xl p-4"
    >
      <app-product-gallery-uploader [images]="images" [productName]="productName()" />
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class GalleryStory implements OnInit {
  readonly rows = input<readonly ImageSeed[]>([]);

  readonly productName = input('هدفون بی‌سیم سونی');

  private readonly fb = inject(FormBuilder);

  readonly images = createImageArray(this.fb);

  readonly form = this.fb.group({ images: this.images });

  ngOnInit(): void {
    for (const seed of this.rows()) {
      this.images.push(createImageGroup(this.fb, seed));
    }
  }
}

const meta: Meta<GalleryStory> = {
  title: 'Features/Products/Gallery',
  component: GalleryStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: [
          'Gallery uploader (BO-F11). Two Arino dropzones — «تصویر اصلی» and',
          '«تصاویر گالری» — feeding ONE `FormArray` of rows `{ url, alt, isPrimary, file }`.',
          '',
          'Until the product is saved the files exist only in the browser: each row points at',
          'a `blob:` object URL and keeps its (possibly compressed) `File` for BO-F13 to upload.',
          'PNG/JPG/GIF up to 2 MB, five images at most, with the first one becoming the cover.',
          '',
          'Reorder is drag & drop on desktop and chevron buttons everywhere (keyboard and touch);',
          'the cover flag travels with the group, so reordering never changes which image is the',
          'cover. Deleting the cover promotes the first survivor instead of leaving a coverless',
          'gallery. Object URLs are revoked on remove and on page destroy — never on tab switch,',
          'which only destroys this component.',
          '',
          '`Empty` is the first-run state; `Full` is at the 5-image ceiling, where the dropzone',
          'answers further picks with a Persian ceiling message.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<GalleryStory>;

/** A healthy gallery: one cover and two extras, editable alt texts included. */
export const Default: Story = {
  args: {
    rows: [
      { url: '/mock/products/headphone-1.jpg', alt: 'هدفون از نمای روبه‌رو', isPrimary: true },
      { url: '/mock/products/headphone-2.jpg', alt: 'هدفون در کیف حمل' },
      { url: '/mock/products/headphone-3.jpg', alt: 'نمای پشت کاپ' },
    ],
  },
};

/** First run: the two dropzones are the whole story. */
export const Empty: Story = {
  args: { rows: [] },
};

/** At the ceiling: the counter reads ۵ از ۵ and further picks are refused. */
export const Full: Story = {
  args: {
    rows: [
      { url: '/mock/products/headphone-1.jpg', alt: 'کاور', isPrimary: true },
      { url: '/mock/products/headphone-2.jpg', alt: 'نمای کنار' },
      { url: '/mock/products/headphone-3.jpg', alt: 'نمای پشت' },
      { url: '/mock/products/headphone-4.jpg', alt: 'در کیف' },
      { url: '/mock/products/headphone-5.jpg', alt: 'لوازم همراه' },
    ],
  },
};
