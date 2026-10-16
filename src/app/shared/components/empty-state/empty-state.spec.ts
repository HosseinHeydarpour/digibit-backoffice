// src/app/shared/components/empty-state/empty-state.spec.ts
//
// One `describe` per task is the house pattern (see stat-card.spec.ts). Each
// test names the test case it proves, so `npm test` output maps 1:1 onto
// TASKS-PHASE-1.md.
//
// The block is exercised through small HOST components rather than by poking the
// instance, because three of the cases only exist in a template: whether the
// button is rendered at all (tc 1, tc 10), whether clicking it reports (tc 2),
// and what the DEFAULT wording is when the caller says nothing (tc 3).
//
// No `vi` anywhere: only `vitest/globals` types are wired and no spec in this
// repo uses it (see theme.spec.ts, confirm.spec.ts).

import { Component, signal } from '@angular/core';
import type { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmptyState } from './empty-state';

/** The bare case: nothing configured, so every default is under test. */
@Component({
  imports: [EmptyState],
  template: `<app-empty-state />`,
})
class DefaultHost {}

/** Every input as a signal, so ONE host plays every scenario (tc 1, tc 4, tc 6). */
@Component({
  imports: [EmptyState],
  template: `
    <app-empty-state
      [icon]="icon()"
      [title]="title()"
      [description]="description()"
      [actionLabel]="actionLabel()"
      (action)="clicks = clicks + 1"
    />
  `,
})
class Host {
  readonly icon = signal<string>('pi pi-inbox');
  readonly title = signal<string>('موردی برای نمایش وجود ندارد');
  readonly description = signal<string | undefined>(undefined);
  readonly actionLabel = signal<string | null | undefined>(undefined);
  clicks = 0;
}

/** The two documented real-world states, side by side (tc 5, tc 6). */
@Component({
  imports: [EmptyState],
  template: `
    <app-empty-state
      title="هنوز محصولی ثبت نشده"
      description="اولین کالای فروشگاه را اضافه کنید."
      actionLabel="افزودن محصول"
    />
    <app-empty-state icon="pi pi-search" title="نتیجه‌ای یافت نشد" />
  `,
})
class ScenariosHost {}

function mount<T>(host: Type<T>): ComponentFixture<T> {
  TestBed.configureTestingModule({ imports: [host] });
  const fixture = TestBed.createComponent(host);
  fixture.detectChanges();
  return fixture;
}

function block<T>(fixture: ComponentFixture<T>): HTMLElement {
  return fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
}

function button<T>(fixture: ComponentFixture<T>): HTMLButtonElement | null {
  return block(fixture).querySelector('button');
}

function paragraphs<T>(fixture: ComponentFixture<T>): HTMLParagraphElement[] {
  return Array.from(block(fixture).querySelectorAll('p'));
}

