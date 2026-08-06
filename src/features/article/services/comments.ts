import { del, get, post } from '@/lib/api';
import type { Comment } from '../models/comment';

/**
 * Angular services become plain async functions: no DI, no Observables.
 * The delete endpoint is exported as `remove` because `del` is the imported
 * HTTP helper from `@/lib/api`.
 */
export async function getAll(slug: string): Promise<Comment[]> {
  const data = await get<{ comments: Comment[] }>(`/articles/${slug}/comments`);
  return data.comments;
}

export async function add(slug: string, payload: string): Promise<Comment> {
  const data = await post<{ comment: Comment }>(`/articles/${slug}/comments`, {
    comment: { body: payload },
  });
  return data.comment;
}

export async function remove(commentId: string, slug: string): Promise<void> {
  await del<void>(`/articles/${slug}/comments/${commentId}`);
}
