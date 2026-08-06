import { create } from 'zustand';
import type { User } from './user';
import type { AuthState } from '@/core/models/auth-state';
import type { ApiError } from '@/core/models/errors';
import { destroyToken, getToken, saveToken } from './jwt';
import { get, post, put, setUnauthorizedHandler } from '@/lib/api';

/**
 * Auth store. Zustand is used instead of context so components can subscribe to a
 * single slice (`useAuthStore(s => s.authState)`), which reproduces the
 * `distinctUntilChanged()` semantics of the Angular BehaviorSubjects.
 *
 * Port of `src/app/core/auth/services/user.service.ts`:
 *
 * - GET /user 4XX (invalid token)        -> purgeAuth: token destroyed, 'unauthenticated'
 * - GET /user 5XX / network / unparsable -> setAuthUnavailable: token kept, 'unavailable',
 *   plus a retry scheduled with exponential backoff 2s, 4s, 8s, 16s, 16s... indefinitely.
 */
interface AuthStore {
  currentUser: User | null;
  authState: AuthState;
  setAuth: (user: User) => void;
  purgeAuth: () => void;
  setAuthUnavailable: () => void;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  register: (credentials: { username: string; email: string; password: string }) => Promise<User>;
  update: (user: Partial<User>) => Promise<User>;
  logout: () => void;
  getCurrentUser: () => Promise<void>;
}

let retryAttempt = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function cancelRetry(): void {
  if (retryTimer !== null) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

/** 2s, 4s, 8s, 16s, 16s... only while a token exists. */
function scheduleRetry(): void {
  cancelRetry();

  if (!getToken()) {
    return;
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

/**
 * The Angular client rejected a body it could not parse; axios keeps unparsable JSON as a
 * raw string, so the shape is validated here and treated like a server error.
 */
function isUserResponse(data: unknown): data is { user: User } {
  return (
    !!data &&
    typeof data === 'object' &&
    'user' in data &&
    !!data.user &&
    typeof (data as { user: unknown }).user === 'object'
  );
}

/** `router.navigate(['/'])` on logout; registered by the router (see AppRoutes). */
let navigate: (path: string) => void = path => {
  window.location.assign(path);
};

export function setNavigator(fn: (path: string) => void): void {
  navigate = fn;
}

export const useAuthStore = create<AuthStore>((set, getStore) => ({
  currentUser: null,
  authState: 'loading',

  setAuth: user => {
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

  setAuthUnavailable: () => {
    set({ currentUser: null, authState: 'unavailable' });
    scheduleRetry();
  },

  login: async credentials => {
    const { user } = await post<{ user: User }>('/users/login', { user: credentials });
    getStore().setAuth(user);
    return user;
  },

  register: async credentials => {
    const { user } = await post<{ user: User }>('/users', { user: credentials });
    getStore().setAuth(user);
    return user;
  },

  /** Replaces the cached user without touching the token or the auth state. */
  update: async user => {
    const { user: updated } = await put<{ user: User }>('/user', { user });
    set({ currentUser: updated });
    return updated;
  },

  logout: () => {
    getStore().purgeAuth();
    navigate('/');
  },

  getCurrentUser: async () => {
    try {
      const data = await get<unknown>('/user');
      if (!isUserResponse(data)) {
        getStore().setAuthUnavailable();
        return;
      }
      getStore().setAuth(data.user);
    } catch (error) {
      const status = (error as ApiError | undefined)?.status ?? 0;
      if (status >= 400 && status < 500) {
        getStore().purgeAuth();
      } else {
        getStore().setAuthUnavailable();
      }
    }
  },
}));

/** Any 401 outside GET /user means the token expired mid-session. */
setUnauthorizedHandler(() => useAuthStore.getState().purgeAuth());

export const selectIsAuthenticated = (state: AuthStore): boolean => !!state.currentUser;

export function isAuthenticated(): boolean {
  return selectIsAuthenticated(useAuthStore.getState());
}
