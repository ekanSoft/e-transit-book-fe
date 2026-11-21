import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/http/api';
import { EmailRecipient, SignupResult } from '../../core/http/api.models';
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
import { EmailRequest } from './email-request';
@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink, Field, Button, Errors, Icon, EmailRequest],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    @media (min-width: 900px) {
      .signup-confirmation {
        transform: translateY(-38px);
      }
    }
  `,
  template: `
    @if (sent(); as recipient) {
      <div class="signup-confirmation">
        <span class="status-symbol"><app-icon name="mail" /></span>
        <h1>Check your email</h1>
        <p class="muted">
          <!-- We sent a verification link to <strong>{{ recipient.email }}</strong>.
          Open the link to verify your email so you can sign in. -->
        </p>
        <div class="alert">
          We sent a verification link to <strong>{{ recipient.email }}</strong>.
          Open the link to verify your email so you can sign in.
          <!-- The verification link is valid for 24 hours. Check your spam folder if you don't see it. -->
        </div>
        <app-email-request [recipient]="recipient" />
      </div>
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
  readonly sent = signal<EmailRecipient | null>(null);
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
      const email = value.email.trim().toLowerCase();
      const { data } = await this.api.post<SignupResult>('/auth/signup', {
        ...value,
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        businessName: value.businessName.trim(),
        email,
        phoneNumber: normalizeNigerianPhone(value.phoneNumber),
      });
      this.sent.set({ email, slug: data?.business?.slug });
      this.form.controls.password.reset();
    } catch (error) {
      this.errors.set(errorMessages(error));
    } finally {
      this.busy.set(false);
    }
  }
}
