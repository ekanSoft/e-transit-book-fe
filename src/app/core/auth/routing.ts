import { Business, RegistrationStage } from '../http/api.models';

export const registrationStages: readonly RegistrationStage[] = [
  'PROFILE',
  'BRANCH',
  'VERIFICATION',
];
export function firstIncompleteStage(business: Business) {
  return registrationStages.find((stage) => !business.registrationStage?.includes(stage));
}
export function registrationConflict(business: Business): boolean {
  return (
    typeof business.registrationComplete !== 'boolean' ||
    business.registrationComplete !== !firstIncompleteStage(business) ||
    (business.accountStatus === 'ACTIVE' && !business.registrationComplete)
  );
}
export function permitsWorkspaceRoute(destination: string, url: string) {
  const path = url.split(/[?#]/, 1)[0];
  if (destination === '/app/dashboard') return path === '/app' || path.startsWith('/app/');
  return path === destination;
}
export function isSignInRoute(url: string) {
  const [path] = url.split(/[?#]/, 1);
  return path === '/login' || path === '/auth/select-business' || path === '/auth/access-status';
}
export function businessDestination(business: Business): string {
  if (registrationConflict(business)) return '/pending-approval';
  if (business.accountStatus === 'ACTIVE') return '/app/dashboard';
  if (business.accountStatus === 'PENDING' && !business.registrationComplete) return '/onboarding';
  return '/pending-approval';
}
