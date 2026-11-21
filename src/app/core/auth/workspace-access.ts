import { computed, inject, Injectable } from '@angular/core';
import { employeeRoleOptions } from '../../shared/utilities/employee-role';
import type { EmployeeRole } from '../http/api.models';
import { Session } from './session';

export type AssignableRole = Exclude<EmployeeRole, 'ADMIN'>;

const terminalManagerTargetRoles: readonly AssignableRole[] = ['BOOKING_AGENT', 'DRIVER'];
const operationsRoles: readonly AssignableRole[] = employeeRoleOptions
  .map(({ value }) => value)
  .filter((role) => role !== 'ADMIN');

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
  private readonly canManageOperations = computed(() => {
    const role = this.employee()?.role;
    return role === 'ADMIN' || role === 'OPERATIONS_MANAGER';
  });
  readonly canCreateTerminal = this.canManageOperations;
  readonly canViewRoutes = computed(() => !!this.scope());
  readonly canCreateRoute = computed(
    () =>
      this.canViewRoutes() &&
      this.canManageOperations() &&
      this.session.business()?.accountStatus === 'ACTIVE',
  );
  readonly canChangeRouteStatus = this.canCreateRoute;
  readonly canViewEmployees = computed(() => {
    const employee = this.employee();
    return this.canCreateTerminal() || (employee?.role === 'BRANCH_MANAGER' && !!employee.branch);
  });
  readonly employeeRoles = computed<readonly AssignableRole[]>(() =>
    this.canCreateTerminal()
      ? operationsRoles
      : this.canViewEmployees()
        ? operationsRoles.filter((role) => terminalManagerTargetRoles.includes(role))
        : [],
  );

  canEditTerminal(id: string) {
    const employee = this.employee();
    return (
      this.canCreateTerminal() || (employee?.role === 'BRANCH_MANAGER' && employee.branch === id)
    );
  }

  canManageEmployee(target: {
    _id: string;
    role: EmployeeRole;
    branch?: string | null;
    business: string;
  }) {
    const employee = this.employee();
    return (
      !!employee &&
      employee._id !== target._id &&
      employee.business._id === target.business &&
      target.role !== 'ADMIN' &&
      (this.canCreateTerminal() ||
        (this.canViewEmployees() &&
          employee.branch === target.branch &&
          terminalManagerTargetRoles.includes(target.role)))
    );
  }
}
