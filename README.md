# eTransitBook operator portal

Angular 21.2, TypeScript, and Tailwind CSS 4. The portal includes employee authentication, business registration, approval status, operational reporting, terminal and employee management, and separate company and employee profiles.

## Local setup

Use a Node version supported by the installed Angular CLI (Node 24 LTS was used for verification) and npm. Keep `package-lock.json` as the dependency lockfile.

```powershell
npm ci
npm start
```

The frontend opens at `http://localhost:4200`. The backend must run at `http://localhost:4500/api/v1`, with its MongoDB replica set, Redis, email, and upload configuration available.

**Email links:** set the backend's `FRONTEND_URL` to the frontend's origin, e.g. `http://localhost:4200`, and restart the backend after changing it. Alternatively, run `npm start -- --port 3000` if the backend uses that origin. The local backend inspected during implementation had `FRONTEND_URL=http://localhost:3000`; that does not match Angular's default port.

## Configuration and deployment

Angular uses build-time environment files, not automatic `.env` loading:

| Configuration | File                                          | API base URL                   |
| ------------- | --------------------------------------------- | ------------------------------ |
| Development   | `src/environments/environment.development.ts` | `http://localhost:4500/api/v1` |
| Production    | `src/environments/environment.ts`             | `/api/v1`                      |

Production intentionally uses a same-origin relative URL. Configure the deployment reverse proxy to forward `/api/v1` to the backend. For a separate API origin, set `apiBaseUrl` in the appropriate build environment before building and configure backend CORS accordingly. No API keys, Swagger credentials, or production hostnames belong in these files.

```powershell
npm run build
npm run serve:ssr:e-transit-book-fe
```

The existing Angular server infrastructure is retained. Operator routes use `RenderMode.Client`: authentication depends on the browser session, and private pages must not be prerendered. `PORT` configures the production Node server; it defaults to `4200`. The server does not proxy API traffic itself.

Static hosting is also possible using `dist/e-transit-book-fe/browser`. Configure an SPA fallback to `index.csr.html` for frontend routes (or publish it as `index.html`), excluding API and asset paths. This is required for direct visits and refreshes of `/verify-signup?token=…`, `/reset-password?token=…`, and authenticated routes. The bundled Node server handles those routes automatically.

## Routes and behavior

| Route                     | Purpose                                                                          |
| ------------------------- | -------------------------------------------------------------------------------- |
| `/login`                  | Sign in even with an active session. An optional `?slug=…` scopes the business.  |
| `/signup`                 | Create a business/admin, then show check-email confirmation                      |
| `/verify-signup?token=…`  | Confirm the email token; request another verification email                      |
| `/forgot-password`        | Request a reset link; choose a business if required                              |
| `/reset-password?token=…` | Set and confirm a new password                                                   |
| `/auth/access-status`     | Backend explanation for a denied sign-in                                         |
| `/auth/select-business`   | Complete a temporary multi-business login                                        |
| `/onboarding`             | Resume the first missing registration stage                                      |
| `/pending-approval`       | Pending review, restricted account, or recoverable context error                 |
| `/app/dashboard`          | Operational dashboard for the selected business (also the destination of `/app`) |
| `/app/terminals`          | Searchable terminal directory with permission-aware creation and editing         |
| `/app/routes`             | Business-wide route directory with creation and status management               |
| `/app/vehicle-layouts`     | Reusable seating arrangements, visual editor and status management               |
| `/app/trips`               | Departure directory, scheduling, trip management, day copying and manifests     |
| `/app/employees`          | Searchable employee directory, assignments, and account status management        |
| `/app/business-profile`   | Read-only registration details and primary terminal                              |
| `/app/account`            | Employee profile, workspace role, and appearance                                 |

The session service owns JWT storage under `etransitbook.session`. It reloads `/employees/me` and `/business` after refresh. There is no refresh-token flow because the backend does not provide one. Protected API `401` responses clear authenticated state and redirect to sign-in; rejected login credentials remain inline. Bearer tokens are attached only to the configured API's protected endpoints, never to public auth calls or third-party URLs.

