import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';

import type { CategoryStatus } from '../models/category.model';

import { CategoriesService } from './categories.service';

const ID = 'pcat-stationery';

describe('CategoriesService status toggle (BO-G07)', () => {
  let service: CategoriesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CategoriesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('PATCHes /categories/:id/status with the new flag and returns the flat row', () => {
    let answer: CategoryStatus | undefined;

    service.setActive(ID, false).subscribe((row) => (answer = row));

    const request = httpMock.expectOne(`${environment.API_BASE_URL}/categories/${ID}/status`);

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ isActive: false });

    request.flush({ data: { id: ID, isActive: false }, message: 'دسته غیرفعال شد.' });

    expect(answer).toEqual({ id: ID, isActive: false });
  });
});
