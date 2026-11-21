# eTransitBook — Vehicle Layout Management & Visual Seat Editor

## Objective

Build the Vehicle Layouts feature for the eTransitBook operator portal, with particular emphasis on **simplicity, usability, visual seat arrangement, and an intuitive operator experience**.

The technical implementation has already been documented separately.

Your responsibility is to use that technical documentation to build a highly usable frontend experience, not merely a working CRUD interface.

This feature deserves special attention because transport operators must be able to represent the physical seating arrangements of their vehicles accurately without technical knowledge.

**The fundamental UX objective is simple:**

An operator should be able to choose a vehicle type, start from a familiar seating arrangement, adjust the positions visually, and save a reusable vehicle layout with minimal effort.

The operator should not need to understand JSON, arrays, seat coordinates, backend data models, or complicated seat-map design tools.

The finished experience should be simple enough for a transport company administrator who is not particularly comfortable with technology.

Do not stop at planning. Inspect the existing frontend, read the technical handoff, implement the feature, and verify its behavior.

---

## 1. Project and Technical Documentation

### Frontend repository

`C:\Users\PC\Documents\source-codes\e-transit-book-fe`

### Backend repository — Read-only reference

`C:\Users\PC\Documents\source-codes\e-transit-book`

### Technical specification

The attached document, **"Vehicle layouts and trips in the operator portal"**, is the primary technical handoff.

It describes:

- Navigation and operational dependencies.
- Access policies.
- API endpoints and response contracts.
- Vehicle layout directory.
- Vehicle layout creation and editing.
- Seat-grid structure.
- Validation rules.
- Layout lifecycle.
- How layouts are later selected by trips.
- How trip snapshots preserve seating arrangements.
- Backend source files and existing frontend components.

Read this document completely before implementation.

Focus particularly on its **Vehicle layout directory and editor** section.

Also inspect the backend files referenced by the handoff, including the vehicle-layout controller, service, DTOs, schema, and seat-layout example.

The technical handoff and verified backend implementation are authoritative for field names, supported operations, types, and validation.

**Do not independently invent API contracts or change the backend to accommodate a frontend design decision.**

### Scope of this phase

Implement Vehicle Layout Management first.

This includes:

- Vehicle layout directory.
- Create vehicle layout.
- Preset selection.
- Visual seat-layout editor.
- Custom seat arrangements.
- Preview.
- View existing layout.
- Edit layout.
- Activate/deactivate layout.

The technical handoff also explains Trips, but **do not implement the Trips feature in this phase**.

Instead, design the seat-layout renderer so it can be reused when implementing trip scheduling, seat pricing, and passenger booking later.

---

## 2. Preserve the Existing Design System

The existing eTransitBook frontend has already been redesigned and is functioning well.

Previous modules include:

- Dashboard.
- Terminals.
- Routes.
- Employees.
- Business settings.
- Shared management dialogs.
- Searchable dropdowns.
- Directory components.
- Theme support.
- Role-based navigation.

Do not redesign these features.

Inspect the existing shared UI components, styles, layout conventions, Tailwind theme tokens, and Angular architecture before creating new components.

The new Vehicle Layouts feature should feel like it belongs in exactly the same application.

Maintain:

- Dark mode as the default.
- Existing light-mode support.
- A sidebar that remains dark in both themes.
- Existing typography and spacing.
- Existing button, input, badge and dialog patterns.
- Responsive design conventions.
- Existing loading and notification patterns.

This feature does not need a completely different design system.

However, the seat-layout editor is a new type of interface, so it deserves a carefully designed, purpose-built component.

---

## 3. Operations Sidebar Structure

Organize the existing Operations navigation in the following order:

1. Terminals
2. Routes
3. Vehicle layouts
4. Trips

This is the natural setup progression for transport operators.

**Terminals** define departure and arrival locations.

**Routes** connect two terminals directionally.

**Vehicle layouts** define reusable physical passenger seating arrangements.

