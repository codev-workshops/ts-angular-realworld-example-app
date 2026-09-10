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

| Phase | Target version         | Branch                                          | PR  | Status                    | Resulting `@angular/core` |
| ----- | ---------------------- | ----------------------------------------------- | --- | ------------------------- | ------------------------- |
| 0     | Prework (plan + tests) | `feature/praveen-migration-demo-phase0-prework` | TBD | In progress               | 21.1.1 (unchanged)        |
| 1     | Angular 17             | -                                               | -   | Already satisfied on main | 21.1.1                    |
| 2     | Angular 18             | -                                               | -   | Already satisfied on main | 21.1.1                    |
| 3     | Angular 19             | -                                               | -   | Already satisfied on main | 21.1.1                    |
| 4     | Angular 20             | -                                               | -   | Already satisfied on main | 21.1.1                    |
| 5     | Angular 21             | -                                               | -   | Already satisfied on main | 21.1.1                    |
| 6     | Angular 22             | `feature/praveen-migration-demo-phase6-ng22`    | -   | Pending                   | -                         |

Evidence that phases 1-5 are already satisfied on `main`:

- Phase 1 (Angular 17): standalone bootstrap via `bootstrapApplication` in `src/main.ts`; built-in control flow (`@if` / `@for`) used in 12 templates under `src/app`; esbuild `@angular/build:application` builder in `angular.json`.
- Phase 2 (Angular 18): `inject()` DI used throughout (34 call sites in `src/app`); zoneless change detection via `provideZonelessChangeDetection()` in `src/app/app.config.ts`.
- Phase 3 (Angular 19): standalone is the default (no `standalone: true` flags needed); signals used for component state.
- Phase 4 (Angular 20): Vitest 4 (`@analogjs/vite-plugin-angular`, jsdom) and Playwright e2e in `e2e/` are present; no Karma/Jasmine remain.
- Phase 5 (Angular 21): `package.json` pins `@angular/core`, `@angular/cli`, `@angular/build` at 21.1.1; `@rx-angular/cdk|template` 21.0.0; TypeScript ~5.9.3; RxJS ^7.8.2.

## Phase 6 checklist (Angular 22)

- [ ] Install Node 22 and bump `engines.node` in `package.json`
- [ ] `ng update @angular/core@22 @angular/cli@22 @angular/build@22` (no `--force`)
- [ ] TypeScript 6
- [ ] `@rx-angular/cdk` / `@rx-angular/template` 22 if released (otherwise document)
- [ ] `npm run build`, `npm test`, `npm run format:check` green
- [ ] Attempt Playwright smoke test without a backend; skip and document if impossible
- [ ] Update this file: Final-state section + Cross-cutting notes

## Decisions log

- Skip ESLint 9 / do not add ESLint (user decision). Prettier remains the only lint/format gate.
- Keep zoneless change detection; do not add `zone.js`.
- Keep the esbuild `@angular/build:application` builder.
- Keep Vitest as the unit-test runner, config as-is (`vitest.config.ts`).
- RxJS is already 7.x; no RxJS migration needed.
- Ignore existing PR #26 (`devin/1788860009-angular-22-upgrade`); do not touch it.

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
