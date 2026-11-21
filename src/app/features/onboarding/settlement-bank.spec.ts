import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Session } from '../../core/auth/session';
import { Business, Employee } from '../../core/http/api.models';
import { authInterceptor } from '../../core/http/auth.interceptor';
import { AccountProfile } from '../workspace/account-profile';
import { BusinessProfile } from '../workspace/business-profile';
import { WorkspaceData } from '../workspace/workspace-data';
import { CompanyProfile } from './company-profile';

const business: Business = {
  _id: 'business',
  name: 'Test Transport',
  slug: 'test-transport',
  email: 'test@example.test',
  contactPhoneNumber: '+2348012345678',
  businessType: 'TRANSPORTATION',
  accountStatus: 'PENDING',
  registrationComplete: false,
  registrationStage: [],
  address: {
    street: '12 Allen Avenue',
    city: 'Ikeja',
    state: 'Lagos',
    stateCode: 'LA',
    country: 'Nigeria',
    countryCode: 'NG',
  },
};
const employee: Employee = {
  _id: 'employee',
  firstName: 'Test',
  lastName: 'Operator',
  email: 'test@example.test',
  phoneNumber: '+2348012345678',
  accountStatus: 'ACTIVE',
  role: 'ADMIN',
  signupVerified: true,
  business,
};
const account = {
  bankName: 'First Bank',
  bankCode: '001',
  accountNumber: '0123456789',
  accountName: 'Test Transport',
};
const envelope = <T>(data: T) => ({ success: true, message: 'OK', statusCode: 200, data });
const detailsUrl = environment.apiBaseUrl + '/business/bank-details';
const banksUrl = environment.apiBaseUrl + '/business/banks';
const resolveUrl = banksUrl + '/resolve';
const profileUrl = environment.apiBaseUrl + '/business/profile';

