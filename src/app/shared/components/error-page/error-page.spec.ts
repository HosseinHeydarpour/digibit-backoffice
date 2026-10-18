// src/app/shared/components/error-page/error-page.spec.ts
//
// Two groups, on purpose:
//
//   * COMPONENT — a recording `Router` and `Location`, because the repo forbids
//     `vi.fn`/`vi.spyOn` and both dependencies are reached through a single
//     narrow method each. This is where the copy, the code and the two actions
//     are asserted, deterministically.
//   * ROUTING — a real router through `RouterTestingHarness`, because tc 1 and
//     tc 6 are about the ROUTE TABLE, not about this component. Asserting them
//     against a stub router would prove nothing.

import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { ErrorPage } from './error-page';

/**
 * The two routes this page is wired to, copied from `app.routes.ts`.
 *
 * `withComponentInputBinding()` is the part that matters: `code` is a required
 * input with no wrapper component, so without it the router matches the route
 * and then throws NG0950 while rendering. The real app registers it in
 * `app.config.ts`; a test router has to ask for it explicitly.
 */
const ERROR_ROUTES = [
  { path: 'forbidden', component: ErrorPage, data: { code: 403 } },
  { path: '**', component: ErrorPage, data: { code: 404 } },
];

/** Records navigations instead of performing them. */
class RecordingRouter {
  readonly navigations: string[] = [];

  navigateByUrl(url: string): Promise<boolean> {
    this.navigations.push(url);
    return Promise.resolve(true);
  }
}

/** Records back() calls and reports a fixed history state. */
class RecordingLocation {
  backs = 0;

  constructor(private readonly state: unknown = null) {}

  back(): void {
    this.backs += 1;
  }

  getState(): unknown {
    return this.state;
  }
}

interface Mounted {
  fixture: ComponentFixture<ErrorPage>;
  router: RecordingRouter;
  location: RecordingLocation;
}

/** Mounts the page for one status code with a given history state. */
function mount(code: number, state: unknown = null): Mounted {
  const router = new RecordingRouter();
  const location = new RecordingLocation(state);

  TestBed.configureTestingModule({
    imports: [ErrorPage],
    providers: [
      { provide: Router, useValue: router },
      { provide: Location, useValue: location },
    ],
  });

  const fixture = TestBed.createComponent(ErrorPage);
  fixture.componentRef.setInput('code', code);
  fixture.detectChanges();

  return { fixture, router, location };
}

/** The visible text of the page, with runs of whitespace collapsed. */
function text(fixture: ComponentFixture<ErrorPage>): string {
  return (fixture.nativeElement as HTMLElement).textContent!.replace(/\s+/g, ' ').trim();
}

/** The button whose label matches, or undefined. */
function button(
  fixture: ComponentFixture<ErrorPage>,
  label: string,
): HTMLButtonElement | undefined {
  const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
  return [...buttons].find((b) => b.textContent!.includes(label)) as HTMLButtonElement | undefined;
}

describe('ErrorPage', () => {
  // tc 4
  describe('status code', () => {
    it('renders 404 in Persian digits', () => {
      const { fixture } = mount(404);

      expect(text(fixture)).toContain('۴۰۴');
    });

    it('renders 403 in Persian digits', () => {
      const { fixture } = mount(403);

      expect(text(fixture)).toContain('۴۰۳');
    });

    it('hides the watermark from assistive technology but keeps it in the heading', () => {
      const { fixture } = mount(404);
      const root = fixture.nativeElement as HTMLElement;

      expect(root.querySelector('[aria-hidden="true"]')!.textContent).toContain('۴۰۴');
      expect(root.querySelector('h1 .sr-only')!.textContent).toContain('۴۰۴');
    });
  });

  // tc 5
  describe('copy', () => {
    it('says «صفحه یافت نشد» for 404', () => {
      const { fixture } = mount(404);

      expect(text(fixture)).toContain('صفحه یافت نشد');
    });

    it('says «دسترسی ندارید» for 403', () => {
      const { fixture } = mount(403);

      expect(text(fixture)).toContain('دسترسی ندارید');
    });

    it('falls back to a generic pair for a code it does not know', () => {
      const { fixture } = mount(500);

      expect(text(fixture)).toContain('خطایی رخ داد');
      expect(text(fixture)).toContain('۵۰۰');
    });
  });

  // tc 3
  describe('back to dashboard', () => {
    it('is always rendered, even when there is no previous page', () => {
      const { fixture } = mount(404);

      expect(button(fixture, 'بازگشت به داشبورد')).toBeDefined();
    });

    it('navigates to /dashboard when pressed', () => {
      const { fixture, router } = mount(404);

      button(fixture, 'بازگشت به داشبورد')!.click();

      expect(router.navigations).toEqual(['/dashboard']);
    });
  });

  // tc 9
  describe('back to the previous page', () => {
    it('is hidden on a first navigation in the session', () => {
      const { fixture } = mount(404, { navigationId: 1 });

      expect(button(fixture, 'بازگشت به صفحهٔ قبل')).toBeUndefined();
    });

    it('is hidden when the router left no state at all', () => {
      const { fixture } = mount(404, null);

      expect(button(fixture, 'بازگشت به صفحهٔ قبل')).toBeUndefined();
    });

    it('appears once the user has navigated at least once', () => {
      const { fixture } = mount(404, { navigationId: 3 });

      expect(button(fixture, 'بازگشت به صفحهٔ قبل')).toBeDefined();
    });

    it('asks the location to go back when pressed', () => {
      const { fixture, location } = mount(404, { navigationId: 3 });

      button(fixture, 'بازگشت به صفحهٔ قبل')!.click();

      expect(location.backs).toBe(1);
    });
  });

  // tc 1, tc 10
  describe('routing', () => {
    it('renders the 404 page for a URL that matches nothing', async () => {
      TestBed.configureTestingModule({
        providers: [provideRouter(ERROR_ROUTES, withComponentInputBinding())],
      });

      const harness = await RouterTestingHarness.create('/does-not-exist');
      const host = harness.routeNativeElement!;

      expect(host.textContent).toContain('۴۰۴');
      expect(host.textContent).toContain('صفحه یافت نشد');
    });

    // tc 6
    it('renders the 403 page when /forbidden is opened directly', async () => {
      TestBed.configureTestingModule({
        providers: [provideRouter(ERROR_ROUTES, withComponentInputBinding())],
      });

      const harness = await RouterTestingHarness.create('/forbidden');
      const host = harness.routeNativeElement!;

      expect(host.textContent).toContain('۴۰۳');
      expect(host.textContent).toContain('دسترسی ندارید');
    });
  });
});
