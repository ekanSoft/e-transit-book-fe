import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot } from '@angular/router';
import type { Business, Employee, EmployeeRole } from '../http/api.models';
import { employeesGuard, terminalsGuard } from './guards';
import { Session } from './session';
import { WorkspaceAccess } from './workspace-access';

const business: Business = {
  _id: 'business-a',
  name: 'Coastal Transit',
  slug: 'coastal-transit',
  email: 'admin@example.test',
  contactPhoneNumber: '+2348031234567',
  businessType: 'TRANSPORTATION',
  accountStatus: 'ACTIVE',
  registrationComplete: true,
  registrationStage: ['BRANCH', 'PROFILE', 'VERIFICATION'],
};

function membership(role: EmployeeRole, branch?: string): Employee {
  return {
    _id: 'actor',
    firstName: 'Amina',
    lastName: 'Danladi',
    email: 'employee@example.test',
    phoneNumber: '+2348031234567',
    accountStatus: 'ACTIVE',
    signupVerified: true,
    business,
    branch,
    role,
  };
}

describe('workspace directory access', () => {
  const employee = signal<Employee | null>(null);
  const selectedBusiness = signal<Business | null>(null);
  const token = signal<string | null>(null);
  const target = { business: business._id, role: 'BOOKING_AGENT' as const, branch: 'terminal-a' };

  beforeEach(() => {
    employee.set(null);
    selectedBusiness.set(business);
    token.set('local-session');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: Session,
          useValue: { employee, business: selectedBusiness, token },
        },
      ],
    });
  });

  it.each(['ADMIN', 'OPERATIONS_MANAGER'] as const)(
    'lets %s manage business terminals and non-admin employees',
    (role) => {
      employee.set(membership(role));
      const access = TestBed.inject(WorkspaceAccess);
      expect(access.canViewEmployees()).toBe(true);
      expect(access.canCreateTerminal()).toBe(true);
      expect(access.canEditTerminal('terminal-b')).toBe(true);
      expect(access.employeeRoles()).toEqual([
        'OPERATIONS_MANAGER',
        'BRANCH_MANAGER',
        'BOOKING_AGENT',
        'ACCOUNTANT',
        'DRIVER',
      ]);
      expect(access.canManageEmployee(target)).toBe(true);
      expect(access.canManageEmployee({ ...target, role: 'ADMIN' })).toBe(false);
      expect(access.canManageEmployee({ ...target, business: 'business-b' })).toBe(false);
    },
  );

  it('limits a terminal manager to booking agents and drivers at the assigned terminal', () => {
    employee.set(membership('BRANCH_MANAGER', 'terminal-a'));
    const access = TestBed.inject(WorkspaceAccess);
    expect(access.canViewEmployees()).toBe(true);
    expect(access.canCreateTerminal()).toBe(false);
    expect(access.canEditTerminal('terminal-a')).toBe(true);
    expect(access.canEditTerminal('terminal-b')).toBe(false);
    expect(access.employeeRoles()).toEqual(['BOOKING_AGENT', 'DRIVER']);
    expect(access.canManageEmployee(target)).toBe(true);
    expect(access.canManageEmployee({ ...target, role: 'DRIVER' })).toBe(true);
    expect(access.canManageEmployee({ ...target, role: 'ACCOUNTANT' })).toBe(false);
    expect(access.canManageEmployee({ ...target, branch: 'terminal-b' })).toBe(false);
    employee.set(membership('BRANCH_MANAGER'));
    expect(access.canViewEmployees()).toBe(false);
    expect(access.canManageEmployee(target)).toBe(false);
  });

  it('blocks unauthorized deep links and clears permissions when the workspace changes', () => {
    employee.set(membership('DRIVER', 'terminal-a'));
    const access = TestBed.inject(WorkspaceAccess);
    const route = {} as ActivatedRouteSnapshot;
    const state = {} as RouterStateSnapshot;
    expect(TestBed.runInInjectionContext(() => terminalsGuard(route, state))).toBe(true);
    expect(TestBed.runInInjectionContext(() => employeesGuard(route, state)).toString()).toBe(
      '/app/dashboard',
    );
    employee.set(membership('ADMIN'));
    expect(TestBed.runInInjectionContext(() => employeesGuard(route, state))).toBe(true);
    selectedBusiness.set({ ...business, _id: 'business-b' });
    expect(access.scope()).toBeUndefined();
    expect(access.canViewEmployees()).toBe(false);
    expect(access.canViewTerminals()).toBe(false);
    expect(access.canManageEmployee(target)).toBe(false);
  });
});
