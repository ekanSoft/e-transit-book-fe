import { AbstractControl, ValidationErrors, Validators } from '@angular/forms';
export const requiredText = (max: number) => [
  Validators.required,
  Validators.maxLength(max),
  (control: AbstractControl<string>): ValidationErrors | null =>
    control.value.trim() ? null : { whitespace: true },
];
export const emailValidators = [Validators.required, Validators.email, Validators.maxLength(150)];
export const passwordValidators = [
  Validators.required,
  Validators.minLength(8),
  Validators.maxLength(100),
];
export function focusInvalid(form: HTMLFormElement) {
  form
    .querySelector<HTMLElement>('input.ng-invalid, select.ng-invalid, button.ng-invalid')
    ?.focus();
}
