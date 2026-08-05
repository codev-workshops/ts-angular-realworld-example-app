import { http } from '../../lib/http';

/** Port of Angular's `TagsService.getAll()`. */
export async function getTags(): Promise<string[]> {
  const { data } = await http.get<{ tags: string[] }>('/tags');
  return data.tags;
}
