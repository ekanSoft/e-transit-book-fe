import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmailRequest } from './email-request';
@Component({
  selector: 'app-forgot-password',
  imports: [EmailRequest, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="auth-heading">
      <span class="eyebrow">ACCOUNT RECOVERY</span>
      <h1>Forgot your password?</h1>
      <p>Enter your email and we'll help you get back in.</p>
    </div>
    <app-email-request mode="reset" />
    <p class="auth-switch"><a routerLink="/login">Back to sign in</a></p>`,
})
export class ForgotPassword {}
