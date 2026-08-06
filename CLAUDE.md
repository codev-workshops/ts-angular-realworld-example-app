# RealWorld Example App (React)

Vite + React + TypeScript implementation of the RealWorld "Conduit" spec. All source lives in
`src/`: `core/` (auth store, layout, routing guards), `features/<feature>/{pages,components,services,models}`,
`shared/` (reusable components and utils), `lib/api.ts` (the single axios instance).

## Commands

```bash
bun run start            # Dev server at localhost:4200 (Vite)
bun run build            # Production build (Vite) into dist/react-conduit
bun run typecheck        # tsc --noEmit
bun run lint             # ESLint
bun run test             # Unit tests (Vitest + Testing Library)
bun run test:e2e         # E2E tests (Playwright), excluding @security
bun run test:e2e:security # @security E2E tests
bun run format           # Format code with Prettier
bun run format:check     # Check formatting without writing
```

`bun run start` must keep serving on `http://localhost:4200`: `playwright.config.ts` starts it
as its `webServer` and the `e2e/` suite is the behavioural gate. Never edit `e2e/`.

## Conventions

- Stack: React Router data router (`createBrowserRouter` + route-level `lazy`), Zustand for the
  auth store (`src/core/auth/store.ts`), React Hook Form for forms, `DOMPurify` + `marked` for
  markdown. Node >= 22.12.
- All HTTP goes through `src/lib/api.ts` (`get`/`post`/`put`/`del`). Never call axios or fetch
  directly and never duplicate the base URL or the auth header.
- Services are modules of async functions (no DI); components subscribe to store slices with a
  selector (`useAuthStore(s => s.authState)`) so they re-render only on their own slice.

## Invariants the e2e suite depends on

- Requests carry `Authorization: Token <jwt>` — **not** `Bearer`.
- Errors are normalized to `{ ...body, status }`, with
  `{ errors: { network: ['Unable to connect. Please check your internet connection.'] } }` when
  there is no error body.
- A 401 logs the user out for every endpoint **except** `/user`, whose 4XX (logout) vs 5XX (keep
  the token and retry with backoff) split lives in the auth store.
- Form inputs keep the `formControlName="..."` attribute: the suite selects on it
  (`input[formControlName="email"]`).
- Class names and element structure match the RealWorld markup the suite selects on.

## Code Style

- Run `bun run format` before presenting code to the user.

## Debug Interface

E2E tests use `window.__conduit_debug__` (`getToken` / `getAuthState` / `getCurrentUser`, with the
four states `loading | authenticated | unauthenticated | unavailable`). See `e2e/helpers/debug.ts`.
