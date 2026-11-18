import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { Session } from '../../core/auth/session';
import { firstIncompleteStage } from '../../core/auth/routing';
import { Business, RegistrationStage } from '../../core/http/api.models';
import { Notifications } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { CompanyProfile } from './company-profile';
import { BusinessVerification } from './business-verification';
import { PrimaryBranch } from './primary-branch';

@Component({
  selector: 'app-onboarding',
  imports: [Icon, CompanyProfile, PrimaryBranch, BusinessVerification],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './onboarding.html',
})
export class Onboarding {
  readonly session = inject(Session);
  private readonly router = inject(Router);
  private readonly notifications = inject(Notifications);
  readonly steps = [
    { key: 'PROFILE', title: 'Business profile' },
    { key: 'BRANCH', title: 'Primary branch' },
    { key: 'VERIFICATION', title: 'Business verification' },
  ] as const;
  readonly next = computed(() => {
    const b = this.session.business();
    return b ? firstIncompleteStage(b) : undefined;
  });
  private readonly selected = signal<RegistrationStage | undefined>(undefined);
  private readonly visited = signal<RegistrationStage[]>([]);
  readonly current = computed(() => this.selected() ?? this.next());
  readonly completeCount = computed(() => this.steps.filter((s) => this.completed(s.key)).length);
  private readonly profile = viewChild(CompanyProfile);
  private readonly branch = viewChild(PrimaryBranch);
  private readonly verification = viewChild(BusinessVerification);
  readonly refreshing = signal(false);
  readonly saving = computed(
    () =>
      this.refreshing() ||
      this.profile()?.busy() ||
      this.branch()?.busy() ||
      this.verification()?.busy(),
  );
  completed(stage: RegistrationStage) {
    return this.session.business()?.registrationStage?.includes(stage) ?? false;
  }
  visible(stage: RegistrationStage) {
    return this.current() === stage || this.visited().includes(stage);
  }
  open(stage: RegistrationStage) {
    if (this.saving() || (!this.completed(stage) && stage !== this.next())) return;
    const previous = this.current();
    if (previous && !this.visited().includes(previous))
      this.visited.update((items) => [...items, previous]);
    this.selected.set(stage);
    this.focusStep();
  }
  private focusStep() {
    setTimeout(() => {
      const heading = document.querySelector<HTMLElement>('.wizard-panel > :not([hidden]) h2');
      heading?.setAttribute('tabindex', '-1');
      heading?.focus();
    });
  }
  async saved(result: Business) {
    const token = this.session.token();
    const finished = this.current();
    if (!token || result._id !== this.session.business()?._id) return;
    this.refreshing.set(true);
    try {
      await this.session.loadContext();
      if (this.session.token() !== token) return;
      this.notifications.show('Registration step saved.');
      if (this.session.destination() !== '/onboarding') {
        await this.router.navigateByUrl(this.session.destination());
        return;
      }
      this.visited.update((items) => items.filter((s) => s !== finished));
      this.selected.set(undefined);
      this.focusStep();
    } finally {
      this.refreshing.set(false);
    }
  }
}
