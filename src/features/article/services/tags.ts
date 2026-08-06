import { get } from '@/lib/api';

/** Angular TagsService becomes a plain async function: no DI, no Observables. */
export async function getAll(): Promise<string[]> {
  const data = await get<{ tags: string[] }>('/tags');
  return data.tags;
}
