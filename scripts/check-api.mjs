// Non-mutating contract smoke checks against the running API. No credentials are logged.
import assert from 'node:assert/strict';
const base = process.env.API_BASE_URL || 'http://localhost:4500/api/v1';
const paths = [
  ['POST', '/auth/signup', 400],
  ['POST', '/auth/login', 400],
  ['POST', '/auth/complete-login', 400],
  ['POST', '/auth/verify-signup', 400],
  ['POST', '/auth/resend-token', 400],
  ['POST', '/auth/initiate-password-reset', 400],
  ['POST', '/auth/reset-password', 400],
  ['GET', '/employees/me', 401],
  ['GET', '/business', 401],
  ['GET', '/branch', 401],
  ['GET', '/branch/000000000000000000000000', 401],
  ['POST', '/branch', 401],
  ['PATCH', '/branch/000000000000000000000000', 401],
  ['GET', '/employees', 401],
  ['POST', '/employees', 401],
  ['PATCH', '/employees/000000000000000000000000', 401],
  ['PATCH', '/employees/000000000000000000000000/toggle-status', 401],
  ['GET', '/trips', 401],
  ['GET', '/reports/dashboard', 401],
  ['GET', '/reports/sales', 401],
  ['PATCH', '/business/profile', 401],
  ['PATCH', '/business/verification', 401],
  ['PATCH', '/business/branch', 401],
];
for (const [method, path, expected] of paths) {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(method !== 'GET' ? { body: '{}' } : {}),
  });
  const body = await response.json();
  assert.equal(response.status, expected, `${method} ${path}`);
  assert.equal(body.success, false);
  assert.equal(body.statusCode, expected);
  assert.ok(typeof body.message === 'string' || Array.isArray(body.message));
  console.log(`PASS ${method} ${path}: ${expected}`);
}
if (process.env.TEST_EMAIL && process.env.TEST_PASSWORD) {
  const response = await fetch(base + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.TEST_EMAIL, password: process.env.TEST_PASSWORD }),
  });
  assert.equal(response.status, 200, 'Test credentials must be valid');
  let { data } = await response.json();
  if (data.requiresAccountSelection) {
    assert.ok(data.businesses.length > 1);
    const selected = await fetch(base + '/auth/complete-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: data.token, businessId: data.businesses[0].business }),
    });
    assert.equal(selected.status, 200);
    ({ data } = await selected.json());
    console.log('PASS multiple-business login and selection');
  } else console.log('PASS single-account login');
  for (const path of ['/employees/me', '/business']) {
    const current = await fetch(base + path, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    assert.equal(current.status, 200);
    assert.equal((await current.json()).success, true);
    console.log(`PASS authenticated GET ${path}`);
  }
}
console.log(
  'Live API smoke checks passed. Signup, email delivery and onboarding writes require a disposable account.',
);
