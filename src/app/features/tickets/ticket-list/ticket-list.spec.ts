import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Page } from '@shared/models';
import { Observable, of, throwError } from 'rxjs';

import type { TicketListItem, TicketQuery } from '../models/ticket.model';
import { TicketsService } from '../services/tickets.service';

import { TicketList } from './ticket-list';

const ROWS: TicketListItem[] = [
  {
    id: '1',
    code: 'TK-2400',
    userName: 'زهرا محمدی',
    subject: 'پیگیری سفارش ۱۴۰۰۰',
    status: 'open',
    priority: 'high',
    unread: true,
    lastMessageAt: 1_728_000_000_000,
  },
  {
    id: '2',
    code: 'TK-2401',
    userName: 'علی رضایی',
    subject: 'سوال دربارهٔ گارانتی',
    status: 'closed',
    priority: 'normal',
    unread: false,
    lastMessageAt: 1_727_900_000_000,
  },
];

class TicketsServiceStub {
  rows: TicketListItem[] = ROWS;

  total = 2;

  fail = false;

  queries: TicketQuery[] = [];

  list(query: TicketQuery): Observable<Page<TicketListItem>> {
    this.queries.push(query);

    return this.fail
      ? throwError(() => new Error('offline'))
      : of({
          items: [...this.rows],
          total: this.total,
          page: query.page,
          pageSize: query.pageSize,
        });
  }
}

async function settle(fixture: ComponentFixture<TicketList>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('TicketList (BO-O01)', () => {
  let fixture: ComponentFixture<TicketList>;
  let component: TicketList;
  let service: TicketsServiceStub;

  beforeEach(async () => {
    service = new TicketsServiceStub();

    await TestBed.configureTestingModule({
      imports: [TicketList],
      providers: [{ provide: TicketsService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(TicketList);
    component = fixture.componentInstance;
    await settle(fixture);
  });

  it('renders the queue with status and priority badges', () => {
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('TK-2400');
    expect(fixture.nativeElement.textContent).toContain('فوری');
    expect(fixture.nativeElement.textContent).toContain('بسته');
  });

  it('marks unread rows with bold text and an envelope', () => {
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');

    expect(rows[0].classList).toContain('font-bold');
    expect(rows[0].querySelector('i.pi-envelope')).toBeTruthy();
    expect(rows[1].classList).not.toContain('font-bold');
    expect(rows[1].querySelector('i.pi-envelope')).toBeNull();
  });

  it('filters by status and priority together', async () => {
    component.onStatusChange('open');
    component.onPriorityChange('high');
    await settle(fixture);

    expect(service.queries.at(-1)).toMatchObject({ status: 'open', priority: 'high', page: 1 });
  });

  it('debounces the search and resets the page', async () => {
    vi.useFakeTimers();

    try {
      component.pageNumber.set(3);
      component.queryControl.setValue('گارانتی');

      vi.advanceTimersByTime(300);

      expect(service.queries.at(-1)).toMatchObject({ query: 'گارانتی', page: 1 });
    } finally {
      vi.useRealTimers();
    }
  });

  it('distinguishes the filtered empty from a queue with no tickets', async () => {
    service.rows = [];
    component.onStatusChange('closed');
    await settle(fixture);

    expect(fixture.nativeElement.textContent).toContain('تیکتی با این فیلترها پیدا نشد');

    component.clearFilters();
    await settle(fixture);

    expect(fixture.nativeElement.textContent).toContain('هنوز تیکتی ثبت نشده');
  });

  it('shows the failure block and retries', async () => {
    service.fail = true;
    component.retry();
    await settle(fixture);

    expect(fixture.nativeElement.textContent).toContain('دریافت تیکت‌ها ناموفق بود');

    service.fail = false;
    const retry: HTMLButtonElement = fixture.nativeElement.querySelector('app-error-state button');
    retry.click();
    await settle(fixture);

    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('pages and stops at the edges', async () => {
    service.total = 25;
    component.retry();
    await settle(fixture);

    expect(component.totalPages()).toBe(3);

    component.goToPage(2);
    await settle(fixture);

    expect(service.queries.at(-1)?.page).toBe(2);

    component.goToPage(0);
    expect(service.queries.at(-1)?.page).toBe(2);
  });
});
