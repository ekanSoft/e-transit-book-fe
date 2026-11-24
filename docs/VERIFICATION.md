# Verification record

## Staff customer entry and the public booking link · 24 November 2026

- Chrome with fixture API responses exercised **Add Customer** for existing and new phone numbers, lookup retry, duplicate recovery, missing-customer validation, and continuation to the payment step. All six employee roles saw the operator-specific public URL on Business profile. Axe reported zero violations on the customer dialog and the desktop and mobile profile.
- A read-only check of the running Acemett API returned an available Makurdi to LifeCamp seat with a checkout total of 1,846,701 kobo. Hosted payment and email delivery were outside this demo check.

## Public fare review, payment confirmation and ticket locations · 24 November 2026

- Edge with fixture API responses verified that **Review total** moved focus to the review heading and sent zero checkout requests. Axe reported zero violations on that screen. **Continue to secure payment** sent one request with the reviewed total and followed the returned URL to a simulated Paystack page.
- Angular and Nest production builds passed. All 10 targeted frontend tests and 22 backend unit tests passed. The isolated MongoDB integration used a simulated Paystack gateway and mail delivery. It checked a price change before the hold, seat competition, expired holds, confirmation despite a one-kobo settlement difference, replay, and state/city labels in both the receipt and email payload for a legacy checkout.
- A temporary local API running the updated backend returned **Benue, Makurdi → Federal Capital Territory, LifeCamp** for the existing confirmed ticket from the screenshot. A fresh hosted transfer and inbox delivery were not exercised.

## Public booking and online checkout · 24 November 2026

- Live Swagger and Acemett reads confirmed guest route discovery, unpaginated departures and saved trip-seat details. An isolated real Paystack test checkout reached the hosted page. Its browser security check prevented completing the external payment.
- Angular and Nest production builds passed. Four backend suites (74 tests) and the MongoDB checkout integration passed with a simulated gateway, including webhook replay, email failure and cross-operator receipt isolation. Frontend tests passed 175 of 176. The existing FCT display-label assertion failed.
- Chrome fixtures exercised booking through receipt download, recovery states and mobile layouts. Six public screens passed axe, and the existing staff browser workflow passed. The A4 PDF was rendered and checked for selectable text, WAT and exact amounts. Production host configuration, the hosted payment return and inbox delivery remain outstanding. [Milestones and verification details](tasks/public-booking-checkout-progress.md)

## Staff Bookings and Customers · 22 November 2026

- Chromium ran the production build against controlled API responses. The journey covered customer search, pagination and edit, saved passenger history, exact phone lookup, inline creation and duplicate recovery, booking from Trips and Bookings, payment confirmation, ticket lookup, check-in, cancellation, and reuse with or without extra payment. A seat conflict preserved the customer and contact draft. A lost confirmation response led to the saved booking without a second sale request.
- The audited customer directory, seat map, payment review, ticket confirmation, cancellation dialog, and bookings directory had zero axe violations or horizontal page overflow at the tested 360, 768, and 1440 px widths across light and dark modes. Chromium also exercised draft discard, dialog Escape and focus restoration, and ticket copying.
- The production build and live API smoke checks passed. Live Swagger and backend source confirmed the staff endpoints and contracts. Live HTTP checks verified unauthenticated error envelopes. Signed-in bookings, customer changes, and ticket lifecycle verification against a disposable workspace remain open.
- All 55 targeted booking contract, Trips, routing, workspace permission and phone tests passed. The full unit run passed 171 of 172 tests. The existing Nigerian address test expects `Federal Capital Territory (FCT)` while the checked-in dataset and utility display `Abuja (FCT)`. [Task checklist and progress notes](tasks/staff-bookings-customers.md)

## Copy a day · 22 November 2026

