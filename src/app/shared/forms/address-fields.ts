import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Field } from './field';
import { stateOptions } from '../utilities/nigerian-address';
export function addressForm() {
  return new FormGroup({
    street: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(4), Validators.maxLength(100)],
    }),
    city: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(75)],
    }),
    stateCode: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });
}
@Component({
  selector: 'app-address-fields',
  imports: [Field],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <div class="form-grid">
    <app-field
      class="full-width"
      [id]="prefix() + '-street'"
      label="Street address"
      [control]="group().controls.street"
      autocomplete="street-address"
      placeholder="e.g. 12 Allen Avenue"
      [maxLength]="100"
    />
    <app-field
      [id]="prefix() + '-city'"
      label="City or town"
      [control]="group().controls.city"
      autocomplete="address-level2"
      [maxLength]="75"
    />
    <app-field
      [id]="prefix() + '-state'"
      label="State"
      [control]="group().controls.stateCode"
      [options]="states"
      placeholder="Select your state"
      autocomplete="address-level1"
    />
    <div>
      <label style="font-weight: 700">Country</label>
      Nigeria
    </div>
  </div>`,
})
export class AddressFields {
  readonly states = stateOptions;
  readonly group = input.required<ReturnType<typeof addressForm>>();
  readonly prefix = input.required<string>();
}
