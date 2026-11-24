import { existsSync, readFileSync, writeFileSync } from 'node:fs';

function publicAddress(key, originOnly = false) {
  const value = process.env[key]?.trim();
  if (!value) return '';
  const relative = !originOnly && /^\/(?!\/)/.test(value);
  const url = new URL(value, relative ? 'https://relative.invalid' : undefined);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    value.includes('\\') ||
    (originOnly && url.pathname !== '/')
  ) {
    throw new Error(`Invalid frontend setting: ${key}`);
  }
  return originOnly ? url.origin : (relative ? url.pathname : url.href).replace(/\/+$/, '');
}

const config = {
  apiBaseUrl: publicAddress('API_BASE_URL'),
  publicBookingOrigin: publicAddress('PUBLIC_BOOKING_ORIGIN', true),
};
const target = new URL('../src/environments/public-config.generated.ts', import.meta.url);
const source = `export const publicConfig = ${JSON.stringify(config, null, 2)};\n`;
if (!existsSync(target) || readFileSync(target, 'utf8') !== source) writeFileSync(target, source);
