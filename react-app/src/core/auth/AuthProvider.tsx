import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { request, setUnauthorizedHandler } from '../api/client';
import type { ApiError } from '../api/client';
import type { User } from '../models/user';
import { destroyToken, getToken, saveToken } from './jwt';
import { AuthContext } from './auth-context';
import type { AuthContextValue, AuthState } from './auth-context';

/**
 * Mirrors the Angular UserService.
 *
 * Auth states: 'loading' (validating a stored token), 'authenticated',
 * 'unauthenticated' (no token or 4XX on GET /user) and 'unavailable'
 * (5XX/network on GET /user - the token is kept and retried with backoff
 * 2s, 4s, 8s, 16s, 16s...).
 *
 * Children are rendered only once the initial check settles, matching Angular's
 * blocking `provideAppInitializer`.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Without a stored token the Angular initializer resolves synchronously to
  // 'unauthenticated', so the very first paint already has the final state.
  const [authState, setAuthState] = useState<AuthState>(() => (getToken() ? 'loading' : 'unauthenticated'));
  const [initialized, setInitialized] = useState(() => !getToken());

  const retryAttempt = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchCurrentUserRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const cancelRetry = useCallback(() => {
    if (retryTimer.current !== null) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
  }, []);

  const setAuth = useCallback(
    (user: User) => {
      cancelRetry();
      retryAttempt.current = 0;
      saveToken(user.token);
      setCurrentUser(user);
      setAuthState('authenticated');
    },
    [cancelRetry],
  );

  const purgeAuth = useCallback(() => {
    cancelRetry();
    retryAttempt.current = 0;
    destroyToken();
    setCurrentUser(null);
    setAuthState('unauthenticated');
  }, [cancelRetry]);

  const fetchCurrentUser = useCallback(async (): Promise<void> => {
    try {
      const { user } = await request<{ user: User }>('/user');
      setAuth(user);
    } catch (err) {
      const status = (err as ApiError).status;
      if (status >= 400 && status < 500) {
        purgeAuth();
      } else {
        cancelRetry();
        setCurrentUser(null);
        setAuthState('unavailable');
        if (!getToken()) {
          return;
        }
        const delaySeconds = Math.min(2 * Math.pow(2, retryAttempt.current), 16);
        retryAttempt.current += 1;
        retryTimer.current = setTimeout(() => {
          if (getToken()) {
            setAuthState('loading');
            void fetchCurrentUserRef.current();
          }
        }, delaySeconds * 1000);
      }
    }
  }, [cancelRetry, purgeAuth, setAuth]);

  useEffect(() => {
    fetchCurrentUserRef.current = fetchCurrentUser;
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (!getToken()) {
      return;
    }
    let active = true;
    const validateStoredToken = async () => {
      try {
        await fetchCurrentUserRef.current();
      } finally {
        if (active) {
          setInitialized(true);
        }
      }
    };
    void validateStoredToken();
    return () => {
      active = false;
    };
    // Runs once, mirroring Angular's `provideAppInitializer`.
  }, []);

  useEffect(() => cancelRetry, [cancelRetry]);

  useEffect(() => {
    setUnauthorizedHandler(purgeAuth);
  }, [purgeAuth]);

  const login = useCallback(
    async (credentials: { email: string; password: string }) => {
      const { user } = await request<{ user: User }>('/users/login', {
        method: 'POST',
        body: { user: credentials },
      });
      setAuth(user);
      return user;
    },
    [setAuth],
  );

  const register = useCallback(
    async (credentials: { username: string; email: string; password: string }) => {
      const { user } = await request<{ user: User }>('/users', {
        method: 'POST',
        body: { user: credentials },
      });
      setAuth(user);
      return user;
    },
    [setAuth],
  );

  const update = useCallback(async (user: Partial<User> & { password?: string }) => {
    const { user: updated } = await request<{ user: User }>('/user', {
      method: 'PUT',
      body: { user },
    });
    setCurrentUser(updated);
    return updated;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      authState,
      isAuthenticated: !!currentUser,
      login,
      register,
      logout: purgeAuth,
      update,
      purgeAuth,
    }),
    [currentUser, authState, login, register, purgeAuth, update],
  );

  useDebugInterface(currentUser, authState);

  return <AuthContext value={value}>{initialized ? children : null}</AuthContext>;
}

/** Exposes window.__conduit_debug__, the framework-agnostic e2e debug interface. */
function useDebugInterface(currentUser: User | null, authState: AuthState): void {
  const userRef = useRef(currentUser);
  const stateRef = useRef(authState);

  useEffect(() => {
    userRef.current = currentUser;
    stateRef.current = authState;
  }, [currentUser, authState]);

  useEffect(() => {
    window.__conduit_debug__ = {
      getToken: () => getToken() ?? null,
      getAuthState: () => stateRef.current,
      getCurrentUser: () => userRef.current,
    };
  }, []);
}
