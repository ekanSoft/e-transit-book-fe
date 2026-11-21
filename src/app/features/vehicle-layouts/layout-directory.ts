import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  linkedSignal,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Session } from '../../core/auth/session';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { errorMessages } from '../../core/http/errors';
import { Field } from '../../shared/forms/field';
import { Button } from '../../shared/ui/button';
import { DirectorySearch } from '../../shared/ui/directory-controls';
import { Errors, Notifications } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { ManagementDialog } from '../../shared/ui/management-dialog';
import { LayoutApi, typeLabels, type VehicleLayout } from './layout-api';

type LayoutFilters = { search: string; type: string; status: string };

@Component({
  selector: 'app-layout-directory',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, DirectorySearch, Errors, Icon, Field, ManagementDialog, RouterLink],
  templateUrl: './layout-directory.html',
  styleUrl: './layout-directory.css',
})
export class LayoutDirectory {
  readonly access = inject(WorkspaceAccess);
  private readonly api = inject(LayoutApi);
  private readonly session = inject(Session);
  private readonly notify = inject(Notifications);
  private readonly destroy = inject(DestroyRef);
  private readonly search = viewChild(DirectorySearch);
  readonly query = signal<LayoutFilters>({ search: '', type: '', status: '' });
  readonly filtered = computed(
    () => !!(this.query().type || this.query().status || this.query().search),
  );
  readonly typeFilter = new FormControl('', { nonNullable: true });
  readonly statusFilter = new FormControl('', { nonNullable: true });
  readonly types = [
    { value: '', label: 'All vehicle types' },
    ...Object.entries(typeLabels).map(([value, label]) => ({ value, label })),
  ];
  readonly statuses = [
    { value: '', label: 'All statuses' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
  ];
  readonly typeLabels = typeLabels;
  readonly errors = errorMessages;
  readonly list = resource({
    params: () => (this.access.canViewLayouts() ? this.access.scope() : undefined),
    loader: async ({ abortSignal }) => {
      try {
        return (await this.api.list()).data;
      } catch (error) {
        if (!abortSignal.aborted && error instanceof HttpErrorResponse && error.status === 403)
          void this.session.loadContext();
        throw error;
      }
    },
  });
  readonly layouts = computed(() => {
    if (!this.list.hasValue()) return [];
    const { search, type, status } = this.query();
    const term = search.trim().toLowerCase();
    return this.list
      .value()
      .filter(
        (layout) =>
          (!type || layout.type === type) &&
          (!status || layout.status === status) &&
          (!term ||
            layout.name.toLowerCase().includes(term) ||
            layout.customType?.toLowerCase().includes(term)),
      );
  });
  readonly action = linkedSignal({
    source: this.access.scope,
    computation: (): { layout: VehicleLayout; trigger: HTMLElement } | null => null,
  });
  readonly busy = signal(false);
  readonly messages = signal<string[]>([]);
  readonly review = signal(false);
  constructor() {
    this.typeFilter.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((type) => this.filter({ type }));
    this.statusFilter.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((status) => this.filter({ status }));
  }
  filter(change: Partial<LayoutFilters>) {
    this.query.update((query) => ({ ...query, ...change }));
  }
  clear() {
    this.typeFilter.reset();
    this.statusFilter.reset();
    this.search()?.clear(true);
  }
  confirm(layout: VehicleLayout, trigger: HTMLElement, popover: HTMLElement) {
    if (!this.access.canWriteLayouts() || this.busy() || this.action()) return;
    popover.hidePopover();
    this.review.set(false);
    this.messages.set([]);
    this.action.set({ layout, trigger });
  }
  async toggle() {
    const action = this.action(),
      scope = this.access.scope();
    if (!scope || !action || !this.access.canWriteLayouts() || this.busy() || this.review()) return;
    this.busy.set(true);
    try {
      const { data } = await this.api.toggle(action.layout._id);
      if (this.destroy.destroyed || scope !== this.access.scope()) return;
      this.notify.show(
        data.status === 'ACTIVE' ? 'Vehicle layout activated.' : 'Vehicle layout deactivated.',
      );
      this.action.set(null);
    } catch (error) {
      if (this.destroy.destroyed || scope !== this.access.scope()) return;
      const messages = errorMessages(error);
      this.review.set(true);
      messages.push('Close this dialog and review the refreshed directory before trying again.');
      this.messages.set(messages);
      if (error instanceof HttpErrorResponse && error.status === 403)
        void this.session.loadContext();
    } finally {
      if (!this.destroy.destroyed) {
        if (scope === this.access.scope()) this.list.reload();
        this.busy.set(false);
      }
    }
  }
}
