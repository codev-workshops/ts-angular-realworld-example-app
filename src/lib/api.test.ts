import { afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { api, API_URL, get, setUnauthorizedHandler } from './api';
import { saveToken } from '@/core/auth/jwt';
import type { ApiError } from '@/core/models/errors';

const ok = (config: InternalAxiosRequestConfig): AxiosResponse => ({
  data: { ok: true },
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
});

function respondWith(handler: (config: InternalAxiosRequestConfig) => AxiosResponse | Promise<never>) {
  api.defaults.adapter = config => Promise.resolve(handler(config)) as Promise<AxiosResponse>;
}

function failWith(status: number, data?: unknown) {
  api.defaults.adapter = config =>
    Promise.reject(
      new AxiosError('failed', 'ERR', config, null, {
        data,
        status,
        statusText: '',
        headers: {},
        config,
      }),
    );
}

afterEach(() => {
  delete api.defaults.adapter;
  setUnauthorizedHandler(() => {});
});

describe('api client', () => {
  it('prefixes the RealWorld API base url', async () => {
    let seen = '';
    respondWith(config => {
      seen = `${config.baseURL}${config.url}`;
      return ok(config);
    });

    await get('/tags');

    expect(seen).toBe(`${API_URL}/tags`);
  });

  it('sends the jwt as "Token <jwt>", never Bearer', async () => {
    saveToken('jwt-123');
    let header: unknown;
    respondWith(config => {
      header = config.headers.get('Authorization');
      return ok(config);
    });

    await get('/user');

    expect(header).toBe('Token jwt-123');
  });

  it('omits the Authorization header when there is no token', async () => {
    let header: unknown = 'unset';
    respondWith(config => {
      header = config.headers.get('Authorization');
      return ok(config);
    });

    await get('/tags');

    expect(header).toBeUndefined();
  });

  it('normalizes error bodies to { ...body, status }', async () => {
    failWith(422, { errors: { title: ["can't be blank"] } });

    await expect(get('/articles')).rejects.toEqual({
      errors: { title: ["can't be blank"] },
      status: 422,
    });
  });

  it('falls back to a network error payload when there is no body', async () => {
    failWith(0);

    const error = (await get('/tags').catch((e: ApiError) => e)) as ApiError;

    expect(error.status).toBe(0);
    expect(error.errors.network).toEqual(['Unable to connect. Please check your internet connection.']);
  });

  it('logs out on 401 for endpoints other than /user', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    failWith(401, { errors: { body: ['unauthorized'] } });

    await expect(get('/articles/feed')).rejects.toBeTruthy();

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('leaves 401 on /user to the auth store', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    failWith(401, { errors: { body: ['unauthorized'] } });

    await expect(get('/user')).rejects.toBeTruthy();

    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
