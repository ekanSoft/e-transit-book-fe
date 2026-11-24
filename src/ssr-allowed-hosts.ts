/**
 * Hostnames permitted for Angular SSR Host-header validation.
 * Keep in sync with `angular.json` → `security.allowedHosts`.
 */
export const SSR_ALLOWED_HOSTS = [
  'etransitbook.com',
  'www.etransitbook.com',
  'app.etransitbook.com',
  'etransitbook.netlify.app',
] as const;

export function mergeSsrAllowedHosts(netlifyHosts: string[]): string[] {
  return [...new Set([...SSR_ALLOWED_HOSTS, ...netlifyHosts])];
}