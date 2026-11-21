import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { EmployeesApi } from './employees-api';

describe('EmployeesApi', () => {
  let http: HttpTestingController;
  let api: EmployeesApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(EmployeesApi);
  });

  afterEach(() => http.verify());

  it('sends supported directory filters and encodes Nigerian phone search', async () => {
    const pending = api.list({
      page: 2,
      limit: 25,
      search: '+2348031234567',
      role: 'DRIVER',
      branch: 'terminal-a',
    });
    const request = http.expectOne(
      environment.apiBaseUrl +
        '/employees?page=2&limit=25&search=%2B2348031234567&role=DRIVER&branch=terminal-a',
    );
    expect(request.request.method).toBe('GET');
    const data = {
      content: [],
      total: 25,
      currentPage: 2,
      totalPages: 1,
      hasNext: false,
      hasPrev: true,
    };
    request.flush({ success: true, data });
    expect((await pending).data).toEqual(data);
  });

  it('preserves explicit terminal clearing and sends a bodyless status toggle', async () => {
    const update = api.update('employee-id', { role: 'OPERATIONS_MANAGER', branch: null });
    const patch = http.expectOne(environment.apiBaseUrl + '/employees/employee-id');
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ role: 'OPERATIONS_MANAGER', branch: null });
    patch.flush({ success: true });
    await update;

    const toggle = api.toggleStatus('employee-id');
    const status = http.expectOne(environment.apiBaseUrl + '/employees/employee-id/toggle-status');
    expect(status.request.method).toBe('PATCH');
    expect(status.request.body).toBeNull();
    status.flush({ success: true });
    await toggle;
  });
});
