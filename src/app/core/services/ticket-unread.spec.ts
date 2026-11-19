import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';

import { TicketUnread } from './ticket-unread';

describe('TicketUnread (BO-O06)', () => {
  let service: TicketUnread;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(TicketUnread);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the count on construction and after a refresh', () => {
    http
      .expectOne(`${environment.API_BASE_URL}/tickets/unread-count`)
      .flush({ data: { count: 4 } });

    expect(service.count()).toBe(4);

    service.refresh();
    http
      .expectOne(`${environment.API_BASE_URL}/tickets/unread-count`)
      .flush({ data: { count: 0 } });

    expect(service.count()).toBe(0);
  });

  it('keeps the last number when the poll fails', () => {
    http
      .expectOne(`${environment.API_BASE_URL}/tickets/unread-count`)
      .flush({ data: { count: 2 } });

    service.refresh();
    http
      .expectOne(`${environment.API_BASE_URL}/tickets/unread-count`)
      .flush({ error: { code: 'BOOM' } }, { status: 500, statusText: 'Server Error' });

    expect(service.count()).toBe(2);
  });
});
