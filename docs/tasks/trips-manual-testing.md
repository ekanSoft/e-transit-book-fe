# Trips manual testing checklist

Tick a box only when the expected result passes. Leave failed, blocked, and unrun checks unchecked. Record the test ID, result, and any evidence in the notes table at the end.

- Tester and date —
- Business and environment —
- Browser, version, and timezone —

## Setup

- [ ] **S1 — Test workspace.** **Action** — Open the local frontend at `http://localhost:4200` with the backend on port `4500`. Sign in to a disposable, active, registration-complete business as an Admin or Operations Manager. **Expected** — **Operations → Trips** opens, with **Create trip** and **Copy a day** visible.
- [ ] **S2 — Routes and layouts.** **Action** — In the test workspace, prepare active routes **Jibowu → Ring Road** and **Ring Road → Jibowu**. Prepare **QA Original** with seats `1A`, `1B`, `2A`, `2B`, **QA Compatible** with `1A`, `1B`, `2A`, and **QA Missing** with `1A`, `2A`. Also prepare an inactive layout and a historical trip on a route that was deactivated after scheduling. **Expected** — The active records are available for scheduling and the historical trip can still be found in Trips.
- [ ] **S3 — Fixtures and accounts.** **Action** — Prepare separate trips for editing, replacing a layout, marking departed, and cancelling. For the booked fixture, use **QA Original** with a checked-in passenger on `1A`, a confirmed unchecked passenger on `1B`, and optionally a customer-cancelled ticket. Prepare all six staff roles, with Terminal Manager and Booking Agent assigned to Jibowu. Save the reverse trip URL and a trip URL from a second business. **Expected** — The fixtures and accounts are available for the checks below. Use an existing or seeded Driver account and an existing test booking workflow or fixture for passengers.

Let **D** be tomorrow in WAT. The sample overnight trip leaves **D at 23:40 WAT** and arrives **D+1 at 01:10 WAT**. Its default fare is **₦18,000**, with overrides of **₦22,000** for `1A` and **₦15,000** for `2B`. For pagination, use 11 or more departures matching one filter. For the Copy a day paging check, use 51 or more departures on one source date.

## 1. Directory, filters, and pagination

- [ ] **1.1 — Initial list.** **Action** — Open **Operations → Trips**. **Expected** — **All dates** is highlighted and departures are ordered earliest first. Rows show journey direction, WAT departure, status, layout, default fare in naira, and booked count.
- [ ] **1.2 — Date filters.** **Action** — Click **Today**, enter D in **Departure date (WAT)**, then click **All dates**. **Expected** — Today highlights both the shortcut and the date field. D highlights the date field alone and includes the overnight departure even though it arrives on D+1. All dates clears the field and highlights only its shortcut.
- [ ] **1.3 — Combined filters.** **Action** — Select Jibowu → Ring Road and **Scheduled**. Change to the reverse route. Try each status on a date with matching trips, then restore **All routes** and **All statuses**. **Expected** — All selected filters apply together. The reverse trip has its own results and the reset broadens the list.
- [ ] **1.4 — Historical route.** **Action** — Select the route marked **Inactive** and use the historical departure date or **All dates**. **Expected** — The optional filter shows State, City for both ends, with the Inactive marker. Existing departures remain listed.
- [ ] **1.5 — Paging.** **Action** — On a result set with more than 10 trips, use **Next** and **Previous**. From page 2, change **Trips per page** to **25**, then **50**. Navigate to a later page where available, then change a filter. **Expected** — Rows, totals and page numbers match the result set. The pager stops at the endpoints, and changing a filter or page size returns to page 1.
- [ ] **1.6 — Empty results and detail links.** **Action** — Select an empty date, then restore a populated date and Ctrl-click a journey link. **Expected** — The empty state says **No departures found**. The link opens the trip in a new tab while the list stays open.

## 2. Schedule a new trip

