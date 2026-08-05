# Angular e2e baseline (known-green reference)

Captured on 2026-08-05 against the **Angular** app (`npm run start` on :4200) and the
live `https://api.realworld.show` backend, serially with 1 retry — i.e. exactly the
configuration the React suite will be diffed against.

| Suite    | Command                     | Result                            |
| -------- | --------------------------- | --------------------------------- |
| main     | `npm run test:e2e`          | **115 passed, 7 failed** (exit 1) |
| security | `npm run test:e2e:security` | **16 passed** (exit 0)            |

## The 7 pre-existing failures (NOT regressions)

All 7 are backend-side: `PUT /api/user` currently returns **422** instead of 200 on the
live backend, so every spec that updates the profile fails, plus the two specs that read
the updated profile back.

- `null-fields.spec.ts:133` — default avatar should display on other user articles in feed
- `settings.spec.ts:18` — should update bio only
- `settings.spec.ts:58` — should update image only
- `settings.spec.ts:95` — should update bio and image together
- `settings.spec.ts:134` — should display updated bio on profile page
- `settings.spec.ts:155` — should display updated image on profile page
- `settings.spec.ts:197` — should allow navigation to settings again after update

## Definition of "green" for the React app

Wave 5's DoD is: the React run matches this baseline — **the same 115 main-suite tests
pass and all 16 security tests pass**. The 7 failures above may remain failing _only if_
they still fail against Angular at the time of the comparison (re-run the baseline to
confirm before accepting any failure). Any _additional_ failure is a migration
regression and must be fixed.
