# Vehicle layouts and trips in the operator portal

This handoff describes the current API and the screens it supports. Vehicle
layouts, routes, trips, booked-seat reads, and manifests are implemented in the
backend. The sidebar order and rollout sequence below are frontend proposals.

- [Navigation and setup](#navigation-and-setup)
- [Roles and branch scope](#roles-and-branch-scope)
- [API conventions](#api-conventions)
- [Vehicle layout directory and editor](#vehicle-layout-directory-and-editor)
- [Trip directory and detail](#trip-directory-and-detail)
- [Schedule a trip](#schedule-a-trip)
- [Manage an existing trip](#manage-an-existing-trip)
- [Copy a day](#copy-a-day)
- [Booked seats and manifests](#booked-seats-and-manifests)
- [Implementation and acceptance checks](#implementation-and-acceptance-checks)
- [Source files](#source-files)

## Navigation and setup

Keep the existing **Operations** group and add the two screens in this order.

| Sidebar item    | What staff do there                                          | Depends on                                                          |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| Terminals       | Set up the physical departure and arrival locations.         | The primary terminal is created during business onboarding.         |
| Routes          | Define a direction between two different terminals.          | Two terminals in the business.                                      |
| Vehicle layouts | Define reusable seat arrangements such as `Sienna 7-seater`. | Layouts are company-wide and can be created before or after routes. |
| Trips           | Schedule and run individual departures.                      | Each new trip needs an active route and an active layout.           |

Use **Vehicle layouts** in navigation and forms. A layout represents the seat
arrangement and can serve several trips at the same time. Plate numbers, vehicle
locations, fleet assignment, and vehicle schedule conflicts are outside this
workflow. A route defines origin and destination. A trip owns the departure
time, estimated arrival, fare, assigned layout, and seat snapshot.

The normal setup path is **Terminals → Routes → Vehicle layouts → Trips**.
Use `/app/vehicle-layouts` and `/app/trips` as the new directory routes.
On the new-trip screen, explain an empty route picker with **Create a route**
or direct the operator to reactivate an existing route. Explain an empty layout
picker with **Create a vehicle layout** or the link to manage existing layouts.
Use role-appropriate links, and preserve the trip draft if the operator leaves
to complete setup. A route can be intrastate, and its reverse direction is a
separate record. Label choices with origin and destination terminal names and
use city/state details where they help distinguish terminals.

## Roles and branch scope

The API uses `BRANCH_MANAGER` for the **Terminal Manager** role. A trip's branch
for authorization is its route's **origin** terminal. All access is scoped to
the signed-in business. An authenticated employee of a pending business can
read permitted data. Transport writes require an active business.

| Capability                                                       | Admin / Operations Manager | Terminal Manager | Booking Agent   | Accountant / Driver |
| ---------------------------------------------------------------- | -------------------------- | ---------------- | --------------- | ------------------- |
| List terminals and routes                                        | Business-wide              | Business-wide    | Business-wide   | Business-wide       |
| View or manage the vehicle-layout catalog                        | Yes                        | No               | No              | No                  |
| List trips, view detail, read booked seats                       | Business-wide              | Own origin only  | Own origin only | Business-wide       |
| Schedule a new trip                                              | Yes                        | No               | No              | No                  |
| Edit schedule or fares, change layout, change status, copy a day | Business-wide              | Own origin only  | No              | No                  |
| Read a trip manifest                                             | Business-wide              | Own origin only  | Own origin only | No                  |

On trips, show write actions only for the applicable roles and statuses. Hide
vehicle layouts navigation and guard its direct routes for users without
catalog access. For terminal managers and booking agents, limit trip route
filter choices by `route.originBranch._id === employee.branch`. Historical
trips and filters can include inactive routes. A nonmatching route filter gives
an empty list. A direct same-business trip from another origin gives `403`.
Missing or foreign trip IDs give `404` for callers with a valid branch scope.
If the employee's branch is missing, surface the API's `403` message.

### Layout picker for terminal managers

The trip API accepts a layout change or a copy with a replacement layout for
a terminal manager's own departure. The current layout catalog **list and
detail** endpoints return `403` to that role. The assigned layout summary and
trip snapshot still come back in the trip response.

For the first release, let terminal managers copy their own day using the
source layout by omitting `vehicleLayout` in each copy. Enable the replacement
picker and the change-layout action for admins and operations managers, who
can load active layouts. If terminal managers need those two controls, agree
on a scoped, read-only source of eligible layouts before exposing them. A copy
using a now-inactive source layout will show a problem in the check response.

## API conventions

Paths below include the `/api/v1` prefix. The Angular `Api` client already
uses the configured API base, so services typically pass paths such as
`/vehicle-layouts` or `/trips`. Use the existing authenticated client and its
standard error handling.

- Success wraps the payload as `{ success, statusCode, message, data }`.
- Errors have `success: false`, `statusCode`, `error`, and `message`. `message`
  can be a string or an array. Show specific validation messages alongside the
  affected fields or in the screen's error summary.
- Trips paginate. `data` contains `content`, `total`, `pageSize`,
  `currentPage`, `totalPages`, `hasNext`, `hasPrev`, and optional `nextPage`
  and `previousPage`. `page` starts at 1 and `limit` defaults to 10. `pageSize`
  is the actual number of rows returned on that page. Reset to page 1 when
  filters or the page limit change.
- `GET /api/v1/vehicle-layouts` returns the complete catalog in `data` as an array.
- `GET /api/v1/branch` and `GET /api/v1/routes` return complete arrays in
  `data`. Reuse the existing route and terminal clients for lookups. See
  [branch and route lists](FRONTEND_BRANCH_ROUTE_LISTS.md).
- On `403`, show an access or business-status message. On `404`, handle a
  missing record or a stale selection. For duplicate layout names the API
  returns `409`. Trip write conflicts also return `409` and require a refresh
  before the operator retries.

## Vehicle layout directory and editor

### Endpoints

| Request                                           | Input                                                           | `data` on success                                                     |
| ------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------- |
| `GET /api/v1/vehicle-layouts`                     | None                                                            | Full layout records for the authenticated business, newest first, including `seatLayout`. |
| `GET /api/v1/vehicle-layouts/:id`                 | Layout ID                                                       | One full layout.                                                      |
| `POST /api/v1/vehicle-layouts`                    | `name`, `type`, `seatLayout`, and `customType` for `OTHER`      | New layout with `status: "ACTIVE"` and calculated `capacity` (`201`). |
| `PATCH /api/v1/vehicle-layouts/:id`               | Changed `name`, `type`, `customType`, `seatLayout`, or `status` | Saved layout (`200`). Send the full grid if changing `seatLayout`.    |
| `PATCH /api/v1/vehicle-layouts/:id/toggle-status` | Layout ID                                                       | Saved layout with `ACTIVE` and `INACTIVE` flipped (`200`).            |

### Directory and layout data

The directory reads the array directly from `data`, with `[]` for an empty
catalog. It shows name, type, passenger capacity, and status. Case-insensitive
name and custom-type search combines with the local vehicle-type and status
filters. All statuses are visible by default. For trip pickers with catalog
access, filter the array locally to `ACTIVE`.

Each row links to its detail page and supports native link behavior, including
Ctrl+Click and opening in a new tab. The separate **Actions** menu provides view,
edit, and activate or deactivate actions according to workspace permissions.

`LayoutApi` keeps an in-memory cache scoped to the authenticated session and
business. View and edit reuse complete records from the catalog. When a record
is missing from memory, such as after a refresh or in a new tab, the frontend
fetches it by ID. Successful creates, edits, and status changes invalidate the
catalog and cache the returned record for subsequent detail reads. The
directory refreshes after a status change or an uncertain toggle result.
Switching businesses starts with a fresh cache.

### Editor behavior

Use a dedicated workspace page with **Details** and **Seat layout**. On desktop,
keep the preview visible beside the editor. On mobile, use sequential steps
and give the seat grid enough room for touch. Keep the same renderer for
presets, editing, trip previews, pricing, and read-only seat views.

- **Back** returns from **Preview layout** to the seat editor, then from the
  editor to **Vehicle details**. The seating draft survives both transitions.
  **Cancel** leaves the workspace after confirmation if there are unsaved changes.
- Name and vehicle type are required. Trim the name and limit it to 120
  characters. Names are unique within the company after trimming and are
  case-sensitive. Put the `409` duplicate message on the name field.
- Types are `CAR`, `SIENNA`, `BUS`, `COASTER`, `LUXURY_BUS`, `BOAT`, and `OTHER`.
  Show `customType` only for `OTHER`. It is required for that type and limited
  to 80 characters. Omit it for predefined types, including when switching
  back from `OTHER`.
- Presets are frontend data. Sienna 7, Sienna 8, Bus 14, Bus 18, and Coaster 30
  are candidates. Offer a miniature top-down preview and seat count per
  preset. Confirm the physical floor plans before treating draft arrangements
  as defaults. Provide **Custom** or **Edit layout** with Seat, Aisle, and
  Driver tools, row/column controls, seat renumbering, and reset to preset.
  A single driver position for applicable road layouts is an editor rule.
  The backend does not enforce driver count.
- Render from front to rear using row numbers and the saved cell order within
  each row. Preserve blank spaces as `AISLE`, which represents walkways and
  gaps. Keep seat labels readable and auto-number passenger cells only. Make
  capacity a read-only count of `SEAT` cells.
- Rows have unique positive integer `row` values and at least one cell each.
  Include at least one row and at least one passenger seat in the layout.
  `SEAT` cells require a trimmed string `seatNumber` of at most 20 characters.
  Seat numbers are unique ignoring case and can be alphanumeric, such as
  `1A`. `AISLE` and `DRIVER` cells omit `seatNumber`.
- On create, send just the editable fields. The API sets `status` and
  calculates `capacity`. Seat rows and cells carry no internal ID or seat key.

Example create payload for a compact layout with four passenger seats.

```json
{
  "name": "Car 4-seater",
  "type": "CAR",
  "seatLayout": {
    "rows": [
      {
        "row": 1,
        "cells": [
          { "type": "DRIVER" },
          { "type": "AISLE" },
          { "type": "SEAT", "seatNumber": "1" }
        ]
      },
      {
        "row": 2,
        "cells": [
          { "type": "SEAT", "seatNumber": "2" },
          { "type": "SEAT", "seatNumber": "3" },
          { "type": "SEAT", "seatNumber": "4" }
        ]
      }
    ]
  }
}
```

The new record has `capacity: 4` and is available in the active layout
picker. Deactivating it removes it from new-trip and replacement choices.
Editing or deactivating a template leaves the seat snapshots on existing
trips intact. Use activation controls for lifecycle management. The API
exposes no delete operation for layouts.

## Trip directory and detail

| Request                                  | Input                                               | `data` on success                                                                |
| ---------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------- |
| `GET /api/v1/trips`                      | `page`, `limit`, `route`, `departureDate`, `status` | Paginated trips, earliest departure first. Populated route and layout summaries. |
| `GET /api/v1/trips/:id`                  | Trip ID                                             | One trip with populated summaries and `seatLayoutSnapshot`.                      |
| `POST /api/v1/trips`                     | Route/layout IDs, times, and pricing                | A `SCHEDULED` trip with its snapshot and `bookedSeatCount: 0` (`201`).           |
| `PATCH /api/v1/trips/:id`                | Changed times or full `pricing`                     | Updated trip (`200`).                                                            |
| `PATCH /api/v1/trips/:id/vehicle-layout` | `{ "vehicleLayout": "<id>" }`                       | `{ trip, removedSeatPrices }` (`200`).                                           |
| `PATCH /api/v1/trips/:id/status`         | `{ "status": "<next status>" }`                     | Updated trip (`200`).                                                            |
| `POST /api/v1/trips/copy-day`            | Source day, target days, and selected copies        | Check/save summary (`200` in both modes).                                        |
| `GET /api/v1/trips/:id/booked-seats`     | Trip ID                                             | `{ seatNumbers }`.                                                               |
| `GET /api/v1/trips/:id/manifest`         | Trip ID                                             | `{ trip, summary, passengers, missedPassengers }`.                               |

The directory filters by route ID, trip status, and a Nigerian calendar date
such as `departureDate=2027-01-12`. Use a date filter for quick access to
today's departures. Omitting it returns all dates, including past trips. The
backend has no trip text search. Show origin/destination, departure in WAT,
status, layout name, base fare, and booked count where useful. A base fare
represents the default seat price and may differ from individual seat fares.

- Read responses populate `route` with `_id`, `status`, `originBranch`, and
  `destinationBranch`. Terminal summaries have `_id`, `name`, and `address`.
  `vehicleLayout` includes `_id`, `name`, `type`, optional `customType`, and
  the current layout `capacity`. Allow for null populated references and
  missing terminal details. The detail and manifest endpoints have additional
  authorization and metadata checks when origin access must be established.
- Write responses use route and layout **ID strings**. After a create or
  update, reload trip detail or the affected list before reusing the populated
  model. Keep separate frontend types for reads and writes.
- The trip list omits `seatLayoutSnapshot`. For an existing trip, use its
  **detail snapshot** for layout rendering, seat fares, and capacity. The
  populated `vehicleLayout.capacity` reflects today's template, which can
  differ after an edit. Show `bookedSeatCount` by itself on the list and use
  manifest `trip.capacity` when showing a manifest.

## Schedule a trip

1. Choose an active route from the route list. The trip keeps that route after
   creation. Changing route later requires a new trip.
2. Enter departure date and time and optionally estimated arrival date and
   time. Capture both arrival date and time for overnight journeys.
3. Choose an active vehicle layout and preview its current grid and capacity.
4. Enter one default fare. Offer optional per-seat prices on the same grid.
   Select passenger seats, apply a price, and allow clearing overrides. If
   the operator changes the layout before saving, review overrides for seats
   missing from the newly selected layout.
5. Confirm the route, WAT times, layout, and pricing. Submit the IDs and form
   values. The server creates the seat snapshot from the active template.

Handle time entry and display in **West Africa Time** (`Africa/Lagos`, UTC+01:00)
even if the browser is in another time zone. Send timestamps with `+01:00` or
an equivalent UTC instant. `08:00 WAT` is `07:00Z` on the same date. Use
`YYYY-MM-DD` for date filters and copy days. Derive those dates in WAT before
formatting. A UTC slice can pick the previous date near a WAT midnight.
Departure must be strictly in the future at creation, including later today.
If supplied, estimated arrival must be later than departure. Date and time from
the API serialize as ISO strings and should be displayed back in WAT.

Fares are JSON numbers in whole **naira**, from `100` to `Number.MAX_SAFE_INTEGER`.
An override changes only the named seat and uses the layout's displayed seat
number. Matching is case-insensitive, and the server keeps the layout's
spelling. Unknown or duplicate override seats return `400`. The API stores
`seatOverrides: []` when none are supplied. Format with the naira symbol for
display and send the numeric amount on the wire.

```json
{
  "route": "6af96f0c81a0847d2dd587d9",
  "vehicleLayout": "6af96f0c81a0847d2dd587dc",
  "departureTime": "2027-01-12T08:00:00+01:00",
  "estimatedArrivalTime": "2027-01-12T16:00:00+01:00",
  "pricing": {
    "baseFare": 18000,
    "seatOverrides": [{ "seatNumber": "1", "fare": 22000 }]
  }
}
```

## Manage an existing trip

### Edit times or pricing

`PATCH /api/v1/trips/:id` applies to `SCHEDULED` trips. Send only changed
fields. Send `estimatedArrivalTime: null` to clear the estimate. When editing
pricing, send the entire `pricing` object, including retained overrides. Set
`seatOverrides: []` to return all seats to the new or existing base fare.
Omit `departureTime` if it was left untouched. Sending it invokes future-time
validation even on a scheduled trip whose departure time has already passed.
Changing either time still has to preserve the arrival-after-departure rule.
Show the field error if the operator moves departure past a saved arrival.

### Change the vehicle layout

`PATCH /api/v1/trips/:id/vehicle-layout` assigns an active layout to a
`SCHEDULED` trip. Preview the proposed replacement next to the saved snapshot.
Use `GET /api/v1/trips/:id/booked-seats` to flag missing seats before saving.
The server checks confirmed reservations again and rejects a layout that
omits any reserved seat number, ignoring letter case. It replaces the trip
snapshot on success and returns the dropped override labels in
`data.removedSeatPrices` as a string array. Seat prices on retained labels
carry over and the base fare stays the same. Reload detail and booked seats
after a successful change. A `409` means a concurrent write invalidated the
change. Reload and let the operator review the current trip before retrying.

### Change status

| Current status             | Available commands                   | Result                           |
| -------------------------- | ------------------------------------ | -------------------------------- |
| `SCHEDULED`                | **Mark departed** or **Cancel trip** | Sends `DEPARTED` or `CANCELLED`. |
| `DEPARTED`                 | **Mark completed**                   | Sends `COMPLETED`.               |
| `COMPLETED` or `CANCELLED` | Read-only                            | These statuses are terminal.     |

Status changes are manual. Passing the scheduled time leaves the trip
`SCHEDULED`. Before departure, make check-in easy to reach and confirm the
action. Marking a trip departed leaves checked-in passengers on the manifest
and marks remaining confirmed bookings as missed. This is done as part of the
departure transaction. When cancelling, the server requires the trip to have
zero booked seats. Guide the operator to handle existing bookings first.
Refresh the trip and any open manifest after a status change.

## Copy a day

Use this workflow to reproduce a timetable over the next few days. The source
day and targets are WAT calendar dates. The target window is the seven calendar
days **after the source date**. Each copied departure must still be in the
future at the time of checking or saving.

1. Pick the source day and load its trip list with `departureDate`, across
   pages as needed. Let the operator select trips for each target day. A
   cancelled source is ineligible. Departed and completed sources can be
   copied when their route and selected layout are active.
2. Keep the route, departure clock time, and estimated arrival offset from
   the source, including next-day arrival. Preserve fares for seats present
   in the selected layout. Permit omitting trips or choosing a replacement
   layout where the catalog is accessible. The server snapshots the selected
   **current template** even when keeping the source's layout ID. An edited
   template can therefore drop overrides in a copy of its original trip.
3. Submit the selection with `checkOnly: true`. Show every per-copy problem
   by target date and source trip, and show `removedSeatPrices` warnings.
   `tripCount` counts the valid copies. A `200` with a nonempty `problems`
   array still requires changes before saving. Recheck after changing inputs.
4. Submit the reviewed selection with `checkOnly` omitted or `false`. The
   API validates again and saves the whole batch in one transaction. It
   returns a count and any dropped prices. Reload the relevant dates. Disable
   repeat submissions while the save is pending. If the response is lost,
   check the target timetable before retrying, since another valid copy can
   create additional trips.

```json
{
  "fromDate": "2027-01-12",
  "days": [
    {
      "date": "2027-01-13",
      "trips": [{ "sourceTrip": "6af96f0c81a0847d2dd587d8" }]
    },
    {
      "date": "2027-01-16",
      "trips": [
        {
          "sourceTrip": "6af96f0c81a0847d2dd587d8",
          "vehicleLayout": "6af96f0c81a0847d2dd587df"
        }
      ]
    }
  ],
  "checkOnly": true
}
```

| Response                                           | Meaning                                                                                                                                               |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data: { tripCount, problems, removedSeatPrices }` | Preview. `problems` entries are `{ date, sourceTrip, message }`. Warnings are `{ date, sourceTrip, seatNumbers }`.                                    |
| `data: { tripCount, removedSeatPrices }`           | All valid copies were created, each `SCHEDULED` with zero bookings.                                                                                   |
| `400` with `message`                               | Invalid dates, duplicate target dates, repeated source within a target date, or validation problems during save. Each target needs at least one trip. |
| `403`                                              | The request contains an unauthorized origin for this terminal manager, in either mode. Handle at the request level.                                   |

Examples of per-copy preview problems include a missing trip, a trip from a
different source day, a cancelled source, an inactive route or layout, and a
target departure that's already passed. Dropped seat prices are warnings.
Bookings, reservations, and actual status from the source never carry over.

## Booked seats and manifests

- To draw a seat map, fetch `GET /api/v1/trips/:id` for the snapshot and
  `GET /api/v1/trips/:id/booked-seats` for confirmed reservation seat labels.
  Apply seat overrides to the snapshot seats and mark occupied seats using
  case-insensitive matching. These reads describe current availability. On
  a staff booking conflict, refresh booked seats and let the agent choose
  again. Booking is available on `SCHEDULED` trips to roles that can book.
- To open a manifest, read `GET /api/v1/trips/:id/manifest`. Its `trip` holds
  the journey and snapshot capacity. `passengers` holds confirmed and checked-in
  passengers. `missedPassengers` holds missed tickets, including missed tickets
  later reused. Preserve the API's seat order and show a separate missed list.
  Customer-requested cancellations are excluded. Use server-provided counts
  for `confirmed`, `checkedIn`, `activePassengers`, `missed`, and `seatsSold`.
  Read [manifest types](../src/transport/trips/types/trip-manifest.types.ts)
  and [the manifest contract](MANIFESTS_DESIGN.md#c-manifest-contract) for entry
  fields and examples.
- Ticket lookup, check-in, payment recording, and seat booking use the
  [bookings controller](../src/bookings/bookings.controller.ts). See
  [staff-assisted booking](FRONTEND_IMPLEMENTATION_NOTES.md#staff-assisted-booking)
  for that workflow. The trip screens can link to these actions as the booking
  UI is wired up.

## Implementation and acceptance checks

| Build order                             | Verify                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Layout directory and editor          | Create an active layout from a preset or custom grid and check its returned capacity. Verify create, edit, and reactivation refresh the directory. Check that filters reuse one catalog read, row links and Actions work independently, view and edit reuse cached seat grids, and a refreshed detail page fetches by ID. Confirm duplicate seat labels are rejected regardless of case and a duplicate name surfaces the `409` next to the field. |
| 2. Trip directory, detail, and creation | Schedule with an active route and layout. Test empty setup, later-today and overnight departures, a WAT date near UTC midnight, and preservation of a trip snapshot after editing its template. Check pagination and that an inactive route remains usable as a historical list filter.                                                    |
| 3. Editing, layout and status           | Clear the arrival estimate, retain or clear seat prices, and show the `409` recovery path. Verify replacing a layout fails when a booked seat is missing and reports dropped prices after a valid save. Verify cancellation with bookings is refused and departure moves unchecked passengers to the missed list.                          |
| 4. Copy and manifest                    | Preview both errors and dropped prices, save a corrected batch, and confirm correct WAT dates and zero bookings on copies. Exercise terminal manager and booking agent access with one departure from their branch and one arriving there. Test manifest access for drivers and accountants and verify an empty manifest renders normally. |

## Source files

### Backend

| Question                                     | Start here                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| What layout endpoints can my role call?      | [Vehicle layouts controller](../../../e-transit-book/src/transport/vehicle-layouts/vehicle-layouts.controller.ts), [role guards](../../../e-transit-book/src/common/guards/employee-role.guard.ts) |
| What do we send for a layout?                | [Create DTO and seat types](../../../e-transit-book/src/transport/vehicle-layouts/dto/create-vehicle-layout.dto.ts), [update DTO](../../../e-transit-book/src/transport/vehicle-layouts/dto/update-vehicle-layout.dto.ts), [example grid](../../../e-transit-book/src/transport/vehicle-layouts/dto/vehicle-seat-layout.example.ts) |
| How are capacity and lifecycle enforced?     | [Layout service](../../../e-transit-book/src/transport/vehicle-layouts/vehicle-layouts.service.ts), [layout schema](../../../e-transit-book/src/transport/vehicle-layouts/schema/vehicle-layout.schema.ts) |
| How do we pick terminals and routes?         | [Branch controller](../src/branch/branch.controller.ts), [routes controller](../src/transport/routes/routes.controller.ts), [routes service](../src/transport/routes/routes.service.ts)                                                                                                                                                                |
| Which trip actions and request fields exist? | [Trips controller](../src/transport/trips/trips.controller.ts), [create and pricing DTO](../src/transport/trips/dto/create-trip.dto.ts), [list filters](../src/transport/trips/dto/list-trips.dto.ts), [update DTO](../src/transport/trips/dto/update-trip.dto.ts), [copy DTO](../src/transport/trips/dto/copy-trips-day.dto.ts)                       |
| How do trip reads and writes behave?         | [Trips service](../src/transport/trips/trips.service.ts), [trip schema and status transitions](../src/transport/trips/schema/trip.schema.ts), [branch access helper](../src/utils/helpers.ts)                                                                                                                                                          |
| Where are response wrappers and examples?    | [Response formatter](../src/common/interceptors/response-formatter.ts), [error filter](../src/common/error/all-error-exceptions.ts), [pagination helper](../src/utils/paginate.helper.ts), [trip HTTP tests](../src/transport/trips/trips.controller.spec.ts), [trip service tests](../src/transport/trips/trips.service.spec.ts)                      |

The [transport architecture](../ARCHITECTURE.md#transport-module) describes
the module and persistence rules. The [original trip design](TRIPS_DESIGN.md)
records the feature rationale. Use the current controller, DTOs, and service
if a historical design example differs from the implementation.

### Existing Angular frontend

Paths below are relative to the `e-transit-book-fe` repository.

| Reuse                                                 | File                                                                                                                                |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Operations navigation and workspace routes            | `src/app/core/layout/operator-shell/operator-shell.ts`, `src/app/app.routes.ts`                                                     |
| Role checks, tenant scope, and authenticated session  | `src/app/core/auth/workspace-access.ts`, `src/app/core/auth/routing.ts`, `src/app/core/auth/session.ts`                             |
| API envelopes and error summaries                     | `src/app/core/http/api.ts`, `src/app/core/http/api.models.ts`, `src/app/core/http/errors.ts`                                        |
| Existing terminal and route data                      | `src/app/features/workspace/workspace-data.ts`, `src/app/features/routes/routes.ts`, `src/app/features/routes/route-form.ts`        |
| Vehicle layout directory, cache, and workspace        | `src/app/features/vehicle-layouts/layout-directory.ts`, `src/app/features/vehicle-layouts/layout-api.ts`, `src/app/features/vehicle-layouts/layout-workspace.ts` |
| Directory search, filters, and pagination conventions | `src/app/shared/ui/directory-controls.ts`, `src/app/features/employees/employees.ts`, `src/app/features/employees/employees-api.ts` |
