import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from '../../core/http/auth.interceptor';
import { Session } from '../../core/auth/session';
import { environment } from '../../../environments/environment';
import { Attempts, holdActive, securePaymentUrl, amount, type Attempt } from './attempts';
import { passengerForm, passengerPayload } from './passenger-form';
import { PublicStore } from './public-store';

describe('public checkout boundaries', () => {
  it('keeps route reads anonymous, ignores a late prior tenant and keeps protected sessions on public errors', async () => {
    TestBed.configureTestingModule({
      providers: [
        PublicStore,
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: Session,
          useFactory: () => {
            throw Error('Public requests must bypass employee auth');
          },
        },
      ],
    });
    const state = TestBed.inject(PublicStore),
      http = TestBed.inject(HttpTestingController);
    const first = state.open('ONE'),
      second = state.open('two');
    const older = http.expectOne(environment.apiBaseUrl + '/public/operators/one/routes'),
      current = http.expectOne(environment.apiBaseUrl + '/public/operators/two/routes');
    expect(current.request.headers.has('Authorization')).toBe(false);
    current.flush({ data: { organization: { name: 'Two', slug: 'two' }, routes: [] } });
    await second;
    older.flush({ data: { organization: { name: 'One', slug: 'one' }, routes: [] } });
    await first;
    expect(state.profile()?.organization.slug).toBe('two');
    const denied = state.open('inactive');
    http
      .expectOne(environment.apiBaseUrl + '/public/operators/inactive/routes')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    await denied;
    expect(state.error()).toBe(true);
    expect(state.profile()).toBeNull();
    http.verify();
  });
  it('accepts only secure checkout URLs on the provider origin', () => {
    expect(securePaymentUrl('https://checkout.paystack.com/code')).toBe(
      'https://checkout.paystack.com/code',
    );
    for (const url of [
      'javascript:alert(1)',
      'https://checkout.paystack.com.evil.test/code',
      'http://checkout.paystack.com/code',
      'https://x@checkout.paystack.com/code',
      'https://checkout.paystack.com:8443/code',
    ])
      expect(securePaymentUrl(url)).toBeNull();
  });
  it('recovers one quoted attempt per slug and keeps initialization locked while pending', () => {
    const a: Attempt = {
      reference: 'etb-test',
      currency: 'NGN',
      holdExpiresAt: '2027-03-01T10:00:00Z',
      departureTime: '2027-03-01T12:00:00Z',
      authorizationUrl: 'https://checkout.paystack.com/code',
      trip: 'one',
      seatNumber: '1A',
      journey: 'East to West',
      fees: {
        fareKobo: 1000000,
        platformFeeKobo: 5000,
        processingFeeKobo: 25457,
        totalKobo: 1030457,
      },
    };
    const state = new Attempts();
    expect(state.start('one')).toBe(true);
    expect(state.start('one')).toBe(false);
    state.set('one', a);
    state.finish('one');
    expect(new Attempts().get('one')).toEqual(a);
    expect(state.start('one')).toBe(false);
    expect(state.get('two')).toBeNull();
    expect(amount(a.fees.totalKobo)).toContain('10,304.57');
    state.set('one', null);
  });
  it('allows a new checkout after the seat hold expires', () => {
    const a: Attempt = {
      reference: 'etb-expired',
      currency: 'NGN',
      holdExpiresAt: '2020-01-01T10:00:00Z',
      departureTime: '2020-01-01T12:00:00Z',
      authorizationUrl: 'https://checkout.paystack.com/code',
      trip: 'one',
      seatNumber: '1A',
      journey: 'East to West',
      fees: {
        fareKobo: 1000000,
        platformFeeKobo: 5000,
        processingFeeKobo: 25457,
        totalKobo: 1030457,
      },
    };
    const state = new Attempts();
    state.set('one', a);
    expect(holdActive(a)).toBe(false);
    expect(state.start('one')).toBe(true);
    state.finish('one');
  });
  it('validates both Nigerian phones and omits empty optional fields from the DTO', () => {
    const form = passengerForm();
    expect(form.valid).toBe(false);
    form.patchValue({
      passenger: {
        firstName: ' Ada ',
        lastName: 'Okafor',
        phoneNumber: '08031234567',
        email: 'ada@example.test',
      },
      nextOfKin: { firstName: 'Ken', lastName: 'Okafor', phoneNumber: '123' },
    });
    expect(form.valid).toBe(false);
    form.controls.nextOfKin.controls.phoneNumber.setValue('2348041234567');
    expect(form.valid).toBe(true);
    const dto = passengerPayload(form);
    expect(dto.passenger.firstName).toBe('Ada');
    expect(dto.nextOfKin.phoneNumber).toBe('+2348041234567');
    expect(dto).not.toHaveProperty('bloodgroup');
    expect(dto.nextOfKin).not.toHaveProperty('email');
  });
});
