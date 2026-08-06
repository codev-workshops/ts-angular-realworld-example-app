/// <reference types="vite/client" />

import type { AuthState } from './core/auth/auth-context';
import type { User } from './core/models/user';

declare global {
  interface Window {
    __conduit_debug__?: {
      getToken: () => string | null;
      getAuthState: () => AuthState;
      getCurrentUser: () => User | null;
    };
  }
}

export {};
