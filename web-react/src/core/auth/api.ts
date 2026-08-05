import { http } from '../../lib/http';
import { User } from './model';

/** HTTP half of `UserService`; the state machine lives in `store.ts`. */

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

export async function login(credentials: LoginCredentials): Promise<User> {
  const { data } = await http.post<{ user: User }>('/users/login', { user: credentials });
  return data.user;
}

export async function register(credentials: RegisterCredentials): Promise<User> {
  const { data } = await http.post<{ user: User }>('/users', { user: credentials });
  return data.user;
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await http.get<{ user: User }>('/user');
  return data.user;
}

export async function updateUser(user: Partial<User>): Promise<User> {
  const { data } = await http.put<{ user: User }>('/user', { user });
  return data.user;
}
