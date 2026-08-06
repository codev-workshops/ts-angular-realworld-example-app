import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { api } from '@/lib/api';
import type { User } from './user';
import { getToken } from './jwt';
import { installDebugInterface } from './init';
import { setNavigator, useAuthStore } from './store';

const user: User = {
  email: 'jake@jake.jake',
  token: 'jwt.token.here',
  username: 'jake',
  bio: null,
  image: null,
};

interface Request {
  method?: string;
  url?: string;
  body?: unknown;
}

/** Replaces the axios adapter so requests never leave the test process. */
function respondWith(data: unknown): Request[] {
  const requests: Request[] = [];
  api.defaults.adapter = (config: InternalAxiosRequestConfig) => {
    requests.push({ method: config.method, url: config.url, body: config.data && JSON.parse(config.data as string) });
    return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config } as AxiosResponse);
  };
  return requests;
}

function failWith(status: number) {
  api.defaults.adapter = config =>
    Promise.reject(
      new AxiosError('failed', 'ERR', config, null, {
        data: { errors: { message: ['nope'] } },
        status,
        statusText: '',
        headers: {},
        config,
      }),
    );
}

beforeEach(() => {
  useAuthStore.setState({ currentUser: null, authState: 'loading' });
});

afterEach(() => {
  delete api.defaults.adapter;
  useAuthStore.getState().purgeAuth();
  vi.useRealTimers();
});

