import { http } from '../../lib/http';
import { Profile } from './model';

/**
 * Port of Angular's `ProfileService` — public profile data for any user.
 *
 * Note: This is different from the auth store which uses GET /user:
 * - GET /profiles/:username → Public profile for any user (this module)
 * - GET /user → Current authenticated user's own data (auth store)
 */
export async function getProfile(username: string): Promise<Profile> {
  const { data } = await http.get<{ profile: Profile }>(`/profiles/${username}`);
  return data.profile;
}

export async function followUser(username: string): Promise<Profile> {
  const { data } = await http.post<{ profile: Profile }>(`/profiles/${username}/follow`, {});
  return data.profile;
}

export async function unfollowUser(username: string): Promise<Profile> {
  const { data } = await http.delete<{ profile: Profile }>(`/profiles/${username}/follow`);
  return data.profile;
}
