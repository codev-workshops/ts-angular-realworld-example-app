import type { AuthState } from '@/core/models/auth-state';
import type { User } from '@/core/auth/user';

/**
 * Framework-agnostic debug interface consumed by the e2e suite
 * (see e2e/helpers/debug.ts). Installed by the auth store at startup.
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
