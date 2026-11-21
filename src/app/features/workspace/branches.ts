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
import { DirectorySearch } from '../../shared/ui/directory-controls';
import { Icon } from '../../shared/ui/icon';
import { Errors, Notifications } from '../../shared/ui/feedback';
import { EmployeesApi, employeeName } from '../employees/employees-api';
import { TerminalForm } from './terminal-form';
import { Branch, WorkspaceData } from './workspace-data';

@Component({
  selector: 'app-branches',
  imports: [Icon, Errors, Button, DirectorySearch, TerminalForm],
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
  readonly query = signal('');
  readonly editor = signal<{ terminal?: Branch; trigger: HTMLElement } | null>(null);
  readonly list = resource({
    params: this.access.scope,
    loader: () => this.api.allBranches(),
  });
  readonly filteredTerminals = computed(() => {
    const terminals = this.list.hasValue() ? this.list.value() : [];
    const query = this.query().toLowerCase();
    return query ? terminals.filter(({ name }) => name.toLowerCase().includes(query)) : terminals;
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
    return manager?.accountStatus === 'ACTIVE' ? employeeName(manager) : '';
  }

  location(terminal: Branch) {
    return [terminal.address?.city, terminal.address?.state].filter(Boolean).join(', ');
  }

  open(trigger: HTMLElement, terminal?: Branch) {
    if (terminal ? this.access.canEditTerminal(terminal._id) : this.access.canCreateTerminal()) {
      if (this.access.canCreateTerminal()) this.managers.reload();
      this.editor.set({ terminal, trigger });
    }
  }

  saved() {
    const editing = !!this.editor()?.terminal;
    this.editor.set(null);
    this.notifications.show(editing ? 'Terminal updated.' : 'Terminal added.');
    this.list.reload();
  }
}