- [ ] **2.1 — Complete the three steps.** **Action** — Click **Create trip**. In **Journey & time**, pick Jibowu → Ring Road and enter the sample WAT times. In **Layout & fares**, pick **QA Original**, enter `18000`, select each override seat, enter the amount, and click **Apply fare**. Click **Continue**. **Expected** — **Review & create** shows the route, both times, four-seat capacity, layout, base fare, and both overrides with amounts.
- [ ] **2.2 — Keep the draft.** **Action** — Click **Back** twice and **Continue** twice. Click **Cancel → Keep editing**. **Expected** — The route, times, layout, fare, and applied overrides survive.
- [ ] **2.3 — Submit.** **Action** — Click **Create trip** in Review and try clicking again while it is pending. From detail, open **All trips** and filter to D. **Expected** — The button reads **Creating…** and blocks repeat clicks while pending. Success opens the saved detail. The list contains one corresponding Scheduled departure with zero bookings.
- [ ] **2.4 — Discard.** **Action** — Start another trip, enter a time, then click **Cancel → Discard draft**. Reopen **Create trip**. **Expected** — The form opens without the discarded values.

## 3. Route and layout selection

- [ ] **3.1 — Search active choices.** **Action** — Open **Route** and use **Search routes** to search by terminal, then try an unmatched term and clear it. Do the same under **Search vehicle layouts**. **Expected** — Results narrow inside each picker. The route label shows State, City for both ends, followed by the terminal names in parentheses. Inactive choices are absent.
- [ ] **3.2 — Preview the template.** **Action** — Select **QA Original**, inspect the grid, then pick **QA Compatible**. **Expected** — The preview reflects the selected layout’s seats, aisle and driver cells. Review shows the selected layout and its passenger capacity.
- [ ] **3.3 — Create a route from the picker.** **Action** — Enter a departure time, open **Route**, search for a missing route, and click **Create route**. In **Add route**, select two terminals and save. Repeat in a workspace with an empty route catalog. **Expected** — The shared dialog closes, the new route is selected, and the departure time is preserved.
- [ ] **3.4 — Create a layout and return.** **Action** — Complete **Journey & time**. With no active layouts, click the standalone **Create vehicle layout** button. With active layouts, open the layout picker and click **Create vehicle layout** below the options. Create and save a layout. **Expected** — The picker action is visible before typing and stays visible while searching. Trips reopens at **Layout & fares** with the new layout selected and its seat map visible. The draft retains the original route, times, and default fare. Any seat overrides absent from the new layout are listed in the removal warning.

## 4. WAT times and overnight travel

- [ ] **4.1 — Later today.** **Action** — Schedule a departure later today in WAT and leave the arrival field blank. **Expected** — Review and detail say **No estimate**, and the departure appears under **Today**.
- [ ] **4.2 — Invalid times.** **Action** — Click **Continue** with a past departure. Repeat with a future departure and an arrival equal to it, then with an earlier arrival. **Expected** — Each invalid combination blocks progression and identifies the relevant field.
- [ ] **4.3 — Overnight in another timezone.** **Action** — Set the browser timezone to `America/Los_Angeles` using DevTools and schedule the sample overnight trip. **Expected** — Review, detail and the directory keep the specified WAT dates and times, including the next-day arrival.
- [ ] **4.4 — WAT date boundary.** **Action** — Schedule a trip for **00:15 WAT** on a future day. Filter to that date, then to the previous day. **Expected** — The trip appears only on its WAT departure date, even though its UTC instant falls on the previous date.

- [ ] **4.5 — Confirm a date and time.** **Action** — Open **Departure (WAT)**, pick a day other than today, type into **Time (WAT)**, and click the calendar’s **OK**. Reopen the picker, choose a different day, then click outside. **Expected** — Only the chosen day has a filled highlight. **OK** closes the picker and shows the confirmed date and time in WAT. Clicking outside keeps the last confirmed value.
- [ ] **4.6 — Calendar on a phone.** **Action** — On iPhone Safari and Android Chrome where available, open the calendar, choose a day, adjust the native **Time (WAT)** field, and tap the calendar’s **OK**. In **Edit times and fares**, open the estimate and use **Clear → OK**. **Expected** — The day, time, and footer controls stay within reach. Clearing the estimate allows the trip to save with **No estimate**.

## 5. Default fare and seat pricing

