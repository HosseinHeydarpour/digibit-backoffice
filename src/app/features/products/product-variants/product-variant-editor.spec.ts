import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import type { FormArray, FormGroup } from '@angular/forms';
import { ConfirmService } from '@core/services/confirm';
import type { ConfirmOptions } from '@core/services/confirm';
import { ToastService } from '@core/services/toast';

import { ProductVariantEditor } from './product-variant-editor';
import { createVariantArray, createVariantGroup } from './variant-form';
import type { VariantSeed } from './variant-form';

class ConfirmStub {
  confirmed = true;

  readonly calls: ConfirmOptions[] = [];

  confirm(options: ConfirmOptions): Promise<boolean> {
    this.calls.push(options);
    return Promise.resolve(this.confirmed);
  }
}

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

  clear(): void {
    this.calls.length = 0;
  }
}

describe('ProductVariantEditor (BO-F10)', () => {
  let fixture: ComponentFixture<ProductVariantEditor>;
  let component: ProductVariantEditor;
  let array: FormArray<FormGroup>;
  let confirm: ConfirmStub;
  let toast: ToastStub;

  beforeEach(async () => {
    confirm = new ConfirmStub();
    toast = new ToastStub();

    await TestBed.configureTestingModule({
      imports: [ProductVariantEditor],
      providers: [
        { provide: ConfirmService, useValue: confirm },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();
  });

  function mount(seeds: readonly VariantSeed[] = [], basePrice = 2_100_000): void {
    const fb = new FormBuilder();
    array = createVariantArray(fb);

    for (const seed of seeds) {
      array.push(createVariantGroup(fb, { basePrice, seed }));
    }

    fixture = TestBed.createComponent(ProductVariantEditor);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('variants', array);
    fixture.componentRef.setInput('basePrice', basePrice);
    fixture.detectChanges();
  }

  function button(selector: string): HTMLButtonElement {
    return fixture.nativeElement.querySelector(selector) as HTMLButtonElement;
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('tc 1/10: renders one card per row and the live summary', () => {
    mount([
      { sku: 'SONY-1', price: 100, stock: 2 },
      { sku: 'SONY-2', price: 200, stock: 3 },
    ]);

    const rows = fixture.nativeElement.querySelectorAll('[data-variant-row]');

    expect(rows.length).toBe(2);
    expect(rows[0].tagName).toBe('ARTICLE');
    expect(rows[0].className).toContain('rounded-xl');
    expect(text()).toContain('۲ واریانت');
    expect(text()).toContain('۵ عدد موجودی');

    // `space-y-*` spaces siblings with MARGINS, and an inline custom element has
    // no box to take a margin — two variants rendered flush (the fixed bug).
    const hosts = fixture.nativeElement.querySelectorAll('app-product-variant-row');
    expect(hosts.length).toBe(2);
    expect(hosts[0].classList.contains('block')).toBe(true);
  });

  it('tc 7: prefills every control from the seed', () => {
    mount([{ sku: 'SONY-1', price: 250, stock: 4, attributes: { رنگ: 'مشکی' } }]);

    const sku = fixture.nativeElement.querySelector('[data-variant-sku="0"]') as HTMLInputElement;
    const price = fixture.nativeElement.querySelector(
      '[data-variant-price="0"]',
    ) as HTMLInputElement;
    const stock = fixture.nativeElement.querySelector(
      '[data-variant-stock="0"]',
    ) as HTMLInputElement;

    expect(sku.value).toBe('SONY-1');
    expect(price.value).toBe('250');
    expect(stock.value).toBe('4');
    expect(text()).toContain('مشکی');
  });

  it('tc 1: an empty array shows the shared empty state', () => {
    mount();

    expect(fixture.nativeElement.querySelector('[data-variants-empty]')).toBeTruthy();
    expect(text()).toContain('هنوز واریانتی اضافه نشده');
    expect(button('[data-variants-empty] app-empty-state button').textContent).toContain(
      'افزودن اولین واریانت',
    );
  });

  it('tc 1/4: the empty-state action adds a row seeded from the base price', () => {
    mount([], 500_000);

    button('[data-variants-empty] app-empty-state button').click();
    fixture.detectChanges();

    expect(array.length).toBe(1);
    expect(array.at(0).get('price')?.value).toBe(500_000);
    expect(array.at(0).get('stock')?.value).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('[data-variant-row]').length).toBe(1);
  });

  it('tc 4: a new row follows the current base price without rewriting old rows', () => {
    mount([{ sku: 'OLD', price: 100 }], 100);

    fixture.componentRef.setInput('basePrice', 250);
    fixture.detectChanges();

    button('[data-add-variant]').click();
    fixture.detectChanges();

    expect(array.at(0).get('price')?.value).toBe(100);
    expect(array.at(1).get('price')?.value).toBe(250);
  });

  it('tc 3/9: duplicates a row below itself with a free SKU', () => {
    mount([
      {
        sku: 'SONY-1',
        price: 250,
        stock: 4,
        imageUrl: '/images/sony.jpg',
        attributes: { رنگ: 'مشکی' },
      },
    ]);

    button('[data-duplicate-variant]').click();
    fixture.detectChanges();

    expect(array.length).toBe(2);
    expect(array.at(1).get('sku')?.value).toBe('SONY-1-2');
    expect(array.at(1).get('price')?.value).toBe(250);
    expect(array.at(1).get('stock')?.value).toBe(4);
    expect(array.at(1).get('imageUrl')?.value).toBe('/images/sony.jpg');
    expect((array.at(1).get('attributes') as FormArray).length).toBe(1);
  });

  it('tc 2: removal asks the shared confirmation and deletes on accept', async () => {
    mount([{ sku: 'SONY-1' }]);

    button('[data-remove-variant]').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(confirm.calls.length).toBe(1);
    expect(confirm.calls[0].danger).toBe(true);
    expect(confirm.calls[0].message).toContain('SONY-1');
    expect(array.length).toBe(0);
    expect(toast.calls.some((call) => call.level === 'info')).toBe(true);
  });

  it('tc 2: cancelling the confirmation keeps the row', async () => {
    confirm.confirmed = false;
    mount([{ sku: 'SONY-1' }]);

    button('[data-remove-variant]').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(confirm.calls.length).toBe(1);
    expect(array.length).toBe(1);
  });

  it('tc 3: flags duplicate SKUs on both rows and clears them after a fix', () => {
    mount([{ sku: 'ABC-1' }, { sku: 'abc-1' }]);

    const first = array.at(0).get('sku');
    const second = array.at(1).get('sku');

    expect(first?.hasError('duplicateSku')).toBe(true);
    expect(second?.hasError('duplicateSku')).toBe(true);
    expect(text()).toContain('این SKU در ردیف دیگری هم استفاده شده است.');

    second?.setValue('ABC-2');
    fixture.detectChanges();

    expect(first?.hasError('duplicateSku')).toBe(false);
    expect(second?.hasError('duplicateSku')).toBe(false);
  });

  it('tc 12: adds custom and suggested attributes, then removes one', () => {
    mount([{ sku: 'SONY-1' }]);

    const attributes = array.at(0).get('attributes') as FormArray;

    button('[data-add-attribute="custom"]').click();
    fixture.detectChanges();

    expect(attributes.length).toBe(1);

    button('[data-add-attribute="رنگ"]').click();
    fixture.detectChanges();

    expect(attributes.length).toBe(2);
    expect(attributes.at(1).get('key')?.value).toBe('رنگ');

    button('[data-remove-attribute="0"]').click();
    fixture.detectChanges();

    expect(attributes.length).toBe(1);
    expect(attributes.at(0).get('key')?.value).toBe('رنگ');
  });

  it('tc 9: adding a row keeps the caret in the SKU field', () => {
    mount([{ sku: 'SONY-1' }]);

    const sku = fixture.nativeElement.querySelector('[data-variant-sku="0"]') as HTMLInputElement;
    sku.focus();

    button('[data-add-variant]').click();
    fixture.detectChanges();

    expect(array.length).toBe(2);
    expect(document.activeElement).toBe(sku);
  });

  it('tc 5: the summary follows a stock edit', () => {
    mount([{ sku: 'SONY-1', stock: 2 }]);

    array.at(0).get('stock')?.setValue(7);
    fixture.detectChanges();

    expect(text()).toContain('۷ عدد موجودی');
  });

  it('tc 6: the list message appears only after the empty array is touched', () => {
    mount();

    expect(component.listError()).toBeNull();

    array.markAsTouched();
    fixture.detectChanges();

    expect(component.listError()).toContain('حداقل یک واریانت');
  });

  it('guards the ceiling and explains it', () => {
    const seeds = Array.from({ length: 50 }, (_, index) => ({ sku: `SKU-${index}` }));
    mount(seeds);

    component.add();

    expect(array.length).toBe(50);
    expect(toast.calls.some((call) => call.level === 'warning')).toBe(true);
  });
});
