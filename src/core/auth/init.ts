import { getToken } from './jwt';
import { useAuthStore } from './store';

/**
 * Framework-agnostic debug interface consumed by the e2e suite
 * (see `e2e/helpers/debug.ts`). Port of `setupDebugInterface` in
 * `src/app/app.config.ts`; the store is read on demand instead of via subscriptions.
 */
export function installDebugInterface(): void {
  window.__conduit_debug__ = {
    getToken: () => getToken(),
    getAuthState: () => useAuthStore.getState().authState,
    getCurrentUser: () => useAuthStore.getState().currentUser,
  };
}

/**
 * Port of `initAuth`: validate a stored token at startup.
 *
 * - token present -> GET /user ('authenticated' | 'unauthenticated' | 'unavailable')
 * - no token      -> purgeAuth so the app leaves 'loading' immediately
 *
 * Runs before render and is not awaited: the shell renders while the request is in flight.
 */
export function initAuth(): void {
  installDebugInterface();

  if (getToken()) {
    void useAuthStore.getState().getCurrentUser();
  } else {
    useAuthStore.getState().purgeAuth();
  }
}
