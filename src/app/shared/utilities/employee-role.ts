const employeeRoles = {
  ADMIN: { label: 'Admin', selectable: true },
  OPERATIONS_MANAGER: { label: 'Operations Manager', selectable: true },
  BRANCH_MANAGER: { label: 'Terminal Manager', selectable: true },
  BOOKING_AGENT: { label: 'Booking Agent', selectable: true },
  ACCOUNTANT: { label: 'Accountant', selectable: true },
  DRIVER: { label: 'Driver', selectable: false }, // Enable when the driver workflow is ready.
} as const;

export type EmployeeRole = keyof typeof employeeRoles;

export const employeeRoleOptions = (Object.keys(employeeRoles) as EmployeeRole[])
  .filter((role) => employeeRoles[role].selectable)
  .map((value) => ({ value, label: employeeRoles[value].label }));

export function employeeRoleDisplayName(role: EmployeeRole): string {
  return employeeRoles[role]?.label ?? role;
}

export function employeeRoleLabel(role?: EmployeeRole): string {
  return role ? employeeRoleDisplayName(role).toLowerCase().replaceAll('_', ' ') : '';
}

export function canManageSettlementBank(role?: EmployeeRole): boolean {
  return role === 'ADMIN' || role === 'OPERATIONS_MANAGER';
}
