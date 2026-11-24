# Public checkout handoff

2026-11-24. Work in the existing Angular and NestJS repositories. No commits.

## Contract inspection
- Started the local configured API on port 4500 and read its OpenAPI JSON. All five public routes exist. Acemett returned HTTP 200 with three routes. The checkout DTO validates passenger and email but Swagger omits them.
- Public list service returns base fare in naira, not the cheapest seat. paginate defaults to newest creation despite Swagger claiming departure order. Use base fare labels and order on the server before pagination.
- Existing callback adds an operator query to PAYSTACK_CALLBACK_URL. Verified response lacks passenger, journey and financial summary. ConfirmedAt and matched charges are saved. Only walk-in sales dispatch ticket mail.
- Frontend has staff authentication and auth layout, shared field and seat map, phone and WAT utilities, no public booking shell. Reviewed the product PDF from Downloads. Its online and staff bookings share inventory. The approved path-based URL supersedes the PDF’s tenant subdomains.

M1 — Added lazy public shell, branding and route picker, public auth bypass, host root defaults and Netlify rewrites. The app hostname defaults to the guarded dashboard and local root retains sign-in.

M2 — Added WAT single-day/range search with URL-backed pagination, base-fare labels, shared seat map with held/sold seats disabled, and fresh trip detail. Public backend pagination now orders by departure and ID.

M3 — Added passenger and next-of-kin form, availability recheck, conflict recovery, per-operator session quote, hold countdown and Paystack handoff. Travel search now uses the operator's revised flat array, no pagination or list population. Fixed Mongoose sort option placement.

M4 — Callback now uses the configured PUBLIC_BOOKING_ORIGIN and validated slug. Return verifies the same reference, handles all booking statuses, review precedence and uncertain outcomes, with manual checks. Signed webhook still reconciles independently.

M5 — Confirmation uses a verified, operator-scoped receipt with booking-time journey snapshot, settled amounts and passenger name. Older tickets use a scoped journey lookup. Added lazy selectable-text A4 PDF with embedded Unicode font, automatic once-per-reference download and manual PDF/copy controls.

M6 — Staff and online confirmations now share dispatchBookingTicket, the existing NotificationService sender and escaped ticket template. Online settlement schedules delivery only after the winning transaction commits. Verified a rejected mail send does not undo confirmation or resend on replay. The shared ticket footer reads Powered by eTransitBook.

## Verification · 24 November 2026

- **Live local API.** Read the final Swagger JSON, including the required passenger DTO and the confirmed receipt schema. Acemett returned three routes. Searches across them returned flat arrays with zero, six and zero departures. Verified departure ordering and opened a three-seat trip in Chrome. Unknown operator returned 404.
- **Real Paystack test mode.** An isolated MongoDB database used Acemett’s configured test subaccount, a synthetic passenger and suppressed email. Angular received a real quote, reference and authorization URL and opened Paystack. The hosted page stopped automated Chrome at its security check before the transfer could be completed. The actual callback, an externally delivered webhook, and inbox delivery remain unverified. The local integration fixtures below cover the application paths.
- **Backend automation.** Nest build passed. Four focused Jest suites passed (74 tests). The MongoDB replica-set integration test passed using a simulated provider. It exercised a signed webhook racing a browser verification, denied another operator access to the receipt, matched receipt fees and journey, shared seat inventory with staff, flagged late/mismatched payment, and confirmed a rejected email delivery neither rolled back payment nor sent a second email.
- **Frontend automation.** Angular production build passed. The PDF dependency loads on demand and generates CommonJS optimization warnings. Of 176 frontend tests, 175 passed, including all four public checkout tests. The existing address-options assertion expects “Federal Capital Territory (FCT)” but the checked-in data displays “Abuja (FCT)”.
- **Chrome.** A production build with controlled API responses exercised search and empty ranges, sold-out seats and a 32-seat map, a 409 with draft recovery, normalized passenger phones, double-click protection, restoring a quote on reload, pending/expired/review/cancelled and retryable errors, direct callback refresh, automatic PDF once and manual download. Axe found zero violations on landing, seats, passenger details, quote, pending status and confirmed ticket. Checked layouts at 320, 360, 390, 768 and 1280 CSS pixels. Tested the apex and dashboard roots using local host aliases. Browser Back restored live departure results. The existing staff browser workflow also passed customer lookup, sale, confirmation, cancellation, ticket reuse and permissions.
- **PDF and email.** Visually inspected the single-page A4 receipt rendered by Poppler and extracted its Unicode passenger name, WAT date, ticket number, exact NGN total and footer. Email template tests checked escaped names, WAT, ticket, seat, fare and footer. Test email was suppressed.
- **Deployment.** Configure PUBLIC_BOOKING_ORIGIN=https://etransitbook.com on the backend and the signed webhook on the public API host. The local backend .env uses http://localhost:4200. The Netlify rules are checked in. Production DNS, deployed Netlify behavior, real inbox delivery and the hosted return still require environment-level verification.

## Where to continue

Public Angular components, models and scoped state are in `src/app/features/public-booking/`. Shared styling is in `src/styles/public-booking.css`. The backend contract is in `docs/FRONTEND_ONLINE_CHECKOUT.md`. The MongoDB regression is `test/online-checkout.cjs` in the backend. No commits or deployment were made.
