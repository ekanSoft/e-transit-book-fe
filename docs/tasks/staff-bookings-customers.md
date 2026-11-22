# eTransitBook — Staff Bookings & Customers Frontend Task

> **Status:** Not started  
> **Frontend:** `C:\Users\PC\Documents\source-codes\e-transit-book-fe`  
> **Backend (read-only):** `C:\Users\PC\Documents\source-codes\e-transit-book`  
> **Purpose:** Deliver a simple, reliable walk-in booking workflow alongside a useful customer directory, ticket lookup, check-in, cancellation, and ticket reuse.

## Source of truth and scope

- [ ] Read frontend `AGENTS.md`, `README.md`, existing Trips/manifest pages, seat-map renderer, forms, API client, and `WorkspaceAccess` rules.
- [ ] In the backend, locate the document headed **“Staff-assisted bookings and customers”** under `docs/` (find by heading; do not assume its filename). Also read `docs/FRONTEND_IMPLEMENTATION_NOTES.md`, `docs/FRONTEND_TRANSPORT.md`, and the backend controllers/DTOs/services/guards it references. If that handoff is not in the backend repository, report the missing file and verify contracts directly against the source.
- [ ] Verify the current endpoints, response envelopes, validation, role/branch restrictions, and business settings against backend code. Treat the backend as read-only.
- [ ] Reuse existing Angular patterns: `src/app/shared/utilities/phone.ts`, `src/app/shared/forms/searchable-select.*`, `src/app/shared/ui/management-dialog.ts`, `src/app/shared/seat-map/seat-map.ts`, `src/app/features/trips/trip-api.ts`, `src/app/features/trips/trip-format.ts`, `src/app/core/auth/workspace-access.ts`, `src/app/core/http/api.ts`, and existing directory controls.
- [ ] Preserve the existing eTransitBook visual language: dark-first, permanently dark sidebar, light-mode support, consistent forms, tables, toasts, loading/empty/error states, and mobile behavior.

**In scope:** Customers directory/details/edit/history; phone-first lookup and inline customer creation; staff booking; bookings directory; ticket lookup/confirmation; check-in; cancellation; reuse of cancelled/missed tickets; links from Trips and manifests.  
**Out of scope:** Customer self-service, online checkout, card processing, proof-of-payment verification, temporary seat holds, automatic refunds, inventory/fleet management, and new backend endpoints.

## UX principles — keep this genuinely simple

- **Booking should begin where staff are working.** From a trip detail, show **Book a seat** with that trip already selected. From Bookings, support **New booking** with route/date/trip selection.
- **One booking = one passenger seat.** Do not add multi-seat cart behavior that the API doesn't support.
- **Use a guided flow**, e.g. **Trip & seat → Customer & contact → Payment & review → Ticket**. Keep step names short, allow Back without wiping progress, and distinguish Back from Cancel.
- Keep selection persistent through previous/next steps and recoverable failures; ask before discarding an in-progress booking.
- Use the existing visual seat-map renderer and the **trip's saved seat snapshot**, not the current vehicle-layout template. Clearly differentiate available, booked/unavailable, and selected seats; display the effective fare when selecting a seat.
- Prefer **phone-first customer lookup** to avoid duplicate records. Allow creating a customer in the flow without losing the trip, seat, or draft.
- Put optional/advanced details behind a calm interface. Avoid a huge all-at-once form and avoid additional dialogs that unnecessarily interrupt a booking agent.
- Use human-friendly terms: **Customers**, **Bookings**, **Find ticket**, **Next of kin**, **Payment method**, **Confirm booking**, **Check in**, **Cancel booking**, **Reuse ticket**.
- Make important irreversible or financially consequential actions explicit. Never claim a payment was processed online or a refund issued when the backend merely recorded staff-collected payment.

## Navigation and entry points

