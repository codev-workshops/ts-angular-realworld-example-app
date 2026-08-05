import { getToken } from './jwt';
import { AuthState, User } from './model';
import { setNavigate, useAuthStore } from './store';

/**
 * Debug interface for testing - exposes app state in a framework-agnostic way.
 * Tests can use this instead of directly accessing localStorage or internal state.
 */
export interface ConduitDebug {
  getToken: () => string | null;
  getAuthState: () => AuthState;
  getCurrentUser: () => User | null;
}

declare global {
  interface Window {
    __conduit_debug__?: ConduitDebug;
  }
}

/** Sets up the debug interface on window.__conduit_debug__ */
function setupDebugInterface(): void {
  // Read through on every call so the interface always reports current values.
  window.__conduit_debug__ = {
    getToken: () => getToken(),
    getAuthState: () => useAuthStore.getState().authState,
    getCurrentUser: () => useAuthStore.getState().currentUser,
  };
}

/**
 * App initializer: checks auth state at startup.
 *
 * - No token → purgeAuth() to exit 'loading' state → 'unauthenticated'
 * - Token exists → getCurrentUser() to validate it:
 *     - Success → 'authenticated'
 *     - 4XX → 'unauthenticated' (invalid token, cleared)
 *     - 5XX → 'unavailable' (server down, token kept, auto-retry)
 *
 * Unlike Angular's blocking `provideAppInitializer`, nothing is awaited: the
 * app renders immediately and the shell shows the 'loading' branch while
 * `GET /user` is in flight.
 */
export function initAuth(navigate?: (to: string) => void): void {
  setupDebugInterface();

  if (navigate) {
    setNavigate(navigate);
  }

  if (getToken()) {
    void useAuthStore.getState().getCurrentUser();
  } else {
    useAuthStore.getState().purgeAuth();
  }
}
