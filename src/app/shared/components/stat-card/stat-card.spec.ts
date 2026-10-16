// src/app/shared/components/stat-card/stat-card.spec.ts
//
// One `describe` per task is the house pattern (see breadcrumb.spec.ts). Each
// test names the test case it proves, so `npm test` output maps 1:1 onto
// TASKS-PHASE-1.md and a reviewer never has to guess which case a test covers.
//
// The card is exercised through small HOST components rather than by poking the
// component instance, because two of the test cases can only be observed through
// a template: whether the tile is marked actionable (tc 10), and what the card
// looks like inside a grid (tc 6).

import { Component, signal } from '@angular/core';
import type { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatCard } from './stat-card';
import type { Tone, Trend } from './stat-card';

/**
 * The read-only tile: all optional inputs are bound to signals so ONE host can
 * play every scenario, and (cardClick) is deliberately left unbound.
 */
@Component({
  imports: [StatCard],
  template: `
    <app-stat-card
      [value]="value()"
      [label]="label()"
      [icon]="icon()"
      [tone]="tone()"
      [trend]="trend()"
      [trendValue]="trendValue()"
    />
  `,
})
class Host {
  readonly value = signal('۱۲۴');
  readonly label = signal('کل فروش');
  readonly icon = signal<string | undefined>(undefined);
  readonly tone = signal<Tone>('neutral');
  readonly trend = signal<Trend>('neutral');
  readonly trendValue = signal<string | undefined>(undefined);
}

/** The same tile marked actionable, with a listener attached (tc 10). */
@Component({
  imports: [StatCard],
  template: `<app-stat-card
    [actionable]="true"
    value="۳۸"
    label="سفارشات جدید"
    (cardClick)="clicks = clicks + 1"
  />`,
})
class ClickHost {
  clicks = 0;
}

/**
 * The documented dashboard layout. The PAGE owns the grid — the card only has to
 * fill whatever cell it is given, which is what makes the mobile layout single
 * column (tc 6).
 */
@Component({
  imports: [StatCard],
  template: `
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      @for (tile of tiles; track tile) {
        <app-stat-card [value]="tile" [label]="tile" />
      }
    </div>
  `,
})
class GridHost {
  readonly tiles = ['۱', '۲', '۳', '۴'];
}

function mount<T>(host: Type<T>): ComponentFixture<T> {
  TestBed.configureTestingModule({ imports: [host] });
  const fixture = TestBed.createComponent(host);
  fixture.detectChanges();
  return fixture;
}

function card<T>(fixture: ComponentFixture<T>): HTMLElement {
  return fixture.nativeElement.querySelector('article') as HTMLElement;
}

function paragraphs<T>(fixture: ComponentFixture<T>): HTMLParagraphElement[] {
  return Array.from(card(fixture).querySelectorAll('p'));
}

