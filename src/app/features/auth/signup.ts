import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/http/api';
import { SignupResult } from '../../core/http/api.models';
import { errorMessages } from '../../core/http/errors';
import { Field } from '../../shared/forms/field';
import {
  emailValidators,
  focusInvalid,
  passwordValidators,
  requiredText,
} from '../../shared/forms/validators';
import { nigerianPhone, normalizeNigerianPhone } from '../../shared/utilities/phone';
import { Button } from '../../shared/ui/button';
import { Errors } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink, Field, Button, Errors, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (sent()) {
      <span class="status-symbol"><app-icon name="mail" /></span>
      <h1>Check your email</h1>
      <p class="muted">
        We sent a verification link to <strong>{{ sent() }}</strong>. Open it to verify your
        account, then sign in to finish setting up your business.
      </p>
      <div class="alert">
        The verification link is valid for 24 hours. Check your spam folder if you don't see it.
      </div>
      <a appButton class="w-full" routerLink="/login">Back to sign in</a>
      <p class="auth-switch">
        Didn't get the email? <a routerLink="/verify-signup">Resend verification</a>
      </p>
    } @else {
      <div class="auth-heading">
        <span class="eyebrow">LET'S GET STARTED</span>
        <h1>Create your business account</h1>
        <p>First, a few details about you and your company.</p>
      </div>
      <app-errors [messages]="errors()" />
      <form
        #formElement
        [formGroup]="form"
        (ngSubmit)="submit(formElement)"
        novalidate
        [attr.aria-busy]="busy()"
      >
        <fieldset [disabled]="busy()">
          <div class="form-grid">
            <app-field
              id="first-name"
              label="First name"
              [control]="form.controls.firstName"
              autocomplete="given-name"
              [maxLength]="100"
            /><app-field
              id="last-name"
              label="Last name"
              [control]="form.controls.lastName"
              autocomplete="family-name"
              [maxLength]="100"
            />
          </div>
          <app-field
            id="business-name"
            label="Business name"
            [control]="form.controls.businessName"
            autocomplete="organization"
            placeholder="Your transport company"
            [maxLength]="120"
          />
          <app-field
            id="signup-email"
            label="Email"
            [control]="form.controls.email"
            type="email"
            autocomplete="username"
            placeholder="name@example.com"
            [maxLength]="150"
          />
          <app-field
            id="signup-phone"
            label="Phone number"
            [control]="form.controls.phoneNumber"
            type="tel"
            autocomplete="tel"
            placeholder="08012345678"
          />
          <app-field
            id="signup-password"
            label="Password"
            [control]="form.controls.password"
            type="password"
            autocomplete="new-password"
            hint="Use 8–100 characters."
            [maxLength]="100"
          />
          <button appButton class="w-full" type="submit" [disabled]="busy()">
            {{ busy() ? 'Creating your account…' : 'Create account' }}<app-icon name="arrow" />
          </button>
        </fieldset>
      </form>
      <p class="auth-switch">Already have an account? <a routerLink="/login">Sign in</a></p>
    }
  `,
})
export class Signup {
  private readonly api = inject(Api);
  readonly form = inject(NonNullableFormBuilder).group({
    firstName: ['', requiredText(100)],
    lastName: ['', requiredText(100)],
    businessName: ['', requiredText(120)],
    email: ['', emailValidators],
    phoneNumber: ['', [Validators.required, nigerianPhone]],
    password: ['', passwordValidators],
  });
  readonly busy = signal(false);
  readonly errors = signal<string[]>([]);
  readonly sent = signal('');
  async submit(element: HTMLFormElement) {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      focusInvalid(element);
      return;
    }
    this.busy.set(true);
    this.errors.set([]);
    try {
      const value = this.form.getRawValue();
      await this.api.post<SignupResult>('/auth/signup', {
        ...value,
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        businessName: value.businessName.trim(),
        email: value.email.trim().toLowerCase(),
        phoneNumber: normalizeNigerianPhone(value.phoneNumber),
      });
      this.sent.set(value.email.trim());
      this.form.controls.password.reset();
    } catch (error) {
      this.errors.set(errorMessages(error));
    } finally {
      this.busy.set(false);
    }
  }
}
