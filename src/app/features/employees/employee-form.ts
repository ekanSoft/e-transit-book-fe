import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Session } from '../../core/auth/session';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { Field } from '../../shared/forms/field';
import { applyServerValidation } from '../../shared/forms/server-validation';
import { emailValidators, focusInvalid, requiredText } from '../../shared/forms/validators';
import { Button } from '../../shared/ui/button';
import { Errors } from '../../shared/ui/feedback';
import { ManagementDialog } from '../../shared/ui/management-dialog';
import { nigerianPhone, normalizeNigerianPhone } from '../../shared/utilities/phone';
import type { Branch } from '../workspace/workspace-data';
import {
  CreateEmployee,
  employeeName,
  EmployeeRow,
  EmployeesApi,
  Gender,
  roleOptions,
  UpdateEmployee,
} from './employees-api';

const genderOptions = [
  { value: 'unspecified', label: 'Unspecified' },
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
];

@Component({
  selector: 'app-employee-form',
  imports: [Button, Errors, Field, ManagementDialog, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './employee-form.html',
})
export class EmployeeForm implements OnInit {
  private readonly api = inject(EmployeesApi);
  private readonly access = inject(WorkspaceAccess);
  private readonly session = inject(Session);
  private readonly destroyRef = inject(DestroyRef);
  readonly employee = input<EmployeeRow>();
  readonly terminals = input<Branch[]>();
  readonly terminalLoadFailed = input(false);
  readonly trigger = input<HTMLElement>();
  readonly saved = output<EmployeeRow>();
  readonly dismissed = output<void>();
  readonly retryTerminals = output<void>();
  readonly busy = signal(false);
  readonly errors = signal<string[]>([]);
  readonly name = employeeName;
  readonly genderOptions = genderOptions;
  readonly roleOptions = computed(() =>
    roleOptions.filter(({ value }) => this.access.employeeRoles().some((role) => role === value)),
  );
  readonly terminalOptions = computed(() =>
    (this.terminals() ?? []).map(({ _id, name, address }) => ({
      value: _id,
      label: address?.city ? `${name} · ${address.city}` : name,
    })),
  );
  readonly form = inject(NonNullableFormBuilder).group({
    firstName: ['', requiredText(100)],
    lastName: ['', requiredText(100)],
    email: ['', emailValidators],
    phoneNumber: ['', [Validators.required, nigerianPhone]],
    role: ['', Validators.required],
    branch: [''],
    gender: ['unspecified'],
    password: ['', [Validators.minLength(8), Validators.maxLength(100)]],
  });
  private readonly valueChanges = toSignal(this.form.valueChanges);
  readonly details = computed(() => {
    this.valueChanges();
    const value = this.form.getRawValue();
    const gender: Gender | undefined =
      value.gender === 'MALE' || value.gender === 'FEMALE' ? value.gender : undefined;
    return {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      email: value.email.trim().toLowerCase(),
      phoneNumber: normalizeNigerianPhone(value.phoneNumber),
      role: this.access.employeeRoles().find((role) => role === value.role),
      branch: value.branch,
      gender,
      password: value.password,
    };
  });
  readonly showTerminal = computed(() => {
    const role = this.details().role;
    return this.access.canCreateTerminal() && !!role && role !== 'OPERATIONS_MANAGER';
  });
  readonly terminalMissing = computed(
    () =>
      this.showTerminal() &&
      !!this.details().branch &&
      this.terminalOptions().length > 0 &&
      !this.terminalOptions().some(({ value }) => value === this.details().branch),
  );
  private readonly patch = computed(() => {
    const employee = this.employee();
    const value = this.details();
    const body: UpdateEmployee = {};
    if (!employee) return body;
    if (value.firstName !== employee.firstName?.trim()) body.firstName = value.firstName;
    if (value.lastName !== employee.lastName?.trim()) body.lastName = value.lastName;
    if (value.phoneNumber !== normalizeNigerianPhone(employee.phoneNumber ?? ''))
      body.phoneNumber = value.phoneNumber;
    if (value.role && value.role !== employee.role) body.role = value.role;
    if (value.gender !== (employee.gender ?? undefined)) body.gender = value.gender ?? null;
    if (value.password) body.password = value.password;
    if (this.access.canCreateTerminal()) {
      if (value.role === 'OPERATIONS_MANAGER' && (body.role || employee.branch)) body.branch = null;
      else if (this.showTerminal() && value.branch && value.branch !== employee.branch)
        body.branch = value.branch;
    }
    return body;
  });
  readonly changed = computed(() => Object.keys(this.patch()).length > 0);

  ngOnInit() {
    const employee = this.employee();
    if (employee) {
      this.form.reset({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phoneNumber: employee.phoneNumber ?? '',
        role: employee.role,
        branch: employee.branch ?? '',
        gender: employee.gender ?? 'unspecified',
        password: '',
      });
      this.form.controls.email.disable();
    } else {
      this.form.controls.password.addValidators(Validators.required);
      this.form.controls.password.updateValueAndValidity();
    }
  }

  async submit(element: HTMLFormElement) {
    const employee = this.employee();
    const scope = this.access.scope();
    if (
      !scope ||
      this.busy() ||
      (employee
        ? !this.access.canManageEmployee(employee) || !this.changed()
        : !this.access.canViewEmployees())
    )
      return;
    const { role, branch, gender, ...details } = this.details();
    const controls = this.form.controls;
    this.form.markAllAsTouched();
    if (this.showTerminal() && !this.terminalOptions().some(({ value }) => value === branch)) {
      controls.branch.setErrors({ required: true });
    }
    const invalid =
      [
        controls.firstName,
        controls.lastName,
        controls.email,
        controls.phoneNumber,
        controls.role,
        controls.gender,
        controls.password,
      ].some((control) => control.invalid) ||
      (this.showTerminal() && controls.branch.invalid);
    if (invalid || !role) {
      focusInvalid(element);
      return;
    }
    this.busy.set(true);
    this.errors.set([]);
    try {
      let result: EmployeeRow;
      if (employee) {
        result = (await this.api.update(employee._id, this.patch())).data;
      } else {
        const body: CreateEmployee = { ...details, role };
        if (this.showTerminal()) body.branch = branch;
        if (gender) body.gender = gender;
        result = (await this.api.create(body)).data;
      }
      if (!this.destroyRef.destroyed && scope === this.access.scope()) this.saved.emit(result);
    } catch (error) {
      if (this.destroyRef.destroyed || scope !== this.access.scope()) return;
      const fields = { ...controls };
      // Account email cannot be changed, and a Terminal Manager has no terminal control.
      const { email, branch, ...editable } = fields;
      this.errors.set(
        applyServerValidation(
          error,
          {
            ...editable,
            ...(!employee && { email }),
            ...(this.showTerminal() && { branch }),
          },
          {
            'This email is already registered': { field: 'email' },
            'This email is already registered for this business': { field: 'email' },
            'This phone number is already registered for this business': { field: 'phoneNumber' },
            'Branch already exists': {
              field: 'branch',
              text: 'This terminal already has a Terminal Manager.',
            },
            'Branch is required for this role': {
              field: 'branch',
              text: 'Select a terminal for this role.',
            },
          },
        ),
      );
      if (!this.errors().length) requestAnimationFrame(() => focusInvalid(element));
      if (error instanceof HttpErrorResponse && error.status === 403)
        void this.session.loadContext();
    } finally {
      this.busy.set(false);
    }
  }
}
