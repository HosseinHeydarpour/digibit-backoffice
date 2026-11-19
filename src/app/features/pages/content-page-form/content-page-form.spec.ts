import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmService } from '@core/services/confirm';
import { ApiError } from '@shared/models';
import { Observable, of, throwError } from 'rxjs';

import type { ContentPage, ContentPageInput } from '../models/content-page.model';
import { PagesService } from '../services/pages.service';

import { ContentPageForm } from './content-page-form';

const PAGE: ContentPage = {
  slug: 'about',
  title: 'درباره ما',
  body: 'خط اول\nخط دوم',
  metaTitle: 'عنوان متا',
  metaDescription: 'توضیح متا',
  updatedAt: 1_728_000_000_000,
};

class PagesServiceStub {
  updates: { slug: string; input: ContentPageInput }[] = [];

  failWith: unknown = null;

  update(slug: string, input: ContentPageInput): Observable<ContentPage> {
    this.updates.push({ slug, input });

    return this.failWith ? throwError(() => this.failWith) : of({ ...PAGE, ...input });
  }
}

describe('ContentPageForm (BO-L08)', () => {
  let fixture: ComponentFixture<ContentPageForm>;
  let component: ContentPageForm;
  let service: PagesServiceStub;
  let confirm: { confirm: ReturnType<typeof vi.fn> };

  async function mount(page: ContentPage | null): Promise<void> {
    service = new PagesServiceStub();
    confirm = { confirm: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [ContentPageForm],
      providers: [
        { provide: PagesService, useValue: service },
        { provide: ConfirmService, useValue: confirm },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContentPageForm);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('page', page);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('hydrates the four fields and previews the body with its newlines', async () => {
    await mount(PAGE);

    expect(component.form.controls.title.value).toBe('درباره ما');
    expect(component.preview()).toContain('خط دوم');
    expect(fixture.nativeElement.textContent).toContain('خط دوم');
  });

  it('saves the trimmed content and emits', async () => {
    await mount(PAGE);
    let emitted = false;
    component.saved.subscribe(() => (emitted = true));

    component.form.patchValue({
      title: ' درباره تازه ',
      body: ' متن تازه ',
      metaTitle: ' عنوان ',
      metaDescription: ' توضیح ',
    });
    component.save();
    await fixture.whenStable();

    expect(service.updates).toEqual([
      {
        slug: 'about',
        input: {
          title: 'درباره تازه',
          body: 'متن تازه',
          metaTitle: 'عنوان',
          metaDescription: 'توضیح',
        },
      },
    ]);
    expect(emitted).toBe(true);
  });

  it('refuses an empty body or a too-short title', async () => {
    await mount(PAGE);

    component.form.patchValue({ title: 'ا', body: '' });
    component.save();
    await fixture.whenStable();

    expect(service.updates).toEqual([]);
    expect(component.saveError()).toContain('کامل');
  });

  it('maps a server 422 under its field', async () => {
    await mount(PAGE);
    service.failWith = new ApiError('VALIDATION', 'بد', 422, {
      title: ['عنوان تکراری است.'],
    });

    component.form.controls.title.setValue('عنوان دیگر');
    component.save();
    await fixture.whenStable();

    expect(component.form.controls.title.errors?.['server']).toBe('عنوان تکراری است.');
    expect(component.fieldError('title')).toBe('عنوان تکراری است.');
  });

  it('asks before leaving with unsaved changes', async () => {
    await mount(PAGE);
    let cancelled = false;
    component.cancelled.subscribe(() => (cancelled = true));

    component.form.controls.title.setValue('تغییر');
    component.form.markAsDirty();
    await component.cancel();

    expect(confirm.confirm).toHaveBeenCalled();
    expect(cancelled).toBe(true);
  });

  it('leaves silently when nothing changed', async () => {
    await mount(PAGE);
    let cancelled = false;
    component.cancelled.subscribe(() => (cancelled = true));

    await component.cancel();

    expect(confirm.confirm).not.toHaveBeenCalled();
    expect(cancelled).toBe(true);
  });
});
