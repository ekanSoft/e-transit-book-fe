import { inject, Injectable } from '@angular/core';
import type { AssignableRole } from '../../core/auth/workspace-access';
import { Api } from '../../core/http/api';
import type { Employee, EmployeeRole } from '../../core/http/api.models';
import type { Page } from '../workspace/workspace-data';

export type Gender = 'MALE' | 'FEMALE';
export type EmployeeRow = Omit<Employee, 'business' | 'branch'> & {
  business: string;
  branch?: string | null;
  gender?: Gender | null;
};

export interface EmployeeQuery {
  page: number;
  limit: number;
  search: string;
  role?: EmployeeRole | '';
  branch?: string;
}

export interface CreateEmployee {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: AssignableRole;
  branch?: string;
  gender?: Gender;
}

export type UpdateEmployee = Partial<Omit<CreateEmployee, 'email' | 'branch' | 'gender'>> & {
  branch?: string | null;
  gender?: Gender | null;
};

export function employeeName(employee: Pick<EmployeeRow, 'firstName' | 'lastName'>) {
  return [employee.firstName, employee.lastName].filter(Boolean).join(' ');
}

@Injectable({ providedIn: 'root' })
export class EmployeesApi {
  private readonly api = inject(Api);

  list({ page, limit, search, role, branch }: EmployeeQuery) {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) query.set('search', search);
    if (role) query.set('role', role);
    if (branch) query.set('branch', branch);
    return this.api.get<Page<EmployeeRow>>('/employees?' + query);
  }

  create(body: CreateEmployee) {
    return this.api.post<EmployeeRow>('/employees', body);
  }

  update(id: string, body: UpdateEmployee) {
    return this.api.patch<EmployeeRow>('/employees/' + id, body);
  }

  toggleStatus(id: string) {
    return this.api.patch<EmployeeRow>('/employees/' + id + '/toggle-status', null);
  }
}