**Trips** combine a route, vehicle layout, departure schedule and pricing.

Important:

Vehicle layouts are independent of routes.

Operators should be able to create vehicle layouts even when they haven't created any routes.

Do not enforce unnecessary route or terminal dependencies in the Vehicle Layouts module.

Add the new route:

`/app/vehicle-layouts`

Use the existing navigation architecture.

Do not add a nonfunctional Trips navigation link if the Trips page hasn't been implemented.

---

## 4. The Most Important UX Decision — Presets First

Do not begin by displaying an intimidating empty grid and asking the operator to design a vehicle from scratch.

Instead, use a **preset-first workflow**.

When creating a vehicle layout, the operator should first enter basic information and then choose a starting arrangement.

### Suggested flow

**Step 1 — Vehicle Details**

The operator enters:

- Layout name.
- Vehicle type.

Examples:

- Sienna 7-seater
- Toyota Hiace 14-seater
- Coaster 30-seater

These are layout names, not registered physical vehicles.

Do not add vehicle plate numbers, fleet IDs, driver assignments, or location fields.

The backend supports these vehicle types:

- CAR
- SIENNA
- BUS
- COASTER
- LUXURY_BUS
- BOAT
- OTHER

Use user-friendly labels while preserving the backend enum values.

When OTHER is selected, reveal the required custom vehicle type field.

### Step 2 — Choose or Build the Seating Arrangement

Show suitable layout presets with miniature visual previews.

The technical handoff identifies candidate presets such as:

- Sienna 7
- Sienna 8
- Bus 14
- Bus 18
- Coaster 30

Also provide a **Custom Layout** option.

Each preset card should contain:

- A descriptive name.
- A miniature top-down seat arrangement.
- Passenger seat count.
- A clear selection state.

Do not create visually identical cards distinguished only by their names.

The operator should be able to understand the general seating arrangement before choosing.

**Important:** These are candidate presets, not verified physical layouts for every vehicle model.

Check available backend examples and product information before adopting specific physical arrangements as defaults.

Do not present speculative seating configurations as universal real-world standards.

Operators must be able to modify presets to match their actual vehicles.

### Custom Layout

Allow users to start from a simple editable grid when no preset matches.

Do not require them to go through a preset first.

### Preferred User Experience

Most users should be able to:

1. Enter a name.
2. Select their vehicle type.
3. Choose a suitable preset.
4. Make minor changes if necessary.
5. Save.

Only users with unusual seating arrangements should need extensive customization.

---

## 5. Use a Dedicated Editor Page

Do not squeeze the full seat-layout creation experience into a small modal.

The editor requires enough space to show the vehicle diagram and the editing controls clearly.

Use a dedicated workspace page.

Suggested routes:

`/app/vehicle-layouts/new`

`/app/vehicle-layouts/:id/edit`

Adapt to existing route conventions where necessary.

### Suggested Page Structure

**Header**

Create Vehicle Layout

"Set up the seating arrangement for your vehicle."

Provide a back navigation action.

**Vehicle Details**

- Layout name.
- Vehicle type.
- Custom type when applicable.

**Seat Layout**

- Preset selection.
- Editable seating grid.
- Seat count.
- Layout editing controls.

**Footer**

- Cancel.
- Save Layout.

The user should understand the process without needing an instructional manual.

### Desktop Layout

Prefer a two-panel experience during seat editing:

**Left panel — Editing controls**

- Selected preset.
- Seat/Aisle/Driver tools.
- Row and column controls.
- Seat numbering controls.
- Reset options.

**Right panel — Visual vehicle layout**

- Vehicle front indicator.
- Actual seat positions.
- Seat numbers.
- Aisles.
- Driver position.
- Live passenger capacity.

Alternatively, arrange the panels in the opposite order if that produces a clearer visual hierarchy.

Keep the layout readable, balanced, and consistent with the existing portal.

### Mobile Layout

