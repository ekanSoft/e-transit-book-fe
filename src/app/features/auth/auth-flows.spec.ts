import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../environments/environment';
import { authGuard } from '../../core/auth/guards';
import { Session } from '../../core/auth/session';
import { App } from '../../app';
import { RouteProgress } from '../../core/layout/route-progress';
import { EmailRequest } from './email-request';
import { VerifySignup } from './verify-signup';
import { ResetPassword } from './reset-password';
import { AccessStatus } from './access-status';
import { Login } from './login';
import { SelectBusiness } from './select-business';
import { Signup } from './signup';

describe('Email authentication flows', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'app/dashboard', component: App, canActivate: [authGuard] },
          { path: 'onboarding', component: App, canActivate: [authGuard] },
          { path: 'login', component: Login },
          { path: 'verify-signup', component: VerifySignup },
          { path: 'auth/access-status', component: AccessStatus },
          { path: 'auth/select-business', component: SelectBusiness },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ token: 'link-token-from-email' }) },
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    localStorage.removeItem('etransitbook.session');
  });
  const verifiedLogin = {
    requiresAccountSelection: false,
    token: 'returned-session-token',
    business: { id: 'business-1' },
    user: { id: 'owner-1', signupVerified: true },
  };
  const resendUrl = environment.apiBaseUrl + '/auth/resend-token';
  const verifyUrl = environment.apiBaseUrl + '/auth/verify-signup';
  const loginUrl = environment.apiBaseUrl + '/auth/login';
  const submitElement = () => document.createElement('form');
  function resendButton(screen: HTMLElement) {
    return screen.querySelector<HTMLButtonElement>('app-email-request .auth-switch button')!;
  }
  function denyUnverifiedLogin(url: string) {
    http
      .expectOne(url)
      .flush(
        { message: 'Please verify your email before logging in' },
        { status: 403, statusText: 'Forbidden' },
      );
  }

  it('resends from signup confirmation using the submitted email and the new business slug', async () => {
    const fixture = TestBed.createComponent(Signup);
    fixture.componentInstance.form.setValue({
      firstName: 'Test',
      lastName: 'Operator',
      businessName: 'Test Transport',
      email: 'Test@Example.com',
      phoneNumber: '08012345678',
      password: 'test-password123',
    });
    const signup = fixture.componentInstance.submit(submitElement());
    http.expectOne(environment.apiBaseUrl + '/auth/signup').flush({
      success: true,
      data: { business: { slug: 'new-business' } },
    });
    await signup;
    await fixture.whenStable();

    const screen: HTMLElement = fixture.nativeElement;
    expect(screen.textContent).toContain('test@example.com');
    expect(screen.querySelector('input')).toBeNull();
    resendButton(screen).click();
    resendButton(screen).click();
    const resend = http.expectOne({ method: 'POST', url: resendUrl + '?slug=new-business' });
    expect(resend.request.body).toEqual({ email: 'test@example.com' });
    resend.flush({ success: true, data: { verificationEmailSent: false } });
    await fixture.whenStable();
    expect(screen.textContent).toContain('The email could not be sent');

    resendButton(screen).click();
    http.expectOne(resendUrl + '?slug=new-business').flush({
      success: true,
      data: { verificationEmailSent: true },
    });
    await fixture.whenStable();
    expect(screen.textContent).toContain('Verification email resent');
  });

  it('resends from sign-in with the entered email and lets the user pick a matching business', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    const screen: HTMLElement = fixture.nativeElement;
    expect(screen.querySelector('a[href="/verify-signup"]')).toBeTruthy();
    http.expectNone(resendUrl);

    fixture.componentInstance.form.controls.email.setValue('Test@Example.com');
    await fixture.whenStable();
    expect(screen.querySelector('app-email-request input')).toBeNull();
    resendButton(screen).click();
    const resend = http.expectOne(resendUrl);
    expect(resend.request.body).toEqual({ email: 'test@example.com' });
    resend.flush({
      success: true,
      data: {
        requiresAccountSelection: true,
        businesses: [{ businessName: 'Test Transport', slug: 'test-transport' }],
      },
    });
    await fixture.whenStable();
    screen.querySelector<HTMLButtonElement>('.business-choice')!.click();
    const selected = http.expectOne(resendUrl + '?slug=test-transport');
    expect(selected.request.body).toEqual({ email: 'test@example.com' });
    selected.flush({ success: true, data: { verificationEmailSent: true } });
    await fixture.whenStable();
    expect(screen.textContent).toContain('Verification email resent');
  });

  it.each([false, true])(
    'resends after an unverified sign-in with business selection %s',
    async (selectBusiness) => {
      const harness = await RouterTestingHarness.create();
      const login = await harness.navigateByUrl(
        selectBusiness ? '/login' : '/login?slug=test-transport',
        Login,
      );
      login.form.setValue({ email: 'test@example.com', password: 'test-password123' });
      const pending = login.submit(submitElement());
      if (selectBusiness) {
        http.expectOne(loginUrl).flush({
          success: true,
          data: {
            requiresAccountSelection: true,
            token: 'temporary-selection-token',
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
            businesses: [
              {
                business: 'test-business-id',
                businessName: 'Test Transport',
                slug: 'test-transport',
                businessAccountStatus: 'ACTIVE',
                role: 'ADMIN',
              },
            ],
          },
        });
        await pending;
        const selection = harness.routeDebugElement!.componentInstance as SelectBusiness;
        const selecting = selection.select('test-business-id');
        denyUnverifiedLogin(environment.apiBaseUrl + '/auth/complete-login');
        await selecting;
      } else {
        denyUnverifiedLogin(loginUrl + '?slug=test-transport');
        await pending;
      }
      await harness.fixture.whenStable();
      const screen = harness.routeNativeElement!;
      expect(screen.textContent).toContain('Please verify your email before logging in');
      expect(screen.querySelector('a[href="/login?slug=test-transport"]')?.textContent).toContain(
        'Back to sign in',
      );
      resendButton(screen).click();
      const resend = http.expectOne(resendUrl + '?slug=test-transport');
      expect(resend.request.body).toEqual({ email: 'test@example.com' });
      resend.flush({ success: true, data: { verificationEmailSent: true } });
      await harness.fixture.whenStable();
    },
  );

  it('keeps email entry available when the verification page is opened directly', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/verify-signup', VerifySignup);
    expect(harness.routeNativeElement?.querySelector('input[type="email"]')).toBeTruthy();
    http.expectNone(verifyUrl);
    http.expectNone(resendUrl);
  });

  for (const mode of ['verify', 'reset'] as const) {
    it(`supports slug-scoped ${mode} requests without reusing a login token`, async () => {
      const fixture = TestBed.createComponent(EmailRequest);
      fixture.componentRef.setInput('mode', mode);
      const component = fixture.componentInstance;
      component.email.setValue('test@example.com');
      const path = mode === 'verify' ? '/auth/resend-token' : '/auth/initiate-password-reset';
      fixture.detectChanges();
      const submit = new Event('submit', { bubbles: true, cancelable: true });
      fixture.nativeElement.querySelector('form').dispatchEvent(submit);
      expect(submit.defaultPrevented).toBe(true);
      http.expectOne(environment.apiBaseUrl + path).flush({
        success: true,
        data: {
          requiresAccountSelection: true,
          businesses: [
            { businessName: 'A Transport', slug: 'a-transport' },
            { businessName: 'B Transport', slug: 'b-transport' },
          ],
        },
      });
      await fixture.whenStable();
      expect(component.choices()).toHaveLength(2);
      expect(component.sent()).toBe(false);
      const second = component.send('b-transport');
      const selected = http.expectOne(environment.apiBaseUrl + path + '?slug=b-transport');
      expect(selected.request.body).toEqual({ email: 'test@example.com' });
      selected.flush({
        success: true,
        data: mode === 'verify' ? { verificationEmailSent: true } : undefined,
      });
      await second;
      expect(component.sent()).toBe(true);
      expect(component.choices()).toEqual([]);
    });
  }
  async function expectAutomaticOnboarding() {
    await vi.waitFor(() => expect(TestBed.inject(Session).loading()).toBe(true));
    http.expectOne(environment.apiBaseUrl + '/employees/me').flush({
      data: { business: { _id: 'business-1' } },
    });
    http.expectOne(environment.apiBaseUrl + '/business').flush({
      data: {
        _id: 'business-1',
        accountStatus: 'PENDING',
        registrationComplete: false,
        registrationStage: [],
      },
    });
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/onboarding'));
  }
  it('verifies a directly opened email link and signs in before continuing to onboarding', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    await TestBed.inject(Router).navigateByUrl('/verify-signup?token=link-token-from-email');
    await fixture.whenStable();

    const app: HTMLElement = fixture.nativeElement;
    const screen = app.querySelector('app-verify-signup')!;
    expect(app.querySelector('.route-progress')?.textContent).toContain('Loading page');
    expect(screen.textContent?.trim()).toBe('');
    expect(screen.querySelector('button, form, a[href="/login"]')).toBeNull();
    const request = http.expectOne({ method: 'POST', url: verifyUrl });
    expect(request.request.body).toEqual({ token: 'link-token-from-email' });
    request.flush({ success: true, data: verifiedLogin });
    await expectAutomaticOnboarding();
    expect(TestBed.inject(Session).token()).toBe(verifiedLogin.token);
    expect(localStorage.getItem('etransitbook.session')).toBe(verifiedLogin.token);
    http.expectNone(loginUrl);
    expect(screen.querySelector('app-email-request')).toBeNull();
  });

  it('offers a new verification email when the link has expired', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/verify-signup?token=expired-link', VerifySignup);
    http
      .expectOne(verifyUrl)
      .flush(
        { message: 'Verification token has expired' },
        { status: 400, statusText: 'Bad Request' },
      );
    const screen = harness.routeNativeElement!;
    await vi.waitFor(() => expect(screen.textContent).toContain('Verification token has expired'));
    expect(TestBed.inject(RouteProgress).loading()).toBe(false);
    expect(screen.querySelector('input[type="email"]')).toBeTruthy();
    expect(screen.textContent).not.toContain('Your email is verified');
    expect(screen.textContent).not.toContain('Try again');
  });

  it('shows recovery if a successful HTTP response does not confirm verification', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/verify-signup?token=link-token-from-email', VerifySignup);
    http.expectOne(verifyUrl).flush({ success: true });

    const screen = harness.routeNativeElement!;
    await vi.waitFor(() => expect(screen.textContent).toContain("Couldn't verify your email"));
    expect(screen.querySelector('input[type="email"]')).toBeTruthy();
    expect(TestBed.inject(RouteProgress).loading()).toBe(false);
    http.expectNone(resendUrl);
  });

  it('retries the same token after a temporary failure', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/verify-signup?token=retry-link', VerifySignup);
    http
      .expectOne(verifyUrl)
      .flush(
        { message: 'Temporarily unavailable' },
        { status: 503, statusText: 'Service Unavailable' },
      );
    const screen = harness.routeNativeElement!;
    await vi.waitFor(() => expect(screen.textContent).toContain('Temporarily unavailable'));
    screen.querySelector<HTMLButtonElement>('button[type="button"]')!.click();
    const retry = http.expectOne(verifyUrl);
    expect(TestBed.inject(RouteProgress).loading()).toBe(true);
    expect(retry.request.body).toEqual({ token: 'retry-link' });
    retry.flush({ success: true, data: verifiedLogin });
    await expectAutomaticOnboarding();
  });

  it('ignores a completed response once a different verification link is open', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/verify-signup?token=first-link', VerifySignup);
    const first = http.expectOne(verifyUrl);
    await harness.navigateByUrl('/verify-signup?token=second-link', VerifySignup);
    const second = http.expectOne(verifyUrl);
    expect(second.request.body).toEqual({ token: 'second-link' });
    first.flush({ success: true, data: verifiedLogin });
    await harness.fixture.whenStable();
    expect(TestBed.inject(RouteProgress).loading()).toBe(true);
    expect(harness.routeNativeElement?.textContent?.trim()).toBe('');
    second.flush({ success: true, data: verifiedLogin });
    await expectAutomaticOnboarding();
  });
  it('uses the reset link token after refresh and excludes confirmation from the request', async () => {
    const component = TestBed.createComponent(ResetPassword).componentInstance;
    component.form.setValue({ newPassword: 'new-password123', confirmPassword: 'new-password123' });
    const pending = component.submit(document.createElement('form'));
    const request = http.expectOne(environment.apiBaseUrl + '/auth/reset-password');
    expect(request.request.body).toEqual({
      token: 'link-token-from-email',
      newPassword: 'new-password123',
    });
    request.flush({ success: true, message: 'Password reset successfully' });
    await pending;
    expect(component.done()).toBe(true);
    expect(component.form.controls.newPassword.value).toBe('');
  });
  it('does not submit mismatched passwords', async () => {
    const component = TestBed.createComponent(ResetPassword).componentInstance;
    component.form.setValue({
      newPassword: 'new-password123',
      confirmPassword: 'different-password',
    });
    await component.submit(document.createElement('form'));
    expect(component.mismatch()).toBe(true);
    http.expectNone(environment.apiBaseUrl + '/auth/reset-password');
  });
});
