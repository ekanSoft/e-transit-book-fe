import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { Field } from '../../shared/forms/field';
import { applyServerValidation } from '../../shared/forms/server-validation';
import { focusInvalid, requiredText } from '../../shared/forms/validators';
import { Button } from '../../shared/ui/button';
import { Errors } from '../../shared/ui/feedback';
import { ManagementDialog } from '../../shared/ui/management-dialog';
import { nigerianCustomerPhone, normalizeNigerianPhone } from '../../shared/utilities/phone';
import { CustomerApi, customerChanges, type Customer } from './customer-api';

@Component({
  selector: 'app-customer-form',
  imports: [Field, Button, Errors, ManagementDialog, ReactiveFormsModule],
  templateUrl: './customer-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerForm {
  private readonly api = inject(CustomerApi);
  private readonly access = inject(WorkspaceAccess);
  readonly customer = input<Customer>();
  readonly phone = input('');
  readonly trigger = input<HTMLElement>();
  readonly saved = output<Customer>();
  readonly duplicate = output<string>();
  readonly dismissed = output<void>();
  readonly busy = signal(false);
  readonly errors = signal<string[]>([]);
  readonly form = inject(FormBuilder).nonNullable.group({
    firstName: ['', requiredText(100)],
    lastName: ['', requiredText(100)],
    phoneNumber: ['', [Validators.required, nigerianCustomerPhone]],
    email: ['', [Validators.email, Validators.maxLength(150)]],
  });

  constructor() {
    effect(() => {
      const customer = this.customer();
      const phone = this.phone();
      const email = this.form.controls.email;
      email.setValidators(
        customer?.email
          ? [Validators.required, Validators.email, Validators.maxLength(150)]
          : [Validators.email, Validators.maxLength(150)],
      );
      this.form.reset({
        firstName: customer?.firstName ?? '',
        lastName: customer?.lastName ?? '',
        phoneNumber: normalizeNigerianPhone(customer?.phoneNumber ?? phone),
        email: customer?.email ?? '',
      });
    });
  }

  async save(element: HTMLFormElement) {
    const scope = this.access.scope();
    if (!scope || !this.access.canEditCustomers() || this.busy()) return;
    this.errors.set([]);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      focusInvalid(element);
      return;
    }
    const draft = this.form.getRawValue();
    const email = draft.email.trim().toLowerCase();
    const body = {
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      phoneNumber: normalizeNigerianPhone(draft.phoneNumber),
      ...(email ? { email } : {}),
    };
    const customer = this.customer();
    const changes = customer ? customerChanges(customer, body) : body;
    if (!Object.keys(changes).length) {
      this.dismissed.emit();
      return;
    }
    this.busy.set(true);
    try {
      const saved = customer
        ? await this.api.update(customer._id, changes)
        : await this.api.create(body);
      if (this.access.scope() === scope) this.saved.emit(saved);
    } catch (error) {
      if (this.access.scope() !== scope) return;
      if (!customer && this.phone() && error instanceof HttpErrorResponse && error.status === 409) {
        this.duplicate.emit(body.phoneNumber);
        return;
      }
      this.errors.set(applyServerValidation(error, this.form.controls));
    } finally {
      this.busy.set(false);
    }
  }
}
