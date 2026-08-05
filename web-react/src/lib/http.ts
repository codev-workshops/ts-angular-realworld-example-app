import axios, { AxiosError, AxiosInstance } from 'axios';

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
 * Axios instance standing in for Angular's `HttpClient` + interceptor chain.
 *
 * Wave 1 replaces the placeholder hooks below with the full port of
 * `apiInterceptor` / `tokenInterceptor` / `errorInterceptor` plus the auth-store
 * binding. Everything downstream only depends on the exported `http` instance,
 * so feature code written against this skeleton keeps working unchanged.
 */
export const http: AxiosInstance = axios.create({ baseURL: API_URL });

/** apiInterceptor equivalent is the axios `baseURL` above. */

/** tokenInterceptor: attaches `Authorization: Token <jwt>` when a token exists. */
http.interceptors.request.use(config => {
  const token = window.localStorage.getItem('jwtToken');
  if (token) {
    config.headers.set('Authorization', `Token ${token}`);
  }
  return config;
});

/** errorInterceptor: normalizes every failure to `ApiError`. */
http.interceptors.response.use(
  response => response,
  (error: AxiosError<{ errors?: Record<string, string[]> }>) => {
    const status = error.response?.status ?? 0;
    const data = error.response?.data;
    const body = data && typeof data === 'object' && 'errors' in data ? data : NETWORK_ERROR_BODY;
    return Promise.reject({ ...body, status } as ApiError);
  },
);
