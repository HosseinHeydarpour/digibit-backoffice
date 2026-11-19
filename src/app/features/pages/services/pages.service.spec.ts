import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';

import type { ContentPage } from '../models/content-page.model';

import { PagesService } from './pages.service';

const PAGE: ContentPage = {
  slug: 'about',
  title: 'درباره ما',
  body: 'متن',
  metaTitle: 'عنوان',
  metaDescription: 'توضیح',
  updatedAt: 1_728_000_000_000,
};

describe('PagesService (BO-L08)', () => {
  let service: PagesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(PagesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists the fixed pages', async () => {
    const promise = firstValueFrom(service.list());

    http
      .expectOne(`${environment.API_BASE_URL}/content-pages`)
      .flush({ data: [PAGE], message: '' });

    expect((await promise)[0].slug).toBe('about');
  });

  it('updates one page by slug', async () => {
    const promise = firstValueFrom(
      service.update('about', {
        title: 'درباره تازه',
        body: 'متن تازه',
        metaTitle: '',
        metaDescription: '',
      }),
    );

    const request = http.expectOne(`${environment.API_BASE_URL}/content-pages/about`);
    expect(request.request.method).toBe('PUT');

    request.flush({ data: { ...PAGE, title: 'درباره تازه' }, message: '' });

    expect((await promise).title).toBe('درباره تازه');
  });
});
