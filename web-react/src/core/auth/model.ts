/** Port of `core/auth/user.model.ts`. */
export interface User {
  email: string;
  token: string;
  username: string;
  bio: string | null;
  image: string | null;
}

/** Port of `UserService`'s `AuthState`. */
export type AuthState = 'authenticated' | 'unauthenticated' | 'unavailable' | 'loading';
