import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import type { FormArray, FormGroup } from '@angular/forms';
import { ToastService } from '@core/services/toast';
import { formatDigits } from '@shared/pipes/persian-digits.pipe';

import { MAX_IMAGES } from './gallery-form';
import { ProductGalleryUploader } from './product-gallery-uploader';

class ToastStub {
  readonly calls: { level: string; message: string }[] = [];

  success(message: string): void {
    this.calls.push({ level: 'success', message });
  }

  error(message: string): void {
    this.calls.push({ level: 'error', message });
  }

  warning(message: string): void {
    this.calls.push({ level: 'warning', message });
  }

  info(message: string): void {
    this.calls.push({ level: 'info', message });
  }
}

const createObjectURL = URL.createObjectURL;
const revokeObjectURL = URL.revokeObjectURL;

describe('ProductGalleryUploader (BO-F11)', () => {
  let fixture: ComponentFixture<ProductGalleryUploader>;
  let component: ProductGalleryUploader;
  let array: FormArray<FormGroup>;
  let toast: ToastStub;
  let urlCounter = 0;
  const revoked: string[] = [];

  beforeAll(() => {
    // jsdom implements neither; the component's contract needs both.
    URL.createObjectURL = vi.fn(() => `blob:mock-${(urlCounter += 1)}`);
    URL.revokeObjectURL = vi.fn((url: string) => {
      revoked.push(url);
    }) as typeof URL.revokeObjectURL;
  });

  afterAll(() => {
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
  });

  beforeEach(async () => {
    toast = new ToastStub();

    await TestBed.configureTestingModule({
      imports: [ProductGalleryUploader],
      providers: [{ provide: ToastService, useValue: toast }],
    }).compileComponents();

    urlCounter = 0;
    revoked.length = 0;
  });

  function mount(productName = 'هدفون سونی'): void {
    const fb = new FormBuilder();
    array = fb.array<FormGroup>([]);

    fixture = TestBed.createComponent(ProductGalleryUploader);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('images', array);
    fixture.componentRef.setInput('productName', productName);
    fixture.detectChanges();
  }

  function card(index: number): HTMLElement {
    return fixture.nativeElement.querySelector(`[data-image-card="${index}"]`) as HTMLElement;
  }

  function button(selector: string): HTMLButtonElement {
    return fixture.nativeElement.querySelector(selector) as HTMLButtonElement;
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function dragEvent(data: string): DragEvent {
    return {
      preventDefault: vi.fn(),
      dataTransfer: {
        setData: vi.fn(),
        getData: () => data,
        effectAllowed: '',
      },
    } as unknown as DragEvent;
  }

  it('tc 1: previews every picked image and crowns the first one', async () => {
    mount();

    await component.addFiles(
      [
        new File([new Uint8Array(10)], 'one.png', { type: 'image/png' }),
        new File([new Uint8Array(10)], 'two.png', { type: 'image/png' }),
      ],
      'gallery',
    );
    fixture.detectChanges();

    expect(array.length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('[data-image-card]').length).toBe(2);
    expect(card(0).querySelector('img')?.getAttribute('src')).toBe('blob:mock-1');
    expect(card(1).querySelector('img')?.getAttribute('src')).toBe('blob:mock-2');

    // An empty gallery makes its first picture the cover, exactly once.
    expect(fixture.nativeElement.querySelectorAll('[data-primary-badge]').length).toBe(1);
    expect(text()).toContain('۲ از ۵ تصویر');

    // Default alts carry the product name (tc 11).
    expect(card(0).querySelector('img')?.getAttribute('alt')).toBe('هدفون سونی - تصویر ۱');
    expect(card(1).querySelector('img')?.getAttribute('alt')).toBe('هدفون سونی - تصویر ۲');
  });

  it('tc 5: a non-image file is refused with an inline sentence', async () => {
    mount();

    await component.addFiles(
      [new File([new Uint8Array(10)], 'virus.exe', { type: 'application/octet-stream' })],
      'gallery',
    );
    fixture.detectChanges();

    expect(array.length).toBe(0);
    expect(text()).toContain('یک تصویر PNG، JPG یا GIF نیست.');
    expect(fixture.nativeElement.querySelector('[data-gallery-error]')).toBeTruthy();
  });

  it('tc 6: an oversized file is refused and the error names it', async () => {
    mount();

    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' });
    await component.addFiles([big], 'gallery');
    fixture.detectChanges();

    expect(array.length).toBe(0);
    expect(text()).toContain('حجم «big.png» بیشتر از ۲ مگابایت است.');
  });

  it('keeps the good files when a mixed selection has one bad apple', async () => {
    mount();

    await component.addFiles(
      [
        new File([new Uint8Array(10)], 'good.png', { type: 'image/png' }),
        new File([new Uint8Array(10)], 'bad.txt', { type: 'text/plain' }),
      ],
      'gallery',
    );
    fixture.detectChanges();

    expect(array.length).toBe(1);
    expect(text()).toContain('bad.txt');
  });

  it('tc 2: removing a middle image frees its object URL and keeps the cover', async () => {
    mount();

    await component.addFiles(
      [
        new File([new Uint8Array(10)], 'a.png', { type: 'image/png' }),
        new File([new Uint8Array(10)], 'b.png', { type: 'image/png' }),
        new File([new Uint8Array(10)], 'c.png', { type: 'image/png' }),
      ],
      'gallery',
    );
    fixture.detectChanges();

    button('[data-image-card="1"] [data-remove-image]').click();
    fixture.detectChanges();

    expect(array.length).toBe(2);
    expect(revoked).toContain('blob:mock-2');
    expect(array.at(0).get('isPrimary')?.value).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('[data-primary-badge]').length).toBe(1);
  });

  it('tc 2/4: removing the cover promotes the first survivor', async () => {
    mount();

    await component.addFiles(
      [
        new File([new Uint8Array(10)], 'a.png', { type: 'image/png' }),
        new File([new Uint8Array(10)], 'b.png', { type: 'image/png' }),
      ],
      'gallery',
    );
    fixture.detectChanges();

    button('[data-image-card="0"] [data-remove-image]').click();
    fixture.detectChanges();

    expect(array.at(0).get('url')?.value).toBe('blob:mock-2');
    expect(array.at(0).get('isPrimary')?.value).toBe(true);
    expect(text()).toContain('تصویر شاخص');
  });

  it('tc 3: the reorder buttons move the row and the payload order follows', async () => {
    mount();

    await component.addFiles(
      [
        new File([new Uint8Array(10)], 'a.png', { type: 'image/png' }),
        new File([new Uint8Array(10)], 'b.png', { type: 'image/png' }),
        new File([new Uint8Array(10)], 'c.png', { type: 'image/png' }),
      ],
      'gallery',
    );
    fixture.detectChanges();

    // tc 3 through the DOM: the first card moves one step right.
    button('[data-image-card="0"] [data-move-down]').click();
    fixture.detectChanges();

    expect(array.at(1).get('url')?.value).toBe('blob:mock-1');
    // The cover flag travels with the group, not with the position.
    expect(array.at(1).get('isPrimary')?.value).toBe(true);
    expect(card(0).querySelector('[data-primary-badge]')).toBeNull();

    button('[data-image-card="1"] [data-move-up]').click();
    fixture.detectChanges();
    expect(array.at(0).get('url')?.value).toBe('blob:mock-1');

    // Bounds are disabled, not silent: no request can move past the ends.
    expect(
      (
        fixture.nativeElement.querySelector(
          '[data-image-card="0"] [data-move-up]',
        ) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it('tc 4: «تصویر شاخص» moves to the clicked card', async () => {
    mount();

    await component.addFiles(
      [
        new File([new Uint8Array(10)], 'a.png', { type: 'image/png' }),
        new File([new Uint8Array(10)], 'b.png', { type: 'image/png' }),
      ],
      'gallery',
    );
    fixture.detectChanges();

    button('[data-image-card="1"] [data-make-primary]').click();
    fixture.detectChanges();

    expect(array.at(0).get('isPrimary')?.value).toBe(false);
    expect(array.at(1).get('isPrimary')?.value).toBe(true);
    expect(card(1).querySelector('[data-primary-badge]')).toBeTruthy();
    expect(
      (
        fixture.nativeElement.querySelector(
          '[data-image-card="1"] [data-make-primary]',
        ) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it('re-uploading the primary dropzone REPLACES the cover, not appends', async () => {
    mount();

    await component.addFiles(
      [new File([new Uint8Array(10)], 'a.png', { type: 'image/png' })],
      'primary',
    );
    await component.addFiles(
      [new File([new Uint8Array(10)], 'b.png', { type: 'image/png' })],
      'primary',
    );
    fixture.detectChanges();

    expect(array.length).toBe(1);
    expect(array.at(0).get('url')?.value).toBe('blob:mock-2');
    expect(revoked).toContain('blob:mock-1');
  });

  it(`refuses a ${MAX_IMAGES + 1}th image with the ceiling message`, async () => {
    mount();

    const five = Array.from(
      { length: MAX_IMAGES },
      (_, index) => new File([new Uint8Array(10)], `f${index}.png`, { type: 'image/png' }),
    );
    await component.addFiles(five, 'gallery');
    await component.addFiles(
      [new File([new Uint8Array(10)], 'six.png', { type: 'image/png' })],
      'gallery',
    );
    fixture.detectChanges();

    expect(array.length).toBe(MAX_IMAGES);
    expect(text()).toContain(`حداکثر ${formatDigits(MAX_IMAGES)} تصویر برای هر محصول مجاز است.`);
    expect(toast.calls.some((call) => call.level === 'warning')).toBe(true);
  });

  it('tc 11: a typed alt becomes the img alt; empty falls back to the default', async () => {
    mount();

    await component.addFiles(
      [new File([new Uint8Array(10)], 'a.png', { type: 'image/png' })],
      'gallery',
    );
    fixture.detectChanges();

    const input = card(0).querySelector('[data-alt-input]') as HTMLInputElement;
    input.value = 'نمای بالا از هدفون';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(array.at(0).get('alt')?.value).toBe('نمای بالا از هدفون');
    expect(card(0).querySelector('img')?.getAttribute('alt')).toBe('نمای بالا از هدفون');

    // A blank alt is not empty access: the default sentence takes over.
    array.at(0).get('alt')?.setValue('   ');
    fixture.detectChanges();
    expect(card(0).querySelector('img')?.getAttribute('alt')).toBe('هدفون سونی - تصویر ۱');
  });

  it('tc 9: the mobile inputs accept images and the gallery one is multiple', () => {
    mount();

    const primary = fixture.nativeElement.querySelector('[data-primary-input]') as HTMLInputElement;
    const gallery = fixture.nativeElement.querySelector('[data-gallery-input]') as HTMLInputElement;

    expect(primary.getAttribute('accept')).toBe('image/png,image/jpeg,image/gif');
    expect(gallery.getAttribute('accept')).toBe('image/png,image/jpeg,image/gif');
    expect(gallery.hasAttribute('multiple')).toBe(true);
  });

  it('tc 3: dropping a card onto another reorders without an event leak', async () => {
    mount();

    await component.addFiles(
      [
        new File([new Uint8Array(10)], 'a.png', { type: 'image/png' }),
        new File([new Uint8Array(10)], 'b.png', { type: 'image/png' }),
      ],
      'gallery',
    );
    fixture.detectChanges();

    component.onCardDragStart(0, dragEvent('0'));
    component.onCardDragEnter(1);
    fixture.detectChanges();
    expect(component.dragOverIndex()).toBe(1);

    component.onCardDrop(1, dragEvent('0'));
    fixture.detectChanges();

    expect(array.at(1).get('url')?.value).toBe('blob:mock-1');
    expect(component.dragOverIndex()).toBeNull();
  });

  it('a drag starting on the alt input is text selection, not a card move', () => {
    mount();

    const event = {
      preventDefault: vi.fn(),
      target: fixture.nativeElement.appendChild(document.createElement('input')),
      dataTransfer: null,
    } as unknown as DragEvent;

    component.onCardDragStart(0, event);

    expect(event.preventDefault).toHaveBeenCalled();
  });
});
