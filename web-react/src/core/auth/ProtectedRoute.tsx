import { ReactNode, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from './store';

interface ProtectedRouteProps {
  /**
   * `true` mirrors `requireAuth` (redirect anonymous users to `/login`);
   * `false` is its inverse, used by `/login` and `/register` to bounce
   * already-authenticated users back to the home page.
   */
  requireAuth: boolean;
  children?: ReactNode;
}

/**
 * Port of the `canActivate` guards in `app.routes.ts`.
 *
 * Angular's guards read `UserService.isAuthenticated` (`!!currentUser`) after
 * `provideAppInitializer` has resolved, so the first navigation always sees a
 * settled auth state. React renders before `GET /user` comes back, so a naive
 * guard would bounce an authenticated user to `/login` on every hard refresh:
 * while `authState === 'loading'` nothing is decided and nothing is rendered
 * (the shell's navbar still shows its `Loading...` branch).
 *
 * `'unavailable'` is treated as not authenticated, exactly like Angular: the
 * token is kept and retried, but `currentUser` is null so `isAuthenticated` is
 * false and the guard redirects.
 */
export function ProtectedRoute({ requireAuth, children }: ProtectedRouteProps) {
  const authState = useAuthStore(s => s.authState);
  const isAuthenticated = useAuthStore(s => !!s.currentUser);
  const location = useLocation();

  // `canActivate` runs once per navigation, so the decision is taken when the
  // route is activated and then frozen: losing the session mid-page (a 401 on
  // some other request purging the store) leaves the user on the page, exactly
  // as in Angular, instead of yanking them to /login mid-interaction.
  const decision = useRef<{ key: string; allow: boolean } | null>(null);

  if (decision.current?.key !== location.key) {
    if (authState === 'loading') {
      return null;
    }
    decision.current = { key: location.key, allow: isAuthenticated === requireAuth };
  }

  if (!decision.current.allow) {
    return <Navigate to={requireAuth ? '/login' : '/'} replace />;
  }

  return <>{children ?? <Outlet />}</>;
}
