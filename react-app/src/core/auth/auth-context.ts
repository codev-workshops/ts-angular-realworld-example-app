import { createContext, useContext } from 'react';
import type { User } from '../models/user';

export type AuthState = 'authenticated' | 'unauthenticated' | 'unavailable' | 'loading';

export interface AuthContextValue {
  currentUser: User | null;
  authState: AuthState;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  register: (credentials: { username: string; email: string; password: string }) => Promise<User>;
  logout: () => void;
  update: (user: Partial<User> & { password?: string }) => Promise<User>;
  purgeAuth: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
