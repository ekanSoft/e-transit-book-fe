import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Session } from '../../core/auth/session';
import type {
  Address,
  ApiResponse,
  Business,
  Employee,
  EmployeeRole,
} from '../../core/http/api.models';
import { Notifications } from '../../shared/ui/feedback';
import type { Branch, CreateRoute, Route } from '../workspace/workspace-data';
import { RouteForm } from './route-form';
import { Routes } from './routes';

const business: Business = {
  _id: '674000000000000000000001',
  name: 'Test Transit',
  slug: 'test-transit',
  email: 'admin@example.test',
  contactPhoneNumber: '+2348031234567',
  businessType: 'TRANSPORTATION',
  accountStatus: 'ACTIVE',
  registrationComplete: true,
  registrationStage: ['PROFILE', 'BRANCH', 'VERIFICATION'],
};
const address: Address = {
  street: '1 Main Road',
  city: 'Lagos',
  state: 'Lagos State',
  stateCode: 'LA',
  country: 'Nigeria',
  countryCode: 'NG',
};
const origin: Branch = { _id: '674000000000000000000002', name: 'Jibowu Terminal', address };
const destination: Branch = { _id: '674000000000000000000003', name: 'Yaba Terminal', address };
const inactive: Route = {
  _id: '674000000000000000000004',
  originBranch: origin,
  destinationBranch: destination,
  status: 'INACTIVE',
};
const reverse: Route = {
  _id: '674000000000000000000005',
  originBranch: destination,
  destinationBranch: origin,
  status: 'ACTIVE',
};
const partial: Route = {
  _id: '674000000000000000000006',
  originBranch: null,
  destinationBranch: { _id: destination._id, address: { stateCode: 'FC' } },
  status: 'ACTIVE',
};
const pair: CreateRoute = { originBranch: origin._id, destinationBranch: destination._id };

function envelope<T>(data: T, statusCode = 200): ApiResponse<T> {
  return { success: true, statusCode, message: 'Success', data };
}