Use a vertically organized experience:

1. Vehicle details.
2. Preset selection.
3. Seat editor.
4. Review and Save.

Avoid tiny cells that are impossible to tap.

Provide enough horizontal space for the actual seating arrangement.

Do not put the entire editor inside several nested scrolling containers.

---

## 6. Visual Seat Layout — The Core Feature

This is the most important component in the implementation.

Build a reusable, visually clear seat-map renderer.

A user should immediately recognize it as the inside of a vehicle viewed from above.

### Vehicle Orientation

Show the front of the vehicle clearly.

For example:

**FRONT OF VEHICLE**

Then display the seating arrangement from front to rear.

Provide a subtle vehicle outline or container if it improves comprehension.

You do not need complex 3D graphics, vehicle illustrations, or realistic seat textures.

The goal is clarity, not decoration.

### Cell Types

The backend supports three cell types:

- `SEAT`
- `AISLE`
- `DRIVER`

Represent these with distinct visual styles.

**Passenger Seat**

- Rounded, seat-like cell.
- Clearly visible seat number.
- Consistent sizing.
- A selected/active editing state.

**Aisle / Empty Space**

- Visually empty or lightly outlined.
- Clearly distinguishable from an actual seat.
- Maintains its grid position.

**Driver Position**

- Uses a distinct icon or label.
- Clearly differentiated from passenger seating.
- Does not count toward passenger capacity.

Do not rely on colors alone to distinguish these types.

Use labels, shapes, or icons where appropriate.

### Visual Simplicity

A conceptual layout might look like:

```text
        FRONT

     [ D ]   [ 1 ]

     [ 2 ]   [ 3 ]
     [ 4 ]   [ 5 ]
     [ 6 ]   [ 7 ]

         REAR
```

This example is only illustrative. The actual grid must preserve the backend's row and cell structure, including explicit aisle cells.

The diagram should make it easy to understand:

- Where the driver sits.
- Where passengers sit.
- How seats are arranged.
- Where spaces and aisles exist.
- How many passengers can be accommodated.

Do not force all vehicle types into the same physical arrangement.

---

## 7. Make Editing Simple — Click or Tap, Not Mandatory Drag-and-Drop

I want a visual editor, but I do not want it to become unnecessarily complicated.

The first version should use a simple interaction model.

### Editing Tools

Provide three clearly labeled tools:

**Seat**

Converts a selected cell into a passenger seat.

**Aisle**

Converts a selected cell into a walkway or empty position.

**Driver**

Converts a selected cell into the driver's position.

### Recommended Interaction

The operator:

1. Chooses a tool.
2. Clicks or taps a cell.
3. The cell changes immediately.
4. The preview updates instantly.

For example:

If they choose Aisle and tap Seat 4, that cell becomes an aisle.

If they choose Seat and tap an aisle, that cell becomes a passenger seat.

If they choose Driver and tap a cell, that becomes the driver position.

Make the currently selected tool visually obvious.

Support proper keyboard interactions.

### Driver Rules

For applicable road vehicle layouts, enforce a single driver position within the editor.

If an operator places the driver in another cell, handle the existing driver position predictably.

Do not silently create multiple driver cells.

The backend does not enforce driver count, so implement this as an explicit frontend editing rule.

### No Mandatory Drag-and-Drop

Do not depend on:

- Dragging individual seats.
- Arbitrary canvas positioning.
- Complex zoom-and-pan interactions.
- Freeform drawing.
- Seat rotation.
- Third-party seat-mapping services.

A structured grid is sufficient for this version.

The technical handoff's JSON seat-grid model is the source of truth.

Use HTML/CSS Grid or an equivalent maintainable Angular rendering approach if suitable.

Only introduce a specialized drawing library when there is a demonstrated need.

Do not make the interface more complex merely because advanced seat designers support more features.

---

## 8. Row and Column Controls

Operators must be able to adjust layouts without manually constructing JSON.

