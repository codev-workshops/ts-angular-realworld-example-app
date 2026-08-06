import { create } from 'zustand';
import type { User } from './user';
import type { AuthState } from '@/core/models/auth-state';
import { destroyToken, saveToken } from './jwt';
import { setUnauthorizedHandler } from '@/lib/api';

/**
 * Auth store. Zustand is used instead of context so components can subscribe to a
 * single slice (`useAuthStore(s => s.authState)`), which reproduces the
 * `distinctUntilChanged()` semantics of the Angular BehaviorSubjects.
 *
 * Phase 2 extends this with login/register/update, the GET /user 4XX-vs-5XX split,
 * the exponential-backoff retry and the window.__conduit_debug__ install.
 */
interface AuthStore {
  currentUser: User | null;
  authState: AuthState;
  setAuth: (user: User) => void;
  purgeAuth: () => void;
}

export const useAuthStore = create<AuthStore>(set => ({
  currentUser: null,
  authState: 'loading',
  setAuth: user => {
    saveToken(user.token);
    set({ currentUser: user, authState: 'authenticated' });
  },
  purgeAuth: () => {
    destroyToken();
    set({ currentUser: null, authState: 'unauthenticated' });
  },
}));

/** Any 401 outside GET /user means the token expired mid-session. */
setUnauthorizedHandler(() => useAuthStore.getState().purgeAuth());

export const selectIsAuthenticated = (state: AuthStore): boolean => !!state.currentUser;

export function isAuthenticated(): boolean {
  return selectIsAuthenticated(useAuthStore.getState());
}
