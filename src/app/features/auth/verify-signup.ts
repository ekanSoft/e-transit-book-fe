import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Subject,
  catchError,
  distinctUntilChanged,
  exhaustMap,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { Session } from '../../core/auth/session';
import { LoginSuccess } from '../../core/http/api.models';
import { Api } from '../../core/http/api';
import { errorMessages } from '../../core/http/errors';
import { RouteProgress } from '../../core/layout/route-progress';
import { Button } from '../../shared/ui/button';
import { Errors } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { EmailRequest } from './email-request';

type VerificationState =
  | { status: 'no-token' | 'verifying' }
  | { status: 'failed'; messages: string[]; retryable: boolean };

@Component({
  selector: 'app-verify-signup',
  imports: [RouterLink, Button, Errors, Icon, EmailRequest],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let state = verification();
    @if (state.status !== 'verifying') {
      <span class="status-symbol"><app-icon name="mail" /></span>
      <h1>{{ state.status === 'failed' ? "Couldn't verify your email" : 'Verify your email' }}</h1>
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
  private readonly router = inject(Router);
  private readonly session = inject(Session);
  private readonly api = inject(Api);
  private readonly routeProgress = inject(RouteProgress);
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
    return this.routeProgress
      .track(() => this.api.post<LoginSuccess>('/auth/verify-signup', { token }))
      .pipe(
        switchMap((response) => {
          if (
            response?.success === true &&
            response.data?.requiresAccountSelection === false &&
            typeof response.data.token === 'string' &&
            response.data.token.trim() &&
            response.data.user?.signupVerified === true &&
            response.data.user.id &&
            response.data.business?.id
          ) {
            this.session.establishSession(response.data);
            return this.routeProgress
              .track(() => this.router.navigateByUrl('/app/dashboard', { replaceUrl: true }))
              .pipe(map((): VerificationState => ({ status: 'verifying' })));
          }
          return of<VerificationState>({
            status: 'failed',
            messages: ['We couldn’t confirm your email. Please try again.'],
            retryable: true,
          });
        }),
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
