# Angular → React migration

The React app lives in `react/` and is built up phase by phase, alongside the Angular app in `src/`.
Both dev servers listen on port 4200, so only one runs at a time and the Playwright suite in `e2e/`
needs no per-app configuration — it is the parity oracle for every phase.

One caveat: 58 selectors across 8 specs target `input[formControlName="..."]`, which React will not emit.
Phase 2 replaces those with `name="..."` selectors and has the React forms render the same attribute, so
both apps keep passing.

```bash
npm run react:install   # one-time, installs react/ dependencies
npm run react:start     # React dev server on localhost:4200
npm run react:build     # typecheck + production build
npm run test:e2e        # e2e against the Angular app
npm run test:e2e:react  # same specs against the React app (E2E_TARGET=react)
```

## Phases

| Phase | Scope                                                                                                               | Done when                                                                                      |
| ----- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 0     | Vite + React + React Router shell, layout, route table with placeholders, shared `src/styles.css`                   | app boots, routes resolve, `health.spec.ts` "app should load" passes                           |
| 1     | HTTP core: `api`/`token`/`error` interceptors → single fetch client; `jwt.service` → token module                   | `e2e/error-handling.spec.ts` passes                                                            |
| 2     | Auth: `user.service` → context/store, login/register/settings, guards → `<RequireAuth>`, `window.__conduit_debug__` | `auth.spec.ts`, `settings.spec.ts`, `user-fetch-errors.spec.ts` pass                           |
| 3     | Data services: `articles`, `comments`, `tags`, `profile` → typed API modules + query hooks                          | unit specs ported                                                                              |
| 4     | Read-only slices: home feed, tag filter, pagination, article view, profiles; pipes → utils                          | `articles.spec.ts`, `navigation.spec.ts`, `url-navigation.spec.ts`, `null-fields.spec.ts` pass |
| 5     | Write slices: editor, comments, favorite/follow; reactive forms → `react-hook-form`                                 | `comments.spec.ts`, `social.spec.ts` pass                                                      |
| 6     | Cutover: delete `src/`, port Vitest specs to RTL, move React to the repo root                                       | full suite incl. `xss-security.spec.ts` passes                                                 |

Each phase is a separate PR that leaves both apps working.
