import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import { Session } from '../../core/auth/session';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { errorMessages } from '../../core/http/errors';
import { Button } from '../../shared/ui/button';
import { DirectoryPager, DirectorySearch } from '../../shared/ui/directory-controls';
import { Icon } from '../../shared/ui/icon';
import { Errors, Notifications } from '../../shared/ui/feedback';
import { EmployeesApi, employeeName } from '../employees/employees-api';
import { TerminalForm } from './terminal-form';
import { Branch, WorkspaceData } from './workspace-data';

@Component({
  selector: 'app-branches',
  imports: [Icon, Errors, Button, DirectoryPager, DirectorySearch, TerminalForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './branches.html',
})
export class Branches {
  readonly session = inject(Session);
  readonly access = inject(WorkspaceAccess);
  private readonly api = inject(WorkspaceData);
  private readonly employees = inject(EmployeesApi);
  private readonly notifications = inject(Notifications);
  readonly searchControl = viewChild.required(DirectorySearch);
  readonly errors = errorMessages;
  readonly query = signal({ page: 1, search: '' });
  readonly editor = signal<{ terminal?: Branch; trigger: HTMLElement } | null>(null);
  readonly list = resource({
    params: () =>
      this.access.scope() ? { ...this.query(), scope: this.access.scope() } : undefined,
    loader: async ({ params }) => (await this.api.branches(params.page, params.search)).data,
  });
  readonly managers = resource({
    params: () =>
      this.access.canViewEmployees()
        ? {
            scope: this.access.scope(),
            branch: this.access.canCreateTerminal() ? undefined : this.access.employee()?.branch,
          }
        : undefined,
    loader: ({ params, abortSignal }) =>
      this.employees.terminalManagers(abortSignal, params.branch),
  });
  private readonly managerById = computed(
    () =>
      new Map(
        (this.managers.hasValue() ? this.managers.value() : []).map((manager) => [
          manager._id,
          manager,
        ]),
      ),
  );

  managerName(terminal: Branch) {
    const manager = this.managerById().get(terminal.branchManager ?? '');
    return manager?.branch === terminal._id && manager.accountStatus === 'ACTIVE'
      ? employeeName(manager)
      : '';
  }

  location(terminal: Branch) {
    return [terminal.address?.city, terminal.address?.state].filter(Boolean).join(', ');
  }

  search(value: string) {
    if (value !== this.query().search) this.query.set({ page: 1, search: value });
  }
  go(page: number) {
    this.query.update((q) => ({ ...q, page }));
  }

  open(trigger: HTMLElement, terminal?: Branch) {
    if (terminal ? this.access.canEditTerminal(terminal._id) : this.access.canCreateTerminal()) {
      if (terminal && this.access.canCreateTerminal()) this.managers.reload();
      this.editor.set({ terminal, trigger });
    }
  }

  saved(terminal: Branch) {
    const editing = !!this.editor()?.terminal;
    this.editor.set(null);
    if (!editing) {
      const reset = this.query().page !== 1 || !!this.query().search;
      this.notifications.show(
        reset ? 'Terminal added. Showing the newest terminals.' : 'Terminal added.',
      );
      this.searchControl().clear();
      if (reset) this.query.set({ page: 1, search: '' });
      else this.list.reload();
      return;
    }
    this.notifications.show('Terminal updated.');
    if (this.list.hasValue()) {
      this.list.update(
        (page) =>
          page && {
            ...page,
            content: page.content.map((row) => (row._id === terminal._id ? terminal : row)),
          },
      );
    }
    this.list.reload();
  }
}