- [ ] **5.1 — Apply overrides.** **Action** — Enter `18000` as the default. Apply `22000` to `1A` and `15000` to `2B`. Try selecting a driver or aisle cell. **Expected** — Two passenger seats show fare markers, the override count is two, and only passenger seats open fare controls.
- [ ] **5.2 — Replace and clear a fare.** **Action** — Apply a new amount to `1A`, then click **Use default fare** for that seat. **Expected** — The first action replaces the amount without adding a duplicate. The second removes only that seat’s override.
- [ ] **5.3 — Unapplied fare and a layout switch.** **Action** — With overrides on `1A` and `2B`, type a new value for the selected seat and click **Continue** before applying it. Apply the amount, then switch to **QA Compatible**. **Expected** — The pending amount blocks progression while its seat is selected. The new layout retains the `1A` override and names `2B` in the removal warning. Review shows the remaining override.
- [ ] **5.4 — Fare boundaries.** **Action** — Try `99`, `18000.50`, `18,000`, `-100`, `1e4`, and `9007199254740992` in the default and individual fare fields. Then try `100` and `9007199254740991`. **Expected** — Invalid forms are rejected. Both inclusive bounds are valid whole-naira amounts.

## 6. Details and saved seat snapshots

- [ ] **6.1 — Saved detail.** **Action** — Open the trip from section 2 and refresh. **Expected** — The saved route, status, WAT times, layout, **0 of 4** booked, base fare, and override count are shown. The seat map shows the saved arrangement, with override amounts listed separately.
- [ ] **6.2 — Booked overlay.** **Action** — Open the booked fixture and compare the map to its known seat assignments. **Expected** — Occupied seats carry **Booked** markers, and fare markers appear on applicable seats.
- [ ] **6.3 — Template independence.** **Action** — Record a trip’s map and capacity. Edit the underlying template in **Vehicle layouts** to add or remove an unbooked seat. Reopen detail and manifest, then preview the edited template in a new scheduling draft. **Expected** — The existing trip keeps its saved arrangement and snapshot capacity. New scheduling uses the edited template.

## 7. Editing a scheduled trip

- [ ] **7.1 — Fare-only edit.** **Action** — Click **Edit times and fares**, change the default to `19000`, and click **Save changes**. **Expected** — The new default is shown and times, route, and per-seat amounts are preserved.
- [ ] **7.2 — Clear and restore an arrival.** **Action** — Clear **Estimated arrival (WAT)** and save. Reopen, enter a valid estimate, and save again. **Expected** — Detail first says **No estimate**, then shows the new estimate in WAT.
- [ ] **7.3 — Edit the departure.** **Action** — Move departure beyond its saved arrival, try to save, then correct or clear the estimate and save again. **Expected** — The invalid combination is rejected. The corrected change persists on refresh.
- [ ] **7.4 — Clear overrides and save unchanged.** **Action** — Click **Clear all special seat fares** and save. Reopen the editor and save without changes. **Expected** — All seats use the default fare. The unchanged edit closes without altering the trip.
- [ ] **7.5 — Past scheduled departure.** **Action** — Change only the fare on a still-Scheduled trip whose time has passed. Then try moving its departure to another past time. **Expected** — The first edit succeeds. The past departure change is blocked.

## 8. Change a vehicle layout

- [ ] **8.1 — Missing booked seat.** **Action** — On the booked **QA Original** fixture, open **Change layout** and select **QA Missing**. **Expected** — The comparison shows saved and replacement seat maps and capacities. It names missing booked seat `1B` and disables **Change layout**.
- [ ] **8.2 — Compatible replacement.** **Action** — Select **QA Compatible** on a trip with a `2B` override, read the warning, and confirm **Change layout**. **Expected** — Detail refreshes to the three-seat snapshot. Booked seats and retained fares carry over, the default is preserved, and the post-save notice names `2B`.
- [ ] **8.3 — Booked-seat check fails.** **Action** — Block the booked-seat request, open **Change layout**, and choose a compatible layout. Unblock the request and click **Retry booked seats**. **Expected** — Saving is disabled while bookings cannot be verified. After retry, compatibility is checked against refreshed booked labels.