- [ ] Add **Bookings** under Operations and **Customers** under Management, following the existing sidebar and permissions. Avoid dead links.
- [ ] Provide `/app/bookings`, a new-booking route, and reasonable detail/ticket lookup routes according to existing route conventions. Provide `/app/customers` and an appropriate customer detail/history view.
- [ ] On authorized Trip details, **Book a seat** opens booking with the trip selected; link the existing manifest/ticket context into lookup or ticket detail where supported.
- [ ] On the Bookings page, offer clearly differentiated **New booking** and **Find ticket** actions.
- [ ] Preserve business-scoped navigation/state and meaningful return links; keep drafts when temporarily visiting a prerequisite screen, where feasible.

## Milestone 1 — Customer directory and phone-first flow

**Why a standalone Customers page?** Customer creation alone is not the goal. It becomes useful for looking up repeat passengers, correcting their contact details, and viewing their booking history. Build this page, but don't force operators to visit it before booking.

- [ ] Customer directory: paginated `GET /api/v1/customers` with backend-supported `page`, `limit`, and general `search`; show name, phone, optional email, and useful detail actions. Search resets to page 1; use accurate pagination metadata.
- [ ] Customer detail: `GET /api/v1/customers/:id`; show customer details and booking history using `GET /api/v1/bookings?customer=<id>` with pagination. Link each historical booking to its actual saved ticket/passenger details.
- [ ] Add customer: `POST /api/v1/customers` with first name, last name, Nigerian phone, optional email. Edit: `PATCH /api/v1/customers/:id` with only changed supported fields. Do not expose email clearing unless the backend contract supports it.
- [ ] Reuse the same create-customer form from the Customers page and inline from booking.
- [ ] Phone-first lookup: normalize formats `080...`, `234...`, and `+234...` to `+234...` and query `GET /api/v1/customers?phoneNumber=...` with proper URL encoding of the leading `+` (`%2B`). This is an **exact identity lookup**, not the general `search` parameter.
- [ ] After a valid full phone number, show loading → existing customer selector **or** an **Add customer** action with the phone prefilled. A failed lookup offers Retry, not a misleading “not found.” Ignore stale responses if the input changes.
- [ ] After inline creation, select the new customer and return to the booking draft with trip/seat preserved. A duplicate-phone `409` triggers another exact lookup and offers the existing record.
- [ ] Keep customer edits distinct from ticket passenger snapshots: changing the customer name later does not rewrite previously booked passenger details.

## Milestone 2 — Staff booking: trip, seat, customer, payment, ticket

### Find trip & seat

- [ ] From general Bookings, pick a route, a departure date in **WAT (`Africa/Lagos`)**, and a `SCHEDULED` trip; from Trip details, skip redundant selection.
- [ ] Respect origin-terminal permissions when showing eligible departures/actions, while preserving read access to booking records as documented.
- [ ] Fetch `GET /api/v1/trips/:id` and `GET /api/v1/trips/:id/booked-seats`; render `seatLayoutSnapshot`, existing seat-specific prices and base fare. Compare seat labels case-insensitively.
- [ ] Display seat number and effective fare clearly. Disable already-booked seats, permit exactly one seat selection, and support reviewing/change of selection before booking.
- [ ] Do **not** treat a visual seat selection as a hold. Seats are reserved only when `POST /api/v1/bookings` commits. Refresh current availability before confirmation as appropriate.
- [ ] A trip still marked `SCHEDULED` remains eligible for staff booking even if its departure time has passed, according to the current backend rule. Do not invent stricter frontend timing rules.

### Customer & passenger details

- [ ] Reuse the phone-first lookup/create flow; for a new sale, send the actual selected `customer` ID.
- [ ] Collect required **Next of kin** first name, last name, nonempty phone; optional email. Keep next-of-kin separate from customer contact information. Normalize Nigerian phone input consistently.
- [ ] Optional blood group only where documented; omit it if unentered. Older booking reads may have no next-of-kin or blood group.

### Payment & review

