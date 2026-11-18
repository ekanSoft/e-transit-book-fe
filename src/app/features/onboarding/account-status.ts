import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Session } from '../../core/auth/session';
import { registrationConflict } from '../../core/auth/routing';
import { Button } from '../../shared/ui/button';
import { Errors, Notifications } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
@Component({
  selector: 'app-account-status',
  imports: [Button, Errors, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <div class="status-main">
    <section class="status-card">
      <span class="status-symbol"><app-icon [name]="pending() ? 'clock' : 'shield'" /></span>
      <span class="eyebrow">{{ session.business()?.name || 'YOUR WORKSPACE' }}</span>
      <h1>{{ heading() }}</h1>
      <p class="status-description">{{ description() }}</p>
      <app-errors [messages]="session.contextError()" />
      @if (pending()) {
        <ol class="review-timeline">
          <li>
            <span class="review-dot done"><app-icon name="check" /></span>
            <div>
              <strong>Business details submitted</strong>
              <p>Your profile, verification and primary branch are saved.</p>
            </div>
          </li>
          <li>
            <span class="review-dot"><app-icon name="clock" /></span>
            <div>
              <strong>Business review in progress</strong>
              <p>Our team will check your details and documents.</p>
            </div>
          </li>
          <li>
            <span class="review-dot"><app-icon name="bus" /></span>
            <div>
              <strong>Your workspace opens</strong>
              <p>Once approved, sign in to start using your workspace.</p>
            </div>
          </li>
        </ol>
      }
      @if (session.business(); as business) {
        <div class="status-summary">
          <span>Business status</span
          ><strong class="badge">{{ statusLabel(business.accountStatus) }}</strong>
        </div>
      }
      <button appButton class="w-full" type="button" (click)="refresh()" [disabled]="busy()">
        {{
          busy()
            ? 'Checking status…'
            : session.contextError().length
              ? 'Try again'
              : 'Refresh status'
        }}
      </button>
      <p class="small muted">
        {{
          pending()
            ? 'You can safely sign out while your business is reviewed.'
            : 'If you need help with account access, contact your business administrator or the eTransitBook support team.'
        }}
      </p>
    </section>
  </div>`,
})
export class AccountStatus {
  readonly session = inject(Session);
  private readonly router = inject(Router);
  private readonly notifications = inject(Notifications);
  readonly busy = signal(false);
  readonly conflict = computed(() => {
    const b = this.session.business();
    return (
      b &&
      (b.accountStatus === 'ACTIVE' || b.accountStatus === 'PENDING') &&
      registrationConflict(b)
    );
  });
  readonly pending = computed(
    () =>
      this.session.business()?.accountStatus === 'PENDING' &&
      this.session.business()?.registrationComplete &&
      !this.conflict(),
  );
  readonly heading = computed(() => {
    if (this.session.contextError().length)
      return this.session.contextStatus() === 403
        ? 'Account access unavailable'
        : 'We couldn’t load your workspace';
    if (this.conflict()) return 'Registration needs review';
    const status = this.session.business()?.accountStatus;
    return status === 'PENDING'
      ? 'Your business is under review'
      : status === 'SUSPENDED'
        ? 'Your business is suspended'
        : status === 'REJECTED'
          ? 'Your business was not approved'
          : 'Your business is inactive';
  });
  readonly description = computed(() =>
    this.conflict()
      ? 'Your approval status and saved registration steps do not agree. Check the status again or ask your business administrator to review the registration record.'
      : this.pending()
        ? 'Your setup is complete. There’s nothing else to submit right now. We’ll need to approve your business before you can begin operations.'
        : this.session.contextError().length
          ? 'Review the message below, then try again when you’re ready.'
          : 'Your workspace is currently unavailable. Contact support for help with the next steps.',
  );
  statusLabel(value: string) {
    return value.charAt(0) + value.slice(1).toLowerCase();
  }
  async refresh() {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.session.loadContext();
      if (this.session.authenticated()) {
        await this.router.navigateByUrl(this.session.destination());
        if (this.pending()) this.notifications.show('Your business is still pending review.');
      }
    } finally {
      this.busy.set(false);
    }
  }
}
