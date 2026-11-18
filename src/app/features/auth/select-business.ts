import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LoginChoice } from '../../core/http/api.models';
import { registrationStages } from '../../core/auth/routing';
import { RouterLink } from '@angular/router';
import { Session } from '../../core/auth/session';
import { Button } from '../../shared/ui/button';
import { Errors } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
@Component({
  selector: 'app-select-business',
  imports: [DatePipe, RouterLink, Button, Errors, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-heading">
      <span class="auth-symbol"><app-icon name="building" /></span>
      <h1>Choose your business</h1>
      <p>Select the business you want to work with today.</p>
    </div>
    <app-errors [messages]="errors()" />
    @if (session.selection(); as selection) {
      <div class="business-choices">
        @for (business of selection.businesses; track business.business) {
          <button
            type="button"
            class="business-choice"
            [disabled]="busy()"
            (click)="select(business.business)"
          >
            <span class="choice-icon"><app-icon name="building" /></span
            ><span
              ><strong>{{ business.businessName }}</strong
              ><small>{{ roleLabel(business.role) }} · {{ choiceStatus(business) }}</small></span
            ><app-icon [name]="pendingId() === business.business ? 'clock' : 'arrow'" />
          </button>
        }
      </div>
      <p class="small muted">
        Choose a business before {{ selection.expiresAt | date: 'HH:mm' : '+0100' }} WAT.
      </p>
    } @else {
      <div class="alert">Please sign in again to load your available businesses.</div>
    }
    @if (!busy()) {
      <a
        appButton
        variant="secondary"
        class="w-full"
        routerLink="/login"
        (click)="session.selection.set(null)"
        >Back to sign in</a
      >
    }
  `,
})
export class SelectBusiness {
  readonly session = inject(Session);
  readonly busy = signal(false);
  readonly errors = signal<string[]>([]);
  readonly pendingId = signal('');
  constructor() {
    effect((onCleanup) => {
      const choice = this.session.selection();
      if (!choice) return;
      const timer = setTimeout(
        () => {
          if (this.session.selection() === choice && !this.busy()) {
            this.session.selection.set(null);
            this.errors.set(['The business selection has expired. Sign in again to continue.']);
          }
        },
        Math.max(0, Date.parse(choice.expiresAt) - Date.now()),
      );
      onCleanup(() => clearTimeout(timer));
    });
  }
  choiceStatus(choice: LoginChoice) {
    if (choice.businessAccountStatus === 'PENDING') {
      if (choice.registrationComplete) return 'Awaiting approval';
      const next = registrationStages.find((stage) => !choice.registrationStage?.includes(stage));
      return next === 'PROFILE'
        ? 'Business profile required'
        : next === 'BRANCH'
          ? 'Branch setup required'
          : 'Registration in progress';
    }
    return this.roleLabel(choice.businessAccountStatus);
  }
  roleLabel(role: string) {
    return role.toLowerCase().replaceAll('_', ' ');
  }
  async select(id: string) {
    if (this.busy()) return;
    this.busy.set(true);
    this.pendingId.set(id);
    this.errors.set([]);
    try {
      await this.session.chooseBusiness(id);
    } catch (error) {
      this.errors.set(await this.session.signInError(error));
    } finally {
      this.busy.set(false);
      this.pendingId.set('');
    }
  }
}