- [ ] Display the server-derived effective seat price in **whole naira**. A new booking sends `payment: { method }` only, where method is `CASH`, `TRANSFER`, or `POS`—**do not send amount**.
- [ ] Read business settings from `GET /api/v1/business`: `allowStaffBooking` plus cash/transfer/POS flags. Explicit `false` disables an option; missing payment-method flags permit it. Handle settings changing between render and submission.
- [ ] Explain accurately that Transfer/POS is **recording money staff already collected**, not initiating or verifying a payment. Do not mark an uncollected transfer as paid.
- [ ] Review screen includes journey, departure (WAT), passenger, selected seat, next of kin, effective fare and method, with simple edit/back navigation and a single **Confirm booking** action.
- [ ] Prevent double submission; preserve the draft and enable recovery on `400`, `403`, `404`, `409`, or network failure.

### Successful booking

- [ ] Submit `POST /api/v1/bookings` with trip ID, seat label, customer ID, next of kin, optional blood group, and payment method; never send generated fare, status, passenger snapshot, ticket code, business, or branch.
- [ ] On `201`, use `data.booking` and `data.transaction` to display a **ticket/confirmation**: ticket code, passenger, route, WAT departure, seat, fare, recorded payment, and convenient copy action. Success means the backend committed; do not wait for email or promise email delivery.
- [ ] Distinguish the ticket's fare from the transaction amount in any later reuse flow. Keep the create response to show the immediate payment receipt; later booking reads do **not** include transaction records.
- [ ] Refresh trip/booked-seat/booking data after success. Offer sensible **Book another seat** and **Back to trip/Bookings** choices; retain the trip where helpful while resetting passenger-specific details.

## Milestone 3 — Bookings directory, ticket lookup & check-in

- [ ] Bookings directory: `GET /api/v1/bookings` with server pagination and supported `trip`, `customer`, and `status` filters. Show saved passenger/ticket details, trip/departure when available, seat, fare, channel, status and relevant actions. Do not implement a fake server-side text search; that endpoint ignores `search`.
- [ ] **Find ticket** uses `GET /api/v1/bookings/tickets/:ticket`, not the list search. Trim, uppercase and URL-encode ticket input; show an actionable not-found state for `404`.
- [ ] Provide `GET /api/v1/bookings/:id` detail and stable navigation when an authorized user opens a booking directly. Handle nullable populated trip and missing legacy optional fields safely.
- [ ] Use ticket/booking reads for passenger snapshots and status; use booking `branch` for mutation visibility. A cross-terminal booking may be readable while its Check-in/Cancel action is unavailable.
- [ ] Check-in: only eligible `CONFIRMED` tickets on `SCHEDULED` trips, within permitted origin/booking branch. Call `PATCH /api/v1/bookings/tickets/:ticket/check-in` without a body; in Angular `Api.patch`, pass `null`. Refresh ticket and manifest on success; handle already checked-in/closed/concurrent changes gracefully.

## Milestone 4 — Cancel & reuse tickets

- [ ] Cancellation: allow eligible `CONFIRMED` or `CHECKED_IN` bookings on a `SCHEDULED` trip, subject to branch permissions. Confirm before `PATCH /api/v1/bookings/:id/cancel` with no body.
- [ ] Explain in confirmation that cancellation releases the seat **but does not issue a refund**. Refresh ticket, trip, booked seats and manifest after confirmation; handle `400`/`409` gracefully.
- [ ] Distinguish **customer-cancelled** from **missed at departure** using `status` + `cancellation.reason`. When staff mark a trip departed, unchecked confirmed bookings become missed; checked-in bookings remain checked in. Show missed passengers appropriately in manifests/history.
- [ ] Reuse flow starts from an eligible `CANCELLED` ticket without `reusedBy`. The original ticket stays cancelled and is reusable only once.
- [ ] Select a new `SCHEDULED` trip and available seat; authorize against the **new trip's origin terminal**, even if the original ticket is from another terminal.
- [ ] Use the old ticket's existing customer identity as defined by the backend. **Omit `customer`** from the reuse payload. Reconfirm next-of-kin information; an older booking may not have it.
- [ ] Offer **No additional payment** (omit `payment` completely) or **Record additional payment** (submit valid method and whole-naira `amount`). The operator enters the amount actually collected; the backend does **not** calculate a fare difference. Do not confuse the new seat's fare with additional collected amount.
- [ ] Send reuse via `POST /api/v1/bookings` with `previousTicket`, trip, seat, next of kin, and optional payment. Confirm using returned new ticket and transaction. Show original/replacement ticket links (`rebookedFrom`, `reusedBy`) where available.
- [ ] On old-ticket reuse conflict (`409`), refresh it and link to its existing replacement rather than suggesting duplicate reuse.

