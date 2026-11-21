# eTransitBook — Trips Frontend Implementation Task

> **Scope:** Build the Trips operator-portal feature in the existing Angular frontend. This document is the frontend **UX/implementation checklist**, not a replacement for the backend API handoff. Tick items as implemented and record blockers or decisions at the end.

## Repositories and source of truth

- **Frontend (modify):** `C:\Users\PC\Documents\source-codes\e-transit-book-fe`
- **Backend (read only):** `C:\Users\PC\Documents\source-codes\e-transit-book`
- Read frontend `AGENTS.md` and `README.md` first.
- Read the backend Trips handoff, expected at `../e-transit-book/docs/FRONTEND_TRANSPORT.md` (verify the actual location), plus the relevant Trips section of `docs/FRONTEND_IMPLEMENTATION_NOTES.md` where applicable.
- Verify contracts against `src/transport/trips/trips.controller.ts`, `trips.service.ts`, Trips DTOs, schema, role guards, and manifest types. Current code takes precedence over historical design notes.
- Reuse existing frontend `WorkspaceAccess`, `WorkspaceData`, routes, shared dialogs/forms, `SearchableSelect`, directory controls, HTTP error handling, and the **existing vehicle seat-layout renderer**. Inspect the real components before integrating.
- Preserve the current portal design, dark-first theme, permanently dark sidebar, authentication, business switching, and existing features. No backend edits or unrelated redesigns.

## Product and UX principles

**Trips are scheduled departures, not routes or vehicle layouts.** A route defines the directional journey; an active layout provides a seating template. Creating a trip snapshots its seat arrangement, departure time, optional arrival estimate, and pricing.

Make operational tasks quick, especially for staff handling multiple departures daily:

- Prefer a focused Trips directory, an easy-to-follow scheduling form, and a scannable Trip details page.
- Show route as **Origin terminal → Destination terminal**, with city/state where useful.
- Always display dates/times in **WAT (Africa/Lagos, UTC+01:00)**; make the timezone visible in relevant controls.
- Use the existing seat-map renderer for previews and per-seat price selection. **Do not create another seat editor.** The trip's seats are immutable snapshot geometry; prices can vary.
- Prefer explicit labels and clear actions over decorative charts, extra cards, or complex calendar widgets.
- Preserve draft state when moving Back/Next or leaving the scheduling flow temporarily to create a route/layout; warn before discarding unsaved changes.
- Make tablet/mobile views genuinely usable (360/768/1440 px), including selectors, touch-friendly seats, dialogs, and tables.
- Keep all UI permission-aware, with the backend authoritative for actual access.

## Navigation and access

- [x] Add **Trips** under Operations, after **Terminals → Routes → Vehicle layouts**, at `/app/trips`.
- [x] Implement directory, detail, and create routes using the existing shell and route guards.
- [x] Respect selected-business scope; clear stale data/drafts on business switches.
- [x] Centralize capabilities in `WorkspaceAccess`, avoiding scattered template role checks.
- [x] Trip **read/detail/booked-seat** access: Admin and Operations Manager business-wide; Terminal Manager and Booking Agent only for trips **originating at their assigned terminal**; Accountant and Driver business-wide.
- [x] **Schedule**: only Admin and Operations Manager (active business).
- [x] **Edit times/fare, status, and copy day**: Admin and Operations Manager business-wide; Terminal Manager own-origin only. Booking Agents, Accountants, and Drivers cannot perform those mutations.
- [x] **Manifest read**: Admin and Operations Manager business-wide; Terminal Manager and Booking Agent own-origin only; not Accountant or Driver.
- [x] Hide catalog-only layout actions for Terminal Manager and other roles without layout catalog access. The Trip API can still return an assigned layout summary and trip snapshot.
- [x] Filter route choices for Terminal Manager and Booking Agent on trip lists by route **origin** ID matching `employee.branch`; routes themselves remain business-wide elsewhere.
- [x] Handle `403`/`404` without exposing another terminal's or business's data.

## Milestone 1 — Trips directory and details

**Goal:** A usable, read-only Trips workspace before implementing mutations.

