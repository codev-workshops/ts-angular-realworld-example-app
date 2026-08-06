import { Navigate, Outlet } from 'react-router-dom';
import { selectIsAuthenticated, useAuthStore } from '@/core/auth/store';

/**
 * `canActivate: [requireAuth]` as a route wrapper. The redirect waits out the
 * 'loading' state (the startup GET /user is still in flight); 'unavailable' has no
 * current user, so — like the Angular guard — it counts as not authenticated.
 */
export function RequireAuth() {
  const authState = useAuthStore(s => s.authState);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  if (authState === 'loading') {
    return null;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

/** Inverse guard for /login and /register: authenticated users go home. */
export function RequireAnonymous() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
}
