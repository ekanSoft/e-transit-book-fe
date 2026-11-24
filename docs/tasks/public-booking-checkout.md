# eTransitBook — Public Booking Website & Online Checkout

> **Status:** Six milestones implemented. Hosted Paystack return and deployment checks are recorded in the [progress file](public-booking-checkout-progress.md).
> **Frontend repository:** `C:\Users\PC\Documents\source-codes\e-transit-book-fe`  
> **Backend repository (limited edits allowed):** `C:\Users\PC\Documents\source-codes\e-transit-book`  
> **Place this file in frontend:** `docs/tasks/public-booking-checkout.md`  
> **Goal:** Deliver a complete, attractive, operator-branded public booking flow from route discovery through Paystack payment verification, ticket confirmation, and downloadable PDF receipt, without rebuilding the payment infrastructure.

## 0. Approved product / deployment decisions

These decisions supersede older product notes and handoff suggestions when they conflict:

- **Public operator pages use a path-based slug, not wildcard company subdomains:** `https://etransitbook.com/public/:slug`, e.g. `https://etransitbook.com/public/acemett`.
- **Operator dashboard:** `https://app.etransitbook.com`; **API:** `https://api.etransitbook.com`; apex `/` is the marketing/home page (can initially be minimal).
- **No separate Next.js application is required.** Keep the existing Angular project and prefer a single Angular deployment for the MVP. Assign `etransitbook.com` and `app.etransitbook.com` to that deployment as supported custom domains/domain aliases; configure routing/host defaults appropriately. This is two hostnames, **not** per-company wildcard subdomains. Do not buy or provision separate domains for each operator.
- **Production public routes:**
  - `/public/:slug` — operator landing, route search and departures.
  - `/public/:slug/trips/:tripId` — seat selection / journey detail (or equivalent existing router structure).
  - `/public/:slug/checkout` — passenger information and payment review as needed.
  - `/public/:slug/payment/return` — Paystack return and payment verification.
  - `/public/:slug/booking/confirmed` — final ticket, with receipt download (may combine this with return after verified success).
- **Paystack `callback_url` must point to the same operator's public path**, e.g. `https://etransitbook.com/public/acemett/payment/return`. Construct this from the validated operator slug and a **server-configured, allowlisted frontend origin**, not arbitrary user-supplied redirect URLs or `Host` headers.
- Public website is **light-mode only**, but styled with the existing eTransitBook **dark navy/charcoal sidebar palette** as the primary brand color, with restrained use of the existing green/teal accent. Do not add a dark/light switch; **do not dynamically apply individual operator `brandColor` in this MVP**.
- Show the **operator's logo prominently when available**; otherwise use one professional, crisp, neutral transport-themed SVG/vector illustration or icon asset. Avoid generic AI-looking stock photos and invented operator logos.
- The **PDF receipt contains no logos**: prominently display the transport business name, trip/passenger/ticket/payment information and a small **“Powered by eTransitBook”** footer. Add the same discreet footer to the online booking confirmation email on the backend.
- Booking is **one passenger and one seat per checkout**, using existing Paystack checkout, seat holds, verification and webhook logic. Do not add a cart, multiple seats, public accounts or new payment methods without existing backend support.
- Display dates/times in **West Africa Time, `Africa/Lagos`**, even if the visitor's device has a different timezone.
- **Do not change transaction fees, split calculations, settlement logic, Paystack webhook security, or staff booking semantics** as part of this task. Reuse the implemented backend and modify only the integration/receipts/email surface necessary.

### Local development URLs

Until production domains are configured, public pages can run at `http://localhost:4200/public/acemett` using the existing Angular dev server. Do not rely on real DNS to test the page. For local Paystack callbacks, follow the backend's configured/test-mode arrangement and a reachable HTTPS origin where required; do not assume Paystack can call localhost from the Internet.

## 1. Required reading and verification (before implementation)

