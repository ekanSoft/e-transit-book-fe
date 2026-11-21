import { HttpErrorResponse } from '@angular/common/http';
import type { AbstractControl } from '@angular/forms';
import { errorMessages } from '../../core/http/errors';

export function applyServerValidation(
  error: unknown,
  controls: Record<string, AbstractControl>,
  aliases: Record<string, { field: string; text?: string }> = {},
): string[] {
  const messages = errorMessages(error);
  if (!(error instanceof HttpErrorResponse) || ![400, 409, 422].includes(error.status)) {
    return messages;
  }
  const remaining: string[] = [];
  for (const message of messages) {
    const alias = aliases[message];
    const key =
      alias?.field ??
      Object.keys(controls).find((name) =>
        message.toLowerCase().startsWith(name.toLowerCase() + ' '),
      );
    const control = key && controls[key];
    if (!control) {
      remaining.push(message);
      continue;
    }
    const existing: unknown = control.getError('server');
    const text = alias?.text ?? message;
    control.setErrors({
      ...control.errors,
      server: typeof existing === 'string' ? existing + ' ' + text : text,
    });
    control.markAsTouched();
  }
  return remaining;
}