Provide simple controls such as:

- Add row.
- Remove row.
- Add column.
- Remove column.

Follow the actual backend grid constraints.

### Recommended Behavior

When adding a row, show the new row in the visual diagram immediately.

When adding a column, extend the relevant grid positions consistently.

Allow the operator to decide which positions are seats, aisles, or the driver.

Never delete passenger seats accidentally.

If removing a row or column would remove passenger seats, show a clear warning or confirmation.

For example:

"Removing this row will also remove 3 passenger seats."

Ensure the operator understands the impact before confirming.

### Avoid Excessive Controls

Do not expose complicated controls for every possible grid parameter.

Keep frequently used actions visible.

Place advanced layout adjustments in a secondary section if necessary.

---

## 9. Seat Numbering — Extremely Important

Seat numbering must be simple and reliable.

The backend requires passenger seat numbers to be unique, ignoring letter case.

Seat labels may be numeric or alphanumeric.

For example:

- 1
- 2
- 3
- 1A
- 1B

### Automatic Numbering

By default, automatically assign seat numbers to passenger seats.

Follow a predictable order based on rows from front to rear and saved cell positions within each row.

Do not number driver or aisle cells.

### Manual Renumbering

Provide an option for operators to adjust seat numbers manually.

This is important because some transport companies already have physical seat numbers that they want the software to match.

Keep manual editing straightforward.

Selecting a passenger seat should provide a clearly labeled way to update its number.

### Renumber All

Provide a **Renumber Seats** action.

Explain that it will reassign passenger seat labels in order.

Do not automatically overwrite custom labels without an intentional user action.

If a seat is removed, do not unexpectedly renumber every remaining seat.

### Validation

Display errors when:

- Two seats have the same number, ignoring case.
- A passenger seat has no number.
- A label exceeds the backend's allowed length.
- A label fails another verified backend constraint.

Make errors contextual.

For example:

"Seat number 4 is already used."

Highlight the conflicting cells.

The operator should not need to inspect a raw backend validation error to identify the problem.

---

## 10. Live Passenger Capacity

Display a clear passenger capacity indicator while editing.

Example:

**Passenger capacity: 14 seats**

The number should update whenever passenger seats are added or removed.

Capacity is determined by the number of `SEAT` cells.

Do not include:

- Driver.
- Aisle cells.
- Empty positions.

Do not let the user manually type the capacity.

The backend calculates the saved capacity.

The frontend's live count should match that calculation.

Do not confuse vehicle-model marketing labels with actual passenger capacity.

For example, a layout may be named "Sienna 7-seater", but the saved passenger capacity must be based on its actual passenger-seat cells.

---

## 11. Preview Mode — What Passengers Will Eventually See

The editor and the future passenger seat selector should use a shared visual foundation.

I want this designed correctly from the beginning.

Build the seat-map renderer so it can operate in distinct modes:

### Editing Mode

Used by authorized business administrators to construct or modify a vehicle layout.

Supports:

- Seat editing.
- Aisle editing.
- Driver placement.
- Number editing.
- Grid controls.
- Validation feedback.

### Read-Only Mode

Used to:

- View an existing layout.
- Preview a layout before saving.
- Display the saved seat arrangement in future Trip screens.

No editing controls.

### Future Booking Mode

The same foundational renderer should later be capable of displaying:

- Available seats.
- Booked seats.
- Selected seats.
- Seat-specific fares.

However, **do not implement booking functionality in this phase**.

Design the renderer to accept state or visual overlays later without changing the underlying layout schema.

Keep the saved layout itself free from booking-specific data.

### Preview Accuracy

The preview must reflect the actual saved row order, cell order, driver position, aisles, and seat labels.

Do not use a separate static illustration that looks different from the saved layout.

The same arrangement should be recognizable when used in future Trips and Bookings screens.

---

## 12. Vehicle Layout Directory

Build the directory using the existing eTransitBook management-page patterns.