- [x] Read frontend `AGENTS.md`, `README.md`, current Angular router, layout/shell boundaries, shared UI components, API client, form validation, WAT date utilities, phone normalizer and seat-map renderer.
- [x] Read backend `docs/FRONTEND_ONLINE_CHECKOUT.md` (**primary checkout handoff**), `docs/FRONTEND_IMPLEMENTATION_NOTES.md` (especially **Customer Booking / Public Operator Routes / Public Trip Search**), `docs/FRONTEND_TRANSPORT.md`, and relevant `ARCHITECTURE.md` sections.
- [x] Review `Etransitbook High Level Product Notes.pdf` if available, especially its **Tenant Model / Main Platform Areas / Online Customer Bookings**. **This task document's path-based URL is the new approved decision**; override older `abc.etransitbook.com` examples and old branded-color suggestions.
- [x] Inspect backend source: `src/bookings/public-bookings.controller.ts`, `public-bookings.service.ts`, `online-checkout.service.ts`, `paystack-webhook.controller.ts`, `dto/online-checkout.dto.ts`, related schemas, Paystack provider service and current ticket/email template(s).
- [x] Inspect the current **Swagger/OpenAPI** to verify actual routes, DTOs, response shapes and validation rather than relying on prose alone. The user can have Swagger running in **Microsoft Edge**; if browser access is available, inspect it. Otherwise use the locally running Swagger/OpenAPI JSON via HTTP/cURL or inspect generated route metadata/source. Do not pretend the browser is accessible if it isn't.
- [x] **Record discrepancies** between `FRONTEND_IMPLEMENTATION_NOTES.md`, `FRONTEND_ONLINE_CHECKOUT.md`, Swagger and source. In particular verify **`startingFare` semantics** (minimum seat fare vs base fare), **trip result ordering** (earliest departure vs creation order), **available public receipt fields**, and **current callback construction**. Source + running API are authoritative; never silently assume a conflicting document is correct.
- [x] Locate the existing frontend public/guest shell, routes and services. Reuse the existing Angular app and design system. Do not duplicate transport pricing/seat-map logic unnecessarily.

**API base path**: `/api/v1/public/operators/:slug` (no employee session). Standard envelope `{ success, statusCode, message, data }`. Unknown/unavailable operator, inactive subscription and active-operator-with-zero-routes are distinct states; do not leak internal billing status publicly.

## 2. Public site design and customer experience

The site should feel like a trustworthy Nigerian transport company's booking page—not a clone of the internal operator dashboard. Use the same color family, but **no dashboard sidebar** and no internal admin navigation.

### Visual direction

- [x] Design a clean, premium, responsive **public header**: operator logo (large enough to be recognizable), business name, optional contact/support phone, sensible page navigation or “Find a trip” anchor. On mobile, keep the booking action visible and don't overcrowd the top bar.
- [x] Use a dark navy/ink **hero/header section** in the visual family of the operator dashboard's dark sidebar, with high-contrast typography and a restrained green/teal primary action. Rest of content can use white/off-white surfaces. Avoid dark-mode toggles and operator-specific theme colors for now.
- [x] Include tasteful transport-themed fallback artwork **only when the operator has no logo**. Prefer a scalable SVG/icon/illustration that is crisp at 1×/2× and looks professionally designed; no fake bus photography, placeholder gradient blob, invented operator name/logo or low-resolution assets.
- [x] Make the primary route/date search prominent, simple and usable by nontechnical travelers. Use branch/terminal names and city/state so intrastate and same-city routes remain unambiguous.
- [x] Mobile-first implementation: small screens, keyboard forms, large tappable seat controls, accessible contrast, skeleton loading, descriptive empty/error states, and predictable Back navigation.
- [x] Passenger must always know **which transport company** is fulfilling the trip. Avoid making eTransitBook the main customer-facing brand; reserve “Powered by eTransitBook” for a discreet footer and the receipt/email footer.
- [x] Do not add unconfirmed amenities, operator ratings, fleet photos, reviews, refundable promises, or other unverified marketing claims.

### Suggested public journey

`Operator page / route search → Available departures → Seat selection → Passenger & next-of-kin → Fare review / initialize checkout → Paystack → Payment verification → Confirmed ticket + receipt`.

Preserve the selected trip/seat and passenger draft where safe during navigation, but treat availability and pricing from the backend as authoritative.