describe('StatCard', () => {
  it('renders the value and the label (tc 1)', () => {
    const fixture = mount(Host);
    const element = card(fixture);

    expect(element.textContent).toContain('کل فروش');
    expect(element.textContent).toContain('۱۲۴');

    // The sizes are part of the contract, not taste: a muted sm label sits above
    // a 2xl value, which is what makes a row of tiles scannable.
    const [label, value] = paragraphs(fixture);
    expect(label.classList.contains('text-sm')).toBe(true);
    expect(value.classList.contains('text-2xl')).toBe(true);
    expect(value.classList.contains('font-bold')).toBe(true);
  });

  it('renders the icon it is given (tc 2)', () => {
    const fixture = mount(Host);
    fixture.componentInstance.icon.set('pi pi-shopping-cart');
    fixture.detectChanges();

    const glyph = card(fixture).querySelector('i');
    expect(glyph?.classList.contains('pi-shopping-cart')).toBe(true);

    // Decorative: the label already says what the number is, so announcing it
    // again would only add noise for a screen reader.
    expect(glyph?.getAttribute('aria-hidden')).toBe('true');
  });

  it('applies the positive (green) and negative (red) tone to the bubble (tc 3)', () => {
    const fixture = mount(Host);
    fixture.componentInstance.icon.set('pi pi-box');

    fixture.componentInstance.tone.set('positive');
    fixture.detectChanges();
    expect(card(fixture).querySelector('.icon-bubble')?.classList.contains('positive')).toBe(true);
    expect(card(fixture).querySelector('.icon-bubble')?.classList.contains('negative')).toBe(false);

    fixture.componentInstance.tone.set('negative');
    fixture.detectChanges();
    expect(card(fixture).querySelector('.icon-bubble')?.classList.contains('negative')).toBe(true);
    expect(card(fixture).querySelector('.icon-bubble')?.classList.contains('positive')).toBe(false);

    // `neutral` carries no modifier class at all: its colour is the base rule on
    // .icon-bubble, so there is nothing to assert beyond "neither of the others".
    fixture.componentInstance.tone.set('neutral');
    fixture.detectChanges();
    expect(card(fixture).querySelector('.icon-bubble')?.classList.contains('positive')).toBe(false);
    expect(card(fixture).querySelector('.icon-bubble')?.classList.contains('negative')).toBe(false);
  });

  it('shows a pre-formatted Persian value verbatim (tc 4)', () => {
    const fixture = mount(Host);
    fixture.componentInstance.value.set('۴٬۵۰۰٬۰۰۰ تومان');
    fixture.detectChanges();

    // The card must not touch the string. Persian digits and the thousands
    // separator arrive ready-made (BO-B16 owns the formatting); a card that
    // "helpfully" reformatted here would fight the pipe that already did.
    const [, value] = paragraphs(fixture);
    expect(value.textContent?.trim()).toBe('۴٬۵۰۰٬۰۰۰ تومان');
  });

  it('renders with only the required inputs (tc 5)', () => {
    const fixture = mount(Host);

    expect(card(fixture).querySelector('.icon-bubble')).toBeNull();
    expect(card(fixture).querySelector('i')).toBeNull();
    expect(paragraphs(fixture)).toHaveLength(2); // the label and the value, nothing else
  });

  it('fills its grid cell so the page decides the column count (tc 6)', () => {
    const fixture = mount(GridHost);
    const cards = Array.from(fixture.nativeElement.querySelectorAll('article')) as HTMLElement[];

    // Four tiles, each claiming the full width of its cell. The column count —
    // 1 on a phone, 4 on a wide screen — comes from the grid in the PAGE
    // (`sm:grid-cols-2 xl:grid-cols-4` in GridHost). A card with a fixed width
    // would break that layout; one that says `w-full` cannot.
    expect(cards).toHaveLength(4);
    for (const element of cards) {
      expect(element.classList.contains('w-full')).toBe(true);
    }
  });

  it('gives every coloured text a dark-mode counterpart (tc 7)', () => {
    const fixture = mount(Host);
    fixture.componentInstance.trend.set('up');
    fixture.componentInstance.trendValue.set('۱۲٪');
    fixture.detectChanges();

    // The cheap guard against the classic dark-theme bug: a `text-gray-500`
    // with no `dark:` sibling is invisible-ish on the dark card. Every text
    // element must carry at least one dark variant.
    for (const element of paragraphs(fixture)) {
      const classes = Array.from(element.classList);
      expect(classes.some((name) => name.startsWith('dark:'))).toBe(true);
    }
  });

  it('renders a full tile with sample dashboard values (tc 8)', () => {
    const fixture = mount(Host);
    fixture.componentInstance.value.set('۴٬۵۰۰٬۰۰۰ تومان');
    fixture.componentInstance.label.set('فروش این ماه');
    fixture.componentInstance.icon.set('pi pi-shopping-cart');
    fixture.componentInstance.tone.set('positive');
    fixture.componentInstance.trend.set('up');
    fixture.componentInstance.trendValue.set('۱۲٪ نسبت به ماه قبل');
    fixture.detectChanges();

    const element = card(fixture);
    expect(element.textContent).toContain('فروش این ماه');
    expect(element.textContent).toContain('۴٬۵۰۰٬۰۰۰ تومان');
    expect(element.textContent).toContain('۱۲٪ نسبت به ماه قبل');
    expect(element.querySelector('.icon-bubble.positive')).not.toBeNull();
    expect(element.querySelector('.pi-arrow-up')).not.toBeNull();
  });

  it('points the trend arrow in the direction of the change (tc 9)', () => {
    const fixture = mount(Host);
    fixture.componentInstance.trendValue.set('۱۲٪');

    fixture.componentInstance.trend.set('up');
    fixture.detectChanges();
    expect(card(fixture).querySelector('.pi-arrow-up')).not.toBeNull();
    expect(card(fixture).querySelector('.pi-arrow-down')).toBeNull();

    fixture.componentInstance.trend.set('down');
    fixture.detectChanges();
    expect(card(fixture).querySelector('.pi-arrow-down')).not.toBeNull();
    expect(card(fixture).querySelector('.pi-arrow-up')).toBeNull();

    // A neutral trend is text only — there is no arrow to point the wrong way.
    fixture.componentInstance.trend.set('neutral');
    fixture.detectChanges();
    expect(card(fixture).querySelector('i')).toBeNull();
  });

  it('emits cardClick on click and on Enter (tc 10)', () => {
    const fixture = mount(ClickHost);
    const element = card(fixture);

    element.click();
    expect(fixture.componentInstance.clicks).toBe(1);

    // The card advertises role="button", so it must answer Enter like a button
    // does — and Space, which the template maps to the same handler.
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(fixture.componentInstance.clicks).toBe(2);
  });

  it('stays inert when nobody listens for the click (tc 10)', () => {
    const fixture = mount(Host);
    const element = card(fixture);

    expect(element.hasAttribute('data-actionable')).toBe(false);
    expect(element.classList.contains('cursor-pointer')).toBe(false);
    expect(element.getAttribute('role')).toBeNull();
    expect(element.getAttribute('tabindex')).toBeNull();

    // And a stray click is harmless rather than a no-op-looking button.
    element.click();
  });
});