describe('EmptyState', () => {
  it('renders a glyph and a sentence with no action at all (tc 1)', () => {
    const fixture = mount(DefaultHost);

    // The <p> count is the assertion that matters: a title-only state must not
    // leave an empty description paragraph behind.
    expect(paragraphs(fixture).length).toBe(1);
    expect(block(fixture).querySelector('i')).toBeTruthy();
    expect(button(fixture)).toBeNull();
  });

  it('speaks the Persian defaults when the caller configures nothing (tc 3)', () => {
    const fixture = mount(DefaultHost);

    expect(block(fixture).textContent).toContain('موردی برای نمایش وجود ندارد');

    // The default glyph is the inbox — "nothing was put here" — which is true of
    // every caller that does not sharpen it.
    const glyph = block(fixture).querySelector('i');
    expect(glyph?.classList.contains('pi-inbox')).toBe(true);
  });

  it('renders the action button when it is labelled (tc 2)', () => {
    const fixture = mount(Host);
    fixture.componentInstance.actionLabel.set('افزودن محصول');
    fixture.detectChanges();

    const element = button(fixture);
    expect(element).toBeTruthy();
    expect(element?.textContent?.trim()).toBe('افزودن محصول');

    // A real <button type="button">, not a styled <a>: this triggers an action
    // on the page rather than navigating, and type="button" keeps it from
    // submitting a surrounding form.
    expect(element?.type).toBe('button');
  });

  it('reports a click through the action output (tc 2)', () => {
    const fixture = mount(Host);
    fixture.componentInstance.actionLabel.set('افزودن محصول');
    fixture.detectChanges();

    button(fixture)?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.clicks).toBe(1);
  });

  it('adds no button when the label is null (tc 10)', () => {
    const fixture = mount(Host);
    fixture.componentInstance.actionLabel.set(null);
    fixture.detectChanges();

    // The same element as "never set": `@if` treats null and undefined alike, so
    // there is no separate null branch that could be forgotten.
    expect(button(fixture)).toBeNull();
  });

  it('adds no button when the label is an empty string (tc 10)', () => {
    const fixture = mount(Host);
    fixture.componentInstance.actionLabel.set('');
    fixture.detectChanges();

    // A falsy string would otherwise render a real button with no text on it,
    // which is worse than no button: it is a focus stop that says nothing.
    expect(button(fixture)).toBeNull();
  });

  it('applies a custom icon over the default (tc 4)', () => {
    const fixture = mount(Host);
    fixture.componentInstance.icon.set('pi pi-search');
    fixture.detectChanges();

    const glyph = block(fixture).querySelector('i');
    expect(glyph?.classList.contains('pi-search')).toBe(true);
    expect(glyph?.classList.contains('pi-inbox')).toBe(false);
  });

  it('allows a custom icon to replace the default entirely', () => {
    const fixture = mount(Host);
    fixture.componentInstance.icon.set('pi pi-filter-slash');
    fixture.detectChanges();

    const glyph = block(fixture).querySelector('i');
    expect(glyph?.classList.contains('pi-filter-slash')).toBe(true);

    // Decorative: the sentence beside it already says what happened, so
    // announcing the glyph too would only add noise.
    expect(glyph?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders the description line only when there is one (tc 1)', () => {
    const fixture = mount(Host);

    expect(paragraphs(fixture).length).toBe(1);

    fixture.componentInstance.description.set('اولین کالای فروشگاه را اضافه کنید.');
    fixture.detectChanges();

    expect(paragraphs(fixture).length).toBe(2);
    expect(block(fixture).textContent).toContain('اولین کالای فروشگاه را اضافه کنید.');
  });

  it('carries an override title verbatim (tc 6)', () => {
    const fixture = mount(Host);
    fixture.componentInstance.title.set('نتیجه‌ای یافت نشد');
    fixture.detectChanges();

    expect(block(fixture).textContent).toContain('نتیجه‌ای یافت نشد');
  });

  it('renders the empty product list and the empty search as two different states (tc 5, tc 6)', () => {
    const fixture = mount(ScenariosHost);
    const blocks = fixture.nativeElement.querySelectorAll('[role="status"]');
    const [products, search] = Array.from(blocks) as HTMLElement[];

    // tc 5 — a list with no rows yet, and a way to start.
    expect(products.textContent).toContain('هنوز محصولی ثبت نشده');
    expect(products.querySelector('button')?.textContent?.trim()).toBe('افزودن محصول');
    expect(products.querySelector('i')?.classList.contains('pi-inbox')).toBe(true);

    // tc 6 — a search that found nothing. Same component, different sentence and
    // a sharper glyph, and deliberately NO button: there is nothing to create.
    expect(search.textContent).toContain('نتیجه‌ای یافت نشد');
    expect(search.querySelector('button')).toBeNull();
    expect(search.querySelector('i')?.classList.contains('pi-search')).toBe(true);
  });

  it('announces politely rather than interrupting (tc 7, tc 8)', () => {
    const fixture = mount(DefaultHost);
    const root = block(fixture);

    // `status` is the polite live-region role: an empty state is the RESULT of a
    // load, not an interruption, so a screen reader should reach it at the next
    // pause instead of cutting off what it was reading.
    expect(root.getAttribute('role')).toBe('status');
  });

  it('centres its whole column, so the 320px layout needs no breakpoint (tc 7)', () => {
    const fixture = mount(DefaultHost);
    const root = block(fixture);

    // A centred single column IS the mobile layout; there is nothing to
    // collapse, which is why no `sm:` variant appears in the template.
    expect(root.classList.contains('text-center')).toBe(true);
    expect(root.classList.contains('flex-col')).toBe(true);
    expect(root.classList.contains('items-center')).toBe(true);
  });

  it('paints the title with the theme pair, for contrast in both modes (tc 8)', () => {
    const fixture = mount(DefaultHost);
    const [title] = paragraphs(fixture);

    // The same pair page-header's heading uses: `text-dark` / `dark:text-light`.
    // If one of the two is ever dropped, the sentence disappears into the
    // background in exactly one of the two themes.
    expect(title.classList.contains('text-dark')).toBe(true);
    expect(title.classList.contains('dark:text-light')).toBe(true);
    expect(title.classList.contains('font-medium')).toBe(true);
  });

  it('keeps the glyph and the button legible in dark mode (tc 8)', () => {
    const fixture = mount(Host);
    fixture.componentInstance.actionLabel.set('افزودن محصول');
    fixture.detectChanges();

    const glyphBox = block(fixture).querySelector('div.rounded-full') as HTMLElement;

    // A theme pair on each surface: the glyph circle and the brand button both
    // have a light and a dark half.
    expect(glyphBox.classList.contains('bg-gray-100')).toBe(true);
    expect(glyphBox.classList.contains('dark:bg-gray-700')).toBe(true);

    const action = button(fixture);
    expect(action?.classList.contains('bg-primary')).toBe(true);
    expect(action?.classList.contains('text-white')).toBe(true);
    expect(action?.classList.contains('hover:bg-primary-600')).toBe(true);
  });
});