describe('Routes directory and management', () => {
  let fixture: ComponentFixture<Routes>;
  let http: HttpTestingController;
  const selectedBusiness = signal<Business>(business);
  const employee = signal<Employee>(membership('ADMIN'));
  const token = signal('tenant-a');
  const popover = Object.assign(document.createElement('div'), { hidePopover: vi.fn() });
  const dialogPrototype = HTMLDialogElement.prototype;
  const nativeShowModal = Object.getOwnPropertyDescriptor(dialogPrototype, 'showModal');
  const nativeClose = Object.getOwnPropertyDescriptor(dialogPrototype, 'close');

  function membership(role: EmployeeRole, tenant = business): Employee {
    return {
      _id: '674000000000000000000007',
      firstName: 'Amina',
      lastName: 'Danladi',
      email: tenant.email,
      phoneNumber: tenant.contactPhoneNumber,
      accountStatus: 'ACTIVE',
      signupVerified: true,
      business: tenant,
      role,
      branch: '674000000000000000000008',
    };
  }

  function request(method: string, path: string) {
    return vi.waitFor(() => http.expectOne({ method, url: environment.apiBaseUrl + path }));
  }

  async function openDirectory(
    routes: Route[] | null,
    role: EmployeeRole = 'ADMIN',
    branches = [origin, destination],
  ) {
    employee.set(membership(role));
    fixture = TestBed.createComponent(Routes);
    fixture.detectChanges();
    const pending = await request('GET', '/routes');
    if (routes) pending.flush(envelope(routes));
    if (fixture.componentInstance.access.canCreateRoute()) {
      (await request('GET', '/branch')).flush(envelope(branches));
      await vi.waitFor(() => expect(fixture.componentInstance.terminals.hasValue()).toBe(true));
    }
    if (routes) await fixture.whenStable();
    return pending;
  }

  function openForm(): RouteForm {
    const trigger = fixture.nativeElement.querySelector(
      '.directory-heading button',
    ) as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();
    return fixture.debugElement.query(By.directive(RouteForm)).injector.get(RouteForm);
  }

  function select(form: RouteForm, body = pair) {
    form.form.setValue(body);
    fixture.detectChanges();
  }

  function statusRequest(route: Route) {
    fixture.componentInstance.openStatus(route, document.createElement('button'), popover);
    fixture.detectChanges();
    return fixture.componentInstance.toggle(route);
  }

  beforeEach(() => {
    selectedBusiness.set(business);
    token.set('tenant-a');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: Session,
          useValue: { business: selectedBusiness, employee, token, loadContext: vi.fn() },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    Object.defineProperties(dialogPrototype, {
      showModal: {
        configurable: true,
        value(this: HTMLDialogElement) {
          this.setAttribute('open', '');
        },
      },
      close: {
        configurable: true,
        value(this: HTMLDialogElement) {
          this.removeAttribute('open');
        },
      },
    });
  });

  afterEach(() => {
    http.verify();
    fixture?.destroy();
    if (nativeShowModal) Object.defineProperty(dialogPrototype, 'showModal', nativeShowModal);
    else Reflect.deleteProperty(dialogPrototype, 'showModal');
    if (nativeClose) Object.defineProperty(dialogPrototype, 'close', nativeClose);
    else Reflect.deleteProperty(dialogPrototype, 'close');
  });

  it('renders a business-wide, ordered, read-only directory for a Terminal Manager', async () => {
    await openDirectory([inactive, reverse, partial], 'BRANCH_MANAGER');
    const page = fixture.componentInstance;
    expect(fixture.nativeElement.textContent).toContain('Lagos, Lagos State');
    expect(fixture.nativeElement.textContent).toContain('Terminal unavailable');
    expect(fixture.nativeElement.textContent).not.toContain('undefined');
    expect(fixture.nativeElement.querySelectorAll('#route-status-filter')).toHaveLength(1);
    expect(page.filteredRows().map(({ route }) => route._id)).toEqual([
      inactive._id,
      reverse._id,
      partial._id,
    ]);
    expect(fixture.nativeElement.querySelector('.directory-row-trigger')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Add route');
    page.openCreate(document.createElement('button'));
    await statusRequest(inactive);
    expect(page.action()).toBeNull();
    http.expectNone(() => true);

    page.query.set('  JIBOWU     lagos   LA ');
    page.statusFilter.setValue('INACTIVE');
    expect(page.filteredRows().map(({ route }) => route._id)).toEqual([inactive._id]);
    page.query.set('missing');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No matching routes');
    page.clearFilters();
    expect(page.filteredRows()).toHaveLength(3);
    http.expectNone(() => true);
  });

  it('shows loading and a retry before displaying the business empty state', async () => {
    const pending = await openDirectory(null, 'DRIVER');
    expect(fixture.nativeElement.textContent).toContain('Loading routes');
    expect(fixture.nativeElement.textContent).not.toContain('No routes yet');
    pending.flush(
      { message: 'Routes temporarily unavailable' },
      { status: 503, statusText: 'Unavailable' },
    );
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Routes temporarily unavailable');
    fixture.nativeElement.querySelector('.directory-message button').click();
    (await request('GET', '/routes')).flush(envelope([]));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No routes yet');
  });

  it('validates terminal IDs, permits same-city reverse routes, and reloads populated data after creation', async () => {
    await openDirectory([inactive]);
    const page = fixture.componentInstance;
    page.statusFilter.setValue('INACTIVE');
    const form = openForm();
    expect(form.canSubmit()).toBe(false);
    select(form, { originBranch: origin._id, destinationBranch: origin._id });
    expect(form.canSubmit()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain(form.sameTerminalMessage);
    select(form, { originBranch: origin._id, destinationBranch: partial._id });
    expect(form.canSubmit()).toBe(false);
    await form.submit();
    http.expectNone({ method: 'POST', url: environment.apiBaseUrl + '/routes' });

    const reversed = { originBranch: destination._id, destinationBranch: origin._id };
    select(form, reversed);
    const create = form.submit();
    const pending = await request('POST', '/routes');
    expect(pending.request.body).toEqual(reversed);
    expect(form.canSubmit()).toBe(false);
    await form.submit();
    http.expectNone({ method: 'POST', url: environment.apiBaseUrl + '/routes' });
    pending.flush(envelope({ ...reversed, _id: reverse._id, status: 'ACTIVE' }, 201));
    await create;
    (await request('GET', '/routes')).flush(envelope([reverse, inactive]));
    await fixture.whenStable();
    expect(page.action()).toBeNull();
    expect(page.statusFilter.value).toBe('');
    expect(page.filteredRows().map(({ route }) => route._id)).toEqual([reverse._id, inactive._id]);
  });

  it('keeps the form values and surfaces terminal validation errors and forbidden writes', async () => {
    await openDirectory([]);
    const form = openForm();
    select(form);
    const submit = form.submit();
    (await request('POST', '/routes')).flush(
      { message: ['Destination branch must be a valid ID'] },
      { status: 400, statusText: 'Bad Request' },
    );
    await submit;
    await fixture.whenStable();
    expect(form.form.getRawValue()).toEqual(pair);
    expect(form.form.controls.destinationBranch.getError('server')).toBe(
      'Select a valid destination terminal.',
    );
    expect(form.canSubmit()).toBe(false);
    select(form);
    const retry = form.submit();
    (await request('POST', '/routes')).flush(
      { message: 'Your role cannot access this resource' },
      { status: 403, statusText: 'Forbidden' },
    );
    await retry;
    expect(form.errors()).toEqual(['Your role cannot access this resource']);
    expect(TestBed.inject(Session).loadContext).toHaveBeenCalled();
  });

  it('refreshes after creation even when a directory request predates the write', async () => {
    const earlierRead = await openDirectory(null);
    const form = openForm();
    select(form);
    const create = form.submit();
    (await request('POST', '/routes')).flush(
      envelope({ ...pair, _id: inactive._id, status: 'ACTIVE' }, 201),
    );
    await create;
    const fresh = { ...inactive, status: 'ACTIVE' } as const;
    (await request('GET', '/routes')).flush(envelope([fresh]));
    earlierRead.flush(envelope([]));
    await fixture.whenStable();
    expect(fixture.componentInstance.allRoutes()).toEqual([fresh]);
  });

  it('explains when a second terminal is needed', async () => {
    await openDirectory([], 'ADMIN', [origin]);
    const form = openForm();
    expect(form.canSubmit()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('At least two terminals are required');
    expect(fixture.nativeElement.querySelector('dialog a')?.getAttribute('href')).toBe(
      '/app/terminals',
    );
  });

  it('locates an inactive duplicate after refreshing a stale list with only the reverse route', async () => {
    await openDirectory([reverse]);
    const page = fixture.componentInstance;
    page.statusFilter.setValue('ACTIVE');
    const form = openForm();
    select(form);
    const submit = form.submit();
    (await request('POST', '/routes')).flush(
      { message: 'Route already exists' },
      { status: 409, statusText: 'Conflict' },
    );
    await submit;
    expect(form.existing()).toBeUndefined();
    (await request('GET', '/routes')).flush(envelope([reverse, inactive]));
    await fixture.whenStable();
    expect(form.existing()?._id).toBe(inactive._id);
    expect(form.form.getRawValue()).toEqual(pair);
    expect(form.canSubmit()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('You can reactivate the existing route');
    form.viewExisting.emit(inactive._id);
    await fixture.whenStable();
    expect(page.action()).toBeNull();
    expect(page.filteredRows().some(({ route }) => route._id === inactive._id)).toBe(true);
    http.expectNone((req) => req.method === 'PATCH');
  });

  it('confirms status changes, sends an empty PATCH once, and reapplies the current filter', async () => {
    await openDirectory([reverse]);
    const page = fixture.componentInstance;
    page.statusFilter.setValue('ACTIVE');
    await page.toggle(reverse);
    http.expectNone(() => true);
    const toggle = statusRequest(reverse);
    const pending = await request('PATCH', `/routes/${reverse._id}/toggle-status`);
    expect(pending.request.body).toBeNull();
    expect(page.filteredRows()[0].route.status).toBe('ACTIVE');
    await page.toggle(reverse);
    http.expectNone((req) => req.method === 'PATCH');
    pending.flush(envelope({ ...pair, _id: reverse._id, status: 'INACTIVE' }));
    await toggle;
    (await request('GET', '/routes')).flush(envelope([{ ...reverse, status: 'INACTIVE' }]));
    await fixture.whenStable();
    expect(page.filteredRows()).toHaveLength(0);
    expect(TestBed.inject(Notifications).messages()[0].text).toBe('Route deactivated.');
  });

  it('reconciles an uncertain toggle and requires a fresh confirmation', async () => {
    await openDirectory([inactive]);
    const page = fixture.componentInstance;
    const toggle = statusRequest(inactive);
    (await request('PATCH', `/routes/${inactive._id}/toggle-status`)).error(
      new ProgressEvent('error'),
    );
    await toggle;
    const active = { ...inactive, status: 'ACTIVE' } as const;
    (await request('GET', '/routes')).flush(envelope([active]));
    await fixture.whenStable();
    expect(page.statusErrors().join(' ')).toContain('check the current status');
    expect(page.filteredRows()[0].route.status).toBe('ACTIVE');
    await page.toggle(inactive);
    http.expectNone((req) => req.method === 'PATCH');
  });

  it('clears an open draft and ignores an outdated response on business change', async () => {
    const stale = await openDirectory(null);
    const form = openForm();
    select(form);
    const newBusiness = { ...business, _id: '674000000000000000000009' };
    token.set('tenant-b');
    selectedBusiness.set(newBusiness);
    employee.set(membership('DRIVER', newBusiness));
    fixture.detectChanges();
    const current = await request('GET', '/routes');
    await form.submit();
    expect(fixture.componentInstance.action()).toBeNull();
    expect(fixture.componentInstance.terminals.hasValue()).toBe(false);
    current.flush(envelope([partial]));
    stale.flush(envelope([inactive]));
    await fixture.whenStable();
    expect(fixture.componentInstance.allRoutes()).toEqual([partial]);
    http.expectNone((req) => req.method === 'POST' || req.url.endsWith('/branch'));
  });
});
