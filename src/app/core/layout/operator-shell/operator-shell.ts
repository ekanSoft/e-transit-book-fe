import { NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { permitsWorkspaceRoute } from '../../auth/routing';
import { Session } from '../../auth/session';
import { WorkspaceAccess } from '../../auth/workspace-access';
import { Theme, ThemeToggle } from '../theme';
import { Brand } from '../../../shared/ui/brand';
import { Icon, IconName } from '../../../shared/ui/icon';
import { employeeRoleLabel } from '../../../shared/utilities/employee-role';
import { publicUrl } from '../../../shared/utilities/public-url';

type NavItem = {
  label: string;
  url: string;
  icon: IconName;
  permission?:
    | 'canViewTerminals'
    | 'canViewRoutes'
    | 'canViewLayouts'
    | 'canViewTrips'
    | 'canViewEmployees'
    | 'canViewBookings';
};
const navigation: { group: string; items: NavItem[] }[] = [
  { group: 'Overview', items: [{ label: 'Dashboard', url: '/app/dashboard', icon: 'overview' }] },
  {
    group: 'Operations',
    items: [
      { label: 'Terminals', url: '/app/terminals', icon: 'pin', permission: 'canViewTerminals' },
      { label: 'Routes', url: '/app/routes', icon: 'route', permission: 'canViewRoutes' },
      {
        label: 'Vehicle layouts',
        url: '/app/vehicle-layouts',
        icon: 'seat',
        permission: 'canViewLayouts',
      },
      { label: 'Trips', url: '/app/trips', icon: 'calendar', permission: 'canViewTrips' },
      { label: 'Bookings', url: '/app/bookings', icon: 'ticket', permission: 'canViewBookings' },
    ],
  },
  {
    group: 'Management',
    items: [
      { label: 'Customers', url: '/app/customers', icon: 'users', permission: 'canViewBookings' },
      { label: 'Employees', url: '/app/employees', icon: 'users', permission: 'canViewEmployees' },
    ],
  },
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
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    NgTemplateOutlet,
    NgOptimizedImage,
    Icon,
    Brand,
    ThemeToggle,
  ],
  templateUrl: './operator-shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperatorShell {
  readonly session = inject(Session);
  private readonly access = inject(WorkspaceAccess);
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
    if (dest === '/app/dashboard') {
      return navigation
        .map(({ group, items }) => ({
          group,
          items: items.filter(({ permission }) => !permission || this.access[permission]()),
        }))
        .filter(({ items }) => items.length > 0);
    }
    const setup = dest === '/onboarding';
    const registration = [
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
    if (this.session.business()?.accountStatus !== 'PENDING') return registration;
    return [
      ...registration,
      ...navigation
        .map(({ group, items }) => ({
          group,
          items: items.filter(
            ({ url, permission }) =>
              !!permission &&
              this.access[permission]() &&
              permitsWorkspaceRoute(dest, url, this.session.business()),
          ),
        }))
        .filter(({ items }) => items.length),
    ];
  });
  // Recreate routed forms on token changes, including a switch in another tab to the same URL.
  readonly outletSession = computed(() => {
    const token = this.session.token();
    return token &&
      permitsWorkspaceRoute(this.session.destination(), this.url(), this.session.business())
      ? [token]
      : [];
  });
  readonly page = computed(
    () =>
      this.groups()
        .flatMap((g) => g.items)
        .find((i) => i.url === this.url() || this.url().startsWith(i.url + '/'))?.label ||
      'Workspace',
  );
  readonly logo = computed(() => publicUrl(this.session.business()?.logo));
  readonly workspaceLabel = computed(() => {
    const name = this.session.business()?.name || 'Business workspace';
    const mark = !this.logo() ? this.session.business()?.name?.charAt(0) : undefined;
    const destination = this.session.destination() === '/app/dashboard' ? ' dashboard' : '';
    return (mark ? mark + ' ' : '') + name + destination;
  });
  readonly initials = computed(
    () =>
      (this.session.employee()?.firstName?.[0] || '') +
      (this.session.employee()?.lastName?.[0] || ''),
  );
  readonly role = computed(() => employeeRoleLabel(this.session.employee()?.role));
}