Suggested page title:

**Vehicle Layouts**

Supporting text:

"Create and manage reusable seating arrangements for your trips."

Primary action:

**Create Layout**

### Directory Content

Display:

- Layout name.
- Vehicle type.
- Passenger capacity.
- Status.
- Actions.

Consider including a small layout preview or preview action.

However, avoid placing full-size seating diagrams inside every table row.

The table should remain compact and easy to scan.

### Search and Filtering

The technical handoff specifies backend pagination and supports:

- Search.
- Vehicle type filter.
- Status filter.
- Page and limit.

Use server-side pagination.

Default the status filter to **All** so inactive layouts remain discoverable.

Handle filtering according to the actual backend contract.

Do not assume the entire catalog is returned in one request.

### Row Actions

Where authorized, provide:

- View Layout.
- Edit Layout.
- Activate Layout.
- Deactivate Layout.

Use the existing action-menu design.

Do not implement Delete, because the backend does not provide layout deletion.

### Empty State

If no layouts exist, show a useful introduction.

Suggested:

**No vehicle layouts yet**

"Create a seating arrangement to use when scheduling trips."

Provide a Create Layout action for authorized users.

---

## 13. Editing Existing Layouts

Use the same editor for creation and editing.

An existing layout should load its actual saved seating arrangement.

Do not replace it with a guessed preset merely because the layout type is SIENNA or BUS.

### Editing Behavior

- Prefill the layout name.
- Prefill the vehicle type.
- Prefill the custom type where applicable.
- Reconstruct the complete saved grid.
- Preserve existing seat labels.
- Show current capacity.
- Allow authorized changes.

When editing the seating grid, send the full updated grid as required by the backend.

For metadata-only edits, use the correct partial update behavior.

### Important: Existing Trips

The technical handoff explains that existing trips keep a snapshot of their seating layout.

Editing a reusable vehicle layout affects its future use but does not retroactively change the seat snapshots on existing trips.

The UI should communicate this where appropriate.

Suggested helper text:

"Changes to this layout won't affect trips already created with it."

This is particularly useful when editing an active layout.

Do not imply that all existing trips will be automatically rearranged.

### Unsaved Changes

If the operator modifies the form and tries to navigate away, warn about unsaved changes.

Provide clear choices to stay or discard changes.

Do not lose edits accidentally when switching editor sections.

---

## 14. Layout Activation and Deactivation

New layouts are ACTIVE by default.

An existing layout can be activated or deactivated using the verified backend endpoint.

Use the established status-action pattern from Routes and Employees.

### Deactivation

Ask for confirmation.

Suggested message:

**Deactivate Vehicle Layout?**

"This layout will no longer be available for new trip selection. Existing trips will keep their saved seat arrangements."

### Activation

Offer an appropriate Activate action for inactive layouts.

### After Status Change

- Show confirmed success feedback.
- Refresh the directory.
- Update the status.
- Keep filters and pagination consistent.
- Prevent duplicate toggle requests.

Do not automatically delete or overwrite a layout.

An inactive layout may be reactivated later.

---

## 15. Error Handling and Form Validation

The editor should prevent mistakes before they reach the backend whenever possible.

Validate:

- Required layout name.
- Required vehicle type.
- Required custom type for OTHER.
- Valid rows.
- Valid cells.
- At least one passenger seat.
- Unique seat numbers.
- Required passenger-seat labels.
- Other documented DTO constraints.

Honor backend field limits exactly.

### Error Presentation

Where the error relates to a specific input, show it beside that input.

Where it relates to a specific seat, highlight the seat in the grid.

Where it relates to the overall layout, provide a clear summary.

Do not make the operator search through a long generic error notification.

### Duplicate Names

The backend may return `409` for a duplicate layout name.

Show that error beside the Name field.

Preserve the entire seat arrangement when this happens.

Do not force the operator to rebuild the grid because the name was duplicated.

### Submission

