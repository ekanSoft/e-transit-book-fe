import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
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
import { DirectorySearch, DirectoryPager } from '../../shared/ui/directory-controls';
import { Errors, Notifications } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { ManagementDialog } from '../../shared/ui/management-dialog';
import { LayoutApi, type LayoutQuery, typeLabels, type VehicleLayout } from './layout-api';

@Component({
  selector: 'app-layout-directory',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Button,
    DirectorySearch,
    DirectoryPager,
    Errors,
    Icon,
    Field,
    ManagementDialog,
    RouterLink,
  ],
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
  readonly query = signal<LayoutQuery>({ page: 1, limit: 10, search: '', type: '', status: '' });
  readonly filtered = computed(
    () => !!(this.query().type || this.query().status || this.query().search),
  );
  readonly typeFilter = new FormControl('', { nonNullable: true });
  readonly statusFilter = new FormControl('', { nonNullable: true });
  readonly sizeFilter = new FormControl('10', { nonNullable: true });
  readonly types = [
    { value: '', label: 'All vehicle types' },
    ...Object.entries(typeLabels).map(([value, label]) => ({ value, label })),
  ];
  readonly statuses = [
    { value: '', label: 'All statuses' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
  ];
  readonly sizes = ['10', '25', '50'].map((value) => ({ value, label: value + ' per page' }));
  readonly typeLabels = typeLabels;
  readonly errors = errorMessages;
  private readonly revision = signal(0);
  readonly list = resource({
    params: () =>
      this.access.canViewLayouts()
        ? { scope: this.access.scope(), query: this.query(), revision: this.revision() }
        : undefined,
    loader: async ({ params, abortSignal }) => {
      try {
        return (await this.api.list(params.query)).data;
      } catch (error) {
        if (!abortSignal.aborted && error instanceof HttpErrorResponse && error.status === 403)
          void this.session.loadContext();
        throw error;
      }
    },
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
    this.sizeFilter.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((limit) => this.filter({ limit: Number(limit) }));
    effect(() => {
      const result = this.list.hasValue() && this.list.value();
      if (result && this.query().page > Math.max(1, result.totalPages))
        this.page(Math.max(1, result.totalPages));
    });
  }
  page(page: number) {
    this.query.update((query) => ({ ...query, page }));
  }
  filter(change: Partial<Omit<LayoutQuery, 'page'>>) {
    this.query.update((query) => ({ ...query, ...change, page: 1 }));
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
      this.revision.update((n) => n + 1);
    } catch (error) {
      if (this.destroy.destroyed || scope !== this.access.scope()) return;
      const messages = errorMessages(error);
      this.review.set(true);
      messages.push('Close this dialog and review the refreshed directory before trying again.');
      this.messages.set(messages);
      this.revision.update((n) => n + 1);
      if (error instanceof HttpErrorResponse && error.status === 403)
        void this.session.loadContext();
    } finally {
      if (!this.destroy.destroyed) this.busy.set(false);
    }
  }
}
