import { request } from '../../../core/api/client';

export async function getTags(signal?: AbortSignal): Promise<string[]> {
  const data = await request<{ tags: string[] }>('/tags', { signal });
  return data.tags;
}
