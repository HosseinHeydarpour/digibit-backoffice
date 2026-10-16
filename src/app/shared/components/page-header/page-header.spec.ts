// src/app/shared/components/page-header/page-header.spec.ts
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PageHeader } from './page-header';

/**
 * Host components, because a projected slot can only be tested from a parent
 * that actually projects something. This is exactly how a real page uses the
 * component, so the tests exercise the same code path the app will.
 */

/** The full usage: breadcrumb on, description on, one action projected. */
@Component({
  imports: [PageHeader],
  template: `
    <app-page-header title="محصولات" description="مدیریت کالاهای فروشگاه">
      <button type="button" page-header-actions>افزودن محصول</button>
    </app-page-header>
  `,
})
class WithActions {}

/** The minimal usage: a required title and nothing else at all. */
@Component({
  imports: [PageHeader],
  template: `<app-page-header title="پیشخوان" />`,
})
class WithoutActions {}

/** The override: breadcrumb explicitly switched off. */
@Component({
  imports: [PageHeader],
  template: `<app-page-header title="تنظیمات" [showBreadcrumb]="false" />`,
})
class WithoutBreadcrumb {}

describe('PageHeader', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WithActions, WithoutActions, WithoutBreadcrumb],
      // Breadcrumb injects BreadcrumbService, which injects Router —
      // so every host needs a router provider even though no navigation happens.
      providers: [provideRouter([])],
    }).compileComponents();
  });

  /** Mount the full-usage host. */
  function renderWithActions(): ComponentFixture<WithActions> {
    const fixture = TestBed.createComponent(WithActions);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the title as the page h1 and the description (tc 1)', () => {
    const heading = renderWithActions().nativeElement.querySelector('h1') as HTMLElement;
    const description = renderWithActions().nativeElement.querySelector('p') as HTMLElement;

    expect(heading.textContent?.trim()).toBe('محصولات');
    expect(description.textContent?.trim()).toBe('مدیریت کالاهای فروشگاه');
  });

  it('renders no description paragraph when none is given (tc 1, tc 3)', () => {
    const fixture = TestBed.createComponent(WithoutActions);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1')?.textContent?.trim()).toBe('پیشخوان');
    // Not an empty <p> — no <p> at all, so there is also no stray margin.
    expect(fixture.nativeElement.querySelector('p')).toBeNull();
  });

  it('projects the action button into the header and at the inline-end edge (tc 2, tc 7)', () => {
    const fixture = renderWithActions();
    const header = fixture.nativeElement.querySelector('header') as HTMLElement;
    const actions = header.lastElementChild as HTMLElement;

    // The action is the LAST child of the row. In a `justify-between` flex row
    // inside a RTL document that is the inline-end edge — visually the LEFT,
    // which is where the task puts the primary buttons.
    expect(actions.querySelector('button')?.textContent?.trim()).toBe('افزودن محصول');
    // And the title block is the FIRST child, i.e. the inline-start (right) side.
    expect(header.firstElementChild?.querySelector('h1')).toBeTruthy();
  });

  it('keeps the row intact when no action is projected (tc 3)', () => {
    const fixture = TestBed.createComponent(WithoutActions);
    fixture.detectChanges();
    const header = fixture.nativeElement.querySelector('header') as HTMLElement;

    // The actions wrapper still exists but is empty; an empty flex container
    // collapses to zero height, which is what stops it from leaving a gap.
    expect(header).toBeTruthy();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    expect(header.querySelector('h1')).toBeTruthy();
  });

  it('never wraps the title, so a narrow screen keeps one line (tc 4)', () => {
    const fixture = renderWithActions();
    const heading: HTMLElement = fixture.nativeElement.querySelector('h1');

    // jsdom does no layout, so the visual result cannot be measured — pin the
    // class contract that produces it. `truncate` carries `white-space: nowrap`,
    // and its parent carries `min-w-0` so the column is allowed to shrink.
    expect(heading.classList.contains('truncate')).toBe(true);
    expect((heading.parentElement as HTMLElement).classList.contains('min-w-0')).toBe(true);
  });

  it('ellipsises a long description instead of wrapping it (tc 5)', () => {
    const fixture = renderWithActions();
    const description: HTMLElement = fixture.nativeElement.querySelector('p');

    expect(description.classList.contains('truncate')).toBe(true);
  });

  it('renders one identical header structure for every page (tc 6)', () => {
    const withActions = renderWithActions();
    const withoutActions = TestBed.createComponent(WithoutActions);
    withoutActions.detectChanges();

    // "Uniform" is the acceptance criterion: whatever the page passes, the root
    // is a <header> with a single <h1>. No page gets a different skeleton.
    for (const fixture of [withActions, withoutActions]) {
      expect(fixture.nativeElement.querySelectorAll('header')).toHaveLength(1);
      expect(fixture.nativeElement.querySelectorAll('h1')).toHaveLength(1);
    }
  });

  it('carries the dark-mode classes so the header adapts to the theme (tc 8)', () => {
    const fixture = renderWithActions();
    const heading: HTMLElement = fixture.nativeElement.querySelector('h1');
    const description: HTMLElement = fixture.nativeElement.querySelector('p');

    // `dark:` is bound to the single `.app-dark` class on <html> (tailwind.css),
    // so these classes are what keeps contrast correct in dark mode.
    expect(heading.classList.contains('dark:text-light')).toBe(true);
    expect(description.classList.contains('dark:text-gray-400')).toBe(true);
  });

  it('hosts the breadcrumb beside the title and lets a page switch it off (tc 9)', () => {
    const withCrumb = renderWithActions();
    expect(withCrumb.nativeElement.querySelector('header app-breadcrumb')).toBeTruthy();

    const withoutCrumb = TestBed.createComponent(WithoutBreadcrumb);
    withoutCrumb.detectChanges();
    expect(withoutCrumb.nativeElement.querySelector('app-breadcrumb')).toBeNull();
  });

  it('uses the shared spacing and type scale (tc 10)', () => {
    const fixture = renderWithActions();
    const header: HTMLElement = fixture.nativeElement.querySelector('header');
    const heading: HTMLElement = fixture.nativeElement.querySelector('h1');

    // 24px below the header, and the same two-step heading size as the rest of
    // the panel so pages do not drift apart.
    expect(header.classList.contains('mb-6')).toBe(true);
    expect(heading.classList.contains('text-xl')).toBe(true);
    expect(heading.classList.contains('sm:text-2xl')).toBe(true);
  });

  it('stacks title and actions vertically below the sm breakpoint (tc 4)', () => {
    const fixture = renderWithActions();
    const header: HTMLElement = fixture.nativeElement.querySelector('header');

    // `flex-col` is the mobile default; `sm:flex-row` is the desktop upgrade.
    // Losing the `flex-col` default is what would squeeze the title at 320px.
    expect(header.classList.contains('flex-col')).toBe(true);
    expect(header.classList.contains('sm:flex-row')).toBe(true);
  });
});