## 9. Status changes

- [ ] **9.1 — Booked trip and departure confirmation.** **Action** — Open a booked Scheduled trip. Click **Mark departed**, read the warning, then choose **Go back**. **Expected** — The page explains that bookings block cancellation. The dialog warns about unchecked passengers, and backing out leaves the trip Scheduled.
- [ ] **9.2 — Depart and complete.** **Action** — Confirm **Mark departed**. Reopen the manifest to run 11.3, then return and confirm **Mark completed**. **Expected** — At Departed, **Mark completed** is the only status mutation and edit and replacement actions disappear. At Completed, the trip is read-only.
- [ ] **9.3 — Cancel an empty trip.** **Action** — On a Scheduled trip with zero bookings, click and confirm **Cancel trip**, refresh, then find it using the **Cancelled** filter. **Expected** — The trip is listed as Cancelled and has no mutation actions.
- [ ] **9.4 — No automatic departure.** **Action** — Open a still-Scheduled trip after its departure time passes. **Expected** — It stays Scheduled until staff explicitly changes its status.

## 10. Copy a day

- [ ] **10.1 — Pick sources and targets.** **Action** — Filter the list to D and click **Copy a day**. Select the overnight trip and another eligible departure. Pick D+1 and D+7. **Expected** — The source date starts at D. The offered dates are D+1 through D+7. Both targets initially show the chosen departures with shifted WAT dates, the same clock times, and the same base fares.
- [ ] **10.1a — Source calendar.** **Action** — Open **Source date (WAT)**, select a different day, and click **OK**. Reopen it, choose **Today**, and confirm again. **Expected** — The picker shows dates without a time field. The source list reloads for the confirmed WAT day.
- [ ] **10.2 — Customize each date.** **Action** — Use **Select all** and **Clear selection**, then reselect D+1 and D+7. Uncheck the second trip on D+7 only and choose **QA Compatible** for the overnight trip on D+1. Temporarily uncheck all departures for one target, then for both. **Expected** — The count moves between **7 of 7 days selected** and **0 of 7 days selected**. An empty target is skipped. If no copies are selected, **Save copied trips** is hidden.
- [ ] **10.3 — Automatic validation.** **Action** — Restore the sample selection, inspect each target timetable in another tab, then change one checkbox or layout. **Expected** — The automatic check reports three ready departures and names the `2B` removal. Checking creates no trips. Editing the plan disables **Save copied trips** until a fresh check succeeds.
- [ ] **10.4 — Save and verify.** **Action** — Restore the intended choices, let the automatic check finish, and click **Save copied trips** once. Open both target timetable links and inspect each copy. **Expected** — Three copies are reported. Each is Scheduled with zero bookings, uses its selected current template, preserves matching fares, and keeps the overnight trip’s 90-minute duration and next-day arrival.
- [ ] **10.5 — Ineligible and invalid copies.** **Action** — Pick a day with cancelled, departed, completed, or inactive-route sources. Include an otherwise eligible trip whose layout is now inactive, or choose a target whose proposed departure is already past. **Expected** — Loaded cancelled and inactive-route sources are disabled. Departed and completed sources can be chosen when eligible. The automatic check identifies each problem by date and trip, and saving stays disabled.
- [ ] **10.6 — All source pages.** **Action** — Load a date with at least 51 departures, select the last one by departure time, choose a target, then change the source date. **Expected** — The later-page source is selectable. Changing dates clears the previous plan.

## 11. Passenger manifests

- [ ] **11.1 — Empty manifest.** **Action** — Open an unbooked trip and click **View manifest**. **Expected** — The manifest shows journey, WAT times, layout, snapshot capacity, five zero counts, and an empty state in both passenger sections.
- [ ] **11.2 — Before departure.** **Action** — Open the booked fixture’s manifest before marking it departed. Compare the seat order, passenger name and phone, ticket, channel, and check-in data with the fixture. **Expected** — **Confirmed 1**, **Checked in 1**, **Active passengers 2**, **Missed 0**, **Seats sold 2**. Rows follow snapshot seat order, check-in time displays in WAT, and any customer-cancelled ticket is absent.
- [ ] **11.3 — After departure.** **Action** — Mark the booked fixture departed, then reopen **View manifest**. **Expected** — The checked-in passenger stays under **Passengers** and the unchecked passenger moves to **Missed passengers** with a WAT timestamp. The counts read **Confirmed 0**, **Checked in 1**, **Active passengers 1**, **Missed 1**, **Seats sold 2**.

