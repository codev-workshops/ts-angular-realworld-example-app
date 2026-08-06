# Angular → React migration patterns

The canonical before/after for this migration. Every phase copies these patterns; the
Angular sources stay in `src/app/` (untouched) until the Phase 7 cutover so each phase can
diff its port against the original.

React lives in `src/` next to the Angular tree, mirroring its layout without the `app/`
segment: `src/app/features/article/...` → `src/features/article/...`.

## Target stack

| Concern     | Angular                           | React                                    |
| ----------- | --------------------------------- | ---------------------------------------- |
| Build/serve | Angular CLI (`ng serve`, `:4200`) | Vite (`vite`, `:4200`, `strictPort`)     |
| Routing     | `Routes` + `loadComponent`        | React Router `<Outlet>` + `React.lazy`   |
| Auth state  | `UserService` BehaviorSubjects    | Zustand store (`src/core/auth/store.ts`) |
| Forms       | Reactive Forms                    | React Hook Form                          |
| HTTP        | `HttpClient` + 3 interceptors     | one axios instance (`src/lib/api.ts`)    |
| Markdown    | `DomSanitizer` + `marked`         | `DOMPurify` + `marked`                   |
| Unit tests  | Vitest + TestBed                  | Vitest + Testing Library                 |

`npm run start` must keep serving on `http://localhost:4200` — `playwright.config.ts`
starts it as its `webServer` and the copied `e2e/` suite is the parity gate.

## Validation scripts (identical for every phase)

```bash
npm run build            # vite build
npm run typecheck        # tsc --noEmit   (src + e2e; src/app is excluded)
npm run lint             # eslint .       (src/app is ignored)
npm run test             # vitest run
npm run test:e2e         # playwright, everything except @security
npm run test:e2e:security # playwright @security only
```

## Invariants that keep the copied e2e suite valid

- Requests carry `Authorization: Token <jwt>` — **not** `Bearer`.
- Errors are normalized to `{ ...body, status }`, with `{ errors: { network: ['Unable to connect. Please check your internet connection.'] } }` when there is no error body.
- A 401 logs the user out for every endpoint **except** `/user`, whose 4XX (logout) vs 5XX (keep token, retry) split lives in the auth store.
- `window.__conduit_debug__` exposes `getToken` / `getAuthState` / `getCurrentUser` with the four states `loading | authenticated | unauthenticated | unavailable`.
- Form inputs keep the `formControlName="..."` attribute: the e2e suite selects on it
  (`input[formControlName="email"]`), so React inputs must render it too.

## Conversions

### Signals / `BehaviorSubject` → `useState` / store slices

```ts
// Angular                          // React
isSubmitting = signal(false);
const [isSubmitting, setIsSubmitting] = useState(false);
this.isSubmitting.set(true);
setIsSubmitting(true);
```

Cross-component state (auth) becomes a Zustand store. Subscribe with a selector so a
component only re-renders when its slice changes — this is the `distinctUntilChanged()`
equivalent:

```ts
const authState = useAuthStore(s => s.authState);
```

### Injectable service + Observable → module of async functions

```ts
// Angular: @Injectable ArticlesService
favorite(slug: string): Observable<Article> {
  return this.http.post<{ article: Article }>(`/articles/${slug}/favorite`, {}).pipe(map(d => d.article));
}

// React: src/features/article/services/articles.ts
export async function favorite(slug: string): Promise<Article> {
  const data = await post<{ article: Article }>(`/articles/${slug}/favorite`, {});
  return data.article;
}
```

No DI: import the function. Every call goes through `src/lib/api.ts` so the interceptor
behaviour applies exactly once.

### `@Input()` with a transform setter → prop + derived value

`ListErrorsComponent` flattened its input inside a setter; the React port computes the same
list during render (see `src/shared/components/ListErrors.tsx`).

### `@Output() EventEmitter` → callback prop

```ts
@Output() toggle = new EventEmitter<boolean>();   // this.toggle.emit(value)
```

```tsx
onToggle?: (favorited: boolean) => void;          // onToggle?.(value)
```

### `<ng-content>` → `children`; `[ngClass]` → computed `className`

See `src/features/article/components/FavoriteButton.tsx`, which also shows the
"call the service, then report the new value to the parent (which owns the optimistic
update)" flow of the Angular original, including the unauthenticated → `/register` redirect.

### Structural directives → hooks / conditional JSX

`*ngIf` / `@if` → `{condition && <.../>}`, `@for` → `.map()` with a `key`.
`[ifAuthenticated]` becomes a small hook plus conditional JSX rather than a directive:

```tsx
const authenticated = useAuthStore(selectIsAuthenticated);
{
  authenticated && <LoggedInNav />;
}
```

### Pipes → plain functions

`defaultImage` and `markdown` pipes become utility functions (`marked` output passed through
`DOMPurify.sanitize`, rendered with `dangerouslySetInnerHTML`).

### `canActivate` guards → route wrapper components

`requireAuth` becomes a wrapper that renders `<Navigate to="/login" replace />` while the
store says unauthenticated, and `<Outlet />` otherwise; login/register use the inverse.
Guards must wait out the `loading` state before redirecting.
