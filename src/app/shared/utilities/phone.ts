import { AbstractControl, ValidationErrors } from '@angular/forms';
export function normalizeNigerianPhone(value: string): string {
  const compact = value.trim().replace(/[\s()\-]/g, '');
  if (/^0\d{10}$/.test(compact)) return '+234' + compact.slice(1);
  if (/^234\d{10}$/.test(compact)) return '+' + compact;
  return compact;
}
export function nigerianPhone(control: AbstractControl<string>): ValidationErrors | null {
  return !control.value || /^\+234[789]\d{9}$/.test(normalizeNigerianPhone(control.value))
    ? null
    : { phone: true };
}
