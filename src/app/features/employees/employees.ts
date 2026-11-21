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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Session } from '../../core/auth/session';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import type { AccountStatus } from '../../core/http/api.models';
import { errorMessages } from '../../core/http/errors';
import { Field } from '../../shared/forms/field';
import { Button } from '../../shared/ui/button';
import { DirectoryPager, DirectorySearch } from '../../shared/ui/directory-controls';
import { Errors, Notifications } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { ManagementDialog } from '../../shared/ui/management-dialog';
import { employeeRoleDisplayName, employeeRoleOptions } from '../../shared/utilities/employee-role';
import { Branch, WorkspaceData } from '../workspace/workspace-data';
import { EmployeeDetails } from './employee-details';
import { EmployeeForm } from './employee-form';
import { employeeName, EmployeeRow, EmployeesApi, EmployeeQuery } from './employees-api';

type EmployeeAction =
  | { kind: 'create'; trigger: HTMLElement }
  | { kind: 'edit' | 'status'; employee: EmployeeRow; trigger: HTMLElement };

type EmployeeDetailsAction = { kind: 'details'; employee: EmployeeRow; trigger: HTMLElement };

const defaultQuery: EmployeeQuery = { page: 1, limit: 12, search: '', role: '', branch: '' };
const filterableRoles = employeeRoleOptions.filter(({ value }) => value !== 'ADMIN');

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
    EmployeeDetails,
    EmployeeForm,
    Errors,
    Field,
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchControl = viewChild(DirectorySearch);
  readonly action = signal<EmployeeAction | EmployeeDetailsAction | null>(null);
  readonly statusBusy = signal(false);
  readonly statusErrors = signal<string[]>([]);
  readonly statusUncertain = signal(false);
  readonly errors = errorMessages;
  readonly roleFilterOptions = [{ value: '', label: 'All roles' }, ...filterableRoles];
  readonly roleFilter = new FormControl('', { nonNullable: true });
  readonly terminalFilter = new FormControl('', { nonNullable: true });
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
    loader: async ({ params }) => {
      if (!params.branch) return this.terminalsApi.allBranches();
      const { data } = await this.terminalsApi.branch(params.branch);
      return data ? [data] : [];
    },
  });
  private readonly terminalsById = computed(
    () =>
      new Map(
        (this.terminals.hasValue() ? this.terminals.value() : []).map((terminal) => [
          terminal._id,
          terminal,
        ]),
      ),
  );
  readonly terminalFilterOptions = computed(() => [
    { value: '', label: 'All terminals' },
    ...Array.from(this.terminalsById().values(), ({ _id, name }) => ({ value: _id, label: name })),
  ]);

  constructor() {
    this.roleFilter.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((role) => this.filterRole(role));
    this.terminalFilter.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((branch) => this.filterTerminal(branch));
    effect(() => {
      if (!this.list.hasValue() || this.list.isLoading()) return;
      const page = this.list.value();
      if (page.currentPage > page.totalPages) this.go(page.totalPages);
    });
  }

  roleLabel(employee: EmployeeRow) {
    return employeeRoleDisplayName(employee.role);
  }

  assignedTerminal(employee: EmployeeRow) {
    return employee.branch ? this.terminalsById().get(employee.branch) : undefined;
  }

  terminalLabel(employee: EmployeeRow) {
    if (!employee.branch) return '';
    return (
      this.assignedTerminal(employee)?.name ??
      (this.terminals.isLoading() ? 'Loading…' : 'Terminal unavailable')
    );
  }

  search(search: string) {
    if (search !== this.query().search)
      this.query.update((query) => ({ ...query, page: 1, search }));
  }

  private filterRole(role: string) {
    const selected = filterableRoles.find(({ value }) => value === role)?.value ?? '';
    if (selected !== this.query().role)
      this.query.update((query) => ({ ...query, page: 1, role: selected }));
  }

  private filterTerminal(branch: string) {
    if (this.access.canCreateTerminal() && branch !== this.query().branch)
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
    this.roleFilter.reset();
    this.terminalFilter.reset();
    this.query.update(({ limit }) => ({ ...defaultQuery, limit }));
  }

  terminalCreated(terminal: Branch) {
    const terminals = this.terminals.hasValue() ? this.terminals.value() : [];
    this.terminals.set([terminal, ...terminals.filter(({ _id }) => _id !== terminal._id)]);
    this.terminals.reload();
    this.notify.show('Terminal added and selected.');
  }

  canViewDetails(employee: EmployeeRow) {
    return (
      employee.role !== 'ADMIN' &&
      this.access.canViewEmployees() &&
      this.access.scope()?.business === employee.business &&
      (this.access.canCreateTerminal() || this.access.employee()?.branch === employee.branch)
    );
  }

  openDetails(employee: EmployeeRow, event: MouseEvent) {
    if (!this.canViewDetails(employee) || !(event.target instanceof Element)) return;
    if (event.target.closest('.directory-actions')) return;
    const row = event.currentTarget;
    if (!(row instanceof HTMLElement)) return;
    const trigger = row.querySelector<HTMLButtonElement>('.directory-employee-name');
    if (trigger) this.action.set({ kind: 'details', employee, trigger });
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

  saved(employee: EmployeeRow) {
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
}
