import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../../shared/ui/button';
import { Icon } from '../../shared/ui/icon';

@Component({
  selector: 'app-access-status',
  imports: [RouterLink, Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="auth-heading">
      <span class="status-symbol"><app-icon name="shield" /></span>
      <h1>Workspace access unavailable</h1>
      <p>{{ reason }}</p>
    </div>
    <a appButton class="w-full" routerLink="/login">Back to sign in</a>
    @if (needsVerification) {
      <p class="auth-switch"><a routerLink="/verify-signup">Request a verification email</a></p>
    }`,
})
export class AccessStatus {
  private readonly state = inject(Location).getState();
  readonly reason =
    this.state &&
    typeof this.state === 'object' &&
    'reason' in this.state &&
    typeof this.state.reason === 'string'
      ? this.state.reason
      : 'Sign in to check access to your business.';
  readonly needsVerification = this.reason.toLowerCase().includes('verify your email');
}
