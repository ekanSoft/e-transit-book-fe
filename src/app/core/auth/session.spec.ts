import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Session } from './session';
import { authInterceptor } from '../http/auth.interceptor';
import { Api } from '../http/api';
import { Business, Employee, LoginSuccess } from '../http/api.models';

const business: Business = {
  _id: 'business-1',
  name: 'Test Transport',
  slug: 'test-transport',
  email: 'test@example.test',
  contactPhoneNumber: '+2348012345678',
  businessType: 'TRANSPORTATION',
  accountStatus: 'PENDING',
  registrationComplete: false,
  registrationStage: ['PROFILE'],
};
const employee: Employee = {
  _id: 'employee-1',
  firstName: 'Test',
  lastName: 'Operator',
  email: 'test@example.test',
  phoneNumber: '+2348012345678',
  accountStatus: 'ACTIVE',
  role: 'ADMIN',
  signupVerified: true,
  business,
};
const login: LoginSuccess = {
  requiresAccountSelection: false,
  token: 'test-bearer-token',
  user: { id: employee._id, ...employee },
  business: { id: business._id, name: business.name, slug: business.slug, role: 'ADMIN' },
};
const envelope = <T>(data: T) => ({
  success: true,
  statusCode: 200,
  message: 'Request was successful',
  data,
});

describe('Session and authenticated HTTP', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => {
    http.verify();
    localStorage.clear();
  });
  async function flushContext() {
    await Promise.resolve();
    http.expectOne(environment.apiBaseUrl + '/employees/me').flush(envelope(employee));
    http.expectOne(environment.apiBaseUrl + '/business').flush(envelope(business));
  }
  it('stores a JWT, loads employee and business, then resumes onboarding', async () => {
    const session = TestBed.inject(Session);
    const pending = session.login(employee.email, 'password123');
    const request = http.expectOne(environment.apiBaseUrl + '/auth/login');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(envelope(login));
    await Promise.resolve();
    const me = http.expectOne(environment.apiBaseUrl + '/employees/me');
    expect(me.request.headers.get('Authorization')).toBe('Bearer test-bearer-token');
    me.flush(envelope(employee));
    http.expectOne(environment.apiBaseUrl + '/business').flush(envelope(business));
    await pending;
    expect(session.business()).toEqual(business);
    expect(session.employee()).toEqual(employee);
    expect(localStorage.getItem('etransitbook.session')).toBe(login.token);
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/onboarding');
  });
  it('restores a stored session after refresh', async () => {
    localStorage.setItem('etransitbook.session', login.token);
    const session = TestBed.inject(Session);
    const pending = session.ensureContext();
    await flushContext();
    await pending;
    expect(session.authenticated()).toBe(true);
    expect(session.business()).toEqual(business);
  });
  it('never persists a temporary selection token and completes the selected business', async () => {
    const session = TestBed.inject(Session);
    const pending = session.login(employee.email, 'password123');
    http.expectOne(environment.apiBaseUrl + '/auth/login').flush(
      envelope({
        requiresAccountSelection: true,
        token: 'temporary',
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        businesses: [
          {
            business: business._id,
            businessName: business.name,
            slug: business.slug,
            employee: employee._id,
            role: 'ADMIN',
            businessAccountStatus: 'PENDING',
          },
        ],
      }),
    );
    await pending;
    expect(session.authenticated()).toBe(false);
    expect(localStorage.length).toBe(0);
    const completing = session.chooseBusiness(business._id);
    const request = http.expectOne(environment.apiBaseUrl + '/auth/complete-login');
    expect(request.request.body).toEqual({ token: 'temporary', businessId: business._id });
    request.flush(envelope(login));
    await flushContext();
    await completing;
    expect(session.selection()).toBeNull();
    expect(session.token()).toBe(login.token);
  });
  it('clears a consumed selection when the chosen account is unverified', async () => {
    const session = TestBed.inject(Session);
    session.selection.set({
      requiresAccountSelection: true,
      token: 'temporary',
      expiresAt: new Date(Date.now() + 600000).toISOString(),
      businesses: [],
    });
    const pending = session.chooseBusiness(business._id);
    const assertion = expect(pending).rejects.toMatchObject({ status: 403 });
    http
      .expectOne(environment.apiBaseUrl + '/auth/complete-login')
      .flush(
        { message: 'Please verify your email before logging in' },
        { status: 403, statusText: 'Forbidden' },
      );
    await assertion;
    expect(session.selection()).toBeNull();
  });
  it('rejects expired temporary selections without an API call', async () => {
    const session = TestBed.inject(Session);
    session.selection.set({
      requiresAccountSelection: true,
      token: 'temporary',
      expiresAt: new Date(0).toISOString(),
      businesses: [],
    });
    await expect(session.chooseBusiness('business-1')).rejects.toThrow('expired');
    expect(session.selection()).toBeNull();
  });
  it('clears a rejected bearer session and redirects to sign in', async () => {
    localStorage.setItem('etransitbook.session', login.token);
    const session = TestBed.inject(Session);
    const pending = TestBed.inject(Api).get('/business');
    const assertion = expect(pending).rejects.toMatchObject({ status: 401 });
    http
      .expectOne(environment.apiBaseUrl + '/business')
      .flush({ message: 'JWT Token expired' }, { status: 401, statusText: 'Unauthorized' });
    await assertion;
    expect(session.authenticated()).toBe(false);
    expect(localStorage.length).toBe(0);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { expired: '1' },
    });
  });
  it('preserves a recoverable context error without retaining stale business access', async () => {
    localStorage.setItem('etransitbook.session', login.token);
    const session = TestBed.inject(Session);
    session.business.set({ ...business, accountStatus: 'ACTIVE' });
    const pending = session.loadContext();
    http.expectOne(environment.apiBaseUrl + '/employees/me').flush(envelope(employee));
    http
      .expectOne(environment.apiBaseUrl + '/business')
      .flush(
        { message: 'Your business account is suspended. Please contact support.' },
        { status: 403, statusText: 'Forbidden' },
      );
    await pending;
    expect(session.business()).toBeNull();
    expect(session.destination()).toBe('/pending-approval');
    expect(session.contextError()[0]).toContain('suspended');
  });
  it('rejects a business payload outside the authenticated employee membership', async () => {
    localStorage.setItem('etransitbook.session', login.token);
    const session = TestBed.inject(Session);
    const loading = session.loadContext();
    http.expectOne(environment.apiBaseUrl + '/employees/me').flush(envelope(employee));
    http
      .expectOne(environment.apiBaseUrl + '/business')
      .flush(envelope({ ...business, _id: 'other-business' }));
    await loading;
    expect(session.employee()).toBeNull();
    expect(session.business()).toBeNull();
    expect(session.destination()).toBe('/pending-approval');
  });
  it('clears the old business and token before switching', () => {
    localStorage.setItem('etransitbook.session', login.token);
    const session = TestBed.inject(Session);
    session.business.set(business);
    session.employee.set(employee);
    session.switchBusiness();
    expect(session.business()).toBeNull();
    expect(session.employee()).toBeNull();
    expect(session.token()).toBeNull();
    expect(localStorage.getItem('etransitbook.session')).toBeNull();
    expect(session.switchEmail()).toBe(employee.email);
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/login');
  });
  it('does not resurrect a session when logout races an in-flight context request', async () => {
    localStorage.setItem('etransitbook.session', login.token);
    const session = TestBed.inject(Session);
    const pending = session.loadContext();
    session.logout();
    await flushContext();
    await pending;
    expect(session.business()).toBeNull();
    expect(session.employee()).toBeNull();
    expect(session.authenticated()).toBe(false);
  });
});
