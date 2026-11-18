import { HttpErrorResponse } from '@angular/common/http';
import { errorMessages } from './errors';
describe('Backend errors', () => {
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