- Chromium with controlled API responses verified bulk date selection, the selected-day count, automatic validation, blocking validation errors, and saving the remaining departures after empty target dates were skipped. The save action disappeared when no departures remained. The tested screen passed axe and fit the viewport at 360 px in light mode and 1440 px in dark mode.
- The production build and all seven Trips contract tests passed. Live signed-in API verification remains open. [Manual checks](tasks/trips-manual-testing.md#10-copy-a-day)

## Trips · 21 November 2026

- **Layout creation from Trips.** The production build and all 155 frontend tests passed. Chromium fixtures at 360 px and 1440 px verified entering the layout editor with only inactive layouts and through an unmatched search, saving a layout, returning to **Layout & fares**, and selecting the saved layout while retaining journey details and any default fare. Automated tests covered the normal layout detail redirect and the fallback when a trip draft is absent. Live signed-in verification remains open. [Manual checks](tasks/trips-manual-testing.md#3-route-and-layout-selection)

- **Directory and access.** Chromium exercised all six staff roles with controlled API responses. The checks covered WAT date filters, trip details, booked seats, origin restrictions for Terminal Managers and Booking Agents, and restricted manifest and layout actions. Automated HTTP tests verified server pagination and the supported filter parameters.
- **Scheduling and management.** Browser checks covered overnight scheduling from an America/Los_Angeles session, keyboard seat selection, draft recovery after layout setup, and discard confirmation. Trip edits preserved unchanged departure times and retained seat fares when sending updated pricing. Browser checks also covered arrival clearing, conflict recovery, layout replacement with booked-seat validation, and removed-fare warnings.
- **Copy and manifests.** Browser checks loaded source trips across multiple pages, verified that preview problems blocked saving, and required a fresh check after changes. The checks covered an uncertain save response, a successful copy with zero bookings, and a fresh manifest read that showed missed passengers after departure.
- **Build and accessibility.** All 151 frontend tests and the production build passed. Chromium inspection covered the directory, scheduling, trip detail, layout replacement, copy planner, and manifest. The tested states had zero axe violations and no horizontal page overflow at 360, 768, and 1440 px across both themes.
- **Live API and limits.** During Trips implementation, the local API returned the expected unauthenticated responses for the Trips read endpoints. Live signed-in reads and writes remain unverified. [Trips checklist and test notes](tasks/trips-frontend.md)
- **Date and time picker follow-up.** The production build and 152 frontend tests passed. Chromium with controlled API responses verified single-date highlighting, OK confirmation, keyboard navigation, outside dismissal, and clearing arrival in the edit dialog. The open calendar passed axe and fit the viewport at 360 px with touch emulation, 768 px, and 1440 px across light and dark themes. Physical iPhone and Android checks are open. [Manual checks](tasks/trips-manual-testing.md#4-wat-times-and-overnight-travel)
- **Calendar redesign.** The production build and seven Trips contract tests passed. Chromium fixtures verified the compact day grid, distinct Today marker, month and year jumps, the December-to-January rollover, leap-day selection, overnight WAT values in the create request, and clearing an estimate in Edit. Visual inspection and axe checks covered 360 px with touch emulation, 768 px, and 1440 px across light and dark themes. Physical-device and live API checks remain open.

## Vehicle Layouts · 21 November 2026

- **Editor and lifecycle.** Isolated fixtures exercised preset and custom layouts, keyboard seat editing, manual labels, previews, creation and reopening, metadata and grid edits, deactivation and reactivation, and draft protection. Tests covered duplicate names, invalid seat labels, and duplicate submissions.
- **Build and accessibility.** The feature acceptance run passed 129 frontend tests and the production build. Chrome inspection covered small and large seating arrangements at 360, 768, and 1440 px in both themes. Ten browser states passed axe and page-width overflow checks. Current automated HTTP tests cover the complete catalog response and workspace-scoped reuse of catalog and detail data.
- **Live API and limits.** An Admin loaded and searched the empty catalog. A Booking Agent was denied catalog access by the API, and the portal hid the navigation entry and redirected catalog deep links without making layout requests. Populated catalogs and writes used fixtures. Operations Manager and Terminal Manager access was covered by automated tests. Live sign-in for those roles and operator confirmation of preset floor plans remain open. [Vehicle Layouts acceptance notes](tasks/vehicle-layouts-progress.md#execution-record--21-november-2026)

## Terminal, route, and employee directories · 21 November 2026

- **Terminals and employees.** HTTP tests verified the complete terminal list, primary-terminal lookup by flag, employee filters and phone search, explicit terminal clearing, and the bodyless employee status toggle. Workspace access tests exercised own-terminal restrictions, role assignment rules, and permission resets on a business change.
- **Routes.** Component tests exercised the business-wide directory for a Terminal Manager, terminal validation, same-city and reverse routes, inactive duplicate recovery, status confirmations, uncertain writes, and draft clearing on a business change.
- **Live API and limits.** The local smoke run during Trips implementation confirmed HTTP 401 on unauthenticated terminal, route, and employee requests. The workflow results in this entry come from automated tests. Signed-in directory and management flows were outside this verification.

## Operator portal redesign · 18 November 2026

The production Angular app was exercised in Chromium against the NestJS API. Tests that needed account creation used a separate, uniquely named local MongoDB database and the real controllers, guards, services, validation, and response formatter. The test mail provider captured verification and reset links in memory. Approved memberships were test fixtures. Browser checks of active operations and pending approval also ran against the existing backend on port 4000.

| Area                    | Observed result                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication          | Signup, resend, verification from a direct link, password reset from a direct link, and subsequent sign-in all succeeded. Only the disposable account password changed.                                                                                                                                                                                                       |
| Business context        | A single eligible membership reached the dashboard directly. Multi-business login showed both roles, completed the selected login, and switched from an active company to a pending company with a new JWT. Reload and logout preserved the expected boundaries. A second open tab switched to the pending company and could no longer display the first company’s dashboard. |
| Registration            | The API accepted profile, primary branch, then verification. Reload and sign-in restored the first missing step. Updating a saved profile preserved an in-progress branch draft. The saved primary branch could be reopened and updated. Verification with an RC number completed registration and led to pending approval.                                                   |
| Reports                 | Existing operational data rendered from the dashboard and sales endpoints. Today, seven-day, and thirty-day requests used the correct inclusive WAT dates. An empty company showed setup guidance. A driver received the trip schedule without a reporting request. A simulated report failure displayed the error and recovered on retry.                                    |
| Restricted access       | Rejected and inactive businesses saw their status pages. A suspended sign-in displayed the API’s denial reason without establishing a session.                                                                                                                                                                                                                                |
| Profiles and navigation | The active company opened read-only registration details. The directory supported search and clearing an empty result. My Account, the account popover, desktop collapse, keyboard navigation, mobile drawer dismissal and focus return worked.                                                                                                                               |
| Appearance              | Chromium showed dark mode on a fresh visit and retained light mode after reload. The computed sidebar background stayed the same. Layout and browser AXE checks covered 360, 768, and 1440 px widths. The inspected auth, wizard, status, dashboard, account, and navigation states had zero detected violations.                                                             |
| Build and smoke checks  | Production build passed with a 334.62 kB initial browser bundle (92.50 kB estimated transfer). All 54 unit tests passed. The live API returned the expected response status and error envelope for all 16 unauthenticated or invalid smoke requests.                                                                                                                          |

The reference preview and the direct Apex demo were inspected. Browser navigation followed the grouped sidebar links, including dashboard, logistics, wizard, forms, layouts, users, roles, settings, and data grid. Inspection also covered the account menu, theme control, expanded and collapsed rail, and mobile drawer.

### Backend contract notes

- The login-selection records carry `registrationComplete` and `registrationStage`. Successful JWT issuance returns a business identifier. The authenticated `/business` read supplies the current full registration record for routing.
- A new credential exchange is required to switch business. The backend has no authenticated membership-switch endpoint.
- The branch API exposes a paginated directory with a `primeBranch` flag. A dedicated primary-branch read is unavailable. The onboarding upsert uses the signed-in employee's branch, which determines who can reopen and save an existing primary branch.
- Registration writes are locked for active businesses. Conflicting stage, completion, and approval fields lead to a status recheck. The business schema has no separate suspension or rejection explanation field. The UI presents the backend's message when a request is denied.
- Dashboard totals and upcoming trips come from `GET /api/v1/reports/dashboard`. Daily revenue comes from `GET /api/v1/reports/sales` for periods with collections. The dashboard response has no recent-booking feed. Booking agents and drivers use the permitted daily trip list.
- Company verification links are shown to admins and operations managers. Server-side document permissions would require a backend change because the business endpoint returns the full company record.

The sign-in image is bundled at `public/terminal.webp`. The built-in image generator produced an overhead editorial view of emerald and ivory intercity coaches in marked terminal bays. The font is bundled locally with its license. Browser email tests verified link handling using captured mail. External inbox delivery was outside that test.

## Earlier verification · 17 November 2026

Date: 17 November 2026. Target: local backend at `http://localhost:4500/api/v1`.

### Completed on 17 November

- Read backend controllers, services, DTOs, enum/schema definitions, response/error formatters, architecture, frontend notes, and handoff. Compared the endpoints against the running Swagger JSON schema.
- Inspected the reference's dashboard, wizard, forms, layouts, users, roles, settings, and data-grid pages, including desktop sidebar and mobile layout.
- Production build passes. Initial bundle is approximately 276 kB before transfer compression; features are lazy loaded.
- 35 unit tests pass, including session/context races, multipart contracts, status/stage routing, temporary selection expiry, email selection and deep-link tokens.
- All twelve integrated API endpoints return expected validation/authentication envelopes under invalid or unauthenticated requests.
- Real multi-business login, complete-login, slug-scoped single-business login, employee context, and business context succeed.
- All three onboarding writes reject active businesses with the actual backend approval restriction.
- Disposable signup succeeds with a unique email alias. Signup with an already registered admin email returns the expected `409`.
- Unverified login returns `403`; resend verification succeeds; signup verification and subsequent single-account login succeed.
- Multipart profile with JSON address and PNG logo succeeds; a fresh business fetch preserves the completed profile stage.
- Empty verification returns the expected `400`. Multipart RC number plus all three PDF document fields succeeds.
- Primary-branch submission completes all three stages, sets `registrationComplete=true`, and leaves `accountStatus=PENDING`.
- Password-reset initiation returns business choices for a shared email and accepts a slug-scoped request for the QA account. Invalid reset tokens are rejected.

The QA business is named `eTransitBook Frontend QA 1794936579956`. Uploaded PDF fixtures identify themselves as QA tests, not legal documents. Original active businesses were not modified. The disposable business remains pending; no manual approval or database-write bypass was used. The signup verification token was read only for that new local test record; inbox delivery has not been independently observed.

### Configuration finding on 17 November

Backend email links currently use `http://localhost:3000`; Angular's default development origin is `http://localhost:4200`. Align `FRONTEND_URL` with the frontend port, or run the frontend on port 3000. No backend files were modified.

### Verification limits on 17 November

- Local browser access was blocked by a saved permission. Responsive visual and browser AXE checks remain pending permission availability.
- Successful live password reset was deliberately skipped at the user's request. No password was changed. Unit tests cover the frontend payload and password confirmation behavior.
