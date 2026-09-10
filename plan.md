# Angular Migration Plan (single source of truth)

Repository: `codev-workshops/ts-angular-realworld` (old name `ts-angular-realworld-example-app` redirects here).

## Branching model

- Base branch: `feature/praveen-migration-demo`, created from `main`. **No direct commits.**
- One leaf branch and one PR per phase, targeting the base branch:
  `feature/praveen-migration-demo-phase<N>-<slug>`.
- PR lifecycle: draft -> Devin Review -> fix findings -> ready for review.
- A human merges. Devin never merges.
- Nothing targets `main`.

## Definition of Done (every phase)

- `npm run build` green
- `npm test` (Vitest) green
- `npm run format:check` (Prettier) green
- Unit-test count never drops without a documented reason in this file
- `plan.md` updated in the same PR
- Conventional-commit PR title (`<type>(<scope>): <description>`)
- Devin Review clean

## Status

| Phase | Target version         | Branch                                          | PR                                                                     | Status                    | Resulting `@angular/core` |
| ----- | ---------------------- | ----------------------------------------------- | ---------------------------------------------------------------------- | ------------------------- | ------------------------- |
| 0     | Prework (plan + tests) | `feature/praveen-migration-demo-phase0-prework` | [#27](https://github.com/codev-workshops/ts-angular-realworld/pull/27) | Done (merged)             | 21.1.1 (unchanged)        |
| 1     | Angular 17             | -                                               | -                                                                      | Already satisfied on main | 21.1.1                    |
| 2     | Angular 18             | -                                               | -                                                                      | Already satisfied on main | 21.1.1                    |
| 3     | Angular 19             | -                                               | -                                                                      | Already satisfied on main | 21.1.1                    |
| 4     | Angular 20             | -                                               | -                                                                      | Already satisfied on main | 21.1.1                    |
| 5     | Angular 21             | -                                               | -                                                                      | Already satisfied on main | 21.1.1                    |
| 6     | Angular 22             | `feature/praveen-migration-demo-phase6-ng22`    | [#28](https://github.com/codev-workshops/ts-angular-realworld/pull/28) | Done (in review)          | 22.1.6                    |

Evidence that phases 1-5 are already satisfied on `main`:

- Phase 1 (Angular 17): standalone bootstrap via `bootstrapApplication` in `src/main.ts`; built-in control flow (`@if` / `@for`) used in 12 templates under `src/app`; esbuild `@angular/build:application` builder in `angular.json`.
- Phase 2 (Angular 18): `inject()` DI used throughout (34 call sites in `src/app`); zoneless change detection via `provideZonelessChangeDetection()` in `src/app/app.config.ts`.
- Phase 3 (Angular 19): standalone is the default (no `standalone: true` flags needed); signals used for component state.
- Phase 4 (Angular 20): Vitest 4 (`@analogjs/vite-plugin-angular`, jsdom) and Playwright e2e in `e2e/` are present; no Karma/Jasmine remain.
- Phase 5 (Angular 21): `package.json` pins `@angular/core`, `@angular/cli`, `@angular/build` at 21.1.1; `@rx-angular/cdk|template` 21.0.0; TypeScript ~5.9.3; RxJS ^7.8.2.

## Phase 6 checklist (Angular 22)

- [x] Install Node 22 and bump `engines.node` in `package.json` (`>=22.22.3`; the Angular 22 CLI refuses Node 20)
- [x] `ng update @angular/core@22 @angular/cli@22 @angular/build@22` (no `--force`)
- [x] TypeScript 6 (`~6.0.3`)
- [x] `@rx-angular/cdk` / `@rx-angular/template` 22 if released (otherwise document) - **not released** (latest is 21.x with peer `@angular/core ^21.0.0`). Keeping 21.0.0 made `npm install` fail with `ERESOLVE`, so both packages were **removed**: the single `*rxLet="tags$"` usage in `home.component.html` became `tags = toSignal(...)` + `@if (tags(); as tags)`
- [x] `npm run build`, `npm test`, `npm run format:check` green
- [x] Attempt Playwright smoke test without a backend; skip and document if impossible
- [x] Update this file: Final-state section + Cross-cutting notes

### Phase 6 result

- Resulting versions: `@angular/core` 22.1.6 (all `@angular/*` runtime packages 22.1.6), `@angular/cli` 22.1.7, `@angular/build` 22.1.7, TypeScript 6.0.3, Node 22 (`engines.node >=22.22.3`), `@rx-angular/cdk|template` removed, `@analogjs/vite-plugin-angular` 2.7.2.
- CLI migrations applied: `provideHttpClient(withXhr(), ...)` in `src/app/app.config.ts` (Angular 22 defaults `HttpClient` to `fetch`; `withXhr()` preserves the previous XHR backend); `$safeNavigationMigration()` wrapper around `currentUser()?.image | defaultImage` in `article.component.html` (preserves pre-22 safe-navigation/pipe semantics); `nullishCoalescingNotNullable` / `optionalChainNotNullable` extended diagnostics suppressed in `tsconfig.app.json`. The `ChangeDetectionStrategy.Eager` migration made no changes because every component is already `OnPush`.
- TypeScript 6 fallout: removed the deprecated `baseUrl` from `tsconfig.json` (TS5101; no import relied on it). `strict: true` was already set and is preserved; TS 6 introduced no new type errors.
- `@analogjs/vite-plugin-angular` bumped `^2.2.2` -> `^2.7.2`: with 2.2.x, Vitest failed to load every spec (`Failed to resolve import "@oxc-project/runtime/helpers/defineProperty" from @angular/core/fesm2022/testing.mjs`).
- Unit tests passing: **180 / 180** (6 files), unchanged from Phase 0.
- `npm run build`: OK. `npm run format:check`: OK.
- Smoke test: the app hardcodes `https://api.realworld.show/api` (`src/app/core/interceptors/api.interceptor.ts`), so the Playwright suite ran against that public backend on Node 22: **115 passed, 7 failed / 122**. The same 7 fail identically on the base branch (Angular 21): `settings.spec.ts` x6 (backend answers `422` to `PUT /api/user`) and `null-fields.spec.ts` "default avatar should display on other user articles in feed" (article not present in the shared global feed). Pre-existing, backend-state related, not caused by this phase. Manual check via headless Chromium: page renders, runtime `ng-version` = `22.1.6`, global feed loads via XHR, no console errors/warnings.

## Decisions log

- Skip ESLint 9 / do not add ESLint (user decision). Prettier remains the only lint/format gate.
- Keep zoneless change detection; do not add `zone.js`.
- Keep the esbuild `@angular/build:application` builder.
- Keep Vitest as the unit-test runner, config as-is (`vitest.config.ts`).
- RxJS is already 7.x; no RxJS migration needed.
- Ignore existing PR #26 (`devin/1788860009-angular-22-upgrade`); do not touch it.
- Phase 6: keep behaviour-preserving CLI migrations (`withXhr()`, `$safeNavigationMigration()`, suppressed extended diagnostics) instead of adopting the new Angular 22 defaults.
- Phase 6: drop `@rx-angular/cdk` / `@rx-angular/template` (no 22-compatible release; the 21.x peer range `@angular/core ^21.0.0` breaks `npm install`). Only `RxLet` was used, in one template; replaced by `toSignal` + `@if`.

## Final state

The base branch `feature/praveen-migration-demo` holds the complete migration (Phases 0-6): Angular 22.1.6, CLI/build 22.1.7, TypeScript 6.0.3, Node 22, zoneless, standalone, esbuild application builder, Vitest 4 (180 tests), Playwright e2e. It is awaiting human review and merge into `main`. Devin never merges.

## Cross-cutting follow-ups

- `@rx-angular/*` was removed; re-add only if a 22-compatible release is published and the library is wanted again.
- `HttpClient`: `withXhr()` was added to preserve the XHR backend; evaluate switching to the Angular 22 default `fetch` backend (`provideHttpClient(withFetch(), ...)` / drop `withXhr()`) and re-run the e2e suite.
- `$safeNavigationMigration()` in `article.component.html`: replace with the intended expression under the new safe-navigation semantics and remove the wrapper.
- Extended diagnostics `nullishCoalescingNotNullable` / `optionalChainNotNullable` are suppressed in `tsconfig.app.json`; re-enable and fix the reported templates.
- ESLint adoption intentionally skipped (user decision); revisit if lint rules beyond Prettier are wanted.
- Components are already `OnPush`; signal-based inputs/outputs and `resource()`/`httpResource()` adoption remain optional modernisation.
- TypeScript `strict` is already on; no strict-mode debt to record.
- The 7 pre-existing Playwright failures against `api.realworld.show` (settings updates return 422; shared global feed) need either a dedicated backend for e2e or test adjustments.
- Devin environment blueprint: Node 22 install proposed via `update_environment_config`; awaiting user approval in the session timeline.

## Baseline (on `main`, before Phase 0)

- `npm run build`: OK
- `npm run format:check`: OK
- `npm test`: **FAILS** - all 6 spec files fail to load with
  `Failed to resolve import "zone.js" from "src/test-setup.ts"`. `zone.js` is not a dependency (the app is zoneless), but `src/test-setup.ts` and every spec file imported `zone.js` / `zone.js/testing` and re-initialised the TestBed with `BrowserDynamicTestingModule`.
- Unit tests passing: 0 (6 files failed to load).

### Phase 0 result

- `src/test-setup.ts` now initialises the TestBed once with `BrowserTestingModule` + `platformBrowserTesting([provideZonelessChangeDetection()])`.
- The 6 spec files drop their `zone.js` imports and per-file `initTestEnvironment` calls; assertions unchanged.
- Unit tests passing: **180 / 180** (6 files).
- `npm run build`: OK. `npm run format:check`: OK.
