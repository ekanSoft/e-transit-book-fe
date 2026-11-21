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
  private readonly hasOriginScopedTripReads = computed(() => {
    const role = this.employee()?.role;
    return role === 'BRANCH_MANAGER' || role === 'BOOKING_AGENT';
  });
  readonly tripScope = computed(() => {
    const scope = this.scope();
    if (!scope) return undefined;
    if (!this.hasOriginScopedTripReads()) return scope;
    const origin = this.employee()?.branch;
    return origin ? { ...scope, origin } : undefined;
  });
  readonly canViewTrips = computed(() => !!this.tripScope());
  readonly canScheduleTrip = computed(
    () =>
      this.canViewTrips() &&
      this.canManageOperations() &&
      this.session.business()?.accountStatus === 'ACTIVE',
  );
  readonly canCopyTrips = computed(
    () =>
      this.canScheduleTrip() ||
      (this.canViewTrips() &&
        this.employee()?.role === 'BRANCH_MANAGER' &&
        this.session.business()?.accountStatus === 'ACTIVE'),
  );
  readonly canReadTripManifest = computed(
    () => this.canViewTrips() && (this.canManageOperations() || this.hasOriginScopedTripReads()),
  );

  canReadTripManifestFrom(origin?: string | null) {
    return this.canReadTripManifest() && this.canReadTripFrom(origin);
  }

  canManageTripFrom(origin?: string | null) {
    return this.canCopyTrips() && this.canReadTripFrom(origin);
  }

  canReplaceTripLayout(origin?: string | null) {
    return this.canManageTripFrom(origin) && this.canViewLayouts();
  }
  canReadTripFrom(origin?: string | null) {
    return (
      this.canViewTrips() &&
      (!this.hasOriginScopedTripReads() || (!!origin && this.employee()?.branch === origin))
    );
  }
  readonly canCreateRoute = computed(
    () =>
      this.canViewRoutes() &&
      this.canManageOperations() &&
      this.session.business()?.accountStatus === 'ACTIVE',
  );
  readonly canChangeRouteStatus = this.canCreateRoute;
  readonly canViewLayouts = computed(() => !!this.scope() && this.canManageOperations());
  readonly canWriteLayouts = computed(
    () => this.canViewLayouts() && this.session.business()?.accountStatus === 'ACTIVE',
  );
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