- [x] Build `/app/trips` using `GET /api/v1/trips`, **server-side pagination** (`page`, `limit`) and the backend response's `data.content`, `total`, `currentPage`, `pageSize`, `totalPages`, and page flags.
- [x] Add functional **route**, **status**, and **departure date** filters; reset page to 1 on filter/page-size changes. Do not invent a backend text-search parameter.
- [x] Add an obvious **Today** filter/shortcut; allow **All dates** (no date filter) for historical trips. Preserve inactive routes as possible *historical* filter choices.
- [x] Show route (origin → destination), **departure in WAT**, status, assigned layout name, default fare (₦), and booked seat count. Provide compact responsive presentation and full loading/empty/error/retry states.
- [x] Make trip rows/details links support normal link behavior (including opening in a new tab); keep row action controls independent.
- [x] Build `/app/trips/:id` using `GET /api/v1/trips/:id`, with a clear summary, departure/arrival, status, pricing overview, seat-map snapshot, and context-appropriate actions.
- [x] Use **`seatLayoutSnapshot` from trip detail** for seats and trip capacity—not the current reusable layout template or its potentially changed `capacity`. The list does not include the snapshot.
- [x] Handle missing/null populated route, terminal, or layout summaries without broken labels.
- [x] Fetch booked seats from `GET /api/v1/trips/:id/booked-seats` where helpful; overlay occupied state on the reusable renderer without making booking UI in this phase.
- [x] Confirm that list/detail reads render correctly for each role, especially origin-scoped roles.

## Milestone 2 — Schedule a trip (highest UX priority)

**Goal:** A simple, reliable guided flow with no unnecessary steps.

- [x] Build a dedicated schedule page (e.g. `/app/trips/new`) with a clean **3-part flow**: **Journey & time → Layout & fares → Review & schedule**. Adapt if existing frontend conventions suggest a simpler arrangement.
- [x] **Journey & time:** select an **ACTIVE route**, showing origin/destination terminal names, then enter **departure date + time** and optional **estimated arrival date + time**. Support overnight arrival, not just a same-day time picker.
- [x] Show only eligible active routes for scheduling. If none exist, explain whether to create a route or reactivate one, with role-appropriate navigation.
- [x] **Layout & fares:** select an **ACTIVE vehicle layout**, preview the current grid and passenger capacity with the existing seat renderer. The layout catalog now returns a **complete unpaginated array**; filter it locally to ACTIVE (verify against current backend code). If no active layouts exist, link to layout setup where authorized.
- [x] Enter **one default fare** in naira and optionally assign **per-seat fare overrides** by selecting passenger seats on the grid. Visually distinguish seats with overrides. Provide simple bulk/apply/clear interactions only where they materially help; do not overwhelm operators.
- [x] Accept whole-number naira fares from **₦100** through the backend's accepted upper bound. Format for display, send **JSON numbers**.
- [x] Keep overridden seat numbers aligned with labels in the chosen layout. Changing layout should flag/drop now-invalid overrides *only with a clear review*, never silently move prices to different seats.
- [x] **Review & schedule:** clearly summarize origin → destination, departure/arrival in WAT, layout name/capacity, base fare, number of seat overrides, and any warnings before submission.
- [x] Preserve all form state between steps; offer **Back** and **Continue** separately from **Cancel**. Prevent accidental losses when navigating away; make each control semantically correct (Back does not submit).
- [x] Create with `POST /api/v1/trips`, using actual route/layout **ID strings**, ISO timestamps representing **WAT** (offset `+01:00` or equivalent UTC instant), and `pricing: { baseFare, seatOverrides }`.
- [x] Departure must be strictly in the future at creation; estimated arrival (if present) must be later than departure. Validate in UI and show backend field errors.
- [x] After success, refresh the correct list/detail with populated reads; the create response contains ID strings and the trip starts `SCHEDULED` with no bookings.
- [x] Test dates near WAT midnight and in browsers outside Africa/Lagos. Never derive WAT date filters by naively slicing a UTC ISO timestamp.

## Milestone 3 — Manage existing trips

**Goal:** Clear, status-aware actions with safe handling of reservations and existing fares.

