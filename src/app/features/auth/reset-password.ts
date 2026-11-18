import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api } from '../../core/http/api';
import { errorMessages } from '../../core/http/errors';
import { Field } from '../../shared/forms/field';
import { focusInvalid, passwordValidators } from '../../shared/forms/validators';
import { Button } from '../../shared/ui/button';
import { Errors } from '../../shared/ui/feedback';
@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, Field, Button, Errors],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-heading">
      <span class="eyebrow">ACCOUNT RECOVERY</span>
      <h1>{{ done() ? 'Password updated' : 'Choose a new password' }}</h1>
      <p>
        {{
          done()
            ? 'You can now sign in using your new password.'
            : 'Use a password you don’t use for another account.'
        }}
      </p>
    </div>
    @if (done()) {
      <a appButton class="w-full" routerLink="/login">Continue to sign in</a>
    } @else if (!token) {
      <div class="alert" role="alert">
        This link is missing its verification details. Request a new password reset email.
      </div>
      <a appButton routerLink="/forgot-password">Get a new reset link</a>
    } @else {
      <app-errors [messages]="errors()" />
      <form #formElement [formGroup]="form" (ngSubmit)="submit(formElement)" novalidate>
        <fieldset [disabled]="busy()">
          <app-field
            id="new-password"
            label="New password"
            [control]="form.controls.newPassword"
            type="password"
            autocomplete="new-password"
            hint="Use 8–100 characters."
            [maxLength]="100"
          />
          <app-field
            id="confirm-password"
            label="Confirm password"
            [control]="form.controls.confirmPassword"
            type="password"
            autocomplete="new-password"
            [maxLength]="100"
          />
          @if (mismatch()) {
            <p class="field-error" role="alert">Your passwords don't match.</p>
          }
          <button appButton class="w-full" type="submit" [disabled]="busy()">
            {{ busy() ? 'Updating password…' : 'Update password' }}
          </button>
        </fieldset>
      </form>
      <p class="auth-switch"><a routerLink="/forgot-password">Request a new reset link</a></p>
    }
  `,
})
export class ResetPassword {
  private readonly api = inject(Api);
  readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');
  readonly form = inject(NonNullableFormBuilder).group({
    newPassword: ['', passwordValidators],
    confirmPassword: ['', Validators.required],
  });
  readonly busy = signal(false);
  readonly done = signal(false);
  readonly mismatch = signal(false);
  readonly errors = signal<string[]>([]);
  async submit(element: HTMLFormElement) {
    if (!this.token || this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      focusInvalid(element);
      return;
    }
    const value = this.form.getRawValue();
    this.mismatch.set(value.newPassword !== value.confirmPassword);
    if (this.mismatch()) return;
    this.busy.set(true);
    this.errors.set([]);
    try {
      await this.api.post('/auth/reset-password', {
        token: this.token,
        newPassword: value.newPassword,
      });
      this.form.reset();
      this.done.set(true);
    } catch (error) {
      this.errors.set(errorMessages(error));
    } finally {
      this.busy.set(false);
    }
  }
}
