import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { getToken } from '@/core/auth/jwt';
import type { ApiError } from '@/core/models/errors';

export const API_URL = 'https://api.realworld.show/api';

const NETWORK_ERROR: ApiError['errors'] = {
  network: ['Unable to connect. Please check your internet connection.'],
};

/**
 * Called when any endpoint except GET /user answers 401, i.e. the token expired
 * mid-session. The auth store registers its purge routine here so this module
 * stays free of store imports (mirrors errorInterceptor -> UserService.purgeAuth).
 */
let onUnauthorized: () => void = () => {};

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

/**
 * Single axios instance replacing the three Angular interceptors:
 * - apiInterceptor    -> baseURL
 * - tokenInterceptor  -> `Authorization: Token <jwt>` (RealWorld uses Token, not Bearer)
 * - errorInterceptor  -> 401 logout + `{ ...body, status }` normalization
 *
 * Every HTTP call in the app must go through this client.
 */
export const api: AxiosInstance = axios.create({ baseURL: API_URL });

api.interceptors.request.use(config => {
  const token = getToken();
  if (token) {
    config.headers.set('Authorization', `Token ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  (error: AxiosError<unknown>) => {
    const status = error.response?.status ?? 0;
    const url = error.config?.url ?? '';

    // /user is handled by the auth store, which splits 4XX (logout) from 5XX (keep token).
    if (status === 401 && !url.endsWith('/user')) {
      onUnauthorized();
    }

    const data = error.response?.data;
    const body = data && typeof data === 'object' && 'errors' in data ? (data as ApiError) : { errors: NETWORK_ERROR };

    return Promise.reject({ ...body, status } satisfies ApiError);
  },
);

export async function get<T>(url: string, params?: Record<string, string | number>): Promise<T> {
  const { data } = await api.get<T>(url, { params });
  return data;
}

export async function post<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.post<T>(url, body);
  return data;
}

export async function put<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.put<T>(url, body);
  return data;
}

export async function del<T>(url: string): Promise<T> {
  const { data } = await api.delete<T>(url);
  return data;
}
