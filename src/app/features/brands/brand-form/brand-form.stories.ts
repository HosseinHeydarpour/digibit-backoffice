import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { of } from 'rxjs';
import type { Observable } from 'rxjs';
import { expect, fireEvent, waitFor } from 'storybook/test';

import type { Brand, BrandInput } from '../models/brand.model';
import { BrandsService } from '../services/brands.service';

import { BrandForm } from './brand-form';

const SAMSUNG: Brand = {
  id: '6',
  name: 'سامسونگ',
  slug: 'brand-6',
  logo: null,
  isActive: true,
  productCount: 6,
  description: 'کره جنوبی',
  createdAt: 1_700_000_000_000,
};

/** A small inline SVG: the story must not depend on the mock layer or a CDN. */
const LOGO_SVG =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#2563eb"/><text x="24" y="31" font-size="20" text-anchor="middle" fill="#fff">D</text></svg>',
  );

/** The form only writes; the story never leaves the page. */
class StaticBrandsService implements Pick<BrandsService, 'create' | 'update' | 'uploadLogo'> {
  create(dto: BrandInput): Observable<Brand> {
    return of({ ...SAMSUNG, ...dto, id: 'brand-new-9' });
  }

  update(_id: string, dto: BrandInput): Observable<Brand> {
    return of({ ...SAMSUNG, ...dto });
  }

  uploadLogo(file: File): Observable<string> {
    return of(`https://cdn.example.com/media/brands/${encodeURIComponent(file.name)}`);
  }
}

const meta: Meta<BrandForm> = {
  title: 'Features/Brands/Form',
  component: BrandForm,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [{ provide: BrandsService, useValue: new StaticBrandsService() }],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          "The create/edit brand form (BO-G05 + logo upload BO-G06), rendered inside the list page's dialog.",
          '',
          '**The slug follows the name** through the shared `slugify` until it is edited by hand.',
          '',
          '**The logo is uploaded when the form is saved, not when the file is picked.** Choosing a',
          'PNG, SVG or WebP (up to 1 MB) only validates the file and shows a 1:1 `blob:` preview.',
          '«ذخیره» sends `POST /media` first and puts the returned URL in the brand DTO; «انصراف»',
          'sends nothing and releases the blob. «حذف لوگو» clears the preview and saves `logo: null`.',
          '',
          '**لوگو هنگام ذخیره آپلود می‌شود، نه هنگام انتخاب فایل.** انتخاب PNG، SVG یا WebP (تا',
          '۱ مگابایت) فقط اعتبارسنجی و پیش‌نمایش ۱:۱ با `blob:` است. «ذخیره» اول `POST /media` را',
          'می‌فرستد و URL برگشتی را در DTO برند می‌گذارد؛ «انصراف» هیچ درخواستی نمی‌فرستد و blob را',
          'آزاد می‌کند. «حذف لوگو» پیش‌نمایش را پاک و `logo: null` را ذخیره می‌کند.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<BrandForm>;

/** Creating a brand: the name generates the slug as it is typed. */
export const Create: Story = {
  args: { brand: null },
};

/** Editing: every field is prefilled, and the slug no longer follows the name. */
export const Edit: Story = {
  args: { brand: SAMSUNG },
};

/** Editing a brand that already has a logo: the 1:1 frame shows the image, not the initial. */
export const WithLogo: Story = {
  args: { brand: { ...SAMSUNG, logo: LOGO_SVG } },
};

/**
 * A rejected file: a PDF is validated locally and the inline error appears.
 *
 * The `play` function picks the file and asserts the error. If the play panel is
 * disabled, choose any PDF from «انتخاب فایل» to see the same state.
 */
export const RejectedFile: Story = {
  args: { brand: null },
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector('#brand-logo-file');

    if (!input) {
      throw new Error('The logo file input is not rendered.');
    }

    const pdf = new File(['%PDF-1.4'], 'brand.pdf', { type: 'application/pdf' });

    await fireEvent.change(input, { target: { files: [pdf] } });

    await waitFor(() => {
      const error = canvasElement.querySelector('[data-logo-error]');
      expect(error).not.toBeNull();
      expect(error?.textContent ?? '').toContain('PNG');
    });
  },
};
