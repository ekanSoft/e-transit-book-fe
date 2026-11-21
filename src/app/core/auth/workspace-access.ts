import { computed, inject, Injectable } from '@angular/core';
import type { EmployeeRole } from '../http/api.models';
import { Session } from './session';

export type AssignableRole = Exclude<EmployeeRole, 'ADMIN'>;

const terminalManagerRoles: readonly AssignableRole[] = ['BOOKING_AGENT', 'DRIVER'];
const operationsRoles: readonly AssignableRole[] = [
  'OPERATIONS_MANAGER',
  'BRANCH_MANAGER',
  'BOOKING_AGENT',
  'ACCOUNTANT',
  'DRIVER',
];

@Injectable({ providedIn: 'root' })
export class WorkspaceAccess {
  private readonly session = inject(Session);
  readonly employee = computed(() => {
    const employee = this.session.employee();
    const business = this.session.business();
    return employee && business && employee.business._id === business._id ? employee : null;
  });
  readonly canViewTerminals = computed(() => !!this.employee());
  readonly scope = computed(
    () => {
      const token = this.session.token();
      const business = this.session.business()?._id;
      return token && business && this.employee() ? { token, business } : undefined;
    },
    { equal: (a, b) => a?.token === b?.token && a?.business === b?.business },
  );
  readonly canCreateTerminal = computed(() => {
    const role = this.employee()?.role;
    return role === 'ADMIN' || role === 'OPERATIONS_MANAGER';
  });
  readonly canViewEmployees = computed(() => {
    const employee = this.employee();
    return this.canCreateTerminal() || (employee?.role === 'BRANCH_MANAGER' && !!employee.branch);
  });
  readonly employeeRoles = computed<readonly AssignableRole[]>(() =>
    this.canCreateTerminal()
      ? operationsRoles
      : this.canViewEmployees()
        ? terminalManagerRoles
        : [],
  );

  canEditTerminal(id: string) {
    const employee = this.employee();
    return (
      this.canCreateTerminal() || (employee?.role === 'BRANCH_MANAGER' && employee.branch === id)
    );
  }

  canManageEmployee(target: { role: EmployeeRole; branch?: string | null; business: string }) {
    const employee = this.employee();
    return (
      !!employee &&
      employee.business._id === target.business &&
      target.role !== 'ADMIN' &&
      (this.canCreateTerminal() ||
        (this.canViewEmployees() &&
          employee.branch === target.branch &&
          terminalManagerRoles.includes(target.role)))
    );
  }
}