## 12. Permissions and terminal scope

For each role, open **Trips → All dates**, inspect **Route**, and open a Scheduled trip. Use a zero-booking departure to check availability of cancellation.

- [ ] **12.1 — Admin.** **Action** — Sign in as Admin and run the role check. **Expected** — Both directions, schedule, copy, edit, replace layout, status actions, and manifest are available. The layout name is a link.
- [ ] **12.2 — Operations Manager.** **Action** — Repeat as Operations Manager. **Expected** — The same trip actions and business-wide scope as Admin.
- [ ] **12.3 — Terminal Manager.** **Action** — Sign in as the Jibowu Terminal Manager and try the list, route filter, detail, and copy planner. **Expected** — Only Jibowu-origin departures and routes are available. Can edit, change status, copy using the source layout, and read manifests. Schedule and replacement controls are absent and the layout name is plain text.
- [ ] **12.4 — Booking Agent.** **Action** — Repeat the role check as the Jibowu Booking Agent. **Expected** — Jibowu-origin trips, booked seats, and manifests are readable. Schedule, copy, and detail mutation actions are absent.
- [ ] **12.5 — Accountant.** **Action** — Repeat the role check as Accountant. **Expected** — Both directions are visible with read-only detail and booked seats. No manifest, schedule, copy, or detail mutation actions.
- [ ] **12.6 — Driver.** **Action** — Repeat the role check as Driver. **Expected** — Both directions are visible with the same read-only Trips access as Accountant.
- [ ] **12.7 — Other-origin direct URLs.** **Action** — As Terminal Manager and Booking Agent, paste the Ring Road → Jibowu detail URL and its `/manifest` URL. Inspect the Terminal Manager’s copy source list. **Expected** — Both pages report **This trip is unavailable in your workspace** without exposing details. The trip is absent from the copy planner.
- [ ] **12.8 — Guarded direct URLs.** **Action** — As Booking Agent, Accountant, and Driver, open `/app/trips/new` and `/app/trips/copy-day`. Also try the schedule URL as Terminal Manager and a manifest URL as Accountant or Driver. **Expected** — Disallowed pages redirect to Trips.
- [ ] **12.9 — Business switch.** **Action** — Switch businesses, reopen Trips, paste an old business’s trip URL, and open scheduling if permitted. **Expected** — Only current-business records and pickers appear. The old trip is unavailable and no previous draft or passenger data appears.

## 13. Errors and edge cases

Use DevTools throttling or request blocking for read failures. A controlled API fixture is the most reliable way to reproduce a conflict or lose a response after a successful commit.

- [ ] **13.1 — Loading and retry.** **Action** — Throttle the connection. Separately block and unblock the Trips list, route catalog, trip detail, booked-seat, and manifest reads, using the displayed retry button after each unblock. **Expected** — Loading and error states are visible and retries recover the affected reads. A failed booked-seat read is visibly flagged even if the seat snapshot renders.
- [ ] **13.2 — Missing record and expired session.** **Action** — Open a well-formed, nonexistent trip ID and its manifest. Then expire or revoke a test session and open a protected Trips screen. **Expected** — Missing records show the unavailable message. An API `401` returns the expired session to sign-in.
- [ ] **13.3 — Stale route or layout.** **Action** — Prepare a schedule draft in one tab, deactivate its route or layout in another, then submit the draft. **Expected** — Creation is rejected and the matching field is identified on the relevant scheduling step.
- [ ] **13.4 — Concurrent change.** **Action** — Simulate a `409` on an edit, layout replacement or status change. Separately, use a fixture to add a booking after opening the cancellation dialog and before confirming it. **Expected** — The app refreshes detail and asks for review. Cancellation is refused and the booked trip remains Scheduled.
- [ ] **13.5 — Copy save revalidation.** **Action** — After the automatic check succeeds, deactivate a required route or layout and click **Save copied trips**. Inspect all target dates. **Expected** — Save rejects the whole batch, creates no copies, and the planner checks again automatically.
- [ ] **13.6 — Unconfirmed copy save.** **Action** — Simulate a lost save response. Inspect **View refreshed departures** or the timetable links, then choose **I reviewed the timetables**. **Expected** — The screen says **Save could not be confirmed**, refreshes the targets, and enables acknowledgement after successful reads. It never automatically resubmits. If the planned trips are already listed, treat the original save as successful.
- [ ] **13.7 — Missing metadata.** **Action** — With a fixture missing populated route, terminal, or layout metadata, open the directory and detail as Admin. **Expected** — Fallback labels render and the detail can still show an intact saved seat snapshot.

