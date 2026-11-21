import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  linkedSignal,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { Session } from '../../core/auth/session';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { errorMessages } from '../../core/http/errors';
import { Field } from '../../shared/forms/field';
import { Button } from '../../shared/ui/button';
import { DirectorySearch } from '../../shared/ui/directory-controls';
import { Errors, Notifications } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { ManagementDialog } from '../../shared/ui/management-dialog';
import {
  type CreateRoute,
  type Route,
  type RouteStatus,
  WorkspaceData,
} from '../workspace/workspace-data';
import { RouteForm } from './route-form';
import { findDirectionalRoute, terminalLocation, terminalName } from './route-labels';

type RouteAction =
  { kind: 'create'; trigger: HTMLElement } | { kind: 'status'; trigger: HTMLElement; route: Route };

const statusLabels: Record<RouteStatus, string> = { ACTIVE: 'Active', INACTIVE: 'Inactive' };

@Component({
  selector: 'app-routes',
  imports: [Button, DirectorySearch, Errors, Field, Icon, ManagementDialog, RouteForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './routes.html',
  styleUrl: './routes.css',
})
export class Routes {
  readonly access = inject(WorkspaceAccess);
  private readonly session = inject(Session);
  private readonly api = inject(WorkspaceData);
  private readonly notify = inject(Notifications);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly search = viewChild(DirectorySearch);

  readonly errors = errorMessages;
  readonly statusLabels = statusLabels;
  readonly statusOptions = [
    { value: '', label: 'All routes' },
    { value: 'ACTIVE', label: statusLabels.ACTIVE },
    { value: 'INACTIVE', label: statusLabels.INACTIVE },
  ];
  readonly statusFilter = new FormControl('', { nonNullable: true });
  private readonly selectedStatus = toSignal(this.statusFilter.valueChanges, { initialValue: '' });
  readonly query = signal('');
  readonly hasFilters = computed(() => !!(this.query() || this.selectedStatus()));
  readonly action = linkedSignal({
    source: this.access.scope,
    computation: (): RouteAction | null => null,
  });
  readonly statusBusy = linkedSignal({ source: this.access.scope, computation: () => false });
  readonly statusErrors = signal<string[]>([]);
  readonly statusNeedsReview = signal(false);

  private readonly refreshVersion = signal(0);
  readonly list = resource({
    params: () => {
      const scope = this.access.scope();
      return scope && { scope, version: this.refreshVersion() };
    },
    loader: async () => (await this.api.routes()).data,
  });
  readonly terminals = resource({
    params: () => (this.access.canCreateRoute() ? this.access.scope() : undefined),
    loader: () => this.api.allBranches(),
  });
  readonly allRoutes = computed(() => (this.list.hasValue() ? this.list.value() : []));
  private readonly rows = computed(() =>
    this.allRoutes().map((route) => {
      const origin = {
        name: terminalName(route.originBranch),
        location: terminalLocation(route.originBranch),
      };
      const destination = {
        name: terminalName(route.destinationBranch),
        location: terminalLocation(route.destinationBranch),
      };
      const searchable = [
        route.originBranch?.name,
        origin.location,
        route.originBranch?.address?.stateCode,
        route.destinationBranch?.name,
        destination.location,
        route.destinationBranch?.address?.stateCode,
      ]
        .join(' ')
        .toLowerCase()
        .replace(/\s+/g, ' ');
      return {
        route,
        origin,
        destination,
        label: `${origin.name} to ${destination.name}`,
        searchable,
      };
    }),
  );
  readonly filteredRows = computed(() => {
    const terms = this.query().toLowerCase().trim().split(/\s+/).filter(Boolean);
    const status = this.selectedStatus();
    return this.rows().filter(
      ({ route, searchable }) =>
        (!status || route.status === status) && terms.every((term) => searchable.includes(term)),
    );
  });

  clearFilters(focus = false) {
    this.search()?.clear(focus);
    this.statusFilter.reset();
  }

  openCreate(trigger: HTMLElement) {
    if (this.access.canCreateRoute() && !this.action())
      this.action.set({ kind: 'create', trigger });
  }

  openStatus(route: Route, trigger: HTMLElement, popover: HTMLElement) {
    if (
      !this.access.canChangeRouteStatus() ||
      this.list.isLoading() ||
      this.action() ||
      !this.isCurrent(route)
    )
      return;
    popover.hidePopover();
    this.statusErrors.set([]);
    this.statusNeedsReview.set(false);
    this.action.set({ kind: 'status', route, trigger });
  }

  created() {
    const filtered = this.hasFilters() || !!this.search()?.draft();
    if (filtered) this.clearFilters();
    this.action.set(null);
    this.notify.show(filtered ? 'Route added. Filters cleared to show it.' : 'Route added.');
    this.refreshRoutes();
  }

  findDuplicate(pair: CreateRoute) {
    if (!findDirectionalRoute(this.allRoutes(), pair)) this.list.reload();
  }

  showExisting(id: string) {
    this.clearFilters();
    this.action.set(null);
    afterNextRender(
      {
        write: () => queueMicrotask(() => this.document.getElementById(`route-row-${id}`)?.focus()),
      },
      { injector: this.injector },
    );
  }

  async toggle(route: Route) {
    const scope = this.access.scope();
    const action = this.action();
    if (
      !scope ||
      !this.access.canChangeRouteStatus() ||
      action?.kind !== 'status' ||
      action.route !== route ||
      this.statusBusy() ||
      this.statusNeedsReview() ||
      this.list.isLoading() ||
      !this.isCurrent(route)
    )
      return;

    this.statusBusy.set(true);
    this.statusErrors.set([]);
    try {
      const { data } = await this.api.toggleRouteStatus(route._id);
      if (this.destroyRef.destroyed || scope !== this.access.scope()) return;
      this.action.set(null);
      this.notify.show(data.status === 'ACTIVE' ? 'Route activated.' : 'Route deactivated.');
      this.list.update((routes) =>
        routes?.map((current) =>
          current._id === route._id ? { ...current, status: data.status } : current,
        ),
      );
      this.refreshRoutes();
    } catch (error) {
      if (this.destroyRef.destroyed || scope !== this.access.scope()) return;
      const status = error instanceof HttpErrorResponse ? error.status : 0;
      const messages = errorMessages(error);
      if (status === 0 || status === 404 || status === 409 || status >= 500) {
        this.statusNeedsReview.set(true);
        this.list.reload();
        messages.push('Close this dialog and check the current status before trying again.');
      }
      if (status === 403) void this.session.loadContext();
      this.statusErrors.set(messages);
    } finally {
      if (!this.destroyRef.destroyed && scope === this.access.scope()) this.statusBusy.set(false);
    }
  }

  private isCurrent(route: Route) {
    return this.allRoutes().some(
      (current) => current._id === route._id && current.status === route.status,
    );
  }

  private refreshRoutes() {
    // A read already in flight can predate the write and resource.reload() will skip it.
    if (!this.list.reload() && this.list.isLoading())
      this.refreshVersion.update((version) => version + 1);
  }

  routeName(route: Route) {
    return `${terminalName(route.originBranch)} to ${terminalName(route.destinationBranch)}`;
  }
}
