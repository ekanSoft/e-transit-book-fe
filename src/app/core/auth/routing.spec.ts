import { Business } from '../http/api.models';
import { businessDestination, firstIncompleteStage, registrationConflict } from './routing';
const business: Business = {
  _id: 'business-1',
  name: 'Test Transport',
  slug: 'test-transport',
  email: 'test@example.test',
  contactPhoneNumber: '+2348012345678',
  businessType: 'TRANSPORTATION',
  accountStatus: 'PENDING',
  registrationComplete: false,
  registrationStage: [],
};
describe('Business access and registration resume', () => {
  it('resumes the first missing stage even if stages arrive out of order', () => {
    expect(firstIncompleteStage({ ...business, registrationStage: ['BRANCH', 'PROFILE'] })).toBe(
      'VERIFICATION',
    );
    expect(firstIncompleteStage({ ...business, registrationStage: ['VERIFICATION'] })).toBe(
      'PROFILE',
    );
    expect(
      firstIncompleteStage({
        ...business,
        registrationStage: ['PROFILE', 'VERIFICATION', 'BRANCH'],
      }),
    ).toBeUndefined();
  });
  it('routes incomplete pending businesses to onboarding', () =>
    expect(businessDestination(business)).toBe('/onboarding'));
  it('routes completed pending businesses to approval', () =>
    expect(
      businessDestination({
        ...business,
        registrationComplete: true,
        registrationStage: ['BRANCH', 'PROFILE', 'VERIFICATION'],
      }),
    ).toBe('/pending-approval'));
  it('never lets an active business edit registration, even with stale stage data', () =>
    expect(businessDestination({ ...business, accountStatus: 'ACTIVE' })).toBe(
      '/pending-approval',
    ));
  it('opens the active operations dashboard after all three saves', () => {
    expect(
      businessDestination({
        ...business,
        accountStatus: 'ACTIVE',
        registrationComplete: true,
        registrationStage: ['VERIFICATION', 'PROFILE', 'BRANCH'],
      }),
    ).toBe('/app/dashboard');
  });
  it('resumes profile, branch, and verification in user-facing order', () => {
    expect(firstIncompleteStage(business)).toBe('PROFILE');
    expect(firstIncompleteStage({ ...business, registrationStage: ['PROFILE'] })).toBe('BRANCH');
    expect(firstIncompleteStage({ ...business, registrationStage: ['PROFILE', 'BRANCH'] })).toBe(
      'VERIFICATION',
    );
  });
  it('withholds access when the stored completion flag disagrees with the saved stages', () => {
    expect(registrationConflict({ ...business, registrationComplete: true })).toBe(true);
    expect(
      registrationConflict({
        ...business,
        registrationStage: ['BRANCH', 'VERIFICATION', 'PROFILE'],
      }),
    ).toBe(true);
  });
  for (const accountStatus of ['SUSPENDED', 'INACTIVE', 'REJECTED'] as const)
    it(`prevents ${accountStatus.toLowerCase()} businesses from entering onboarding`, () =>
      expect(businessDestination({ ...business, accountStatus })).toBe('/pending-approval'));
});
