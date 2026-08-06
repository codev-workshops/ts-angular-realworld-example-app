import { selectIsAuthenticated, useAuthStore } from './store';

/**
 * Port of the `[ifAuthenticated]` structural directive: callers combine it with
 * conditional JSX instead of a template directive.
 *
 * ```tsx
 * const authenticated = useIsAuthenticated();
 * {authenticated ? <LoggedInNav /> : <LoggedOutNav />}
 * ```
 */
export function useIsAuthenticated(): boolean {
  return useAuthStore(selectIsAuthenticated);
}