## 14. Responsive, theme, and accessibility checks

- [ ] **14.1 — Mobile at 360 px.** **Action** — Open the directory, each scheduling step, detail, edit and replacement dialogs, Copy a day, and a populated manifest. Use touch to select a seat and apply its fare. **Expected** — Controls fit and remain reachable without horizontal page overflow. The replacement comparison stacks and long names remain legible.
- [ ] **14.2 — Tablet at 768 px.** **Action** — Repeat the screen and dialog checks at this width. **Expected** — Filters, paging, grid, dialog footer and passenger fields are usable without horizontal page overflow.
- [ ] **14.3 — Desktop at 1440 px.** **Action** — Repeat at desktop width, including the two layout previews. **Expected** — The comparison can be read side by side and the directory, planner, and manifest remain readable without clipping.
- [ ] **14.4 — Light, dark, and system.** **Action** — Switch light and dark from the header, refresh, then choose **My account → Appearance → System** and change device appearance. **Expected** — Explicit choice survives refresh and System follows the device. Text, badges, focus indicators, booked markers, and warnings have usable contrast. The sidebar remains dark.
- [ ] **14.5 — Keyboard and modal focus.** **Action** — Use Tab, Shift+Tab, Enter, Space and Escape to open a picker, select a passenger seat, apply a fare, advance a step, and dismiss a confirmation. **Expected** — Focus is visible. Advancing focuses the next heading. Open modals keep focus inside, and Escape dismisses an idle modal and restores focus to its trigger.
- [ ] **14.6 — Axe.** **Action** — If axe DevTools is available, scan the directory, open pickers, scheduling validation, a booked map, a management dialog, the copy review, and the populated manifest in both themes. **Expected** — Zero violations in the scanned states. Record any violations by screen, viewport and theme.

## Current limits

- The Trips directory has no text search. The **Route** filter is selection-only. Search is available inside the schedule route and layout pickers and the replacement-layout picker. Reopening Trips normally resets filters and page size. Copy outcome timetable links supply their target date.
- Booking, payment recording, ticket lookup, passenger check-in, and booking cancellation are outside the Trips screens. Use prepared booking fixtures. A manifest already open in another tab needs a reload after a status change.
- Terminal Managers can use a source layout when copying. The portal hides replacement controls for them because they cannot read the layout catalog.
- The setup round-trip draft lives in the current browser session and can be lost on reload. Apply a seat fare before changing seats, since changing seats resets the fare input.
- Copy controls constrain the dates and selections to valid shapes. Duplicate request entries and out-of-window dates cannot be entered in the normal UI. Copy preserves source times and compatible prices. The backend has no copy idempotency key, so check the target timetable after an unconfirmed save.

The prior signed-in browser checks used controlled responses. Mark the live signed-in checks here only after running them. See the [implementation task and progress log](trips-frontend.md), [verification record](../VERIFICATION.md), and [backend transport handoff](../../../e-transit-book/docs/FRONTEND_TRANSPORT.md).

## Test notes

| Test ID | Result | Actual behavior or blocker | Evidence |
| --- | --- | --- | --- |
| | Failed / Blocked / Retest | | |
