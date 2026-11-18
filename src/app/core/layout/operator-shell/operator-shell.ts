import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { permitsWorkspaceRoute } from '../../auth/routing';
import { Session } from '../../auth/session';
import { Theme, ThemeToggle } from '../theme';
import { Brand } from '../../../shared/ui/brand';
import { Icon, IconName } from '../../../shared/ui/icon';
import { employeeRoleLabel } from '../../../shared/utilities/employee-role';

type NavItem = { label: string; url: string; icon: IconName };
const navigation: { group: string; items: NavItem[] }[] = [
  { group: 'Overview', items: [{ label: 'Dashboard', url: '/app/dashboard', icon: 'overview' }] },
  { group: 'Operations', items: [{ label: 'Terminals', url: '/app/terminals', icon: 'pin' }] },
  {
    group: 'Workspace',
    items: [
      { label: 'Business profile', url: '/app/business-profile', icon: 'building' },
      { label: 'My account', url: '/app/account', icon: 'user' },
    ],
  },
];
@Component({
  selector: 'app-operator-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, NgTemplateOutlet, Icon, Brand, ThemeToggle],
  templateUrl: './operator-shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperatorShell {
  readonly session = inject(Session);
  readonly theme = inject(Theme);
  private readonly router = inject(Router);
  readonly collapsed = signal(false);
  readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.split(/[?#]/)[0]),
    ),
    { initialValue: this.router.url },
  );
  readonly groups = computed(() => {
    const dest = this.session.destination();
    if (dest === '/app/dashboard') return navigation;
    const setup = dest === '/onboarding';
    return [
      {
        group: 'Registration',
        items: [
          {
            label: setup ? 'Business setup' : 'Account status',
            url: dest,
            icon: setup ? 'building' : 'shield',
          } satisfies NavItem,
        ],
      },
    ];
  });
  // Recreate routed forms on token changes, including a switch in another tab to the same URL.
  readonly outletSession = computed(() => {
    const token = this.session.token();
    return token && permitsWorkspaceRoute(this.session.destination(), this.url()) ? [token] : [];
  });
  readonly page = computed(
    () =>
      this.groups()
        .flatMap((g) => g.items)
        .find((i) => i.url === this.url())?.label || 'Workspace',
  );
  readonly initials = computed(
    () =>
      (this.session.employee()?.firstName?.[0] || '') +
      (this.session.employee()?.lastName?.[0] || ''),
  );
  readonly role = computed(() => employeeRoleLabel(this.session.employee()?.role));
}
