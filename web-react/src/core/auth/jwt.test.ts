import { beforeEach, describe, expect, it } from 'vitest';
import { destroyToken, getToken, saveToken } from './jwt';

/**
 * Port of `jwt.service.spec.ts`.
 *
 * Angular's service read `window.localStorage['jwtToken']` by index access, so
 * the spec asserted `undefined` for a missing token; the React port uses
 * `getItem`, which returns `null`. Those assertions are adapted accordingly —
 * the intent ("no token stored") is unchanged.
 */
describe('jwt', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('getToken', () => {
    it('retrieves the token from localStorage', () => {
      window.localStorage.setItem('jwtToken', 'test-jwt-token-123');
      expect(getToken()).toBe('test-jwt-token-123');
    });

    it('returns null when no token exists', () => {
      expect(getToken()).toBeNull();
    });

    it('handles an empty string token', () => {
      window.localStorage.setItem('jwtToken', '');
      expect(getToken()).toBe('');
    });

    it('retrieves the token multiple times consistently', () => {
      saveToken('consistent-token');
      expect(getToken()).toBe('consistent-token');
      expect(getToken()).toBe('consistent-token');
      expect(getToken()).toBe('consistent-token');
    });

    it('handles a long JWT token', () => {
      const longToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + 'a'.repeat(500);
      saveToken(longToken);
      expect(getToken()).toBe(longToken);
    });

    it('handles a token with special characters', () => {
      const specialToken = 'token.with-special_chars!@#$%^&*()';
      saveToken(specialToken);
      expect(getToken()).toBe(specialToken);
    });
  });

  describe('saveToken', () => {
    it('saves the token to localStorage', () => {
      saveToken('new-jwt-token-456');
      expect(window.localStorage.getItem('jwtToken')).toBe('new-jwt-token-456');
    });

    it('overwrites an existing token', () => {
      saveToken('old-token');
      saveToken('new-token');
      expect(getToken()).toBe('new-token');
    });

    it('handles an empty string token', () => {
      saveToken('');
      expect(getToken()).toBe('');
    });

    it('handles a very long token', () => {
      const longToken = 'a'.repeat(1000);
      saveToken(longToken);
      expect(getToken()).toBe(longToken);
    });

    it('handles JWT format tokens', () => {
      const jwtToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      saveToken(jwtToken);
      expect(getToken()).toBe(jwtToken);
    });

    it('handles rapid successive saves', () => {
      ['token1', 'token2', 'token3', 'token4', 'token5'].forEach(saveToken);
      expect(getToken()).toBe('token5');
    });
  });

  describe('destroyToken', () => {
    it('removes the token from localStorage', () => {
      saveToken('test-token');
      destroyToken();
      expect(window.localStorage.getItem('jwtToken')).toBeNull();
    });

    it('handles destroying a non-existent token', () => {
      expect(() => destroyToken()).not.toThrow();
      expect(getToken()).toBeNull();
    });

    it('is idempotent', () => {
      saveToken('test-token');
      destroyToken();
      destroyToken();
      destroyToken();
      expect(getToken()).toBeNull();
    });

    it('allows saving a new token after destroy', () => {
      saveToken('first-token');
      destroyToken();
      saveToken('second-token');
      expect(getToken()).toBe('second-token');
    });
  });

  describe('token lifecycle', () => {
    it('handles the complete token lifecycle', () => {
      saveToken('lifecycle-test-token');
      expect(getToken()).toBe('lifecycle-test-token');
      destroyToken();
      expect(getToken()).toBeNull();
    });

    it('handles multiple save operations', () => {
      ['token1', 'token2', 'token3'].forEach(token => {
        saveToken(token);
        expect(getToken()).toBe(token);
      });
    });

    it('handles alternating save and destroy', () => {
      saveToken('token1');
      destroyToken();
      saveToken('token2');
      destroyToken();
      saveToken('token3');
      expect(getToken()).toBe('token3');
    });
  });

  describe('edge cases', () => {
    it('handles a token with whitespace', () => {
      saveToken('  token-with-spaces  ');
      expect(getToken()).toBe('  token-with-spaces  ');
    });

    it('handles a token with newlines', () => {
      saveToken('token\nwith\nnewlines');
      expect(getToken()).toBe('token\nwith\nnewlines');
    });

    it('handles unicode characters in a token', () => {
      saveToken('token-with-émojis-🚀-and-中文');
      expect(getToken()).toBe('token-with-émojis-🚀-and-中文');
    });

    it('handles a numeric token', () => {
      saveToken('123456789');
      expect(getToken()).toBe('123456789');
    });

    it('handles a boolean-like token', () => {
      saveToken('true');
      expect(getToken()).toBe('true');
    });
  });

  describe('security considerations', () => {
    it('stores the token only in localStorage', () => {
      saveToken('secure-token');
      expect(window.localStorage.getItem('jwtToken')).toBe('secure-token');
      expect(Object.keys(window.localStorage)).toEqual(['jwtToken']);
    });

    it('handles XSS-like token strings safely', () => {
      const xssToken = '<script>alert("xss")</script>';
      saveToken(xssToken);
      expect(getToken()).toBe(xssToken);
    });
  });

  describe('integration scenarios', () => {
    it('supports the authentication flow', () => {
      saveToken('login-jwt-token');
      expect(getToken()).toBe('login-jwt-token');
      saveToken('refreshed-jwt-token');
      expect(getToken()).toBe('refreshed-jwt-token');
      destroyToken();
      expect(getToken()).toBeNull();
    });

    it('supports session management', () => {
      saveToken('session-token-1');
      expect(getToken()).toBe('session-token-1');
      saveToken('session-token-2');
      expect(getToken()).toBe('session-token-2');
      destroyToken();
      expect(getToken()).toBeNull();
    });

    it('handles the concurrent tab scenario', () => {
      window.localStorage.setItem('jwtToken', 'external-token');
      expect(getToken()).toBe('external-token');
      saveToken('updated-token');
      expect(window.localStorage.getItem('jwtToken')).toBe('updated-token');
    });
  });
});
