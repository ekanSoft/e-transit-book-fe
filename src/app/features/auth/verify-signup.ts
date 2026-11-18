import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api } from '../../core/http/api';
import { errorMessages } from '../../core/http/errors';
import { Button } from '../../shared/ui/button';
import { Errors } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { EmailRequest } from './email-request';
@Component({
  selector: 'app-verify-signup',
  imports: [RouterLink, Button, Errors, Icon, EmailRequest],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="status-symbol"><app-icon [name]="verified() ? 'check' : 'mail'" /></span>
    <h1>{{ verified() ? 'Your email is verified' : 'Verify your email' }}</h1>
    @if (verified()) {
      <p class="muted">You're ready to sign in and set up your transport business.</p>
      <a appButton class="w-full" routerLink="/login"
        >Continue to sign in<app-icon name="arrow"
      /></a>
    } @else {
      <p class="muted">
        {{
          token
            ? 'Confirm your email address to continue setting up your account.'
            : 'Enter your email below to request a verification link.'
        }}
      </p>
      <app-errors [messages]="errors()" />
      @if (token) {
        <button appButton class="w-full" type="button" [disabled]="busy()" (click)="verify()">
          {{ busy() ? 'Verifying…' : 'Verify email address' }}
        </button>
        <div class="form-divider">Need a new link?</div>
      }
      <app-email-request mode="verify" />
      <p class="auth-switch"><a routerLink="/login">Back to sign in</a></p>
    }
  `,
})
export class VerifySignup {
  private readonly api = inject(Api);
  readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');
  readonly busy = signal(false);
  readonly verified = signal(false);
  readonly errors = signal<string[]>([]);
  async verify() {
    if (!this.token || this.busy()) return;
    this.busy.set(true);
    this.errors.set([]);
    try {
      await this.api.post<{ message: string }>('/auth/verify-signup', { token: this.token });
      this.verified.set(true);
    } catch (error) {
      this.errors.set(errorMessages(error));
    } finally {
      this.busy.set(false);
    }
  }
}
