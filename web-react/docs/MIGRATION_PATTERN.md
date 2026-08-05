# Angular → React migration pattern

This is the canonical reference every migration wave copies. It is derived from the
end-to-end conversion of `favorite-button.component.ts`, which exercises every
mechanic the rest of the app needs: inputs, outputs, injected services, router
navigation, local signal state, an HTTP call, and a unit test.

## Workspace layout

The React app lives in `web-react/` next to the untouched Angular app. Both stay
runnable for the whole migration:

|            | Angular                                | React                                                                  |
| ---------- | -------------------------------------- | ---------------------------------------------------------------------- |
| dev server | `npm run start` → :4200                | `npm run start` → :4300                                                |
| unit tests | Vitest + TestBed                       | Vitest + MSW + Testing Library                                         |
| e2e        | `playwright.config.ts` (baseURL :4200) | `web-react/playwright.config.ts`, **same `e2e/` specs**, baseURL :4300 |

## Stack (locked — do not substitute)

- Vite + React 18 + TypeScript (strict)
- React Router v6 (`createBrowserRouter`)
- Zustand for the module-level auth store (replaces `UserService`'s `BehaviorSubject`s)
- TanStack Query for server state in pages/components (replaces `AsyncPipe` over service observables)
- axios with request/response interceptors (replaces `HttpClient` + functional interceptors)
- DOMPurify for the markdown pipe
- Vitest + MSW + Testing Library for unit tests

## Script contract (`web-react/package.json`)

Every child session must leave all of these green:

```
npm run build      # vite build
npm run lint       # eslint .
npm run typecheck  # tsc --noEmit
npm run test       # vitest run
```

Waves that touch auth or routing additionally run:

```
npm run test:e2e            # playwright test --grep-invert @security
npm run test:e2e:security   # playwright test --grep @security
```

## File-naming conventions

| Angular                            | React                                               |
| ---------------------------------- | --------------------------------------------------- |
| `foo-bar.component.ts` (+ `.html`) | `FooBar.tsx` (JSX inline)                           |
| `foo.service.ts`                   | `features/<area>/api.ts` (plain async functions)    |
| `foo.model.ts`                     | `features/<area>/model.ts`                          |
| `foo.pipe.ts`                      | `lib/<foo>.ts` (plain function) or a tiny component |
| `foo.service.spec.ts`              | `features/<area>/api.test.ts`                       |
| `*.component.spec.ts`              | `FooBar.test.tsx`                                   |

## Translation rules

### 1. `@Input()` → props; `@Output()` → callback props

```ts
// Angular
@Input() article!: Article;
@Output() toggle = new EventEmitter<boolean>();
this.toggle.emit(!this.article.favorited);
```

```tsx
// React
interface FavoriteButtonProps {
  article: Article;
  onToggle: (favorited: boolean) => void;
}
onToggle(!article.favorited);
```

Name the callback `on<Event>`. Keep the payload identical to the Angular emitter.

### 2. `signal(x)` → `useState(x)`

`isSubmitting = signal(false)` / `this.isSubmitting.set(true)` becomes
`const [isSubmitting, setIsSubmitting] = useState(false)` / `setIsSubmitting(true)`.
`signal.update(fn)` becomes `setState(fn)`.

The **optimistic favorite toggle** is preserved exactly: the child fires
`onToggle(!article.favorited)` after a successful request, and the _parent_ owns
the count update (mirroring `ArticlePreviewComponent.toggleFavorite`):

```tsx
onToggle={favorited =>
  setArticle(a => ({
    ...a,
    favorited,
    favoritesCount: favorited ? a.favoritesCount + 1 : a.favoritesCount - 1,
  }))
}
```

### 3. Injected services → module imports

Angular DI has no React equivalent; services become plain modules.

```ts
constructor(private readonly articleService: ArticlesService) {}
this.articleService.favorite(slug)      // Angular
import { favoriteArticle } from './api';
await favoriteArticle(slug);            // React
```

### 4. `Router` → `useNavigate()`

`void this.router.navigate(['/register'])` → `const navigate = useNavigate(); navigate('/register')`.
`routerLink="/x"` → `<Link to="/x">`; `routerLinkActive="active"` → `<NavLink className={({isActive}) => ...}>`.

### 5. Observables → promises

Services return `Promise<T>` from `async` functions, not `Observable<T>`. The
`.pipe(map(data => data.article))` unwrapping moves into the function body:

```ts
export async function favoriteArticle(slug: string): Promise<Article> {
  const { data } = await http.post<{ article: Article }>(`/articles/${slug}/favorite`, {});
  return data.article;
}
```

`switchMap` chains become sequential `await`s. `subscribe({ next, error })`
becomes `try/catch`. `takeUntilDestroyed` is unnecessary for one-shot requests;
where cancellation matters, use an `AbortController` or TanStack Query.

### 6. `HttpClient` + interceptors → `src/lib/http.ts`

One shared axios instance. `apiInterceptor` is the `baseURL`; `tokenInterceptor`
is a request interceptor; `errorInterceptor` is a response interceptor that
normalizes every failure to `{ ...body, status }` with the
`{ errors: { network: [...] } }` fallback. **Never** create another axios
instance or call `fetch` directly — always import `http`.

### 7. Auth state

`UserService` becomes a module-level Zustand store with the same four-state
machine (`authenticated | unauthenticated | unavailable | loading`). Components
read it with the store hook; leaf components that only need a boolean should
take it as a **prop** so they stay pure and trivially testable — as
`FavoriteButton` does with `isAuthenticated`.

## Testing pattern (Vitest + MSW + Testing Library)

- MSW server is global: `src/test/msw-server.ts`, wired in `src/test/setup.ts`.
  Unhandled requests **fail** the test, so every test declares its handlers.
- Register per-test handlers with `server.use(...)` against `` `${API_URL}/...` ``.
- Render through `MemoryRouter` when the component navigates; assert navigation
  by rendering a stub route and checking its content is on screen.
- Drive interactions with `@testing-library/user-event`, never by calling
  handlers directly.
- Wrap the component in a small stateful `Harness` when the Angular parent owned
  state (as with the favorites count) so the optimistic behaviour is covered.

See `src/features/article/FavoriteButton.test.tsx` for the worked example.

## Before / after

<details>
<summary><code>favorite-button.component.ts</code> (Angular)</summary>

```ts
@Component({
  selector: 'app-favorite-button',
  template: `
    <button
      class="btn btn-sm"
      [ngClass]="{
        disabled: isSubmitting(),
        'btn-outline-primary': !article.favorited,
        'btn-primary': article.favorited,
      }"
      (click)="toggleFavorite()"
    >
      <i class="ion-heart"></i> <ng-content></ng-content>
    </button>
  `,
})
export class FavoriteButtonComponent {
  isSubmitting = signal(false);
  @Input() article!: Article;
  @Output() toggle = new EventEmitter<boolean>();

  constructor(
    private readonly articleService: ArticlesService,
    private readonly router: Router,
    private readonly userService: UserService,
  ) {}

  toggleFavorite(): void {
    this.isSubmitting.set(true);
    this.userService.isAuthenticated
      .pipe(
        switchMap(authenticated => {
          if (!authenticated) {
            void this.router.navigate(['/register']);
            return EMPTY;
          }
          return this.article.favorited
            ? this.articleService.unfavorite(this.article.slug)
            : this.articleService.favorite(this.article.slug);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toggle.emit(!this.article.favorited);
        },
        error: () => this.isSubmitting.set(false),
      });
  }
}
```

