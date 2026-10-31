import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { of } from 'rxjs';
import type { Observable } from 'rxjs';

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

/** The form only posts; the story never leaves the page. */
class StaticBrandsService implements Pick<BrandsService, 'create' | 'update'> {
  create(dto: BrandInput): Observable<Brand> {
    return of({ ...SAMSUNG, ...dto, id: 'brand-new-9' });
  }

  update(_id: string, dto: BrandInput): Observable<Brand> {
    return of({ ...SAMSUNG, ...dto });
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
          "The create/edit brand form (BO-G05), rendered inside the list page's dialog.",
          '',
          '**The slug follows the name** through the shared `slugify` until it is edited by hand.',
          '',
          '**The logo is a URL for now.** BO-G06 adds the file upload, its size/type checks and the',
          'remove button; the preview here already shows the image or the initial fallback.',
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
