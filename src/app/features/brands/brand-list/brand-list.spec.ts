import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { ConfirmService } from '@core/services/confirm';
import { ToastService } from '@core/services/toast';
import { OFFLINE_MESSAGE } from '@shared/utils/connectivity';
import { MessageService } from 'primeng/api';
import type { ToggleSwitch } from 'primeng/toggleswitch';
import { Subject, of, throwError } from 'rxjs';
import type { Observable } from 'rxjs';

import type { Brand, BrandInput, BrandListItem, BrandQuery } from '../models/brand.model';
import { BrandsService } from '../services/brands.service';

import { BrandList } from './brand-list';

const SAMSUNG: BrandListItem = {
  id: '6',
  name: 'سامسونگ',
  slug: 'brand-6',
  logo: null,
  isActive: true,
  productCount: 3,
};

const NOKIA: BrandListItem = {
  id: '7',
  name: 'نوکیا',
  slug: 'brand-7',
  logo: 'https://cdn.test/nokia.webp',
  isActive: false,
  productCount: 0,
};

class BrandsServiceStub {
  queries: BrandQuery[] = [];

  removed: string[] = [];

  toggled: { id: string; isActive: boolean }[] = [];

  created: BrandInput | null = null;

  uploads: File[] = [];

  /** Holds the logo upload open so a spec can close the dialog mid-save. */
  uploadHold: Subject<string> | null = null;

  /** Holds the status answer open so a spec can see the optimistic row first. */
  toggleHold: Subject<Brand> | null = null;

  toggleError = false;

  failList = false;

  list(
    query: BrandQuery = {},
  ): Observable<{ items: BrandListItem[]; total: number; page: number; pageSize: number }> {
    this.queries.push(query);

    if (this.failList) {
      throw new Error('offline');
    }

    return of({ items: [SAMSUNG, NOKIA], total: 12, page: query.page ?? 1, pageSize: 10 });
  }

  get(id: string): Observable<Brand> {
    return of({ ...SAMSUNG, id, description: 'توضیح', createdAt: 1 });
  }

  create(dto: BrandInput): Observable<Brand> {
    this.created = dto;

    return of({ ...SAMSUNG, ...dto, id: 'brand-new-9', description: '', createdAt: 1 });
  }

  uploadLogo(file: File): Observable<string> {
    this.uploads.push(file);

    return this.uploadHold ? this.uploadHold.asObservable() : of('https://cdn.test/uploaded.webp');
  }

  setActive(id: string, isActive: boolean): Observable<Brand> {
    this.toggled.push({ id, isActive });

    if (this.toggleError) {
      return throwError(() => new Error('offline'));
    }

    return this.toggleHold
      ? this.toggleHold.asObservable()
      : of({ ...SAMSUNG, id, isActive, description: '', createdAt: 1 });
  }

  remove(id: string): Observable<number> {
    this.removed.push(id);

    return of(0);
  }
}

class ConfirmStub {
  answer = true;

  calls = 0;

  confirm(): Promise<boolean> {
    this.calls += 1;

    return Promise.resolve(this.answer);
  }
}

class ToastStub {
  success = vi.fn();
  warning = vi.fn();
  error = vi.fn();
}