- Prevent duplicate submissions.
- Disable Save during the request.
- Preserve the editor state on failure.
- Show success feedback only after API confirmation.
- Navigate to the appropriate directory/detail view after saving.

---

## 16. Role-Based Access

Follow the backend access rules documented in the technical handoff.

Vehicle-layout catalog access is restricted to:

- ADMIN
- OPERATIONS_MANAGER

Other roles do not currently have access to list or manage the layout catalog.

Use the existing `WorkspaceAccess` approach.

Apply access control to:

- Sidebar visibility.
- Route guards.
- Directory access.
- Creation.
- Editing.
- Activation/deactivation.

Do not accidentally allow Terminal Managers, Booking Agents, Accountants or Drivers to access layout management.

Do not confuse catalog access with future trip seat-map viewing.

Other roles may eventually view a trip's seat-layout snapshot through authorized Trip or Booking endpoints without having access to the reusable layout catalog.

The backend remains the security authority.

Transport write actions require an ACTIVE business.

---

## 17. Responsive Experience and Accessibility

The seat editor must work on real mobile screens.

Verify layouts around:

- 360px.
- 768px.
- 1440px.

### Mobile Priorities

- Large enough seat cells to tap accurately.
- Clear front/rear orientation.
- Readable seat labels.
- Simple editing controls.
- No overlapping toolbar elements.
- No unnecessary nested scrolling.
- A visible way to review capacity.
- Accessible Save and Cancel actions.

For large buses, use a sensible scrollable diagram area where necessary, while avoiding awkward zoom levels.

Do not shrink seats until their numbers become unreadable.

### Keyboard Accessibility

Support:

- Keyboard focus on interactive cells.
- Keyboard activation of selected cell tools.
- Clear focus indicators.
- Accessible tool labels.
- Validation feedback.
- Proper dialog handling.
- Screen-reader-friendly descriptions for seat positions.

A seat should be identifiable by its row, position, type and label where applicable.

Do not make color the only way to understand the grid.

---

## 18. Technical Architecture for the Seat Renderer

I want the renderer to be reusable, not buried entirely inside the Create Layout page.

Keep a sensible separation between:

**Seat Layout Renderer**

Responsible for displaying the grid and its visual states.

**Seat Layout Editor**

Responsible for applying editing tools and producing changes.

**Layout Forms**

Responsible for name, vehicle type, validation and submission.

**Vehicle Layout API**

Responsible for communicating with the backend.

Use the existing Angular architecture and component conventions.

Do not introduce a heavy canvas or graphics library unless absolutely necessary.

Prefer a maintainable implementation using Angular components and the existing styling system.

The renderer must use the backend's canonical seat grid, including row ordering, cell ordering, and explicit aisle positions.

Do not persist frontend-only cell IDs, visual coordinates, selected states, or other editor metadata as part of the backend seat-layout payload.

---

## 19. Avoid Overengineering

This feature can easily become more complex than necessary.

Keep the first version focused.

I do not need:

- A full graphical CAD-style editor.
- Freeform seat movement.
- 3D vehicle rendering.
- Seat rotation.
- Complex animations.
- Multi-deck vehicle editors unless the existing schema and current requirements explicitly support them.
- Seat-specific pricing within layout creation.
- Fleet management.
- Number-plate registration.
- Route assignment.
- Driver scheduling.
- Booking availability management.

Do not build features simply because external seat-map design tools have them.

A structured visual grid, useful presets, simple editing controls, and a reliable preview should be sufficient.

If a particularly useful enhancement can be added without complicating the experience, use your judgment.

But prioritize **simplicity, clarity, correctness and speed of use**.

---

## 20. Tests and Verification

Implement relevant tests and verify the actual experience.

### Directory

Verify:

- Real API data loads correctly.
- Server-side pagination works.
- Search works.
- Type and status filters work.
- Inactive layouts remain discoverable.
- Unauthorized roles cannot access the catalog.
- Correct empty/loading/error states.

