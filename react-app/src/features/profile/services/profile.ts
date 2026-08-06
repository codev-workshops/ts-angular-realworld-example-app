import { request } from '../../../core/api/client';
import type { Profile } from '../models/profile';

export async function getProfile(username: string, signal?: AbortSignal): Promise<Profile> {
  const data = await request<{ profile: Profile }>(`/profiles/${username}`, { signal });
  return data.profile;
}

export async function followProfile(username: string): Promise<Profile> {
  const data = await request<{ profile: Profile }>(`/profiles/${username}/follow`, { method: 'POST', body: {} });
  return data.profile;
}

export async function unfollowProfile(username: string): Promise<Profile> {
  const data = await request<{ profile: Profile }>(`/profiles/${username}/follow`, { method: 'DELETE' });
  return data.profile;
}
