import { del, get as apiGet, post } from '@/lib/api';
import type { Profile } from '../models/profile';

/**
 * ProfileService - Fetches public profile data for any user by username.
 *
 * Note: This is different from the user store which uses GET /user:
 * - GET /profiles/:username → Public profile for any user (this service)
 * - GET /user → Current authenticated user's own data (auth store)
 *
 * The Angular `get` used `shareReplay(1)`; that is dropped here — callers own caching.
 */
export async function get(username: string): Promise<Profile> {
  const data = await apiGet<{ profile: Profile }>('/profiles/' + username);
  return data.profile;
}

export async function follow(username: string): Promise<Profile> {
  const data = await post<{ profile: Profile }>('/profiles/' + username + '/follow', {});
  return data.profile;
}

export async function unfollow(username: string): Promise<Profile> {
  const data = await del<{ profile: Profile }>('/profiles/' + username + '/follow');
  return data.profile;
}