### Creation

Verify:

- Vehicle details are validated.
- Presets produce valid grid structures.
- Custom layouts can be created.
- Passenger capacity is calculated correctly.
- Driver and aisle cells do not count as seats.
- Duplicate seat numbers are rejected case-insensitively.
- Manual alphanumeric labels work.
- Required fields are enforced.
- Duplicate layout names preserve editor progress.
- The create payload matches the backend DTO.
- A successfully created layout is ACTIVE.

### Editing

Verify:

- Saved grids load accurately.
- Seat changes update the preview.
- Adding/removing rows works.
- Adding/removing columns works.
- Numbering works.
- Existing seat labels are preserved unless intentionally changed.
- Validation errors identify problematic cells.
- Edits produce the correct backend payload.
- Existing trip snapshots are not treated as editable template data.
- Unsaved changes are handled.

### Status

Verify:

- Activate/deactivate works.
- Deactivation confirms the operator's intention.
- Repeated requests are prevented.
- Status changes refresh the directory.

### Visual Verification

Inspect the editor using:

- A small car layout.
- A Sienna layout.
- A medium bus.
- A larger Coaster layout.
- A custom layout with unusual seat/aisle positions.

Check that each remains understandable and usable.

Test both dark and light themes.

Run relevant frontend tests and the production Angular build.

Do not claim visual verification unless the screens were actually inspected.

---

## 21. Implementation Instructions

Before coding, briefly explain:

1. How you understand the seat-grid backend model.
2. Which existing frontend components you will reuse.
3. How the preset-first workflow will operate.
4. How operators will edit individual cells.
5. How seat numbers and capacity will be managed.
6. How the renderer will be reusable for future Trips and Bookings.
7. Any conflicts between the desired UI and the backend contract.

Then proceed with the implementation.

Do not stop after planning.

### Important Restrictions

- Do not modify backend files.
- Do not rebuild existing features.
- Do not invent API endpoints.
- Do not create fake seat-layout records.
- Do not implement the Trips module yet.
- Do not force the operator to use drag-and-drop.
- Do not introduce a new design system.
- Do not create a Git commit unless explicitly requested.
- Preserve existing uncommitted changes.
- Do not mark guessed real-world floor plans as verified presets.

### Completion Report

At the end, explain:

- What was implemented.
- Which components were created or reused.
- How the seat editor works.
- Which presets are available.
- How manual customization works.
- How numbering and validation work.
- How the layout can be reused by the future Trip module.
- APIs integrated.
- Test and build results.
- Any limitations requiring future work.

Update the frontend README's Workspace section with the new Vehicle Layouts capability.

---

## 22. Final Acceptance Criteria

The feature is complete when:

- Vehicle Layouts appears under Operations.
- Existing sidebar design is preserved.
- Authorized users can list layouts.
- The directory supports server-side pagination, search and filters.
- Users can create layouts.
- Users can choose a predefined starting arrangement.
- Users can create custom arrangements.
- The editor is visual and intuitive.
- Passenger seats, aisles and driver positions are distinct.
- Operators can edit cells by clicking or tapping.
- Rows and columns can be adjusted.
- Passenger seats can be automatically and manually numbered.
- Duplicate seat numbers are prevented.
- Capacity updates automatically.
- The exact layout can be previewed.
- Existing layouts can be viewed and edited.
- Layouts can be activated/deactivated.
- The backend contract is respected.
- Permission rules are enforced.
- The renderer is suitable for reuse in Trips and Bookings.
- Mobile and desktop layouts are usable.
- Existing theme behavior remains intact.
- Tests and the production build pass.

**Final emphasis**

This is not just another CRUD feature.

The Vehicle Layout Editor is foundational to how eTransitBook will eventually display available seats, manage individual seat fares, and allow passengers to select seats when booking.

I want a thoughtful interface that operators can use confidently.