The sign-in form stays available with an existing session. A successful new sign-in replaces the stored JWT after any required business selection. Temporary login-selection tokens remain in memory, separate from the JWT, and expire after the backend-specified time. Refreshing that selection screen requires signing in again. Email resend/reset selection uses a business slug and does not reuse a login-selection token. Logout clears all session and selection state; stale requests cannot restore a logged-out session.

Routing uses both `accountStatus` and `registrationComplete`. Pending incomplete businesses resume setup; pending complete businesses see manual-review status. Completed active businesses open the dashboard. If an active business has incomplete records, or the completion flag disagrees with the saved stages, the status page offers a recheck. The backend locks registration edits for active businesses. Suspended, rejected, and inactive businesses are shown status information; backend eligibility errors are preserved. The backend remains the authorization authority.

## Workspace

The portal follows the device’s light or dark appearance by default, including changes while it is open. The header toggle saves an explicit choice for this browser. Select **System** under **My account → Appearance** to follow the device again. The initial theme is applied before Angular starts. The sidebar retains its dark palette in both modes. A native modal drawer provides navigation on smaller viewports.

The dashboard uses `GET /reports/dashboard` for totals, payment mix and upcoming trips. For periods with revenue it also reads `GET /reports/sales` for daily values. The default period is the last seven WAT calendar days. Administrators and operations managers receive company reports. Terminal managers and accountants receive their backend-scoped reports. Booking agents and drivers see today's permitted departures from `GET /trips`.

Switching workspaces signs out the current membership and opens sign-in with the employee email prefilled. A fresh login issues the selection token or session JWT. There is no authenticated token-exchange endpoint. Company verification links are displayed to administrators and operations managers. The backend currently includes those fields in its business response to other authenticated roles too.

- **Terminals** loads the full business list, including the original onboarding terminal, and searches it locally by name. Admins and Operations Managers can add and edit terminals. Terminal Managers can edit their assigned terminal. To assign a Terminal Manager, choose that role and the terminal in **Employees**, then save.
- **Routes** shows the selected business’s Active and Inactive routes, newest first. All staff roles can view the business-wide directory and filter it locally by terminal name, city, state, and status. Admins and Operations Managers in an active business can add routes and change their status. The Add Route dialog searches the business’s terminal list and requires distinct origin and destination terminals. Same-city routes and the reverse direction are valid. If a route already exists, the dialog helps staff find it in the directory and reactivate it explicitly if needed.
- The Routes directory reads the populated array from `GET /routes`. Creation uses `POST /routes` with the two selected branch IDs. Activation and confirmed deactivation use `PATCH /routes/:id/toggle-status` with an empty body. The directory refreshes after each successful change. The toggle flips the current server status, so the directory also refreshes after an uncertain result before another attempt.
- **Vehicle layouts** gives Admins and Operations Managers a company-wide directory at `/app/vehicle-layouts`, with local name and custom-type search and vehicle-type and status filters. The directory loads complete layouts and reuses them for view and edit navigation within the current workspace. In an active business, start with an editable arrangement or a custom grid, place seats, aisles and the driver, adjust seat numbers, and preview the passenger capacity before saving. The directory supports viewing, editing, deactivation and reactivation. Existing trips retain their saved seat snapshots.
- **Trips** shows a paginated departure timetable with route, status, and WAT date filters. Admins and Operations Managers can schedule a departure using an active route and layout. Trip details show the saved seat snapshot, booked seats, default fare, and per-seat fares. Terminal Managers can edit times and fares, update status, and copy departures from their assigned terminal. Admins and Operations Managers can also replace the layout after checking booked seats. Copy a day validates the proposed departures before saving. Admins and Operations Managers can read business-wide manifests, while Terminal Managers and Booking Agents can read manifests for departures from their own terminal.
- **Employees** includes server-side search, pagination, and role and terminal filters. Filtering by account status would require a backend API change. Admins and Operations Managers can manage non-admin employees across the selected business. Terminal Managers can view employees at their own terminal, add Booking Agents, and manage existing Booking Agents and Drivers. The server assigns their terminal automatically. Driver is temporarily unavailable for role assignment. Admin accounts are read-only in the directory.
- Employee creation requires an Initial staff password. The backend activates the account and attempts to email sign-in details. Sign-in email is read-only after creation. Operations Manager is company-wide, while Terminal Managers, Booking Agents, Accountants and Drivers require a terminal assignment. Moving an employee to Operations Manager clears their previous assignment.
- The employee form searches the business’s terminal list. Admins and Operations Managers can add a missing terminal in a dialog, which selects it and keeps the employee draft open.
- The directories use the configured API base URL and current authenticated business. Navigation, deep links, and management actions use shared workspace permissions. No new environment settings are required.