- [x] Show only permitted actions for a user's role **and the trip's current status**.
- [x] For `SCHEDULED` trips, edit departure/estimated-arrival and pricing through `PATCH /api/v1/trips/:id`. Send only changed fields, except **when pricing changes, send the entire `pricing` object including retained overrides**.
- [x] Support clearing arrival via `estimatedArrivalTime: null`; use `seatOverrides: []` when explicitly clearing all overrides. **Omit untouched departureTime**, because sending it re-runs future-time validation on old scheduled trips.
- [x] Preserve arrival-after-departure validation, with clear field errors.
- [x] Provide a **Change layout** flow for Admin and Operations Manager only: compare the **saved trip snapshot** with the **new active template** side by side; call booked-seats to flag booked seats missing from the replacement.
- [x] Use `PATCH /api/v1/trips/:id/vehicle-layout` with the selected layout ID. On success show `removedSeatPrices` warnings, reload trip detail and booked seats, and use the new snapshot.
- [x] Handle `409` concurrency conflicts by refreshing the trip and prompting review, not blindly retrying.
- [x] Do **not** expose the replacement layout picker to Terminal Managers: current catalog endpoints return `403` for that role despite the trip API supporting a change.
- [x] Implement manual status transitions via `PATCH /api/v1/trips/:id/status`:
  - `SCHEDULED` → **Mark departed** (`DEPARTED`) or **Cancel trip** (`CANCELLED`).
  - `DEPARTED` → **Mark completed** (`COMPLETED`).
  - `COMPLETED` / `CANCELLED` → read-only.
- [x] Use confirmations for consequential status changes, especially departure/cancellation. Explain that cancellation is blocked when booked seats exist; do not suggest an unsupported cancellation workaround.
- [x] Do not automatically mark a trip departed just because the scheduled time passed. Refresh detail/manifest after status changes.

## Milestone 4 — Copy a day and manifests

**Goal:** Make repeat scheduling safe and manifests easy to use without creating a full booking module.

### Copy a day

- [x] Provide **Copy a day** in Trips, for Admin, Operations Manager, and Terminal Manager (own-origin only).
- [x] Use a focused planner: choose a **source WAT calendar date**, load all that day's trips **across pages**, choose eligible source trips, select target dates within the **seven calendar days after the source date**, and review each proposed copy.
- [x] Preserve route, departure clock time, estimated-arrival offset (including next-day arrival), and fares where supported. Never copy passenger bookings, reservations, or status.
- [x] Prevent cancelled sources; departed/completed sources can be copied if their route/layout remain active and the resulting departures are future times.
- [x] For Terminal Managers, reuse source layout by **omitting `vehicleLayout`** for each copy. Do not show a replacement layout picker they cannot load. Admin/Operations Manager may choose eligible active replacements.
- [x] Call `POST /api/v1/trips/copy-day` with `checkOnly: true` first. Present `tripCount`, **per-date/per-trip `problems`**, and `removedSeatPrices` warnings clearly. **HTTP 200 does not mean the batch is ready if `problems` is nonempty.**
- [x] Require a fresh successful check after changes before the final Save; then call again with `checkOnly` omitted/false. Disable repeat submissions while pending.
- [x] Refresh affected dates after success. If a save response is lost, review target timetable before retrying to avoid accidental duplicate departures.
- [x] Display errors for invalid target windows, duplicate dates/sources, inactive route/layout, unauthorized origin, or already-passed departure.

### Manifest and booked seats

- [x] Provide an authorized **View manifest** action on Trip details; use `GET /api/v1/trips/:id/manifest`.
- [x] Show trip/route summary, server-provided counts (`confirmed`, `checkedIn`, `activePassengers`, `missed`, `seatsSold`), the passenger list in API seat order, and a **separate missed-passengers list**.
- [x] Use manifest `trip.capacity` for manifest capacity, not current template capacity.
- [x] Handle an empty manifest gracefully; respect restricted manifest roles.
- [x] Keep booking, payment recording, passenger check-in, ticket lookup, and staff-assisted booking **out of scope** unless there is already an implemented destination to link to. Do not create dead action buttons.

## API contract quick reference