describe('auth store', () => {
  it('login posts the credentials and authenticates', async () => {
    const requests = respondWith({ user });

    await useAuthStore.getState().login({ email: user.email, password: 'pw' });

    expect(requests[0]).toMatchObject({ method: 'post', url: '/users/login' });
    expect(requests[0].body).toEqual({ user: { email: user.email, password: 'pw' } });
    expect(useAuthStore.getState().authState).toBe('authenticated');
    expect(getToken()).toBe(user.token);
  });

  it('register posts to /users and authenticates', async () => {
    const requests = respondWith({ user });

    await useAuthStore.getState().register({ username: 'jake', email: user.email, password: 'pw' });

    expect(requests[0]).toMatchObject({ method: 'post', url: '/users' });
    expect(useAuthStore.getState().currentUser).toEqual(user);
  });

  it('update replaces the current user without touching the token or the auth state', async () => {
    respondWith({ user });
    await useAuthStore.getState().login({ email: user.email, password: 'pw' });

    const updated = { ...user, token: 'a-different-token', bio: 'now with bio' };
    respondWith({ user: updated });
    await useAuthStore.getState().update({ bio: 'now with bio' });

    expect(useAuthStore.getState().currentUser).toEqual(updated);
    expect(useAuthStore.getState().authState).toBe('authenticated');
    expect(getToken()).toBe(user.token);
  });

  describe('getCurrentUser error split', () => {
    it.each([400, 401, 403, 404])('purges the session on %i', async status => {
      respondWith({ user });
      await useAuthStore.getState().login({ email: user.email, password: 'pw' });

      failWith(status);
      await useAuthStore.getState().getCurrentUser();

      expect(useAuthStore.getState().authState).toBe('unauthenticated');
      expect(useAuthStore.getState().currentUser).toBeNull();
      expect(getToken()).toBeNull();
    });

    it.each([500, 503, 0])('keeps the token and becomes unavailable on %i', async status => {
      respondWith({ user });
      await useAuthStore.getState().login({ email: user.email, password: 'pw' });

      failWith(status);
      await useAuthStore.getState().getCurrentUser();

      expect(useAuthStore.getState().authState).toBe('unavailable');
      expect(useAuthStore.getState().currentUser).toBeNull();
      expect(getToken()).toBe(user.token);
    });

    it('becomes unavailable when the response could not be parsed', async () => {
      respondWith({ user });
      await useAuthStore.getState().login({ email: user.email, password: 'pw' });

      respondWith('{ not valid json }}}}');
      await useAuthStore.getState().getCurrentUser();

      expect(useAuthStore.getState().authState).toBe('unavailable');
      expect(getToken()).toBe(user.token);
    });

    it('authenticates on success', async () => {
      window.localStorage.setItem('jwtToken', 'stored');
      respondWith({ user });

      await useAuthStore.getState().getCurrentUser();

      expect(useAuthStore.getState().authState).toBe('authenticated');
      expect(useAuthStore.getState().currentUser).toEqual(user);
    });
  });

  describe('retry backoff', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      window.localStorage.setItem('jwtToken', 'stored');
    });

    it('retries with 2s, 4s, 8s, 16s, 16s delays', async () => {
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      failWith(500);

      await useAuthStore.getState().getCurrentUser();
      for (const delay of [2000, 4000, 8000, 16000]) {
        await vi.advanceTimersByTimeAsync(delay);
      }

      expect(setTimeoutSpy.mock.calls.map(call => call[1])).toEqual([2000, 4000, 8000, 16000, 16000]);
      expect(useAuthStore.getState().authState).toBe('unavailable');
      expect(getToken()).toBe('stored');
    });

    it('goes back to loading and refetches when the retry fires', async () => {
      failWith(500);
      await useAuthStore.getState().getCurrentUser();

      const requests = respondWith({ user });
      await vi.advanceTimersByTimeAsync(2000);

      expect(requests[0]).toMatchObject({ method: 'get', url: '/user' });
      expect(useAuthStore.getState().authState).toBe('authenticated');
    });

    it('does not schedule a retry once the token is gone', async () => {
      window.localStorage.removeItem('jwtToken');
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      failWith(500);

      await useAuthStore.getState().getCurrentUser();

      expect(setTimeoutSpy).not.toHaveBeenCalled();
      expect(useAuthStore.getState().authState).toBe('unavailable');
    });

    it('cancels the pending retry on login and restarts the backoff', async () => {
      failWith(500);
      await useAuthStore.getState().getCurrentUser();

      const requests = respondWith({ user });
      await useAuthStore.getState().login({ email: user.email, password: 'pw' });
      await vi.advanceTimersByTimeAsync(60000);

      expect(requests.filter(request => request.url === '/user')).toHaveLength(0);
      expect(useAuthStore.getState().authState).toBe('authenticated');

      // The counter was reset, so the next failure starts at 2s again.
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      failWith(500);
      await useAuthStore.getState().getCurrentUser();
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    });

    it('cancels the pending retry on logout so it cannot resurrect the session', async () => {
      failWith(500);
      await useAuthStore.getState().getCurrentUser();

      const navigate = vi.fn();
      setNavigator(navigate);
      const requests = respondWith({ user });
      useAuthStore.getState().logout();
      await vi.advanceTimersByTimeAsync(60000);

      expect(requests).toHaveLength(0);
      expect(useAuthStore.getState().authState).toBe('unauthenticated');
      expect(getToken()).toBeNull();
      expect(navigate).toHaveBeenCalledWith('/');
    });
  });

  describe('window.__conduit_debug__', () => {
    beforeEach(() => {
      installDebugInterface();
    });

    it('reports null token and the loading state before init resolves', () => {
      expect(window.__conduit_debug__?.getToken()).toBeNull();
      expect(window.__conduit_debug__?.getAuthState()).toBe('loading');
      expect(window.__conduit_debug__?.getCurrentUser()).toBeNull();
    });

    it('reports the token, state and user of an authenticated session', async () => {
      respondWith({ user });
      await useAuthStore.getState().login({ email: user.email, password: 'pw' });

      expect(window.__conduit_debug__?.getToken()).toBe(user.token);
      expect(window.__conduit_debug__?.getAuthState()).toBe('authenticated');
      expect(window.__conduit_debug__?.getCurrentUser()).toEqual(user);
    });

    it('reports the kept token and a null user while unavailable', async () => {
      respondWith({ user });
      await useAuthStore.getState().login({ email: user.email, password: 'pw' });

      failWith(500);
      await useAuthStore.getState().getCurrentUser();

      expect(window.__conduit_debug__?.getToken()).toBe(user.token);
      expect(window.__conduit_debug__?.getAuthState()).toBe('unavailable');
      expect(window.__conduit_debug__?.getCurrentUser()).toBeNull();
    });

    it('reports no token once purged', () => {
      useAuthStore.getState().purgeAuth();

      expect(window.__conduit_debug__?.getToken()).toBeNull();
      expect(window.__conduit_debug__?.getAuthState()).toBe('unauthenticated');
    });
  });
});
