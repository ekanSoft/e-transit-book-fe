import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from '../../core/http/auth.interceptor';
import { Session } from '../../core/auth/session';
import { environment } from '../../../environments/environment';
import { Attempts, holdActive, securePaymentUrl, amount, type Attempt } from './attempts';
import { passengerForm, passengerPayload } from './passenger-form';
import { PublicStore } from './public-store';
import { Checkout } from './checkout';
import { PaymentReturn } from './payment-return';

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
  const a: Attempt = {
    reference: 'etb-test',
    currency: 'NGN',
    holdExpiresAt: new Date(Date.now() + 900_000).toISOString(),
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
  function setupRoute(params: Record<string, string>) {
    const paramMap = convertToParamMap(params);
    const navigate = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        PublicStore,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate } },
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(paramMap), snapshot: { queryParamMap: paramMap } },
        },
      ],
    });
    TestBed.inject(PublicStore).slug.set('one');
    new Attempts().set('one', a);
    return { navigate, http: TestBed.inject(HttpTestingController) };
  }
  afterEach(() => sessionStorage.removeItem('etb.public.one'));

  it('reviews the server quote without holding, then sends one payment request with that total', async () => {
    const { http } = setupRoute({ trip: a.trip, seat: a.seatNumber });
    sessionStorage.removeItem('etb.public.one');
    const checkout = TestBed.runInInjectionContext(() => new Checkout());
    http.expectOne(environment.apiBaseUrl + '/public/operators/one/trips/one').flush({
      data: {
        _id: a.trip,
        route: { originBranch: null, destinationBranch: null },
        departureTime: a.departureTime,
        seats: [{ seatNumber: a.seatNumber, fare: 10000, available: true, fees: a.fees }],
      },
    });
    await vi.waitFor(() => expect(checkout.seat()?.fees).toEqual(a.fees));
    checkout.form.patchValue({
      passenger: {
        firstName: 'Ada',
        lastName: 'Okafor',
        phoneNumber: '08031234567',
        email: 'ada@example.test',
      },
      nextOfKin: { firstName: 'Ken', lastName: 'Okafor', phoneNumber: '08041234567' },
    });
    checkout.review();
    expect(checkout.reviewing()).toBe(true);
    http.verify();
    const payment = checkout.pay();
    await checkout.pay();
    const request = http.expectOne(environment.apiBaseUrl + '/public/operators/one/checkout');
    expect(request.request.body.expectedTotalKobo).toBe(a.fees.totalKobo);
    request.flush({}, { status: 409, statusText: 'Conflict' });
    await payment;
    expect(checkout.attempt()).toBeNull();
    http.verify();
  });

  it('restores a matching quote after reload without requesting the held seat again', () => {
    const { navigate, http } = setupRoute({
      reference: a.reference,
      trip: a.trip,
      seat: a.seatNumber,
    });
    const checkout = TestBed.runInInjectionContext(() => new Checkout());
    expect(checkout.attempt()).toEqual(a);
    expect(navigate).not.toHaveBeenCalled();
    http.verify();
  });
  it('checks an older URL independently and preserves the newer quote', async () => {
    const { navigate, http } = setupRoute({ reference: 'etb-old' });
    TestBed.runInInjectionContext(() => new Checkout());
    expect(navigate).toHaveBeenCalledWith(['/public', 'one', 'payment', 'return'], {
      queryParams: { reference: 'etb-old' },
      replaceUrl: true,
    });
    const page = TestBed.runInInjectionContext(() => new PaymentReturn());
    http
      .expectOne(environment.apiBaseUrl + '/public/operators/one/checkout/etb-old/verify')
      .flush({ data: { status: 'EXPIRED', paymentReview: true } });
    await vi.waitFor(() => expect(page.result()?.paymentReview).toBe(true));
    expect(new Attempts().get('one')).toEqual(a);
    http.verify();
  });
  it('keeps a pending quote and clears it once its own reference is confirmed', async () => {
    const { http } = setupRoute({ trxref: a.reference });
    const page = TestBed.runInInjectionContext(() => new PaymentReturn());
    const url =
      environment.apiBaseUrl + '/public/operators/one/checkout/' + a.reference + '/verify';
    http.expectOne(url).flush({ data: { status: 'LOCKED', paymentReview: false } });
    await vi.waitFor(() => expect(page.result()?.status).toBe('LOCKED'));
    expect(new Attempts().get('one')).toEqual(a);
    const check = page.verify();
    http.expectOne(url).flush({ data: { status: 'CONFIRMED', paymentReview: false } });
    await check;
    expect(new Attempts().get('one')).toBeNull();
    http.verify();
  });
  it('makes no verification request when the return URL lacks a reference', () => {
    const { http } = setupRoute({});
    const page = TestBed.runInInjectionContext(() => new PaymentReturn());
    expect(page.error()).toContain('reference is missing');
    expect(new Attempts().get('one')).toEqual(a);
    http.verify();
  });
  it('keeps one quoted attempt per slug in this tab and locks initialization while pending', () => {
    const state = new Attempts();
    expect(state.start('one')).toBe(true);
    expect(state.start('one')).toBe(false);
    state.set('one', a);
    state.finish('one');
    expect(state.get('one')).toEqual(a);
    expect(new Attempts().get('one')).toEqual(a);
    expect(state.start('one')).toBe(false);
    expect(state.get('two')).toBeNull();
    expect(amount(a.fees.totalKobo)).toContain('10,304.57');
    state.set('one', null);
    expect(new Attempts().get('one')).toBeNull();
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
    state.set('one', null);
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
