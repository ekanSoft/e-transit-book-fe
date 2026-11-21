import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  Subject,
  catchError,
  defer,
  distinctUntilChanged,
  exhaustMap,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { Api } from '../../core/http/api';
import { errorMessages } from '../../core/http/errors';
import { Button } from '../../shared/ui/button';
import { Errors } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { EmailRequest } from './email-request';

type VerificationState =
  | { status: 'no-token' | 'verifying' | 'verified' }
  | { status: 'failed'; messages: string[]; retryable: boolean };

@Component({
  selector: 'app-verify-signup',
  imports: [RouterLink, Button, Errors, Icon, EmailRequest],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let state = verification();
    <span class="status-symbol"
      ><app-icon [name]="state.status === 'verified' ? 'check' : 'mail'"
    /></span>
    <h1 aria-live="polite">
      @switch (state.status) {
        @case ('verifying') {
          Verifying your email
        }
        @case ('verified') {
          Your email is verified
        }
        @case ('failed') {
          Couldn't verify your email
        }
        @default {
          Verify your email
        }
      }
    </h1>
    @if (state.status === 'verified') {
      <p class="muted">You're ready to sign in and set up your transport business.</p>
      <a appButton class="w-full" routerLink="/login"
        >Continue to sign in<app-icon name="arrow"
      /></a>
    } @else if (state.status === 'verifying') {
      <p class="muted">Please wait while we confirm your email address.</p>
    } @else {
      @if (state.status === 'failed') {
        <app-errors [messages]="state.messages" />
        @if (state.retryable) {
          <button appButton class="w-full" type="button" (click)="retry.next()">Try again</button>
          <div class="form-divider">Need a new link?</div>
        }
      }
      <p class="muted">Enter your email below to request a verification link.</p>
      <app-email-request mode="verify" />
      <p class="auth-switch"><a routerLink="/login">Back to sign in</a></p>
    }
  `,
})
export class VerifySignup {
  private readonly api = inject(Api);
  protected readonly retry = new Subject<void>();
  protected readonly verification = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(
      map((params) => params.get('token')),
      distinctUntilChanged(),
      switchMap((token) =>
        token
          ? this.retry.pipe(
              startWith(undefined),
              exhaustMap(() => this.verify(token)),
            )
          : of<VerificationState>({ status: 'no-token' }),
      ),
    ),
    { initialValue: { status: 'no-token' } as const },
  );

  private verify(token: string) {
    return defer(() => this.api.post('/auth/verify-signup', { token })).pipe(
      map((): VerificationState => ({ status: 'verified' })),
      catchError((error: unknown) =>
        of<VerificationState>({
          status: 'failed',
          messages: errorMessages(error),
          retryable:
            error instanceof HttpErrorResponse &&
            (error.status === 0 || error.status === 429 || error.status >= 500),
        }),
      ),
      startWith<VerificationState>({ status: 'verifying' }),
    );
  }
}
