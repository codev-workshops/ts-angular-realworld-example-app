import { Link } from 'react-router-dom';
import { useAuthStore } from '@/core/auth/store';
import { defaultImage } from '@/shared/utils/default-image';
import { formatLongDate } from '@/shared/utils/format-date';
import type { Comment } from '../models/comment';

interface ArticleCommentProps {
  comment: Comment;
  /** `@Output() delete` becomes a callback prop. */
  onDelete?: () => void;
}

/** Port of `src/app/features/article/components/article-comment.component.ts`. */
export function ArticleComment({ comment, onDelete }: ArticleCommentProps) {
  const currentUser = useAuthStore(s => s.currentUser);
  const canModify = currentUser?.username === comment.author.username;
  const profileUrl = `/profile/${comment.author.username}`;

  return (
    <div className="card">
      <div className="card-block">
        <p className="card-text">{comment.body}</p>
      </div>
      <div className="card-footer">
        <Link className="comment-author" to={profileUrl}>
          <img src={defaultImage(comment.author.image)} className="comment-author-img" />
        </Link>
        &nbsp;
        <Link className="comment-author" to={profileUrl}>
          {comment.author.username}
        </Link>
        <span className="date-posted">{formatLongDate(comment.createdAt)}</span>
        {canModify && (
          <span className="mod-options">
            <i className="ion-trash-a" onClick={() => onDelete?.()}></i>
          </span>
        )}
      </div>
    </div>
  );
}