describe('Settlement bank integration', () => {
  let http: HttpTestingController;
  const currentEmployee = signal(employee);

  beforeEach(() => {
    currentEmployee.set(employee);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: WorkspaceData, useValue: { primaryBranch: async () => null } },
        {
          provide: Session,
          useValue: {
            business: signal(business),
            employee: currentEmployee,
            token: signal('test-token'),
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function control<T extends HTMLElement>(fixture: ComponentFixture<unknown>, id: string): T {
    return (fixture.nativeElement as HTMLElement).querySelector<T>(`#settlement-${id}`)!;
  }

  function enter(element: HTMLInputElement, value: string) {
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    TestBed.tick();
  }

  function chooseBank(fixture: ComponentFixture<CompanyProfile>, name: string) {
    control<HTMLButtonElement>(fixture, 'bank-code').click();
    TestBed.tick();
    const screen: HTMLElement = fixture.nativeElement;
    const option = [
      ...screen.querySelectorAll<HTMLElement>('#settlement-bank-dropdown [role="option"]'),
    ].find((item) => item.textContent.trim() === name);
    option!.click();
    TestBed.tick();
  }

  async function openProfile() {
    const fixture = TestBed.createComponent(CompanyProfile);
    TestBed.tick();
    const details = http.expectOne({ method: 'GET', url: detailsUrl });
    expect(details.request.headers.get('Authorization')).toBe('Bearer test-token');
    http.expectNone(banksUrl);
    details.flush(envelope(null));
    const banks = await vi.waitFor(() => {
      TestBed.tick();
      return http.expectOne({ method: 'GET', url: banksUrl });
    });
    banks.flush(
      envelope([
        { name: account.bankName, code: account.bankCode },
        { name: 'Other Bank', code: '002' },
      ]),
    );
    await fixture.whenStable();
    return fixture;
  }

  function enterAccount(fixture: ComponentFixture<CompanyProfile>) {
    chooseBank(fixture, account.bankName);
    enter(control<HTMLInputElement>(fixture, 'account-number'), account.accountNumber);
    return http.expectOne({ method: 'POST', url: resolveUrl });
  }

  function submitProfile(fixture: ComponentFixture<CompanyProfile>) {
    const form = (fixture.nativeElement as HTMLElement).querySelector('form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  it('filters the dropdown, resolves only complete inputs, and ignores superseded results', async () => {
    const fixture = await openProfile();
    const screen: HTMLElement = fixture.nativeElement;
    const bank = control<HTMLButtonElement>(fixture, 'bank-code');
    const number = control<HTMLInputElement>(fixture, 'account-number');
    const feedback = control<HTMLElement>(fixture, 'verification-feedback');
    expect(screen.querySelector('input[aria-label="Search banks"]')).toBeNull();
    bank.click();
    TestBed.tick();
    const search = screen.querySelector<HTMLInputElement>('input[aria-label="Search banks"]')!;
    expect(document.activeElement).toBe(search);
    expect(search.hasAttribute('aria-activedescendant')).toBe(false);
    expect(screen.querySelector('#settlement-bank-dropdown [data-active="true"]')).toBeNull();
    expect(screen.querySelector('#settlement-bank-dropdown [aria-selected="true"]')).toBeNull();
    enter(search, 'first');
    expect(bank.getAttribute('aria-expanded')).toBe('true');
    expect(
      [...screen.querySelectorAll('#settlement-bank-dropdown [role="option"]')].map((item) =>
        item.textContent.trim(),
      ),
    ).toEqual(['First Bank']);
    http.expectNone(banksUrl);
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    search.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
    TestBed.tick();
    expect(bank.textContent).toContain('First Bank');
    expect(bank.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(bank);
    enter(number, '012345678');
    http.expectNone(resolveUrl);
    submitProfile(fixture);
    http.expectNone(profileUrl);
    enter(number, account.accountNumber);
    const first = http.expectOne({ method: 'POST', url: resolveUrl });
    expect(first.request.body).toEqual({ accountNumber: '0123456789', bankCode: '001' });
    expect(fixture.nativeElement.textContent).toContain('Verifying account…');

    chooseBank(fixture, 'Other Bank');
    const second = http.expectOne(resolveUrl);
    second.flush(envelope({ ...account, bankCode: '002', accountName: 'Current account' }));
    first.flush(envelope(account));
    await fixture.whenStable();
    expect(feedback.textContent).toContain('Current account');
    expect(screen.querySelector('#settlement-account-name')).toBeNull();

    bank.click();
    TestBed.tick();
    const reopenedSearch = screen.querySelector<HTMLInputElement>(
      'input[aria-label="Search banks"]',
    )!;
    enter(reopenedSearch, 'otro');
    expect(screen.textContent).toContain('No banks match your search.');
    reopenedSearch.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    TestBed.tick();
    http.expectNone(resolveUrl);
    expect(feedback.textContent).toContain('Current account');
    expect(bank.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(bank);

    bank.click();
    TestBed.tick();
    number.focus();
    TestBed.tick();
    expect(bank.getAttribute('aria-expanded')).toBe('false');
  });

  it('offers a select-only state picker and writes the selected state code', async () => {
    const fixture = await openProfile();
    const state = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '#company-state',
    )!;
    const control = fixture.componentInstance.form.controls.address.controls.stateCode;
    control.setValue('');
    TestBed.tick();

    expect(state.readOnly).toBe(true);
    expect(state.value).toBe('');
    state.click();
    TestBed.tick();
    const list = document.getElementById(state.getAttribute('aria-controls')!)!;
    expect(list.hidden).toBe(false);
    expect(list.querySelector('input')).toBeNull();
    expect(list.querySelector('[role="option"]')?.textContent.trim()).toBe('Abia');
    expect(list.querySelector('[aria-selected="true"]')).toBeNull();

    state.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    state.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
    TestBed.tick();
    expect(state.value).toBe('Abia');
    expect(control.value).toBe('AB');
    expect(list.hidden).toBe(true);
  });

  it('accepts only ten account digits and preserves leading zeros', async () => {
    const fixture = await openProfile();
    const number = control<HTMLInputElement>(fixture, 'account-number');
    chooseBank(fixture, account.bankName);

    expect(number.maxLength).toBe(10);
    enter(number, '0a123-45');
    expect(number.value).toBe('012345');
    http.expectNone(resolveUrl);

    enter(number, account.accountNumber + '123');
    expect(number.value).toBe(account.accountNumber);
    const verification = http.expectOne({ method: 'POST', url: resolveUrl });
    expect(verification.request.body).toEqual({
      accountNumber: account.accountNumber,
      bankCode: account.bankCode,
    });
    verification.flush(envelope(account));
    await fixture.whenStable();
  });

  it('handles an unverifiable account and retries temporary provider errors', async () => {
    const fixture = await openProfile();
    enterAccount(fixture).flush(
      { message: 'Invalid account' },
      { status: 400, statusText: 'Bad Request' },
    );
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('This account could not be verified');
    submitProfile(fixture);
    http.expectNone(profileUrl);

    enter(control<HTMLInputElement>(fixture, 'account-number'), '0123456780');
    http.expectOne(resolveUrl).flush(null, { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable();
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    const retry = [...buttons].find((button) => button.textContent!.includes('Retry verification'));
    expect(retry).toBeDefined();
    retry!.click();
    TestBed.tick();
    http.expectOne(resolveUrl).flush(envelope({ ...account, accountNumber: '0123456780' }));
    await fixture.whenStable();
    expect(control<HTMLElement>(fixture, 'verification-feedback').textContent).toContain(
      account.accountName,
    );
  });

  it('saves just the bank code and number, then reloads the saved account on conflict', async () => {
    currentEmployee.set({ ...employee, role: 'OPERATIONS_MANAGER' });
    const fixture = await openProfile();
    enterAccount(fixture).flush(envelope(account));
    await fixture.whenStable();

    fixture.componentInstance.logo.set(new File(['logo'], 'logo.png', { type: 'image/png' }));
    submitProfile(fixture);
    const save = http.expectOne({ method: 'PATCH', url: profileUrl });
    const formData = save.request.body as FormData;
    expect(formData.get('bankDetails')).toBe('{"accountNumber":"0123456789","bankCode":"001"}');
    expect(formData.get('logo')).toBeInstanceOf(File);
    expect(formData.get('name')).toBe(business.name);
    save.flush(null, { status: 409, statusText: 'Conflict' });

    const reload = await vi.waitFor(() => {
      TestBed.tick();
      return http.expectOne(detailsUrl);
    });
    reload.flush(envelope({ ...account, accountName: 'Already saved' }));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain(
      'A settlement account is already configured',
    );
    expect(fixture.nativeElement.textContent).toContain('Already saved');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('#settlement-bank-code'),
    ).toBeNull();
    http.expectNone(banksUrl);

    submitProfile(fixture);
    const retry = http.expectOne(profileUrl);
    expect((retry.request.body as FormData).has('bankDetails')).toBe(false);
    retry.flush(envelope(business));
    await fixture.whenStable();
  });

  it('requires a state and a verified settlement account before saving without a logo', async () => {
    const fixture = await openProfile();
    const profile: HTMLElement = fixture.nativeElement;
    expect(profile.querySelector('#business-type')).toBeNull();
    expect(profile.querySelector('app-address-fields')?.textContent).not.toContain('Country');
    const fields = profile.querySelector('app-settlement-bank-fields')!;
    const logo = profile.querySelector('app-file-upload')!;
    expect(fields.compareDocumentPosition(logo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const state = fixture.componentInstance.form.controls.address.controls.stateCode;
    state.setValue('');
    submitProfile(fixture);
    http.expectNone(profileUrl);

    state.setValue('LA');
    submitProfile(fixture);
    http.expectNone(profileUrl);
    TestBed.tick();
    expect(fields.textContent).toContain('Select your bank.');

    const resolve = enterAccount(fixture);
    submitProfile(fixture);
    http.expectNone(profileUrl);
    resolve.flush(envelope(account));
    await fixture.whenStable();

    submitProfile(fixture);
    const save = http.expectOne(profileUrl);
    const payload = save.request.body as FormData;
    expect(payload.has('businessType')).toBe(false);
    expect(payload.get('bankDetails')).toBe('{"accountNumber":"0123456789","bankCode":"001"}');
    expect(payload.has('logo')).toBe(false);
    save.flush(envelope(business));
    await fixture.whenStable();
  });

  it.each([account, null])(
    'shows the saved or pending settlement state in Business Profile for an admin (%j)',
    async (details) => {
      const fixture = TestBed.createComponent(BusinessProfile);
      const accountPage = TestBed.createComponent(AccountProfile);
      TestBed.tick();
      expect(fixture.nativeElement.textContent).toContain('Loading settlement account…');
      http
        .expectOne(detailsUrl)
        .flush(envelope(details && { ...details, paystackSubaccountCode: 'ACCT_hidden' }));
      await fixture.whenStable();
      expect(accountPage.nativeElement.textContent).not.toContain('Settlement Account');
      const content = fixture.nativeElement.textContent;
      expect(content).toContain('Settlement Account');
      if (details) {
        expect(content).toContain(details.bankName);
        expect(content).toContain(details.accountNumber);
        expect(content).toContain(details.accountName);
        expect(content).not.toContain('ACCT_hidden');
      } else {
        expect(content).toContain('Not configured');
      }
    },
  );

  it('does not load saved settlement details for an operations manager', async () => {
    currentEmployee.set({ ...employee, role: 'OPERATIONS_MANAGER' });
    const profile = TestBed.createComponent(BusinessProfile);
    await profile.whenStable();
    expect(profile.nativeElement.textContent).not.toContain('Settlement Account');
    http.expectNone(detailsUrl);
  });

  it.each(['BRANCH_MANAGER', 'BOOKING_AGENT', 'ACCOUNTANT', 'DRIVER'] as const)(
    'hides the settlement controls and makes no bank calls for %s',
    async (role) => {
      currentEmployee.set({ ...employee, role });
      const profile = TestBed.createComponent(CompanyProfile);
      const businessProfile = TestBed.createComponent(BusinessProfile);
      await profile.whenStable();
      await businessProfile.whenStable();
      expect(profile.nativeElement.textContent).not.toContain('Settlement Bank Account');
      expect(businessProfile.nativeElement.textContent).not.toContain('Settlement Account');
      http.expectNone(detailsUrl);
      http.expectNone(banksUrl);
      http.expectNone(resolveUrl);
    },
  );
});