## Onboarding contracts

The wizard orders Business Profile → Primary Terminal → Business Verification. Each successful PATCH is followed by a fresh business and employee read. Saved steps can be reopened while registration is editable. The terminal lookup finds the backend's `primeBranch` flag in the full terminal list. Editing an existing primary terminal requires the account assigned to it because the backend upsert targets the signed-in employee's branch.

- Profile uses multipart data with an address JSON string and optional `logo`. The request field for support phone is `supportContact`; the returned field is `supportPhoneNumber`.
- Business and terminal addresses send street, city, state and its two-letter code. The API supplies Nigeria and NG. The dropdown uses a bundled copy of the backend’s `src/common/data/nigeria-states.json`. After changing that file, run `npm run sync:states` with the two repositories checked out side by side and commit the updated copy. Frontend builds use the checked-in file.
- Business types are `TRANSPORTATION` and `CAR_HIRE`.
- Verification accepts an RC number **or** at least one document. Supported field names are `certificateOfIncorporation`, `formCAC`, and `memorandumAndArticle`. All three files are not mandatory.
- Each file has the backend's 20 MB size limit. The logo picker requests images; verification documents follow the backend's general upload support. Files can be replaced. Removing a newly selected file does not delete an existing saved file because no deletion endpoint exists in this scope.
- The primary terminal form sends `PATCH /business/branch` using JSON with `name`, `phoneNumber`, and nested address.
- Nigerian phone numbers normalize to `+234…`. Country and state codes are uppercased before submission.
- Progress comes from returned `registrationStage` values (`PROFILE`, `VERIFICATION`, `BRANCH`), not browser-stored wizard indices. Onboarding never activates a business.

## Verification

Use the [Trips manual testing checklist](docs/tasks/trips-manual-testing.md) to track browser acceptance testing. Tick each test as it passes and record any failures or blocked checks in the checklist.

```powershell
npm test -- --watch=false
npm run check:api
npm run build
```

Tests cover session persistence, selected-business login, expiry/401 handling, logout races, status routing, stage resume, multipart payloads, phone normalization, email business selection, token links, password confirmation, and field/file validation.

`check:api` performs non-mutating requests that check validation and authentication envelopes, including the terminal and employee management endpoints. Optional process environment variables `API_BASE_URL`, `TEST_EMAIL`, and `TEST_PASSWORD` enable authenticated login and context checks. Supply credentials through your terminal environment and keep them out of version control. The script keeps credentials and tokens out of its output.

Manual browser checks should include 360, 768, and 1440 px widths; keyboard traversal; password visibility; inline errors; mobile dialog focus/Escape behavior; sidebar collapse; account menu; refresh after login; direct token links; each registration stage; and pending approval. Live write tests need a disposable unapproved business. Do not edit active business data to manufacture an onboarding state.

See `docs/VERIFICATION.md` for observed evidence and limits.

## Source organization

- `core/auth`: session, business-routing rules, functional guards.
- `core/http`: typed models, API client, bearer/401 interceptor, error normalization.
- `core/layout`: responsive operator shell with a native modal navigation drawer.
- `shared/forms`: typed reactive fields, address group, password visibility, file selection and validators.
- `shared/ui`: buttons, icons, brand, notifications and error feedback.
- `features/auth`: lazy authentication pages and shared email request flow.
- `features/onboarding`: step forms, API payload builders, wizard and account status.
- `features/workspace`: dashboard, terminal management, read-only business profile and account settings.
- `features/employees`: employee directory, forms and API integration.
- `features/routes`: route directory, creation form and status actions.
- `features/trips`: timetable, scheduling, trip management, copy planner, and manifests.

Typed Reactive Forms follow the repository conventions; signals own application/feature state. Native controls and a modal `<dialog>` provide keyboard behavior without a large UI framework. No backend source files were changed.
