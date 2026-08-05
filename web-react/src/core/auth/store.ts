import { create } from 'zustand';
import * as authApi from './api';
import { destroyToken, getToken, saveToken } from './jwt';
import { AuthState, User } from './model';
import { setUnauthorizedHandler } from '../../lib/http';

/**
 * Port of `UserService` as a module-level Zustand store.
 *
 * ## Auth states
 *
 * - 'loading': initial state, checking if the stored token is valid
 * - 'authenticated': token valid, user data loaded
 * - 'unauthenticated': no token or token invalid (4XX error)
 * - 'unavailable': server error (5XX / network / parse), token kept for retry
 *
 * ## Error handling on GET /user
 *
 * 4XX means "your token is bad" (clear it); anything else means "the server is
 * broken" (keep the token, retry with exponential backoff). The RxJS `timer`
 * schedule becomes `setTimeout`, and `shareReplay(1)` becomes in-flight promise
 * de-duplication.
 */
export interface AuthStore {
  currentUser: User | null;
  authState: AuthState;
  setAuth: (user: User) => void;
  purgeAuth: () => void;
  login: (credentials: authApi.LoginCredentials) => Promise<User>;
  register: (credentials: authApi.RegisterCredentials) => Promise<User>;
  update: (user: Partial<User>) => Promise<User>;
  logout: () => void;
  getCurrentUser: () => Promise<void>;
}

/**
 * Angular injected the `Router` into `UserService`; importing the router into a
 * module-level store would create a cycle (router -> shell -> store -> router)
 * and make the store untestable outside a router context, so navigation is a
 * registered callback the app wires up at startup instead.
 */
type NavigateFn = (to: string) => void;
let navigate: NavigateFn = to => {
  window.location.assign(to);
};

export function setNavigate(fn: NavigateFn): void {
  navigate = fn;
}

let retryAttempt = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let inFlightCurrentUser: Promise<void> | null = null;

function cancelRetry(): void {
  if (retryTimer !== null) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

/** Exponential backoff: 2s, 4s, 8s, 16s, 16s, ... (capped at 16s, indefinite). */
function scheduleRetry(): void {
  cancelRetry();

  if (!getToken()) {
    return; // No token, nothing to retry
  }

  const delaySeconds = Math.min(2 * Math.pow(2, retryAttempt), 16);
  retryAttempt++;

  retryTimer = setTimeout(() => {
    retryTimer = null;
    if (getToken()) {
      useAuthStore.setState({ authState: 'loading' });
      void useAuthStore.getState().getCurrentUser();
    }
  }, delaySeconds * 1000);
}

function setAuthUnavailable(): void {
  useAuthStore.setState({ currentUser: null, authState: 'unavailable' });
  scheduleRetry();
}

/**
 * 4XX: client error (invalid token, forbidden, ...) -> logout.
 * Anything else (5XX, network error / status 0, parse error) -> unavailable.
 */
function handleAuthError(error: unknown): void {
  const status = typeof error === 'object' && error !== null ? (error as { status?: number }).status : undefined;

  if (typeof status === 'number' && status >= 400 && status < 500) {
    useAuthStore.getState().purgeAuth();
  } else {
    setAuthUnavailable();
  }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  currentUser: null,
  authState: 'loading',

  setAuth: (user: User) => {
    cancelRetry();
    retryAttempt = 0;
    saveToken(user.token);
    set({ currentUser: user, authState: 'authenticated' });
  },

  purgeAuth: () => {
    cancelRetry();
    retryAttempt = 0;
    destroyToken();
    set({ currentUser: null, authState: 'unauthenticated' });
  },

  login: async credentials => {
    const user = await authApi.login(credentials);
    get().setAuth(user);
    return user;
  },

  register: async credentials => {
    const user = await authApi.register(credentials);
    get().setAuth(user);
    return user;
  },

  /** Updates the cached user only — the token and auth state are untouched. */
  update: async user => {
    const updated = await authApi.updateUser(user);
    set({ currentUser: updated });
    return updated;
  },

  logout: () => {
    get().purgeAuth();
    navigate('/');
  },

  /**
   * Concurrent callers share a single in-flight `GET /user`, preserving the
   * `shareReplay(1)` semantics of the Angular version. Errors are handled here
   * and never propagate (Angular's `catchError(() => EMPTY)`).
   */
  getCurrentUser: () => {
    if (inFlightCurrentUser) {
      return inFlightCurrentUser;
    }

    const request = authApi
      .getCurrentUser()
      .then(
        user => get().setAuth(user),
        error => handleAuthError(error),
      )
      .catch(error => handleAuthError(error))
      .finally(() => {
        inFlightCurrentUser = null;
      });

    inFlightCurrentUser = request;
    return request;
  },
}));

// Break the store <-> http cycle: http calls back into the store on a 401.
setUnauthorizedHandler(() => useAuthStore.getState().purgeAuth());