## 3. Milestone 1 — Public routing, operator branding & routes

- [x] Add guest routes to existing Angular router under `/public/:slug` and exclude authenticated operator guards and operator navigation shell. Handle refresh/deep links on Netlify (`/* /index.html 200` SPA fallback or equivalent compatible with existing config).
- [x] Keep dashboard accessible under current internal routes on `app.etransitbook.com`. Inspect current auth/deployment behavior; don't accidentally redirect all `app.*` paths to apex or expose staff sections as public entry points. Decide whether each host's `/` should redirect to marketing vs dashboard based on `window.location.hostname` only in browser-safe code, and test both hosts where configured.
- [x] **On first render of `/public/:slug`, immediately call** `GET /api/v1/public/operators/:slug/routes` — do not wait until a user clicks Search. This is the **first public operator API call**, providing `data.organization` and `data.routes`.
- [x] Cache/profile-store the operator name, logo and contact for the current public slug across public pages; refresh if slug changes. Do not carry one operator's identity, routes or session into another slug.
- [x] Show logo when valid and provided; otherwise polished fallback. Handle broken image and unknown operator gracefully. Don't apply `organization.brandColor` in this phase.
- [x] Build route selector from returned active routes with origin/destination terminal names and city/state where available. Hide routes with unusable/missing branch summaries. Direction is meaningful; do not infer that Lagos→Abuja implies Abuja→Lagos.
- [x] Handle active operator with `routes: []`: keep branding visible and explain that no routes are currently available. Unknown/inactive account or invalid subscription: friendly, non-internal “Booking page unavailable” state with support/return option.
- [x] Avoid exposing employee sessions, internal staff/customer records or protected API fields on the public app.

## 4. Milestone 2 — Trip search and seat availability

