import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Type, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import axe from 'axe-core';
import { environment } from '../environments/environment';
import { Session } from './core/auth/session';
import { Business, Employee } from './core/http/api.models';
import { SettlementBankApi } from './core/http/settlement-bank-api';
import { WorkspaceData } from './features/workspace/workspace-data';
import { BusinessProfile } from './features/workspace/business-profile';
import { AccountProfile } from './features/workspace/account-profile';
import { Login } from './features/auth/login';
import { Signup } from './features/auth/signup';
import { VerifySignup } from './features/auth/verify-signup';
import { ForgotPassword } from './features/auth/forgot-password';
import { ResetPassword } from './features/auth/reset-password';
import { SelectBusiness } from './features/auth/select-business';
import { CompanyProfile } from './features/onboarding/company-profile';
import { BusinessVerification } from './features/onboarding/business-verification';
import { PrimaryBranch } from './features/onboarding/primary-branch';
import { Onboarding } from './features/onboarding/onboarding';
import { AccountStatus } from './features/onboarding/account-status';
import { OperatorShell } from './core/layout/operator-shell/operator-shell';

const business: Business = {
  _id: 'test-business',
  name: 'Test Transport',
  slug: 'test-transport',
  email: 'test@example.test',
  contactPhoneNumber: '+2348012345678',
  businessType: 'TRANSPORTATION',
  accountStatus: 'PENDING',
  registrationComplete: false,
  registrationStage: [],
};
const employee: Employee = {
  _id: 'test-employee',
  firstName: 'Test',
  lastName: 'Operator',
  email: 'test@example.test',
  phoneNumber: '+2348012345678',
  role: 'ADMIN',
  accountStatus: 'ACTIVE',
  signupVerified: true,
  business,
};

describe('AXE structural accessibility of rendered Angular screens', () => {
  let fixture: ComponentFixture<unknown> | undefined;
  let wrapper: HTMLElement | undefined;
  beforeEach(() => {
    const queryParamMap = convertToParamMap({ token: 'test-link-token' });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WorkspaceData, useValue: { primaryBranch: async () => null } },
        {
          provide: SettlementBankApi,
          useValue: {
            savedDetails: async () => null,
            banks: async () => [{ name: 'Test Bank', code: '001' }],
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap },
            queryParamMap: of(queryParamMap),
          },
        },
        {
          provide: Session,
          useValue: {
            destination: signal('/app/dashboard'),
            authenticated: signal(true),
            token: signal('test-session'),
            switchEmail: signal(''),
            employee: signal(employee),
            business: signal(business),
            selection: signal(null),
            storageWarning: signal(false),
            contextError: signal([]),
            contextStatus: signal(0),
            logout: vi.fn(),
          },
        },
      ],
    });
  });
  afterEach(() => {
    fixture?.destroy();
    wrapper?.remove();
    fixture = undefined;
    wrapper = undefined;
  });
  const screens: { component: Type<unknown>; fragment?: boolean }[] = [
    { component: Login, fragment: true },
    { component: Signup, fragment: true },
    { component: VerifySignup, fragment: true },
    { component: ForgotPassword, fragment: true },
    { component: ResetPassword, fragment: true },
    { component: SelectBusiness, fragment: true },
    { component: CompanyProfile, fragment: true },
    { component: BusinessVerification, fragment: true },
    { component: PrimaryBranch, fragment: true },
    { component: Onboarding, fragment: true },
    { component: BusinessProfile, fragment: true },
    { component: AccountProfile, fragment: true },
    { component: AccountStatus, fragment: true },
    { component: OperatorShell },
  ];
  for (const { component, fragment } of screens)
    it(`${component.name} has no detectable WCAG A/AA structural violations`, async () => {
      fixture = TestBed.createComponent(component);
      await fixture.whenStable();
      if (component === VerifySignup) {
        TestBed.inject(HttpTestingController)
          .expectOne(environment.apiBaseUrl + '/auth/verify-signup')
          .flush(
            { message: 'Verification link expired' },
            { status: 400, statusText: 'Bad Request' },
          );
        await vi.waitFor(() =>
          expect(fixture?.nativeElement.textContent).toContain('Verification link expired'),
        );
      }
      wrapper = document.createElement(fragment ? 'main' : 'div');
      wrapper.append(fixture.nativeElement as HTMLElement);
      document.body.append(wrapper);
      const results = await axe.run(wrapper, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
        // JSDOM has no layout/paint engine. Contrast and responsive layout require browser checks.
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(
        results.violations.map((violation) => ({
          id: violation.id,
          nodes: violation.nodes.map((node) => node.html),
        })),
      ).toEqual([]);
    }, 15_000);
});
