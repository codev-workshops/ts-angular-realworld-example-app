import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { getToken } from '../core/auth/jwt';

export const API_URL = 'https://api.realworld.show/api';

/**
 * Normalized API error shape, mirroring the Angular `errorInterceptor`:
 * `{ ...responseBody, status }` with a network fallback body.
 */
export interface ApiError {
  errors: Record<string, string[]>;
  status: number;
}

const NETWORK_ERROR_BODY = {
  errors: { network: ['Unable to connect. Please check your internet connection.'] },
};

/**
 * Break the store <-> http circular dependency: `http` needs `purgeAuth()` but
 * the store needs `http`. The store registers its handler at import time
 * instead of `http` importing the store.
 */
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

/**
 * `errorInterceptor` skips /user because `getCurrentUser()` applies its own
 * 4XX-vs-5XX logic there. Angular checked `req.url.endsWith('/user')` on the
 * pre-`apiInterceptor` (relative) URL; axios exposes the request URL either
 * relative or absolute, so strip query/hash and compare the path suffix.
 */
function isCurrentUserEndpoint(url: string | undefined): boolean {
  if (!url) {
    return false;
  }
  return url.split(/[?#]/)[0].endsWith('/user');
}

function toApiError(status: number, data: unknown): ApiError {
  const body =
    data && typeof data === 'object' && 'errors' in data
      ? (data as { errors: Record<string, string[]> })
      : NETWORK_ERROR_BODY;
  return { ...body, status };
}

/**
 * Axios instance standing in for Angular's `HttpClient` + interceptor chain.
 *
 * - `apiInterceptor` -> the `baseURL` below
 * - `tokenInterceptor` -> the request interceptor
 * - `errorInterceptor` -> the response interceptor
 */
export const http: AxiosInstance = axios.create({ baseURL: API_URL });

/** tokenInterceptor: attaches `Authorization: Token <jwt>` when a token exists. */
http.interceptors.request.use(config => {
  const token = getToken();
  if (token) {
    config.headers.set('Authorization', `Token ${token}`);
  }
  return config;
});

/** errorInterceptor: normalizes every failure to `ApiError`. */
http.interceptors.response.use(
  (response: AxiosResponse) => {
    // A 2XX response whose body is not parseable JSON is a server bug; axios
    // silently leaves the raw text in `data`, which would otherwise surface as
    // a confusing `undefined` deref downstream. Turn it into a normal error so
    // callers (notably `getCurrentUser()`) take their error path.
    if (typeof response.data === 'string' && response.data.trim() !== '') {
      try {
        JSON.parse(response.data);
      } catch {
        return Promise.reject(toApiError(response.status, undefined));
      }
    }
    return response;
  },
  (error: AxiosError<unknown>) => {
    const status = error.response?.status ?? 0;

    // Global 401 handling for all endpoints EXCEPT /user (token expired
    // mid-session -> logout). /user is handled by the store's 4XX vs 5XX logic.
    if (status === 401 && !isCurrentUserEndpoint(error.config?.url)) {
      unauthorizedHandler?.();
    }

    return Promise.reject(toApiError(status, error.response?.data));
  },
);
