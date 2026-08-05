import { ReactNode } from 'react';
import { useAuthStore } from './store';

interface IfAuthenticatedProps {
  /** The directive's `[ifAuthenticated]` input: which auth status renders the children. */
  condition: boolean;
  children: ReactNode;
}

/**
 * Port of `if-authenticated.directive.ts`.
 *
 * The directive rendered its template when `isAuthenticated && condition`
 * (authRequired) or `!isAuthenticated && !condition` (unauthRequired), i.e.
 * whenever the two match. `isAuthenticated` mirrors `UserService.isAuthenticated`
 * — a truthy current user, not the four-way `authState`.
 */
export function IfAuthenticated({ condition, children }: IfAuthenticatedProps) {
  const isAuthenticated = useAuthStore(s => !!s.currentUser);

  return isAuthenticated === condition ? <>{children}</> : null;
}
