import { HttpErrorResponse } from '@angular/common/http';
export function errorMessages(error: unknown): string[] {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return ['Unable to connect. Check your connection and try again.'];
    const body: unknown = error.error;
    if (body && typeof body === 'object' && 'message' in body) {
      const message = body.message;
      if (typeof message === 'string') return [message];
      if (
        Array.isArray(message) &&
        message.every((item): item is string => typeof item === 'string')
      )
        return message;
    }
    return [
      error.status === 429
        ? 'Too many attempts. Please wait a moment before trying again.'
        : `The request could not be completed (${error.status}). Please try again.`,
    ];
  }
  return [
    error instanceof Error
      ? error.message
      : 'The request could not be completed. Please try again.',
  ];
}
