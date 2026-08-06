import { request } from '../../../core/api/client';
import type { Comment } from '../models/comment';

export async function getComments(slug: string, signal?: AbortSignal): Promise<Comment[]> {
  const data = await request<{ comments: Comment[] }>(`/articles/${slug}/comments`, { signal });
  return data.comments;
}

export async function addComment(slug: string, body: string): Promise<Comment> {
  const data = await request<{ comment: Comment }>(`/articles/${slug}/comments`, {
    method: 'POST',
    body: { comment: { body } },
  });
  return data.comment;
}

export function deleteComment(commentId: string, slug: string): Promise<void> {
  return request<void>(`/articles/${slug}/comments/${commentId}`, { method: 'DELETE' });
}
