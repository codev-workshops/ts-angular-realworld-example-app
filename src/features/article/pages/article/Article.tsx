import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArticleMeta } from '@/features/article/components/ArticleMeta';
import { ArticleComment } from '@/features/article/components/ArticleComment';
import { FavoriteButton } from '@/features/article/components/FavoriteButton';
import { FollowButton } from './FollowButton';
import { ListErrors } from '@/shared/components/ListErrors';
import { Markdown } from '@/shared/components/Markdown';
import { defaultImage } from '@/shared/utils/default-image';
import { useAuthStore } from '@/core/auth/store';
import { useIsAuthenticated } from '@/core/auth/useIsAuthenticated';
import { get as getArticle, remove as removeArticle } from '@/features/article/services/articles';
import { add as addCommentRequest, getAll as getComments, remove as removeComment } from '../../services/comments';
import type { Article as ArticleModel } from '@/features/article/models/article';
import type { Comment } from '@/features/article/models/comment';
import type { Errors } from '@/core/models/errors';
import type { Profile } from '@/features/profile/models/profile';

/** Port of `src/app/features/article/pages/article/article.component.*`. */
export default function Article() {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore(s => s.currentUser);
  const isAuthenticated = useIsAuthenticated();

  const [article, setArticle] = useState<ArticleModel | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [errors, setErrors] = useState<Errors | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [commentFormErrors, setCommentFormErrors] = useState<Errors | null>(null);
  const [deleteCommentErrors, setDeleteCommentErrors] = useState<Errors | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // `combineLatest([articleService.get, commentsService.getAll])` with the shared
  // catchError: one rejection replaces the whole page with the error list.
  useEffect(() => {
    let active = true;

    Promise.all([getArticle(slug), getComments(slug)])
      .then(([loadedArticle, loadedComments]) => {
        if (!active) {
          return;
        }
        setArticle(loadedArticle);
        setComments(loadedComments);
      })
      .catch((error: Errors | undefined) => {
        if (active) {
          setErrors(error?.errors ? error : { errors: { error: ['Failed to load article'] } });
        }
      });

    return () => {
      active = false;
    };
  }, [slug]);

  const canModify = !!article && currentUser?.username === article.author.username;

  const onToggleFavorite = (favorited: boolean) =>
    setArticle(current =>
      current
        ? {
            ...current,
            favorited,
            favoritesCount: favorited ? current.favoritesCount + 1 : current.favoritesCount - 1,
          }
        : current,
    );

  const toggleFollowing = (profile: Profile) =>
    setArticle(current =>
      current ? { ...current, author: { ...current.author, following: profile.following } } : current,
    );

  const deleteArticle = () => {
    if (!article) {
      return;
    }
    setIsDeleting(true);
    removeArticle(article.slug)
      .then(() => void navigate('/'))
      .catch(() => setIsDeleting(false));
  };

  const addComment = (event: FormEvent) => {
    event.preventDefault();
    if (!article) {
      return;
    }

    setIsSubmitting(true);
    setCommentFormErrors(null);

    addCommentRequest(article.slug, commentBody)
      .then(comment => {
        setComments(current => [comment, ...current]);
        setCommentBody('');
        setIsSubmitting(false);
      })
      .catch((error: Errors) => {
        setIsSubmitting(false);
        setCommentFormErrors(error);
      });
  };

  const deleteComment = (comment: Comment) => {
    if (!article) {
      return;
    }
    setDeleteCommentErrors(null);
    removeComment(comment.id, article.slug)
      .then(() => setComments(current => current.filter(item => item !== comment)))
      .catch((error: Errors) => setDeleteCommentErrors(error));
  };

  const articleActions = (current: ArticleModel) =>
    canModify ? (
      <span>
        <Link className="btn btn-sm btn-outline-secondary" to={`/editor/${current.slug}`}>
          <i className="ion-edit"></i> Edit Article
        </Link>

        <button
          className={isDeleting ? 'btn btn-sm btn-outline-danger disabled' : 'btn btn-sm btn-outline-danger'}
          onClick={deleteArticle}
        >
          <i className="ion-trash-a"></i> Delete Article
        </button>
      </span>
    ) : (
      <span>
        <FollowButton profile={current.author} onToggle={toggleFollowing} />

        <FavoriteButton article={current} onToggle={onToggleFavorite}>
          {current.favorited ? 'Unfavorite' : 'Favorite'} Article
          <span className="counter">({current.favoritesCount})</span>
        </FavoriteButton>
      </span>
    );

  return (
    <div className="article-page">
      {errors && (
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <ListErrors errors={errors} />
            </div>
          </div>
        </div>
      )}

      {article && (
        <>
          <div className="banner">
            <div className="container">
              <h1>{article.title}</h1>

              <ArticleMeta article={article}>{articleActions(article)}</ArticleMeta>
            </div>
          </div>

          <div className="container page">
            <div className="row article-content">
              <div className="col-md-12">
                <Markdown content={article.body} />

                <ul className="tag-list">
                  {article.tagList.map(tag => (
                    <li className="tag-default tag-pill tag-outline" key={tag}>
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <hr />

            <div className="article-actions">
              <ArticleMeta article={article}>{articleActions(article)}</ArticleMeta>
            </div>

            <div className="row">
              <div className="col-xs-12 col-md-8 offset-md-2">
                {isAuthenticated ? (
                  <div>
                    <ListErrors errors={commentFormErrors} />
                    <form className="card comment-form" onSubmit={addComment}>
                      <fieldset disabled={isSubmitting}>
                        <div className="card-block">
                          <textarea
                            className="form-control"
                            placeholder="Write a comment..."
                            rows={3}
                            value={commentBody}
                            onChange={event => setCommentBody(event.target.value)}
                          ></textarea>
                        </div>
                        <div className="card-footer">
                          <img src={defaultImage(currentUser?.image)} className="comment-author-img" />
                          <button className="btn btn-sm btn-primary" type="submit">
                            Post Comment
                          </button>
                        </div>
                      </fieldset>
                    </form>
                  </div>
                ) : (
                  <div>
                    <Link to="/login">Sign in</Link> or <Link to="/register">sign up</Link> to add comments on this
                    article.
                  </div>
                )}

                <ListErrors errors={deleteCommentErrors} />

                {comments.map(comment => (
                  <ArticleComment key={comment.id} comment={comment} onDelete={() => deleteComment(comment)} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
