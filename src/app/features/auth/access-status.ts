import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Button } from '../../shared/ui/button';
import { Icon } from '../../shared/ui/icon';
import { EmailRequest } from './email-request';

@Component({
  selector: 'app-access-status',
  imports: [RouterLink, Button, Icon, EmailRequest],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="auth-heading">
      <span class="status-symbol"><app-icon name="shield" /></span>
      <h1>Workspace access unavailable</h1>
      <p>{{ reason }}</p>
    </div>
    <a appButton class="w-full" routerLink="/login" [queryParams]="{ slug }">Back to sign in</a>
    @if (needsVerification) {
      @if (recipient) {
        <app-email-request [recipient]="recipient" />
      } @else {
        <p class="auth-switch"><a routerLink="/verify-signup">Request a verification email</a></p>
      }
    }`,
})
export class AccessStatus {
  protected readonly slug = inject(ActivatedRoute).snapshot.queryParamMap.get('slug');
  private readonly state = inject(Location).getState();
  readonly reason =
    this.state &&
    typeof this.state === 'object' &&
    'reason' in this.state &&
    typeof this.state.reason === 'string'
      ? this.state.reason
      : 'Sign in to check access to your business.';
  readonly needsVerification = this.reason.toLowerCase().includes('verify your email');
  private readonly info = inject(Router).currentNavigation()?.extras.info;
  protected readonly recipient =
    this.info &&
    typeof this.info === 'object' &&
    'email' in this.info &&
    typeof this.info.email === 'string' &&
    this.info.email.trim()
      ? {
          email: this.info.email,
          slug:
            'slug' in this.info && typeof this.info.slug === 'string' ? this.info.slug : undefined,
        }
      : undefined;
}
