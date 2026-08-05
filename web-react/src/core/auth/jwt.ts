/**
 * Port of `core/auth/services/jwt.service.ts`.
 *
 * Angular read/wrote `window.localStorage['jwtToken']` by index access, which
 * yields `undefined` for a missing key; the React port uses the standard
 * `getItem`/`setItem` API, so a missing token is `null`.
 */
const TOKEN_KEY = 'jwtToken';

export function getToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function destroyToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}
