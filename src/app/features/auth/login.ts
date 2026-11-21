import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Session } from '../../core/auth/session';
import { Field } from '../../shared/forms/field';
import { emailValidators, focusInvalid } from '../../shared/forms/validators';
import { Button } from '../../shared/ui/button';
import { Errors } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { EmailRequest } from './email-request';
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, Field, Button, Errors, Icon, EmailRequest],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-heading">
      <span class="auth-symbol"><app-icon name="ticket" /></span>
      <h1>Sign in to your workspace</h1>
      <p>
        {{
          switchEmail
            ? 'Confirm your password to choose a business.'
            : 'Use your employee account to access the operator portal.'
        }}
      </p>
    </div>
    @if (expired) {
      <div class="alert" role="status">Your session has expired. Please sign in again.</div>
    }
    <app-errors [messages]="errors()" />
    <form
      #formElement
      [formGroup]="form"
      (ngSubmit)="submit(formElement)"
      novalidate
      [attr.aria-busy]="busy()"
    >
      <fieldset [disabled]="busy()">
        <app-field
          id="login-email"
          label="Email"
          [control]="form.controls.email"
          type="email"
          autocomplete="username"
          placeholder="name@example.com"
          [maxLength]="150"
        />
        <app-field
          id="login-password"
          label="Password"
          [control]="form.controls.password"
          type="password"
          autocomplete="current-password"
          placeholder="Enter your password"
          [maxLength]="100"
        />
        <div class="form-link-row">
          <a routerLink="/forgot-password">Forgot password?</a>
        </div>
        <button appButton class="w-full" type="submit" [disabled]="busy()">
          {{ busy() ? 'Signing in…' : 'Sign in' }}<app-icon name="arrow" />
        </button>
      </fieldset>
    </form>
    <p class="auth-switch">
      New to eTransitBook? <a routerLink="/signup">Create a business account</a>
    </p>
    @for (recipient of resendRecipients(); track recipient.email) {
      <app-email-request [recipient]="recipient" />
    } @empty {
      <div class="auth-help">
        <app-icon name="mail" /><span
          >Still waiting to verify your email?
          <a routerLink="/verify-signup">Resend verification</a></span
        >
      </div>
    }
  `,
})
export class Login {
  private readonly session = inject(Session);
  private readonly route = inject(ActivatedRoute);
  readonly expired = this.route.snapshot.queryParamMap.has('expired');
  readonly switchEmail = this.session.switchEmail();
  readonly form = inject(NonNullableFormBuilder).group({
    email: [this.switchEmail, emailValidators],
    password: ['', [Validators.required, Validators.maxLength(100)]],
  });
  private readonly enteredEmail = toSignal(this.form.controls.email.valueChanges, {
    initialValue: this.switchEmail,
  });
  protected readonly resendRecipients = computed(() => {
    const email = this.enteredEmail().trim().toLowerCase();
    return this.form.controls.email.valid ? [{ email, slug: this.slug }] : [];
  });
  private get slug() {
    return this.route.snapshot.queryParamMap.get('slug') ?? undefined;
  }
  readonly busy = signal(false);
  readonly errors = signal<string[]>([]);
  async submit(element: HTMLFormElement) {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      focusInvalid(element);
      return;
    }
    this.busy.set(true);
    this.errors.set([]);
    const { email, password } = this.form.getRawValue();
    const recipient = { email: email.trim().toLowerCase(), slug: this.slug };
    try {
      await this.session.login(recipient.email, password, recipient.slug);
    } catch (error) {
      this.errors.set(await this.session.signInError(error, recipient));
    } finally {
      this.busy.set(false);
    }
  }
}
