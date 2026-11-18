import { HttpErrorResponse } from '@angular/common/http';
import { errorMessages } from './errors';
describe('Backend errors', () => {
  it('uses terminal wording for assignment errors and preserves names in other messages', () => {
    const messages = ['Your account is not assigned to a branch', 'Contact East Branch Travel'];
    expect(
      errorMessages(new HttpErrorResponse({ status: 403, error: { message: messages } })),
    ).toEqual(['Your account is not assigned to a terminal.', 'Contact East Branch Travel']);
  });
  it('preserves useful conflict messages', () =>
    expect(
      errorMessages(
        new HttpErrorResponse({
          status: 409,
          error: { message: 'Registration number already exists' },
        }),
      ),
    ).toEqual(['Registration number already exists']));
  it('preserves validation arrays', () =>
    expect(
      errorMessages(
        new HttpErrorResponse({
          status: 400,
          error: { message: ['Email must be an email', 'Name is required'] },
        }),
      ),
    ).toEqual(['Email must be an email', 'Name is required']));
  it('provides a recoverable network error', () =>
    expect(errorMessages(new HttpErrorResponse({ status: 0 }))[0]).toContain(
      'Check your connection',
    ));
});
