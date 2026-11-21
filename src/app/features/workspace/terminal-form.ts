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
import { HttpErrorResponse } from '@angular/common/http';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { Session } from '../../core/auth/session';
import { AddressFields, addressForm } from '../../shared/forms/address-fields';
import { Field } from '../../shared/forms/field';
import { applyServerValidation } from '../../shared/forms/server-validation';
import { focusInvalid, requiredText } from '../../shared/forms/validators';
import { Button } from '../../shared/ui/button';
import { Errors } from '../../shared/ui/feedback';
import { ManagementDialog } from '../../shared/ui/management-dialog';
import { addressPayload, savedAddressValue } from '../../shared/utilities/nigerian-address';
import { nigerianPhone, normalizeNigerianPhone } from '../../shared/utilities/phone';
import { Branch, CreateBranch, UpdateBranch, WorkspaceData } from './workspace-data';

const addressFields = ['street', 'city', 'stateCode'] as const;

@Component({
  selector: 'app-terminal-form',
  imports: [AddressFields, Button, Errors, Field, ManagementDialog, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './terminal-form.html',
})
export class TerminalForm implements OnInit {
  private readonly api = inject(WorkspaceData);
  private readonly session = inject(Session);
  private readonly destroyRef = inject(DestroyRef);
  readonly access = inject(WorkspaceAccess);
  readonly terminal = input<Branch>();
  readonly quickCreate = input(false);
  readonly trigger = input<HTMLElement>();
  readonly saved = output<Branch>();
  readonly dismissed = output<void>();
  readonly busy = signal(false);
  readonly errors = signal<string[]>([]);
  readonly form = inject(NonNullableFormBuilder).group({
    name: ['', requiredText(120)],
    phoneNumber: ['', [Validators.required, nigerianPhone]],
    address: addressForm(),
  });
  private readonly valueChanges = toSignal(this.form.valueChanges);
  private readonly original = signal(this.form.getRawValue());
  readonly changes = computed(() => {
    this.valueChanges();
    const value = this.form.getRawValue();
    const original = this.original();
    return {
      name: value.name.trim() !== original.name.trim(),
      phoneNumber:
        normalizeNigerianPhone(value.phoneNumber) !== normalizeNigerianPhone(original.phoneNumber),
      address: addressFields.some(
        (key) => value.address[key].trim() !== original.address[key].trim(),
      ),
    };
  });
  readonly changed = computed(() => Object.values(this.changes()).some(Boolean));

  ngOnInit() {
    const terminal = this.terminal();
    if (!terminal) return;
    this.form.reset({
      name: terminal.name,
      phoneNumber: terminal.phoneNumber ?? '',
      address: savedAddressValue(terminal.address),
    });
    this.original.set(this.form.getRawValue());
  }

  async submit(element: HTMLFormElement) {
    const terminal = this.terminal();
    const scope = this.access.scope();
    if (
      !scope ||
      this.busy() ||
      (terminal
        ? !this.access.canEditTerminal(terminal._id) || !this.changed()
        : !this.access.canCreateTerminal())
    )
      return;
    const changes = this.changes();
    const controls = this.form.controls;
    this.form.markAllAsTouched();
    if (
      (!terminal && this.form.invalid) ||
      controls.name.invalid ||
      controls.phoneNumber.invalid ||
      (changes.address && controls.address.invalid)
    ) {
      focusInvalid(element);
      return;
    }
    this.busy.set(true);
    this.errors.set([]);
    try {
      const value = this.form.getRawValue();
      const name = value.name.trim();
      const phoneNumber = normalizeNigerianPhone(value.phoneNumber);
      let result: Branch | null;
      if (terminal) {
        const body: UpdateBranch = {};
        if (changes.name) body.name = name;
        if (changes.phoneNumber) body.phoneNumber = phoneNumber;
        if (changes.address) {
          // The branch API replaces the whole nested address. Preserve untouched fields using the latest copy.
          const { data: latest } = await this.api.branch(terminal._id);
          if (this.destroyRef.destroyed || scope !== this.access.scope()) return;
          if (!latest)
            throw new Error('This terminal is no longer available. Reload the directory.');
          const merged = savedAddressValue(latest.address);
          const original = this.original().address;
          for (const field of addressFields) {
            const previous = original[field].trim();
            const next = value.address[field].trim();
            if (next === previous) continue;
            const current = merged[field].trim();
            if (current !== previous && current !== next) {
              throw new Error(
                'The terminal address changed while you were editing. Reopen the form to review the latest address.',
              );
            }
            merged[field] = next;
          }
          body.address = addressPayload(merged);
        }
        result = (await this.api.updateBranch(terminal._id, body)).data;
      } else {
        const body: CreateBranch = {
          name,
          phoneNumber,
          address: addressPayload(value.address),
        };
        result = (await this.api.createBranch(body)).data;
      }
      if (this.destroyRef.destroyed || scope !== this.access.scope()) return;
      if (!result)
        throw new Error(
          'This terminal is no longer available. Close this form and reload the directory.',
        );
      this.saved.emit(result);
    } catch (error) {
      if (this.destroyRef.destroyed || scope !== this.access.scope()) return;
      this.errors.set(
        applyServerValidation(
          error,
          {
            name: controls.name,
            phoneNumber: controls.phoneNumber,
            'address.street': controls.address.controls.street,
            'address.city': controls.address.controls.city,
            'address.state': controls.address.controls.stateCode,
            'address.stateCode': controls.address.controls.stateCode,
          },
          {
            'Address.select a Nigerian state or FCT and its matching state code.': {
              field: 'address.stateCode',
              text: 'Select a Nigerian state or FCT.',
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
