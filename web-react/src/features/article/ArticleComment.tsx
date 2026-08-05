import { Link } from 'react-router-dom';
import { useAuthStore } from '../../core/auth/store';
import { defaultImage } from '../../shared/defaultImage';
import { formatLongDate } from './ArticleMeta';
import { Comment } from './comment';

export interface ArticleCommentProps {
  comment: Comment;
  /** Angular `@Output() delete` — emits `true`, kept identical. */
  onDelete: (value: boolean) => void;
}

/**
 * Port of `article-comment.component.ts`.
 *
 * `canModify$` compared the injected `UserService.currentUser` username with the
 * comment author's, so the store is read here rather than passed in as a prop.
 */
export function ArticleComment({ comment, onDelete }: ArticleCommentProps) {
  const currentUser = useAuthStore(s => s.currentUser);

  if (!comment) {
    return null;
  }

  const canModify = currentUser?.username === comment.author.username;

  return (
    <div className="card">
      <div className="card-block">
        <p className="card-text">{comment.body}</p>
      </div>
      <div className="card-footer">
        <Link className="comment-author" to={`/profile/${comment.author.username}`}>
          <img src={defaultImage(comment.author.image)} className="comment-author-img" />
        </Link>
        &nbsp;
        <Link className="comment-author" to={`/profile/${comment.author.username}`}>
          {comment.author.username}
        </Link>
        <span className="date-posted">{formatLongDate(comment.createdAt)}</span>
        {canModify && (
          <span className="mod-options">
            <i className="ion-trash-a" onClick={() => onDelete(true)}></i>
          </span>
        )}
      </div>
    </div>
  );
}
