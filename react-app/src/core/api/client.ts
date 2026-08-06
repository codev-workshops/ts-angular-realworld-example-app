import { getToken } from '../auth/jwt';

/** Same base URL the Angular apiInterceptor prepends to every relative request URL. */
export const API_URL = 'https://api.realworld.show/api';

export interface ApiError {
  errors: Record<string, string | string[]>;
  status: number;
}

type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler = () => {};

/**
 * Registers the global 401 handler. Mirrors errorInterceptor: any 401 outside of
 * `/user` means the token expired mid-session, so the session is purged.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorized = handler;
}

const NETWORK_ERROR: ApiError['errors'] = {
  network: ['Unable to connect. Please check your internet connection.'],
};

function normalizeError(status: number, body: unknown): ApiError {
  const hasErrors = !!body && typeof body === 'object' && 'errors' in body;
  const errors = hasErrors ? (body as { errors: ApiError['errors'] }).errors : NETWORK_ERROR;
  return { ...(hasErrors ? (body as object) : {}), errors, status };
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params, signal } = options;

  let url = `${API_URL}${path}`;
  if (params) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        search.set(key, String(value));
      }
    }
    const query = search.toString();
    if (query) {
      url += `?${query}`;
    }
  }

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    if (signal?.aborted) {
      throw err;
    }
    // Network failure: Angular surfaces this as status 0 with the network message.
    throw normalizeError(0, null);
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !path.endsWith('/user')) {
      onUnauthorized();
    }
    throw normalizeError(response.status, payload);
  }

  return payload as T;
}
