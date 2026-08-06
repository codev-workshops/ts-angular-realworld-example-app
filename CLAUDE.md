# RealWorld Example App (Angular → React migration in progress)

The React app lives in `src/` (Vite + React + TypeScript). The Angular sources in `src/app/`
are kept read-only as the migration reference until the Phase 7 cutover; they are excluded
from build, typecheck, lint and unit tests. See `PATTERN.md` for the conversion patterns.

## Commands

```bash
bun run start            # Dev server at localhost:4200 (Vite)
bun run build            # Production build (Vite)
bun run typecheck        # tsc --noEmit
bun run lint             # ESLint
bun run test             # Unit tests (Vitest)
bun run test:e2e         # E2E tests (Playwright), excluding @security
bun run test:e2e:security # @security E2E tests
bun run format           # Format code with Prettier
bun run format:check     # Check formatting without writing
```

## Code Style

- Run `bun run format` before presenting code to the user.

## Debug Interface

E2E tests use `window.__conduit_debug__` to access app state. See `e2e/helpers/debug.ts` for helpers and implementation examples for Angular/React/Vue.
