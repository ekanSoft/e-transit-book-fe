import type { EmployeeRole } from '../../core/http/api.models';

export function employeeRoleLabel(role?: EmployeeRole): string {
  if (role === 'BRANCH_MANAGER') return 'terminal manager';
  return role?.toLowerCase().replaceAll('_', ' ') ?? '';
}

export function canManageSettlementBank(role?: EmployeeRole): boolean {
  return role === 'ADMIN' || role === 'OPERATIONS_MANAGER';
}