Focus on making a potentially complicated workflow feel extremely simple.

The ideal experience is:

**Choose a vehicle → Select a layout → Adjust the seats → Preview → Save.**

An operator should be able to create a normal vehicle layout without needing training or technical knowledge.

Build the simplest reliable experience that meets the actual backend requirements.

## Execution record — 21 November 2026

| Milestone | Verification | Status |
| --- | --- | --- |
| 1. Contracts, permissions, presets and grid operations | Running Swagger, backend source and 16 focused HTTP, grid and access tests checked. | Complete |
| 2. Directory and lifecycle | Four directory tests passed, covering filtering and paging, confirmation and duplicate requests, denied access, errors and empty state. Live admin list returned HTTP 200 with zero records. | Complete |
| 3. Dedicated workspace and shared diagram | Strict Angular compilation passed. Four form tests passed for custom creation, duplicate-name recovery, duplicate submission, metadata edits, full-grid edits and draft protection. | Complete |
| 4. Acceptance and documentation | Reviewed the specification and inspected both themes at 360, 768 and 1440 px. Ten browser states passed axe. All 129 tests and the production build passed. Updated the README Workspace section. | Complete |

The Bus 14 arrangement comes from the server DTO example and Car 4 from the handoff. All cards are editable starting arrangements. The server accepts uneven rows and nonconsecutive row numbers. The renderer will keep both. Driver placement is a frontend rule. The authenticated portal's existing theme preference, sidebar and shared controls apply throughout.

Reviewed the backend's separate BACKEND_IMPLEMENTATION_NOTES.md in full. Preset geometry remains an open product decision. The reusable renderer reads embedded rows and can accept seat annotations separately from layout data. The verified live Admin catalog was empty. A Booking Agent login succeeded and the catalog correctly returned 403. Operations Manager and Terminal Manager logins returned 401 with the supplied test password. Role-policy tests cover both.

### Delivered behavior and verification

- The Operations directory uses the authenticated list, detail, create, partial update and toggle-status endpoints. Search, both filters and page size reset the server query to page one. A confirmed status change refreshes the current query. An uncertain toggle requires reviewing the refreshed state.
- Car 4, Sienna 7/8, Bus 14/18 and Coaster 30 open in preview. Custom opens directly in the editor. Saved arrangements retain row numbers, cell order, explicit gaps and manual labels. The shared seat map also supports miniature previews and template-provided annotations.
- Presets and intentional renumbering number seats from front to rear. Adding a seat uses the lowest free positive number and leaves existing labels intact. Tapping an existing seat with the Seat tool focuses its label. Moving the road vehicle driver clears the old position. Edited road grids require one driver. Metadata-only edits can preserve a historical grid.
- Duplicate seat labels highlight both cells. A duplicate layout name returns focus to the name field with the grid intact. Operators can cancel removal of occupied rows or columns, renumbering, a reset, preset replacement or leaving a dirty draft.
- Chrome inspection covered a small car and large Coaster at 360 px, Sienna at 768 px, and Bus 14 and an irregular custom arrangement at 1440 px. The preset-first mobile review keeps the diagram ahead of optional tools. Tests exercised keyboard activation, manual numbering, preview, save, reopen, metadata edits, and both lifecycle transitions.
- All ten final browser states passed the full default axe scan and page-width overflow checks. The final run followed a correction to the accessible row and column controls. The Angular suite passed 129 tests in 19 files. The production browser and server bundles built successfully.
- Live Chrome checks with the Admin session loaded the empty catalog and searched it successfully. The Booking Agent was redirected on all four catalog deep links, with the sidebar entry hidden and zero catalog requests. Populated, multi-page and write scenarios used isolated fixtures. The live business catalog received no test records.

**Remaining verification limits.** The exact model-specific floor plans still require operator confirmation. Operations Manager and Terminal Manager could not be signed in live with the supplied password. Automated access tests covered those roles. All four implementation milestones are complete.
