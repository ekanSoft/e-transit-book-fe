
You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

### Dropdowns

- Use the portal’s shared picker style for dropdowns in forms and filters. For selection-only controls, reuse `app-field` with options and the overlay, as in the employee Role and terminal State fields.
- For searchable dropdowns, use `app-searchable-select` with a search field inside the open menu, following the Business Profile bank picker. Use selection-only dropdowns for simple filters.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

## Backend
swagger will be running on: http://localhost:4500/docs/v1
SWAGGER_USERNAME=swagger
SWAGGER_PASSWORD=swagger123

swagger will help u see all the api, documents and their contract

repo: Backend reference: C:\Users\PC\Documents\source-codes\e-transit-book

Make sure to read: C:\Users\PC\Documents\source-codes\e-transit-book/docs/FRONTEND_IMPLEMENTATION_NOTES.md when introducing new features so you can see the notes that backend decided for the frontend during implementation.

if you also need to get full context of the project as a whole, u can also take a look at the C:\Users\PC\Documents\source-codes\e-transit-book\AGENTS.md to get the full business context

## Backend reference

- Backend repository at `../e-transit-book`, with [architecture](../e-transit-book/ARCHITECTURE.md) and [frontend implementation notes](../e-transit-book/docs/FRONTEND_IMPLEMENTATION_NOTES.md).
- The portal calls the backend's **Branch** a **Terminal**. Keep backend field and enum names in API requests.
- Validate API-dependent changes against the backend source and documentation. Keep shared API contracts and product rules documented in the backend repository.

## Verification record

- Update [docs/VERIFICATION.md](docs/VERIFICATION.md) when completing a major feature or substantial workflow change, such as Vehicle Layouts or Trips. Reserve the record for work of that scope.
- Add a dated entry covering the workflows exercised, the results of relevant tests, builds, API checks, and browser or accessibility checks, and any verification still outstanding. Identify which results came from the live backend and which came from fixtures or automated tests. Link to detailed task notes when available.
