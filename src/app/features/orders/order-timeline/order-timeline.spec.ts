import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { OrderStatus } from '@shared/models/status-badge.model';

import type { OrderStatusHistoryEntry } from '../models/order.model';
import { ORDER_FLOW, orderStatusLabel } from '../order-status';

import { OrderTimeline } from './order-timeline';

const HISTORY: OrderStatusHistoryEntry[] = [
  { id: 'h1', status: 'pending', note: null, createdAt: 1_728_000_000_000 },
  { id: 'h2', status: 'paid', note: null, createdAt: 1_728_003_600_000 },
  { id: 'h3', status: 'processing', note: null, createdAt: 1_728_007_200_000 },
];

describe('OrderTimeline (BO-H05)', () => {
  let fixture: ComponentFixture<OrderTimeline>;

  function render(status: OrderStatus, history = HISTORY): void {
    fixture.componentRef.setInput('status', status);
    fixture.componentRef.setInput('history', history);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [OrderTimeline] }).compileComponents();
    fixture = TestBed.createComponent(OrderTimeline);
  });

  function steps(): HTMLElement[] {
    return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('ol li'));
  }

  it('renders the five flow steps in order', () => {
    render('processing');

    expect(steps().map((step) => step.querySelector('p')?.textContent?.trim())).toEqual(
      ORDER_FLOW.map((status) => orderStatusLabel(status)),
    );
  });

  it('marks past steps done and the current step bold', () => {
    render('processing');

    expect(steps()[0].querySelector('.bg-green-100')).toBeTruthy();
    expect(steps()[2].querySelector('.bg-primary')).toBeTruthy();
    expect(steps()[2].querySelector('.font-bold')).toBeTruthy();
    expect(steps()[3].querySelector('.bg-primary')).toBeNull();
  });

  it('prints the recorded time for a step that happened and none for a future one', () => {
    render('paid');

    expect(steps()[1].textContent).toContain('۱۴۰۳');
    expect(steps()[3].textContent).not.toContain('۱۴۰۳');
  });

  it('renders a cancelled order as one red row with its reason', () => {
    render('cancelled', [
      ...HISTORY,
      { id: 'h4', status: 'cancelled', note: 'انصراف مشتری', createdAt: 1_728_010_000_000 },
    ]);

    expect(fixture.nativeElement.textContent).toContain('این سفارش لغوشده است.');
    expect(fixture.nativeElement.textContent).toContain('انصراف مشتری');
    expect(fixture.nativeElement.querySelector('.bg-red-50')).toBeTruthy();
  });
});