describe('BrandList (BO-G05)', () => {
  let fixture: ComponentFixture<BrandList>;
  let service: BrandsServiceStub;
  let confirm: ConfirmStub;
  let toast: ToastStub;
  let permissions: WritableSignal<readonly string[]>;

  beforeEach(async () => {
    service = new BrandsServiceStub();
    confirm = new ConfirmStub();
    toast = new ToastStub();
    permissions = signal<readonly string[]>(['products.view']);

    await TestBed.configureTestingModule({
      imports: [BrandList],
      providers: [
        { provide: BrandsService, useValue: service },
        { provide: ConfirmService, useValue: confirm },
        { provide: ToastService, useValue: toast },
        MessageService,
        { provide: PERMISSIONS, useValue: permissions },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BrandList);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => vi.restoreAllMocks());

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  /** NgModel writes to the switch in a microtask; flush it before reading the DOM. */
  async function flush(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  }

  async function openCreate(): Promise<void> {
    fixture.componentInstance.openCreate();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function typeName(value: string): Promise<void> {
    const input = element().querySelector('#brand-name') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function selectLogo(): Promise<void> {
    const input = element().querySelector('#brand-logo-file') as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      value: [new File([new Uint8Array(4)], 'logo.png', { type: 'image/png' })],
      configurable: true,
    });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function pressEscape(): void {
    const dialog = element().querySelector('.p-dialog') as HTMLElement;
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
  }

  it('tc 1: renders the rows with their slug, product count and status pill', () => {
    expect(element().textContent).toContain('سامسونگ');
    expect(element().textContent).toContain('brand-6');
    expect(element().textContent).toContain('فعال');
    expect(element().textContent).toContain('غیرفعال');
    // Two rows, 12 total → two pages; the label reports the server total.
    expect(fixture.componentInstance.pageCount()).toBe(2);
  });

  it('tc 9: a row with a logo renders it; a row without one keeps the initial', () => {
    const rows = element().querySelectorAll('tbody tr');

    expect(rows[0].querySelector('img')).toBeNull();
    expect(rows[0].querySelector('[data-brand-avatar]')?.textContent?.trim()).toBe('س');

    const image = rows[1].querySelector('img');
    expect(image?.getAttribute('src')).toBe('https://cdn.test/nokia.webp');
    expect(image?.getAttribute('alt')).toBe('نوکیا — لوگو');
  });

  it('BO-G07: the switch lives in the status cell, with only edit/delete in actions', () => {
    const row = element().querySelector('tbody tr') as HTMLElement;
    const status = row.querySelectorAll('td')[2] as HTMLElement;
    const actions = row.querySelectorAll('td')[3] as HTMLElement;
    const toggle = status.querySelector('[data-toggle-brand="6"]') as HTMLElement;

    expect(toggle).not.toBeNull();
    expect(actions.querySelector('[data-toggle-brand]')).toBeNull();
    expect(status.querySelector('div > span')?.className).toContain('max-sm:hidden');
    expect(toggle.classList.contains('max-sm:box-content')).toBe(true);
    expect(toggle.classList.contains('max-sm:px-0.5')).toBe(true);
    expect(toggle.classList.contains('max-sm:py-2.5')).toBe(true);

    const slider = toggle.querySelector('.p-toggleswitch-slider');
    expect(slider?.getAttribute('style')).toContain('--p-text-muted-color');
  });

  it('tc 6: the toggle flips the row before the answer and calls the endpoint', async () => {
    const hold = new Subject<Brand>();
    service.toggleHold = hold;

    await flush();

    const toggle = element().querySelector('[data-toggle-brand="6"]') as HTMLElement;
    const input = toggle.querySelector('input') as HTMLInputElement;

    expect(input.getAttribute('aria-label')).toBe('وضعیت برند سامسونگ');

    toggle.click();
    fixture.detectChanges();

    // The server has not answered yet; the row already shows the new state.
    expect(fixture.componentInstance.rows()?.[0].isActive).toBe(false);
    expect(service.toggled).toEqual([{ id: '6', isActive: false }]);

    await flush();

    expect(toggle.getAttribute('data-p-checked')).toBe('false');

    hold.next({ ...SAMSUNG, id: '6', isActive: false, description: '', createdAt: 1 });
    hold.complete();
    fixture.detectChanges();

    expect(fixture.componentInstance.rows()?.[0].isActive).toBe(false);
  });

  it('BO-G07 tc 3: a failed toggle reloads the row and does not toast success', async () => {
    service.toggleError = true;
    const before = service.queries.length;

    (element().querySelector('[data-toggle-brand="6"]') as HTMLElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.queries.length).toBe(before + 1);
    expect(fixture.componentInstance.rows()?.[0].isActive).toBe(true);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('BO-G07 tc 4: a successful toggle reports the new state', async () => {
    (element().querySelector('[data-toggle-brand="6"]') as HTMLElement).click();
    await fixture.whenStable();

    expect(toast.success).toHaveBeenCalledWith('برند غیرفعال شد.');
  });

  it('BO-G07 tc 7: offline resets the switch, sends nothing, and warns', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    const toggle = element().querySelector('[data-toggle-brand="6"]') as HTMLElement;

    toggle.click();
    fixture.detectChanges();
    await flush();

    expect(fixture.componentInstance.rows()?.[0].isActive).toBe(true);
    // PrimeNG flips before emitting; the guard must put the switch back.
    expect(toggle.getAttribute('data-p-checked')).toBe('true');
    expect(service.toggled).toEqual([]);
    expect(toast.warning).toHaveBeenCalledWith(OFFLINE_MESSAGE);
  });

  it('BO-G07 tc 9: without products.view the toggle is hidden and the handler is a no-op', () => {
    permissions.set([]);
    fixture.detectChanges();

    expect(element().querySelector('[data-toggle-brand]')).toBeNull();

    fixture.componentInstance.toggleStatus(SAMSUNG, {} as ToggleSwitch);

    expect(service.toggled).toEqual([]);
  });

  it('tc 7: delete asks first, and cancelling sends nothing', async () => {
    confirm.answer = false;

    await fixture.componentInstance.removeBrand(SAMSUNG);
    fixture.detectChanges();

    expect(confirm.calls).toBe(1);
    expect(service.removed).toEqual([]);
  });

  it('tc 7: confirming deletes and reloads the page', async () => {
    await fixture.componentInstance.removeBrand(SAMSUNG);
    await fixture.whenStable();

    expect(service.removed).toEqual(['6']);
    expect(service.queries.length).toBe(2);
  });

  it('tc 1: the search is debounced and starts again from page 1', async () => {
    const input = element().querySelector('#brand-search') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;

    fixture.componentInstance.goTo(2);
    await fixture.whenStable();
    service.queries.length = 0;

    setter.call(input, 'سامسونگ');
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // Nothing is sent for the first 300 ms.
    expect(service.queries).toEqual([]);

    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(service.queries).toEqual([{ query: 'سامسونگ', page: 1, pageSize: 10 }]);
  });

  it('tc 2: the dialog opens for create and for the full edit record', async () => {
    fixture.componentInstance.openCreate();
    expect(fixture.componentInstance.dialogOpen()).toBe(true);
    expect(fixture.componentInstance.editing()).toBeNull();

    fixture.componentInstance.closeDialog();
    fixture.componentInstance.openEdit(SAMSUNG);
    await fixture.whenStable();

    expect(fixture.componentInstance.editing()).toMatchObject({ id: '6', description: 'توضیح' });
  });

  it('blocks Escape and the mask while a save is in flight', async () => {
    const upload = new Subject<string>();
    service.uploadHold = upload;

    await openCreate();
    await typeName('سامسونگ');
    await selectLogo();

    (element().querySelector('[data-save-brand]') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.formSaving()).toBe(true);
    expect(service.uploads).toHaveLength(1);

    // `closeOnEscape` and `dismissableMask` are always false, so PrimeNG binds
    // no escape/mask listener at all. The page's own keydown guard is what
    // refuses Escape while the upload owns the transaction, and the mask has
    // no handler to dismiss it.
    pressEscape();
    expect(fixture.componentInstance.dialogOpen()).toBe(true);
    expect(service.created).toBeNull();

    const mask = element().querySelector('.p-dialog-mask');
    expect(mask).not.toBeNull();
    mask?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.dialogOpen()).toBe(true);
    expect(service.created).toBeNull();

    // The remaining close affordances are gone/disabled.
    expect(element().querySelector('.p-dialog-close-button')).toBeNull();
    expect((element().querySelector('[data-cancel-brand]') as HTMLButtonElement).disabled).toBe(
      true,
    );

    upload.next('https://cdn.test/uploaded.webp');
    upload.complete();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(service.created?.logo).toBe('https://cdn.test/uploaded.webp');
    expect(fixture.componentInstance.dialogOpen()).toBe(false);
  });

  it('closes on Escape when no save is running', async () => {
    await openCreate();

    expect(fixture.componentInstance.dialogOpen()).toBe(true);

    pressEscape();

    expect(fixture.componentInstance.dialogOpen()).toBe(false);
  });
});
