import { HttpResponse, http as mswHttp } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http } from '../../lib/http';
import { API_URL, server } from '../../test/msw-server';
import { getToken, saveToken } from './jwt';
import { User } from './model';
import { setNavigate, useAuthStore } from './store';

/**
 * Port of `user.service.spec.ts`. The RxJS/`HttpTestingController` mechanics
 * become promises + MSW, but the covered behaviour is the same, plus the new
 * in-flight de-duplication test that replaces `shareReplay(1)`.
 */
const mockUser: User = {
  email: 'test@example.com',
  token: 'test-jwt-token',
  username: 'testuser',
  bio: 'Test bio',
  image: 'https://example.com/avatar.jpg',
};

const navigate = vi.fn();

function store() {
  return useAuthStore.getState();
}

/** Only fake the timers the backoff uses so MSW's async I/O keeps working. */
function useBackoffTimers() {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
}

/** Let a fired retry's (un-faked) MSW round trip settle. */
async function flush() {
  for (let i = 0; i < 10; i++) {
    await new Promise(resolve => setImmediate(resolve));
  }
}

beforeEach(() => {
  navigate.mockClear();
  setNavigate(navigate);
  // purgeAuth also cancels any retry scheduled by a previous test.
  store().purgeAuth();
  useAuthStore.setState({ authState: 'loading' });
});

afterEach(() => {
  store().purgeAuth();
  vi.useRealTimers();
});

