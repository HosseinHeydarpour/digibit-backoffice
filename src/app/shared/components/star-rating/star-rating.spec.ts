import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StarRating } from './star-rating';

describe('StarRating (BO-N04)', () => {
  let fixture: ComponentFixture<StarRating>;

  function render(rating: number | null): void {
    fixture.componentRef.setInput('rating', rating);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StarRating] }).compileComponents();
    fixture = TestBed.createComponent(StarRating);
    fixture.detectChanges();
  });

  function icons(): string[] {
    return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('i')).map(
      (icon) => icon.className,
    );
  }

  it('renders five full stars for 5', () => {
    render(5);

    expect(icons().filter((name) => name.includes('pi-star-fill'))).toHaveLength(5);
  });

  it('renders a half star for 3.5', () => {
    render(3.5);

    expect(icons().filter((name) => name.includes('pi-star-fill'))).toHaveLength(3);
    expect(icons().filter((name) => name.includes('pi-star-half-fill'))).toHaveLength(1);
    expect(icons().filter((name) => name.includes('pi-star '))).toHaveLength(1);
  });

  it('renders one full star for 1', () => {
    render(1);

    expect(icons().filter((name) => name.includes('pi-star-fill'))).toHaveLength(1);
  });

  it('says «بدون امتیاز» for a null rating', () => {
    render(null);

    expect(fixture.nativeElement.textContent).toContain('بدون امتیاز');
    expect(fixture.nativeElement.querySelector('[aria-label="بدون امتیاز"]')).toBeTruthy();
  });

  it('prints the number beside the stars and names the value for a screen reader', () => {
    render(4);

    expect(fixture.nativeElement.textContent).toContain('۴');
    expect(fixture.nativeElement.querySelector('[aria-label="امتیاز ۴ از ۵"]')).toBeTruthy();
  });
});
