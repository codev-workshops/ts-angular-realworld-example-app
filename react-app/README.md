# Conduit — React port

A Vite + React + TypeScript port of the Angular Conduit app in the repository root. The Angular app is
untouched and remains the source of truth; this port is verified against it pixel by pixel.

Both apps talk to the same backend, `https://api.realworld.show/api`, and share the same JWT storage key
(`localStorage['jwtToken']`).

## Running

| App     | Command                       | URL                     |
| ------- | ----------------------------- | ----------------------- |
| Angular | `npm start` (repository root) | <http://localhost:4200> |
| React   | `npm start` (this directory)  | <http://localhost:4300> |

```bash
cd react-app
npm install
npm start
```

## Verification

```bash
cd react-app
npm run typecheck        # tsc -b
npm run lint             # eslint .
npm run build            # tsc -b && vite build
npm run parity           # 54 static cases,      all at 0 mismatched pixels
npm run parity:interact  # 33 interaction steps, all at 0 mismatched pixels

cd .. && npm run build   # the Angular app still builds
```

`npm run parity` and `npm run parity:interact` need **both** dev servers running (`:4200` and `:4300`) and
Playwright's Chromium (`npx playwright install chromium`).

## Parity harness

Everything lives in `parity/` and is committed:

| File                     | Purpose                                                                        |
| ------------------------ | ------------------------------------------------------------------------------ |
| `record.mjs`             | One-off recorder: hits the live API and writes `fixtures/recorded.json`        |
| `fixtures/recorded.json` | Recorded tags, articles, article details, comments and profiles                |
| `fixtures/avatar.png`    | Local copy of the remote avatar, so images never vary between runs             |
| `api-mock.mjs`           | Replays the fixtures into **both** apps via Playwright request interception    |
| `cases.mjs`              | The static case matrix                                                         |
| `harness.mjs`            | Browser launch, context setup, settling rules and the pixelmatch diff          |
| `compare.mjs`            | `npm run parity` — navigates both apps to every case and diffs full-page shots |
| `interact.mjs`           | `npm run parity:interact` — drives the same clicks/typing through both apps    |

Both apps are driven in identical Chromium contexts (`deviceScaleFactor: 1`, `reducedMotion: 'reduce'`,
partial raster and composited antialiasing disabled), with animations, transitions and the caret disabled
before any app code runs, and `jwtToken` seeded before navigation for authenticated cases. Screenshots are
full-page and re-taken until two consecutive captures are byte-identical. `pixelmatch` runs with
`threshold: 0`, so only byte-identical pixels pass.

Re-recording fixtures (only needed if the API shape changes):

```bash
node parity/record.mjs
```

### Coverage

27 static cases × 2 viewports (desktop 1280×900, mobile 375×812) = **54 cases**:

home (global feed anonymous / authenticated / paginated / page 2 / empty), auth unavailable, rejected token,
your-feed (empty and populated), tag feed, unknown tag, login, register, settings, settings redirect for
anonymous users, new editor, edit editor, article (anonymous / as author / as other user / not found /
server error), profile (own / own anonymous / other / favorites empty / not found).

**33 interaction steps** across 8 scenarios: hover and focus, tag pill and brand navigation, opening an
article, favoriting as an anonymous user (redirect to `/register`), pagination, feed switching, favorite and
unfavorite, header navigation, profile tabs, login and register submission, follow/unfollow, writing and
posting a comment, editor tag add/remove, editing settings and logging out. Every step asserts the URL,
`localStorage['jwtToken']` and the `href`/`target`/`rel` of every link in both apps, in addition to the
pixel diff.

Latest run: **54/54 static cases and 33/33 interaction steps at 0 mismatched pixels.**

## Deviations from the Angular app

- **No theme axis.** The Angular app has a single stylesheet and no theme engine, so the playbook's
  "× themes" dimension collapses to one. The matrix is widened along auth state (anonymous, authenticated,
  auth unavailable, rejected token), empty/error states, feeds and pagination instead.
- **Component host elements are reproduced literally.** Angular renders `<app-article-meta>`,
  `<app-favorite-button>`, `<router-outlet>` … into the DOM and the global stylesheet targets them
  (`app-root > *:not(app-layout-footer)`). React has no host element, so every ported component renders the
  Angular selector as a custom element (`src/custom-elements.d.ts`) and the app mounts into `<app-root>`.
  Without this the flex layout and float behaviour differ by fractions of a pixel.
- **Whitespace is written explicitly.** Angular removes whitespace-only text nodes between elements but keeps
  the whitespace inside interpolations, e.g. `<i></i>` immediately followed by `Favorite Article`. JSX
  collapses differently, so text is emitted as a single template literal (``{` ${count} `}``) rather than
  adjacent nodes; adjacent text nodes shift subpixel rasterisation.
- **Guards are evaluated on navigation only.** Angular runs route guards when a route is entered, not
  continuously. `useGuardDecision` in `src/App.tsx` captures the decision on mount, so logging out on
  `/settings` leaves the page up until the component navigates away — as in Angular, instead of an immediate
  redirect to `/login`.
- **Routes carry explicit keys.** Angular creates a new component instance when the matched route changes
  (`/` → `/tag/:tag`), which also drops DOM focus. React Router would reuse the element, so the two routes
  render `<HomePage>` with different `key`s.
- **Error objects keep Angular's shape.** The Angular error interceptor rethrows `{ ...body, status }` and the
  page components store `err.errors` directly, which means `ListErrors` receives the inner object and renders
  an empty `<ul>` for API errors. That behaviour (including the empty list's `margin-bottom`) is reproduced
  rather than "fixed".
- **Markdown sanitisation.** Angular renders article bodies with `marked` into `[innerHTML]`, which runs
  Angular's own sanitizer. React's `dangerouslySetInnerHTML` does not sanitise, so the port pipes the same
  `marked` output through `DOMPurify` to keep an equivalent security posture.
- **`npm` instead of `bun`.** `CLAUDE.md` documents `bun`, which is not available in this environment; the
  scripts are plain npm scripts and work with either.
