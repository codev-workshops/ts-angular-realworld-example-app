import { afterEach, describe, expect, it } from 'vitest';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { api } from '@/lib/api';
import type { ApiError } from '@/core/models/errors';
import { follow, get, unfollow } from './profile';
import type { Profile } from '../models/profile';

interface Captured {
  method?: string;
  url?: string;
  body?: unknown;
}

const profile: Profile = { username: 'jake', bio: 'I work at statefarm', image: null, following: false };

function capture(responseData: unknown): Captured {
  const seen: Captured = {};
  api.defaults.adapter = (config: InternalAxiosRequestConfig) => {
    seen.method = config.method;
    seen.url = config.url;
    seen.body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
    return Promise.resolve({
      data: responseData,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    } as AxiosResponse);
  };
  return seen;
}

function failWith(status: number, data?: unknown) {
  api.defaults.adapter = config =>
    Promise.reject(
      new AxiosError('failed', 'ERR', config, null, { data, status, statusText: '', headers: {}, config }),
    );
}

afterEach(() => {
  delete api.defaults.adapter;
});

describe('profile service', () => {
  it('get fetches /profiles/:username and unwraps data.profile', async () => {
    const seen = capture({ profile });

    const result = await get('jake');

    expect(seen.method).toBe('get');
    expect(seen.url).toBe('/profiles/jake');
    expect(result).toEqual(profile);
  });

  it('follow posts to /profiles/:username/follow and unwraps data.profile', async () => {
    const seen = capture({ profile: { ...profile, following: true } });

    const result = await follow('jake');

    expect(seen.method).toBe('post');
    expect(seen.url).toBe('/profiles/jake/follow');
    expect(seen.body).toEqual({});
    expect(result.following).toBe(true);
  });

  it('unfollow deletes /profiles/:username/follow and unwraps data.profile', async () => {
    const seen = capture({ profile });

    const result = await unfollow('jake');

    expect(seen.method).toBe('delete');
    expect(seen.url).toBe('/profiles/jake/follow');
    expect(result).toEqual(profile);
  });

  it('propagates the normalized { ...body, status } error shape', async () => {
    failWith(404, { errors: { profile: ['not found'] } });

    await expect(get('ghost')).rejects.toEqual({
      errors: { profile: ['not found'] },
      status: 404,
    } satisfies ApiError);
  });
});