- [x] Trip search: `GET /api/v1/public/operators/:slug/trips` with **required** `route` ID and **one** WAT date (`departureDate=YYYY-MM-DD`) or inclusive date range (`from`/`to`). Never send both date modes simultaneously; disallow past WAT dates and invalid ranges.
- [x] Per the updated contract, render the unpaginated data array in departure order with WAT times, base fare and available seats.
- [x] Make empty search, fully booked, loading and retry states clear. Mark trips with zero seats **Sold out** and disable booking.
- [x] On trip selection call `GET /api/v1/public/operators/:slug/trips/:tripId` to read `seatLayoutSnapshot` and `seats[]` (each seat's effective `fare` and `available` flag). Do not use current mutable vehicle-layout templates.
- [x] Reuse the existing frontend seat renderer, showing `FRONT`/`REAR`, `DRIVER`/`AISLE`, seat labels and state. Only SEAT cells can be selected; sold/held seats remain unavailable.
- [x] A customer selects **exactly one** seat. Show its actual effective fare, including a custom fare where configured, plus journey summary. Warn that availability can change before payment.
- [x] On `409` or stale seat detail, re-fetch trip detail and ask for another seat while preserving unrelated passenger information.

## 5. Milestone 3 — Passenger information, review and Paystack initiation

- [x] Form: required passenger `firstName`, `lastName`, **Nigerian phone number**, `email`; required next-of-kin `firstName`, `lastName`, `phoneNumber`; optional next-of-kin email and blood group only if backend supports them. Reuse common phone utility and inline validation, clear labels and privacy-minded form design.
- [x] Display company, trip, route, WAT date/time, seat, per-seat fare and concise booking summary prior to checkout. Explain payment will open secure Paystack checkout.
- [x] POST `.../checkout` using the verified DTO: `{ trip, seatNumber, passenger, nextOfKin, bloodgroup? }`. Do **not** send client-calculated fees, fare, operator ID or Paystack secrets.
- [x] Prevent double submission; one successful initialization creates one seat hold and one Paystack reference. Retain returned `reference`, `authorizationUrl`, `holdExpiresAt`, `currency`, `fees`. Use memory plus **session-scoped** state to recover the same attempt after external redirect; avoid persisting sensitive passenger details unnecessarily.
- [x] After initialization show the **server-quoted** fare, platform fee, processing fee and total, converting `fareKobo`/`platformFeeKobo`/`processingFeeKobo`/`totalKobo` to properly formatted NGN; no custom calculation in the frontend and no rounding drift. The user should see the payable total **before being sent to Paystack**. Make clear that the hold is temporary (up to 15 minutes, or departure if earlier).
- [x] Provide a clear **Continue to secure payment** action using the returned authorization URL and current hold. Don't create additional holds if the user simply revisits the review screen or clicks twice.
- [x] Do not build an invented embedded bank-transfer page or fake payment processor; use the existing Paystack flow and any enabled channels from the backend.
- [x] If Paystack initialization fails (`400/409/502/503/network`), preserve inputs and show actionable retry/seat refresh; do not claim a booking is confirmed. Validate the provider URL before redirecting according to existing trusted Paystack patterns.

## 6. Milestone 4 — Operator-specific Paystack callback and payment verification

**This milestone requires a targeted backend change and corresponding frontend handling.**

### Backend

- [x] Inspect the existing `online-checkout.service.ts` and Paystack transaction initialization. Replace or adapt the **single generic callback URL** so each transaction returns to its own operator public page:
  - Production: `https://etransitbook.com/public/<validated-slug>/payment/return`
  - Dev/test: from a **configured safe public origin**; no hardcoding production host for local builds.
- [x] Use Paystack transaction initialization's per-transaction `callback_url` field; do not assume a Paystack dashboard callback alone can retain the operator slug. Keep existing webhook URL and signature verification unchanged.
- [x] Never derive callback hostname from an arbitrary client-provided URL, request Origin or Host header. Normalize/validate the slug and construct the URL server-side from configured approved origin. Add focused tests for multiple slugs, path encoding, and safe origin handling.
- [x] Ensure callback routing remains compatible with Paystack's appended `reference` and/or `trxref` query parameters. Preserve reference ownership checks in `POST /checkout/:reference/verify`.

### Frontend

- [x] Implement `/public/:slug/payment/return`: parse Paystack's `reference` (and fallback `trxref` where documented), recover current operator slug from the route and check reference against saved attempt when possible. Do not trust query params as proof of payment.
- [x] **Immediately call** `POST /api/v1/public/operators/:slug/checkout/:reference/verify` with the API's expected empty body and re-use the same reference for subsequent checks. The backend/webhook—not browser redirect—is authoritative.
- [x] Show a polished **checking-payment** state: indeterminate progress animation/pulsing stepper (“Checking transfer”, “Confirming booking”, “Preparing ticket”) where stages are factual; **no fake percentage or premature success checkmarks**.
- [x] For `LOCKED`/pending: show hold deadline and a prominent **Check payment status** action; optionally retry checks at a **bounded**, respectful interval with backoff and no infinite tight loop. Stop polling on terminal outcome/unmount. Offer manual check after a wait or unknown network error.
- [x] For `CONFIRMED`/`CHECKED_IN`: show success, ticket code, journey summary and receipt download. Never show this state before verified backend confirmation.
- [x] For `paymentReview: true`: show **Payment received — please contact the transport company with your reference**; take precedence over expiry, and **do not invite another payment**.
- [x] For `EXPIRED` with no review: explain that the hold ended; allow refreshing availability, but also show a **Check this payment again** option and operator support in case funds were transferred near expiry. Don't automatically trigger a second payment.
- [x] For `CANCELLED`/failed/abandoned provider flow, explain status and provide a safe route back to search. For 404, 429 or network failure, preserve reference and show retry/support rather than mislabeling the payment failed.
- [x] Ensure page refresh, browser back, direct return URL, webhook-before-return, verification-before-webhook, mobile return, and eventual verification all behave without duplicate booking creation.

## 7. Milestone 5 — Confirmed ticket and downloadable PDF receipt

- [x] After verified success, render a professional ticket/receipt confirmation screen using the **operator's name** as the primary brand, with ticket number, passenger, origin/destination terminals, WAT departure, seat, booking/payment reference, payment date and clear paid status.
- [x] **Generate a downloadable PDF receipt in the frontend** using a lightweight existing client-side PDF tool if available; otherwise add a well-supported minimal dependency. For a browser-initiated payment return, attempt automatic download **once per confirmed attempt where browser policy permits**, but always show an obvious **Download PDF receipt** button as fallback. Never repeatedly auto-download on refresh/polling.
- [x] The receipt is a **real payment receipt**, not just a graphic screenshot: readable A4 or compact receipt layout, clean typography, selectable text, consistent NGN amount formatting, business name, passenger/route/journey/ticket identifiers, fare, fee breakdown and total actually confirmed/paid, payment reference, WAT payment time if available, and status. PDF should print well.
- [x] **No operator logo, no eTransitBook logo** in the PDF. Small unobtrusive footer: `Powered by eTransitBook`. Customer-facing receipt must not show secret gateway data, full card details, transaction tokens or next-of-kin private details unnecessarily.
- [x] Before building the PDF, verify that the public `verify` response actually contains the trusted trip, passenger, company, ticket and confirmed financial breakdown needed. **If not**, make a small **backend-only** addition to return a safe, operator-scoped confirmed receipt summary via the same verified reference or a carefully designed protected receipt lookup. Avoid new public customer-directory endpoints or unauthenticated booking ID lookups. Define/test the exact DTO and update the backend handoff.
- [x] Treat fee values as integers in kobo internally until formatting. Don't calculate the paid total from a possibly changed current trip fare; use the settled transaction/checkout snapshot. Distinguish ticket fare from any extra processing/platform fees.
- [x] Provide **Copy ticket number**, **Download receipt**, **Book another trip**, and optional **Print** if simple. A confirmation must remain useful when email delivery is delayed.
- [x] For an expired/locked/pending/reviewed payment, **do not generate a “Paid” receipt** or automatically download one.

## 8. Milestone 6 — Backend booking-confirmation email update

- [x] Locate the existing online-confirmation email sender/template and any shared ticket email helper invoked after successful online booking; verify in source rather than assuming the staff booking template is identical.
- [x] Make the **operator's business name** and practical passenger ticket/journey details the primary emphasis. Keep the existing ticket notification triggers and backend async delivery mechanics intact.
- [x] Add a small, low-contrast footer at the bottom: **`Powered by eTransitBook`**. Not a large marketing banner. Preserve sending details, escaping, formatting, mobile email compatibility and deliverability behavior.
- [x] If the current receipt/ticket email is shared with staff-assisted bookings, decide whether the same unobtrusive footer should apply consistently; do not alter staff booking business rules.
- [x] Test generated email template(s) and ensure failures sending mail do not cause a successful paid booking to be reported as failed.

## 9. Cross-cutting safety, reliability and UX checks

- [x] **Isolation:** changing `/public/acemett` to `/public/xyz` must fetch only XYZ's profile/routes/trips/checkout; a reference for Acemett must not verify or reveal receipt details under XYZ.
- [x] **Seat concurrency:** online holds + staff sold seats share inventory; held or sold seats cannot be selected. A `409` refreshes availability and preserves passenger draft as safe.
- [x] **Money:** fee breakdown and final receipt are backed by server data; don't misstate pending transfers as paid; preserve successful backend reconciliations and webhook idempotency.
- [x] **Privacy:** no employee session required or sent to public API; don't leak other customers' information, private financial account data, internal status details, checkout review reasons or raw Paystack secrets.
- [x] **URL safety:** no open redirects. Callback and public origin are from allowed configuration; slug is normalized, encoded and tied to operator; reference lookups are scoped.
- [x] **Time:** WAT midnight transitions, today vs future trips, hold expiry before scheduled departure, countdown cleanup, localized date labels and timezone-independent rendering.
- [x] **A11y:** labels, keyboard path, focus management, contrast, error messages, non-color seat state indicators, reduced-motion-friendly payment progress.
- [x] **Responsive:** 320–390px phones, tablet and desktop; seat map scroll/zoom as needed for 3/7/18/30+ seats without crushing tap targets.
- [x] **Performance:** avoid calling trip search until route/date are valid; avoid N+1 detail calls for results; cache operator branding by slug; force fresh availability near checkout.
- [x] **App boundaries:** public pages shouldn't expose the internal dashboard sidebar, operator nav, tenant-switcher, or employee-only controls. Dashboard auth guard and existing staff workflows must continue functioning unchanged.
- [x] **Unknown availability/failure:** show honest states, retry the **same** checkout reference after uncertain payment, and do not spawn duplicate charges by default.

## 10. End-to-end acceptance checklist

- [x] Load `/public/acemett`: first request is public `GET .../routes`; display operator name/logo/contact and routes.
- [x] Test a company without a logo and one without active routes; both look polished, not broken.
- [x] Unknown, pending or inactive operator shows appropriate unavailable page without leaking subscription details.
- [x] Search intrastate and interstate routes on a valid WAT date; distinguish terminal names; show all matches; handle sold-out/empty results.
- [x] Select one seat on a small and large layout. Confirm saved snapshot rendering, seat-specific fare and locked/sold disabled state.
- [x] Fill passenger and next-of-kin with valid Nigerian phone formats; validate missing/invalid inputs.
- [x] Initialize checkout once; confirm returned fee breakdown and hold deadline match authoritative API response; no duplicate initialization on double click.
- [ ] Paystack test payment returns to `/public/acemett/payment/return?reference=...`, **not** an operator dashboard page or another company's URL.
- [x] Verify pending → confirmed (or webhook-first) response and accurate display of ticket. No success message before verification.
- [x] Confirm receipt auto-download attempt once and working manual Download PDF button; inspect printed PDF for business name, WAT journey, fare/fees/total, paid reference, no logos and tiny footer.
- [x] Confirm backend online ticket email renders correctly with small footer; no client-side claim that email delivery is guaranteed.
- [x] Test expired hold, late transfer/payment-review, network outage, 409 seat conflict, cancelled, 404 reference and API rate limits.
- [x] Verify cross-operator isolation for all reads/verify/receipts.
- [x] Refresh callback URL directly; use browser Back; try mobile; test Angular/Netlify deep-link refresh at public paths.
- [x] Verify current `app.etransitbook.com` dashboard auth and navigation still work after public routes are added.
- [x] Run frontend build, relevant frontend tests, backend unit/integration tests for touched code, and Swagger contract checks. Update handoff docs when behavior changes.

## 11. Work order, reporting and session handoff

**Preferred implementation sequence:**

1. Inspect and reconcile documents, Swagger and source; resolve documented API contradictions.
2. Frontend public routes, operator branding and trip search.
3. Seat selection, passenger form, fare review and checkout initiation.
4. Targeted backend callback update; frontend payment return, verification statuses.
5. Trusted confirmation data and downloadable PDF receipt.
6. Backend email footer, regression tests and responsive polish.

**Milestone progress:** Update the checkboxes above and maintain a brief `docs/tasks/public-booking-checkout-progress.md` (or existing project progress convention) after each milestone with modified paths, decisions, known issues and what remains. Do not stop after planning; implement sequentially, make the required limited backend edits, and use the current implementation as source of truth.

**Do not commit unless explicitly requested.** Avoid broad refactors of the booking backend, settlement system, or existing dashboard. If something truly requires a significant backend contract expansion, document the smallest safe change and implement/test it deliberately rather than inventing response fields in the Angular client.

## 12. Documentation and references

- Backend: `docs/FRONTEND_ONLINE_CHECKOUT.md`, `docs/FRONTEND_IMPLEMENTATION_NOTES.md`, `docs/FRONTEND_TRANSPORT.md`, relevant current controller/DTO/service files and live Swagger.
- User's product notes: eTransitBook high-level PDF, especially tenant, application areas and online booking sections (**subdomain examples are superseded by path slugs**).
- Netlify docs: [Multiple domains on one site](https://docs.netlify.com/manage/domains/configure-domains/add-a-domain-alias/), [Angular SPA routing](https://docs.netlify.com/build/frameworks/framework-setup-guides/angular/).
- Paystack docs: [Initialize Transaction](https://paystack.com/docs/api/transaction/) — supports per-transaction `callback_url`; [Accept Payments](https://paystack.com/docs/payments/accept-payments/) — verify server-side before fulfilling tickets.