## Milestone 5 — Permissions, reliability & visual QA

- [ ] Use `BookingStaffGuard` semantics and centralized `WorkspaceAccess`: Admin and Operations Manager get business-wide customer/booking access; Terminal Manager and Booking Agent can read business-wide customers/bookings but perform origin-scoped booking/check-in/cancel operations; Accountant and Driver are denied customer/booking APIs.
- [ ] For Terminal Manager/Booking Agent, trip detail, booked-seat reads and manifests are own-origin-only; customer and booking list/ticket reads remain business-wide. No assigned branch means origin-scoped actions are unavailable. Pending businesses can read permitted records but writes require ACTIVE status.
- [ ] Block/hide actions consistently at route, control and handler levels while keeping backend guards authoritative. Invalidate sensitive state when switching businesses; ignore stale responses.
- [ ] Handle seat-taken or changed-trip `409` by reloading trip and booked-seat data, keeping the customer/next-of-kin/payment draft, clearing only invalid seat selection, and requiring a fresh fare review.
- [ ] Handle lost response after a possible successful booking by checking existing bookings/customer history before retrying; do not blindly resubmit an uncertain sale.
- [ ] Respect real API envelopes, validation messages, `401` global auth handling, `403` denied/business disabled, `404` stale/deleted, and `409` concurrent/duplicate cases.
- [ ] Verify at ~360px, 768px, and 1440px. Seat map must be tap-friendly for buses/coasters; date/times WAT-correct; booking flow readable in dark/light modes, with dark sidebar unchanged. Accessible dialogs, keyboard controls, labels, focus and error messaging.
- [ ] Run relevant tests and frontend production build. Test the full journey: lookup existing/new customer → choose seat → record payment → confirm ticket → find ticket → check in → cancel eligible ticket → reuse on another trip.
- [ ] Update the frontend README Workspace section with shipped features; no fake API data, backend modifications, or commits unless explicitly requested.

## UI decisions for the agent to make after inspection

- **Customers page:** Yes, implement it, but make it useful (search, edit, booking history) rather than a standalone record-creation destination. In the staff booking form, **inline find/add customer** is the primary entry path.
- **Booking form:** Prefer a dedicated page/stepper over a cramped modal. Keep a trip preselected when launched from Trips. Do not require staff to navigate away to create a customer.
- **Seat preview:** Reuse the existing trip snapshot renderer, with available/booked/selected visuals and a clearly visible price. Do not rewrite the Vehicle Layout editor or store seat availability in a layout template.
- **Payment:** Make it obvious whether staff are recording cash, transfer or POS collected. There is no external gateway checkout in this phase.
- **Ticket:** Keep the code visually prominent and copyable. Ticket status and actions should be easy to reach from a booking, a trip manifest, and Find ticket.

## Progress record (update as work proceeds)

| Milestone | Status | Notes / important decisions |
|---|---|---|
| 1. Customer directory & lookup | ☐ Not started | |
| 2. Staff booking & ticket creation | ☐ Not started | |
| 3. Bookings directory, lookup & check-in | ☐ Not started | |
| 4. Cancel & reuse tickets | ☐ Not started | |
| 5. Permissions, testing & documentation | ☐ Not started | |

### Handoff for a resumed session

Record: what is implemented, files affected, what actually passed testing, known blockers, outstanding checklist items, and any differences found between documentation and live backend code. **Do not mark a checkbox complete based only on a successful build.**