</details>

<details>
<summary><code>FavoriteButton.tsx</code> (React)</summary>

```tsx
export function FavoriteButton({ article, onToggle, isAuthenticated, children, className }: FavoriteButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const toggleFavorite = async () => {
    setIsSubmitting(true);
    if (!isAuthenticated) {
      setIsSubmitting(false);
      navigate('/register');
      return;
    }
    try {
      if (!article.favorited) {
        await favoriteArticle(article.slug);
      } else {
        await unfavoriteArticle(article.slug);
      }
      setIsSubmitting(false);
      onToggle(!article.favorited);
    } catch {
      setIsSubmitting(false);
    }
  };

  const classes = [
    'btn',
    'btn-sm',
    isSubmitting ? 'disabled' : '',
    article.favorited ? 'btn-primary' : 'btn-outline-primary',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} onClick={toggleFavorite}>
      <i className="ion-heart"></i> {children}
    </button>
  );
}
```

</details>

## Markup fidelity is non-negotiable

The `e2e/` suite is reused verbatim, and it selects on class names, text and DOM
structure. Copy the Angular template's element structure, classes and text
exactly — including things that look decorative (`ion-heart`, `pull-xs-right`,
`Connecting...`, `Loading...`). Angular control flow maps as:

| Angular                      | React                               |
| ---------------------------- | ----------------------------------- |
| `@if (cond) { ... }`         | `{cond && <>...</>}`                |
| `@for (x of xs; track x.id)` | `{xs.map(x => <El key={x.id} />)}`  |
| `<ng-content>`               | `children`                          |
| `{{ value \| somePipe }}`    | `{somePipe(value)}`                 |
| `[ngClass]="{a: cond}"`      | template string / `clsx`-style join |

## Shared files are orchestrator-owned

Child sessions **must not** edit:

- `web-react/package.json`
- `web-react/src/router.tsx`
- `web-react/src/main.tsx`
- `web-react/src/lib/http.ts` auth-store binding

Request the change in your PR description instead; the orchestrator applies it.
Everything else is partitioned by directory so waves never touch the same file.
