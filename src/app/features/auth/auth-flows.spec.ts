import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { EmailRequest } from './email-request';
import { VerifySignup } from './verify-signup';
import { ResetPassword } from './reset-password';

describe('Email authentication flows', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
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
  afterEach(() => http.verify());
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
  it('reads a verification token from a directly opened URL', async () => {
    const component = TestBed.createComponent(VerifySignup).componentInstance;
    expect(component.token).toBe('link-token-from-email');
    const pending = component.verify();
    const request = http.expectOne(environment.apiBaseUrl + '/auth/verify-signup');
    expect(request.request.body).toEqual({ token: 'link-token-from-email' });
    request.flush({ success: true, data: { message: 'Signup verified successfully' } });
    await pending;
    expect(component.verified()).toBe(true);
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
