import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Session } from '../../core/auth/session';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import type { AccountStatus } from '../../core/http/api.models';
import { errorMessages } from '../../core/http/errors';
import { Button } from '../../shared/ui/button';
import { DirectoryPager, DirectorySearch } from '../../shared/ui/directory-controls';
import { Errors, Notifications } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { ManagementDialog } from '../../shared/ui/management-dialog';
import { WorkspaceData } from '../workspace/workspace-data';
import { EmployeeForm } from './employee-form';
import {
  employeeName,
  EmployeeRow,
  EmployeesApi,
  EmployeeQuery,
  roleOptions,
} from './employees-api';

type EmployeeAction =
  | { kind: 'create'; trigger: HTMLElement }
  | { kind: 'edit' | 'status'; employee: EmployeeRow; trigger: HTMLElement };

const defaultQuery: EmployeeQuery = { page: 1, limit: 12, search: '', role: '', branch: '' };

const statusLabels: Record<AccountStatus, string> = {
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  INACTIVE: 'Inactive',
  PENDING: 'Pending',
  REJECTED: 'Rejected',
};

@Component({
  selector: 'app-employees',
  imports: [
    Button,
    DirectoryPager,
    DirectorySearch,
    EmployeeForm,
    Errors,
    Icon,
    ManagementDialog,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './employees.html',
})
export class Employees {
  readonly access = inject(WorkspaceAccess);
  private readonly session = inject(Session);
  private readonly api = inject(EmployeesApi);
  private readonly terminalsApi = inject(WorkspaceData);
  private readonly notify = inject(Notifications);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchControl = viewChild(DirectorySearch);
  readonly action = signal<EmployeeAction | null>(null);
  readonly statusBusy = signal(false);
  readonly statusErrors = signal<string[]>([]);
  readonly statusUncertain = signal(false);
  readonly errors = errorMessages;
  readonly roles = roleOptions;
  readonly name = employeeName;
  readonly status = statusLabels;
  readonly pageSizes = [12, 25, 50];
  readonly query = signal(defaultQuery);
  readonly filtered = computed(() => {
    const { search, role, branch } = this.query();
    return !!(search || role || (branch && this.access.canCreateTerminal()));
  });
  readonly list = resource({
    params: () => {
      const scope = this.access.scope();
      if (!scope || !this.access.canViewEmployees()) return undefined;
      const query = this.query();
      const branch = this.access.canCreateTerminal() ? query.branch : undefined;
      const assigned = this.access.canCreateTerminal() ? undefined : this.access.employee()?.branch;
      return { scope, assigned, query: { ...query, branch } };
    },
    loader: async ({ params, abortSignal }) => {
      try {
        return (await this.api.list(params.query)).data;
      } catch (error) {
        if (!abortSignal.aborted && error instanceof HttpErrorResponse && error.status === 403) {
          void this.session.loadContext();
        }
        throw error;
      }
    },
  });
  readonly terminals = resource({
    params: () =>
      this.access.canViewEmployees()
        ? {
            scope: this.access.scope(),
            branch: this.access.canCreateTerminal() ? undefined : this.access.employee()?.branch,
          }
        : undefined,
    loader: async ({ params, abortSignal }) => {
      if (!params.branch) return this.terminalsApi.allBranches(abortSignal);
      const { data } = await this.terminalsApi.branch(params.branch);
      return data ? [data] : [];
    },
  });
  readonly terminalNames = computed(
    () =>
      new Map(
        (this.terminals.hasValue() ? this.terminals.value() : []).map(({ _id, name }) => [
          _id,
          name,
        ]),
      ),
  );

  constructor() {
    effect(() => {
      if (!this.list.hasValue() || this.list.isLoading()) return;
      const page = this.list.value();
      if (page.currentPage > page.totalPages) this.go(page.totalPages);
    });
  }

  roleLabel(employee: EmployeeRow) {
    return this.roles.find(({ value }) => value === employee.role)?.label ?? employee.role;
  }

  terminalLabel(employee: EmployeeRow) {
    if (employee.role === 'OPERATIONS_MANAGER' || (employee.role === 'ADMIN' && !employee.branch)) {
      return 'Company-wide';
    }
    if (!employee.branch) return 'Unassigned';
    return (
      this.terminalNames().get(employee.branch) ??
      (this.terminals.isLoading() ? 'Loading…' : 'Terminal unavailable')
    );
  }

  search(search: string) {
    if (search !== this.query().search)
      this.query.update((query) => ({ ...query, page: 1, search }));
  }

  filterRole(role: string) {
    const selected = this.roles.find(({ value }) => value === role)?.value ?? '';
    this.query.update((query) => ({ ...query, page: 1, role: selected }));
  }

  filterTerminal(branch: string) {
    if (this.access.canCreateTerminal())
      this.query.update((query) => ({ ...query, page: 1, branch }));
  }

  changeLimit(limit: string) {
    const size = Number(limit);
    if (this.pageSizes.includes(size))
      this.query.update((query) => ({ ...query, page: 1, limit: size }));
  }

  go(page: number) {
    this.query.update((query) => ({ ...query, page }));
  }

  clear(focus = false) {
    this.searchControl()?.clear(focus);
    this.query.update(({ limit }) => ({ ...defaultQuery, limit }));
  }

  open(action: EmployeeAction, popover?: HTMLElement) {
    if (
      action.kind === 'create'
        ? !this.access.canViewEmployees()
        : !this.access.canManageEmployee(action.employee)
    ) {
      return;
    }
    popover?.hidePopover();
    this.statusErrors.set([]);
    this.statusUncertain.set(false);
    this.action.set(action);
  }

  async saved(employee: EmployeeRow) {
    const creating = this.action()?.kind === 'create';
    this.action.set(null);
    if (creating) {
      const reset = this.query().page !== 1 || this.filtered();
      this.notify.show(reset ? 'Employee added. Showing the newest employees.' : 'Employee added.');
      if (reset) this.clear();
      else {
        this.searchControl()?.clear();
        this.list.reload();
      }
      return;
    }
    this.notify.show('Employee updated.');
    this.updateRow(employee);
    await this.refreshOwnAccess(employee);
  }

  async toggle(employee: EmployeeRow) {
    const scope = this.access.scope();
    if (
      !scope ||
      this.statusBusy() ||
      this.statusUncertain() ||
      !this.access.canManageEmployee(employee)
    )
      return;
    this.statusBusy.set(true);
    this.statusErrors.set([]);
    try {
      const { data } = await this.api.toggleStatus(employee._id);
      if (this.destroyRef.destroyed || scope !== this.access.scope()) return;
      this.action.set(null);
      this.notify.show(
        data.accountStatus === 'SUSPENDED' ? 'Employee suspended.' : 'Employee reactivated.',
      );
      this.updateRow(data);
      await this.refreshOwnAccess(data);
    } catch (error) {
      if (this.destroyRef.destroyed || scope !== this.access.scope()) return;
      const messages = errorMessages(error);
      if (!(error instanceof HttpErrorResponse) || error.status === 0 || error.status >= 500) {
        this.statusUncertain.set(true);
        this.list.reload();
        messages.push('Close this dialog and check the current status before trying again.');
      }
      this.statusErrors.set(messages);
      if (error instanceof HttpErrorResponse && error.status === 403)
        void this.session.loadContext();
    } finally {
      this.statusBusy.set(false);
    }
  }

  private updateRow(employee: EmployeeRow) {
    if (this.list.hasValue()) {
      this.list.update(
        (page) =>
          page && {
            ...page,
            content: page.content.map((row) => (row._id === employee._id ? employee : row)),
          },
      );
    }
    this.list.reload();
  }

  private async refreshOwnAccess(employee: EmployeeRow) {
    if (employee._id !== this.access.employee()?._id) return;
    const token = this.session.token();
    await this.session.loadContext();
    if (token === this.session.token() && !this.access.canViewEmployees()) {
      await this.router.navigateByUrl(this.session.destination());
    }
  }
}