| Endpoint | Purpose |
| --- | --- |
| `GET /trips?page=&limit=&route=&departureDate=&status=` | Paginated directory; earliest departure first |
| `GET /trips/:id` | Detail with **seatLayoutSnapshot** |
| `POST /trips` | Schedule a trip |
| `PATCH /trips/:id` | Edit times and/or pricing for `SCHEDULED` |
| `PATCH /trips/:id/vehicle-layout` | Replace layout (requires booked-seat review) |
| `PATCH /trips/:id/status` | Manual status transition |
| `POST /trips/copy-day` | Check (`checkOnly: true`) and save copied trips |
| `GET /trips/:id/booked-seats` | Confirmed occupied seat labels |
| `GET /trips/:id/manifest` | Passenger manifest |
| `GET /routes` | Full business routes array; use active routes for new trips |
| `GET /vehicle-layouts` | Full business layouts array; use active layouts for new trips |

All relative endpoints above use the frontend's existing API base `/api/v1`. Verify actual DTOs, guards and response wrappers before coding.

## Shared verification checklist

- [x] WAT display/input/date handling works for today, overnight journeys, and around UTC midnight, regardless of browser timezone.
- [x] Exact create/update payloads conform to DTOs; `pricing` behavior and cleared fields are correct.
- [x] Trips are server-paginated; routes and vehicle layouts are loaded as complete arrays (under the current backend contract).
- [x] Existing trip seats/prices use the **saved snapshot** and not a changed template.
- [x] Authenticated selected-business and own-origin access rules are respected in list, detail, pickers and actions.
- [x] No fake data, missing-content crashes, unauthorized action controls, stale-business data, or duplicate submissions.
- [x] Loading/empty/error/retry states and meaningful 400/401/403/404/409 errors.
- [x] Mobile, tablet, desktop; dark and light themes; keyboard accessible controls and seat-map interactions.
- [x] Relevant frontend tests pass and production Angular build passes.
- [x] Update the frontend README Workspace section only after the corresponding feature actually ships.

## Execution / progress notes

Implement **one milestone at a time**, keeping this checklist current. For each milestone, note what changed, what remains, any deviations from the backend handoff, tests/build status, and actual visual checks. Do not create commits unless asked. Avoid large unrelated refactors.

**Progress log**

- **Milestone 1.** Added the Trips directory, WAT filters, server pagination, and trip detail with the saved seat snapshot and booked-seat overlay. Verified the Trips controller, DTOs, service, role guards, and pagination helper. Chromium fixtures exercised all six role profiles, including inaccessible trips from the other origin for Terminal Managers and Booking Agents.
- **Milestone 2.** Added the three-step scheduling flow, active route and layout pickers, and per-seat fares on the shared renderer. The draft stays in the current workspace session when operators follow setup links. Chromium exercised the setup round trip, discard confirmation, keyboard seat selection, and overnight scheduling from an America/Los_Angeles browser. Unit tests cover WAT midnight and numeric fare bounds.
- **Milestone 3.** Added changed-field edits, snapshot-to-template comparison, and manual status transitions. Verified conflict refresh, preserved fares, arrival clearing, booked-seat checks, and removed-price notices through browser fixtures. Opening the manifest after a status change reads fresh data.
- **Milestone 4.** Added multi-page Copy a day with per-date choices, preview validation, and refreshed target timetables. Added manifests with server counts and a separate missed-passengers table. Terminal Manager copies leave the layout field out because the catalog is restricted to Admin and Operations Manager. Chromium exercised a preview with blocking problems, a fresh check after plan changes, a successful copy with zero bookings, and a save with an uncertain response.
- **Verification.** The Angular test suite passed 151 tests. The production build, the existing API smoke check, and unauthenticated access checks on all Trips read endpoints passed. Visually inspected the directory, scheduling, detail, layout replacement, copy planner, and manifest in Chromium. The tested states had no axe violations or horizontal page overflow at 360, 768, and 1440 px across light and dark themes. Signed-in browser checks used controlled API responses. Live staff credentials were unavailable for role-specific reads or writes.

**Remaining acceptance**

- [ ] Repeat authenticated checks against a disposable business with staff memberships for all six roles.

**Backend behavior to account for.** Copy requests have no idempotency key. When a save response cannot be confirmed, the planner refreshes the target dates and asks the operator to review the timetable before checking again.
