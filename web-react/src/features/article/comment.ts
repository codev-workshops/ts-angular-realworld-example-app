import { http } from '../../lib/http';
import { Profile } from '../profile/model';

/** Port of Angular's `comment.model.ts`. */
export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: Profile;
}

/** Port of Angular's `CommentsService`. */
export async function getComments(slug: string): Promise<Comment[]> {
  const { data } = await http.get<{ comments: Comment[] }>(`/articles/${slug}/comments`);
  return data.comments;
}

export async function addComment(slug: string, payload: string): Promise<Comment> {
  const { data } = await http.post<{ comment: Comment }>(`/articles/${slug}/comments`, {
    comment: { body: payload },
  });
  return data.comment;
}

export async function deleteComment(commentId: string, slug: string): Promise<void> {
  await http.delete<void>(`/articles/${slug}/comments/${commentId}`);
}
