import { afterEach, describe, expect, it } from 'vitest';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { api } from '@/lib/api';
import type { ApiError } from '@/core/models/errors';
import { getAll } from './tags';

interface Captured {
  method?: string;
  url?: string;
}

function capture(responseData: unknown): Captured {
  const seen: Captured = {};
  api.defaults.adapter = (config: InternalAxiosRequestConfig) => {
    seen.method = config.method;
    seen.url = config.url;
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

describe('tags service', () => {
  it('getAll fetches /tags and unwraps data.tags', async () => {
    const seen = capture({ tags: ['dragons', 'training'] });

    const result = await getAll();

    expect(seen.method).toBe('get');
    expect(seen.url).toBe('/tags');
    expect(result).toEqual(['dragons', 'training']);
  });

  it('propagates the normalized { ...body, status } error shape', async () => {
    failWith(0);

    const error = (await getAll().catch((e: ApiError) => e)) as ApiError;

    expect(error.status).toBe(0);
    expect(error.errors.network).toEqual(['Unable to connect. Please check your internet connection.']);
  });
});