describe('auth store', () => {
  it('starts with no user', () => {
    expect(store().currentUser).toBeNull();
  });

  describe('login', () => {
    it('sends a POST request to /users/login', async () => {
      let body: unknown;
      server.use(
        mswHttp.post(`${API_URL}/users/login`, async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({ user: mockUser });
        }),
      );

      await store().login({ email: 'test@example.com', password: 'password123' });

      expect(body).toEqual({ user: { email: 'test@example.com', password: 'password123' } });
    });

    it('calls setAuth with the returned user', async () => {
      server.use(mswHttp.post(`${API_URL}/users/login`, () => HttpResponse.json({ user: mockUser })));

      await store().login({ email: 'test@example.com', password: 'password123' });

      expect(getToken()).toBe(mockUser.token);
      expect(store().authState).toBe('authenticated');
    });

    it('updates currentUser after a successful login', async () => {
      server.use(mswHttp.post(`${API_URL}/users/login`, () => HttpResponse.json({ user: mockUser })));

      await store().login({ email: 'test@example.com', password: 'password123' });

      expect(store().currentUser).toEqual(mockUser);
    });

    it('propagates login errors to the caller', async () => {
      server.use(
        mswHttp.post(`${API_URL}/users/login`, () =>
          HttpResponse.json({ errors: { 'email or password': ['is invalid'] } }, { status: 401 }),
        ),
      );

      await expect(store().login({ email: 'test@example.com', password: 'wrong' })).rejects.toMatchObject({
        status: 401,
        errors: { 'email or password': ['is invalid'] },
      });
      expect(store().currentUser).toBeNull();
    });
  });

  describe('register', () => {
    it('sends a POST request to /users', async () => {
      let body: unknown;
      server.use(
        mswHttp.post(`${API_URL}/users`, async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({ user: mockUser });
        }),
      );

      const credentials = { username: 'newuser', email: 'new@example.com', password: 'password123' };
      await store().register(credentials);

      expect(body).toEqual({ user: credentials });
    });

    it('calls setAuth with the returned user', async () => {
      server.use(mswHttp.post(`${API_URL}/users`, () => HttpResponse.json({ user: mockUser })));

      await store().register({ username: 'newuser', email: 'new@example.com', password: 'password123' });

      expect(getToken()).toBe(mockUser.token);
      expect(store().currentUser).toEqual(mockUser);
    });

    it('propagates registration errors to the caller', async () => {
      server.use(
        mswHttp.post(`${API_URL}/users`, () =>
          HttpResponse.json({ errors: { email: ['has already been taken'] } }, { status: 422 }),
        ),
      );

      await expect(
        store().register({ username: 'existing', email: 'existing@example.com', password: 'password123' }),
      ).rejects.toMatchObject({ status: 422 });
    });
  });

  describe('logout', () => {
    it('purges the auth state', () => {
      saveToken('a-token');
      store().logout();

      expect(getToken()).toBeNull();
      expect(store().authState).toBe('unauthenticated');
    });

    it('navigates to the home page', () => {
      store().logout();
      expect(navigate).toHaveBeenCalledWith('/');
    });

    it('clears currentUser', () => {
      store().setAuth(mockUser);
      store().logout();
      expect(store().currentUser).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('sends a GET request to /user and calls setAuth on success', async () => {
      let method: string | undefined;
      server.use(
        mswHttp.get(`${API_URL}/user`, ({ request }) => {
          method = request.method;
          return HttpResponse.json({ user: mockUser });
        }),
      );

      await store().getCurrentUser();

      expect(method).toBe('GET');
      expect(getToken()).toBe(mockUser.token);
      expect(store().currentUser).toEqual(mockUser);
      expect(store().authState).toBe('authenticated');
    });

    it.each([400, 401, 403, 404])('purges auth on a %i response', async status => {
      saveToken('invalid-token');
      server.use(
        mswHttp.get(`${API_URL}/user`, () => HttpResponse.json({ errors: { message: ['nope'] } }, { status })),
      );

      await store().getCurrentUser();

      expect(getToken()).toBeNull();
      expect(store().currentUser).toBeNull();
      expect(store().authState).toBe('unauthenticated');
    });

    it.each([500, 503])('enters unavailable mode and keeps the token on a %i response', async status => {
      useBackoffTimers();
      saveToken('my-precious-token');
      server.use(mswHttp.get(`${API_URL}/user`, () => HttpResponse.json({ errors: { server: ['down'] } }, { status })));

      await store().getCurrentUser();

      expect(store().authState).toBe('unavailable');
      expect(store().currentUser).toBeNull();
      expect(getToken()).toBe('my-precious-token');
    });

    it('enters unavailable mode on a network error', async () => {
      useBackoffTimers();
      saveToken('my-precious-token');
      server.use(mswHttp.get(`${API_URL}/user`, () => HttpResponse.error()));

      await store().getCurrentUser();

      expect(store().authState).toBe('unavailable');
      expect(getToken()).toBe('my-precious-token');
    });

    it('enters unavailable mode when the response body is malformed JSON', async () => {
      useBackoffTimers();
      saveToken('my-precious-token');
      server.use(
        mswHttp.get(
          `${API_URL}/user`,
          () =>
            new HttpResponse('{ not valid json }}}}', {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
        ),
      );

      await store().getCurrentUser();

      expect(store().authState).toBe('unavailable');
      expect(getToken()).toBe('my-precious-token');
    });

    it('de-duplicates concurrent requests (replaces shareReplay)', async () => {
      let requests = 0;
      server.use(
        mswHttp.get(`${API_URL}/user`, () => {
          requests++;
          return HttpResponse.json({ user: mockUser });
        }),
      );

      await Promise.all([store().getCurrentUser(), store().getCurrentUser(), store().getCurrentUser()]);

      expect(requests).toBe(1);
      expect(store().authState).toBe('authenticated');
    });

    it('issues a new request once the previous one has settled', async () => {
      let requests = 0;
      server.use(
        mswHttp.get(`${API_URL}/user`, () => {
          requests++;
          return HttpResponse.json({ user: mockUser });
        }),
      );

      await store().getCurrentUser();
      await store().getCurrentUser();

      expect(requests).toBe(2);
    });
  });

  describe('auto-retry with exponential backoff', () => {
    it('retries with 2s, 4s, 8s, 16s, 16s delays while a token exists', async () => {
      useBackoffTimers();
      saveToken('my-precious-token');
      let requests = 0;
      server.use(
        mswHttp.get(`${API_URL}/user`, () => {
          requests++;
          return HttpResponse.json({ errors: { server: ['down'] } }, { status: 500 });
        }),
      );

      await store().getCurrentUser();
      expect(requests).toBe(1);

      for (const delay of [2000, 4000, 8000, 16000, 16000]) {
        const before = requests;
        await vi.advanceTimersByTimeAsync(delay - 1);
        await flush();
        expect(requests).toBe(before);

        await vi.advanceTimersByTimeAsync(1);
        await flush();
        // The retry fires, re-requests, and lands back in 'unavailable'.
        expect(requests).toBe(before + 1);
        expect(store().authState).toBe('unavailable');
      }
    });

    it('recovers to authenticated when a retry succeeds', async () => {
      useBackoffTimers();
      saveToken('my-precious-token');
      let requests = 0;
      server.use(
        mswHttp.get(`${API_URL}/user`, () => {
          requests++;
          return requests === 1
            ? HttpResponse.json({ errors: { server: ['down'] } }, { status: 500 })
            : HttpResponse.json({ user: mockUser });
        }),
      );

      await store().getCurrentUser();
      expect(store().authState).toBe('unavailable');

      await vi.advanceTimersByTimeAsync(2000);
      await flush();
      expect(store().authState).toBe('authenticated');
      expect(store().currentUser).toEqual(mockUser);
    });

    it('does not schedule a retry when there is no token', async () => {
      useBackoffTimers();
      let requests = 0;
      server.use(
        mswHttp.get(`${API_URL}/user`, () => {
          requests++;
          return HttpResponse.json({ errors: { server: ['down'] } }, { status: 500 });
        }),
      );

      await store().getCurrentUser();
      expect(store().authState).toBe('unavailable');

      await vi.advanceTimersByTimeAsync(60000);
      expect(requests).toBe(1);
    });

    it('cancels a pending retry on setAuth and purgeAuth', async () => {
      useBackoffTimers();
      saveToken('my-precious-token');
      let requests = 0;
      server.use(
        mswHttp.get(`${API_URL}/user`, () => {
          requests++;
          return HttpResponse.json({ errors: { server: ['down'] } }, { status: 500 });
        }),
      );

      await store().getCurrentUser();
      store().setAuth(mockUser);
      await vi.advanceTimersByTimeAsync(60000);
      expect(requests).toBe(1);
      expect(store().authState).toBe('authenticated');

      await store().getCurrentUser();
      expect(store().authState).toBe('unavailable');
      store().purgeAuth();
      await vi.advanceTimersByTimeAsync(60000);
      expect(requests).toBe(2);
      expect(store().authState).toBe('unauthenticated');
    });

    it('resets the backoff after a successful setAuth', async () => {
      useBackoffTimers();
      saveToken('my-precious-token');
      let requests = 0;
      server.use(
        mswHttp.get(`${API_URL}/user`, () => {
          requests++;
          return HttpResponse.json({ errors: { server: ['down'] } }, { status: 500 });
        }),
      );

      await store().getCurrentUser();
      await vi.advanceTimersByTimeAsync(2000);
      await flush();
      expect(requests).toBe(2);

      // A successful auth resets the attempt counter, so the next failure waits
      // 2s again rather than 8s.
      store().setAuth(mockUser);
      await store().getCurrentUser();
      const before = requests;
      await vi.advanceTimersByTimeAsync(2000);
      await flush();
      expect(requests).toBe(before + 1);
    });
  });

  describe('update', () => {
    it('sends a PUT request to /user', async () => {
      let body: unknown;
      const updates = { bio: 'Updated bio', image: 'https://example.com/new-avatar.jpg' };
      server.use(
        mswHttp.put(`${API_URL}/user`, async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({ user: { ...mockUser, ...updates } });
        }),
      );

      await store().update(updates);

      expect(body).toEqual({ user: updates });
    });

    it('updates currentUser with the new values without touching the token or auth state', async () => {
      const updates = { bio: 'Updated bio' };
      const updatedUser = { ...mockUser, ...updates, token: 'a-brand-new-token' };
      server.use(mswHttp.put(`${API_URL}/user`, () => HttpResponse.json({ user: updatedUser })));

      store().setAuth(mockUser);
      await store().update(updates);

      expect(store().currentUser).toEqual(updatedUser);
      expect(store().authState).toBe('authenticated');
      expect(getToken()).toBe(mockUser.token);
    });

    it('propagates update errors to the caller', async () => {
      server.use(
        mswHttp.put(`${API_URL}/user`, () => HttpResponse.json({ errors: { bio: ['is invalid'] } }, { status: 422 })),
      );

      await expect(store().update({ bio: 'Updated bio' })).rejects.toMatchObject({ status: 422 });
    });
  });

  describe('setAuth', () => {
    it('saves the token', () => {
      store().setAuth(mockUser);
      expect(getToken()).toBe(mockUser.token);
    });

    it('sets currentUser and the authenticated state', () => {
      store().setAuth(mockUser);
      expect(store().currentUser).toEqual(mockUser);
      expect(store().authState).toBe('authenticated');
    });
  });

  describe('purgeAuth', () => {
    it('destroys the token', () => {
      saveToken('a-token');
      store().purgeAuth();
      expect(getToken()).toBeNull();
    });

    it('sets currentUser to null and the unauthenticated state', () => {
      store().setAuth(mockUser);
      store().purgeAuth();
      expect(store().currentUser).toBeNull();
      expect(store().authState).toBe('unauthenticated');
    });
  });

  describe('global 401 handling (errorInterceptor)', () => {
    it('purges auth on a 401 from a non-/user endpoint', async () => {
      server.use(
        mswHttp.get(`${API_URL}/articles`, () =>
          HttpResponse.json({ errors: { message: ['Token expired'] } }, { status: 401 }),
        ),
      );
      store().setAuth(mockUser);

      await expect(http.get('/articles')).rejects.toMatchObject({ status: 401 });

      expect(store().authState).toBe('unauthenticated');
      expect(getToken()).toBeNull();
    });

    it('leaves a 401 from /user to the store 4XX/5XX logic', async () => {
      useBackoffTimers();
      server.use(
        mswHttp.get(`${API_URL}/user`, () =>
          HttpResponse.json({ errors: { message: ['Token expired'] } }, { status: 401 }),
        ),
      );
      store().setAuth(mockUser);
      useAuthStore.setState({ authState: 'unavailable' });

      await expect(http.get('/user')).rejects.toMatchObject({ status: 401 });

      // The interceptor did not touch the state; only getCurrentUser() does.
      expect(store().authState).toBe('unavailable');
      expect(getToken()).toBe(mockUser.token);
    });

    it('normalizes network failures to the fallback body with status 0', async () => {
      server.use(mswHttp.get(`${API_URL}/articles`, () => HttpResponse.error()));

      await expect(http.get('/articles')).rejects.toEqual({
        errors: { network: ['Unable to connect. Please check your internet connection.'] },
        status: 0,
      });
    });

    it('sends no Authorization header when there is no token', async () => {
      let authorization: string | null = 'unset';
      server.use(
        mswHttp.get(`${API_URL}/articles`, ({ request }) => {
          authorization = request.headers.get('Authorization');
          return HttpResponse.json({ articles: [] });
        }),
      );

      await http.get('/articles');
      expect(authorization).toBeNull();

      store().setAuth(mockUser);
      await http.get('/articles');
      expect(authorization).toBe(`Token ${mockUser.token}`);
    });
  });

  describe('integration scenarios', () => {
    it('handles the complete authentication flow', async () => {
      server.use(mswHttp.post(`${API_URL}/users/login`, () => HttpResponse.json({ user: mockUser })));

      await store().login({ email: 'test@example.com', password: 'password123' });
      expect(store().currentUser).toEqual(mockUser);

      store().logout();
      expect(store().currentUser).toBeNull();
      expect(navigate).toHaveBeenCalledWith('/');
    });

    it('maintains authentication state across multiple operations', async () => {
      const updates = { bio: 'New bio' };
      server.use(
        mswHttp.post(`${API_URL}/users/login`, () => HttpResponse.json({ user: mockUser })),
        mswHttp.put(`${API_URL}/user`, () => HttpResponse.json({ user: { ...mockUser, ...updates } })),
      );

      await store().login({ email: 'test@example.com', password: 'password123' });
      expect(store().authState).toBe('authenticated');

      await store().update(updates);
      expect(store().authState).toBe('authenticated');
      expect(store().currentUser?.bio).toBe('New bio');
    });
  });
});
