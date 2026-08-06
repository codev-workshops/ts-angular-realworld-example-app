import { Link } from 'react-router-dom';
import { useAuth } from '../../../core/auth/auth-context';
import { defaultImage } from '../../../shared/util/defaultImage';
import { longDate } from '../../../shared/util/formatDate';
import type { Comment } from '../models/comment';

export function ArticleComment({ comment, onDelete }: { comment: Comment; onDelete: () => void }) {
  const { currentUser } = useAuth();
  const canModify = currentUser?.username === comment.author.username;

  return (
    <app-article-comment>
      <div className="card">
        <div className="card-block">
          <p className="card-text">{` ${comment.body} `}</p>
        </div>
        <div className="card-footer">
          <Link className="comment-author" to={`/profile/${comment.author.username}`}>
            <img src={defaultImage(comment.author.image)} className="comment-author-img" />
          </Link>
          {' \u00a0 '}
          <Link className="comment-author" to={`/profile/${comment.author.username}`}>
            {` ${comment.author.username} `}
          </Link>
          <span className="date-posted">{` ${longDate(comment.createdAt)} `}</span>
          {canModify && (
            <span className="mod-options">
              <i className="ion-trash-a" onClick={onDelete}></i>
            </span>
          )}
        </div>
      </div>
    </app-article-comment>
  );
}
