import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../../core/auth/store';
import { IfAuthenticated } from '../../../core/auth/IfAuthenticated';
import { Errors } from '../../../core/models/errors';
import { ListErrors } from '../../../shared/ListErrors';
import { defaultImage } from '../../../shared/defaultImage';
import { markdown } from '../../../shared/markdown';
import { Profile } from '../../profile/model';
import { FollowButton } from '../../profile/FollowButton';
import { deleteArticle, getArticle } from '../api';
import { addComment, Comment, deleteComment, getComments } from '../comment';
import { Article } from '../model';
import { ArticleComment } from '../ArticleComment';
import { ArticleMeta } from '../ArticleMeta';
import { FavoriteButton } from '../FavoriteButton';

/**
 * Port of `article/pages/article/article.component.{ts,html}`.
 *
 * - The `combineLatest([get, getAll, currentUser])` load becomes a single
 *   `useEffect` fetch plus the module-level auth store for the current user.
 * - `signal`s become `useState`; the optimistic favorite/follow updates stay in
 *   this page (the parent) exactly as the Angular component owned them.
 * - `MarkdownPipe` is the shared `markdown()` helper rendered via
 *   `dangerouslySetInnerHTML` — the single sanitization boundary the XSS e2e
 *   suite depends on.
 * - The slug is read with `useParams`, so the page works at both its temporary
 *   route and its final `/article/:slug` route.
 */
export function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore(s => s.currentUser);

  const [article, setArticle] = useState<Article | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [errors, setErrors] = useState<Errors | null>(null);

  const [commentBody, setCommentBody] = useState('');
  const [commentFormErrors, setCommentFormErrors] = useState<Errors | null>(null);
  const [deleteCommentErrors, setDeleteCommentErrors] = useState<Errors | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canModify = !!article && currentUser?.username === article.author.username;

  useEffect(() => {
    if (!slug) {
      return;
    }
    let active = true;
    Promise.all([getArticle(slug), getComments(slug)]).then(
      ([loadedArticle, loadedComments]) => {
        if (!active) return;
        setArticle(loadedArticle);
        setComments(loadedComments);
      },
      (err: unknown) => {
        if (!active) return;
        setErrors((err as Errors) || { errors: { error: 'Failed to load article' } });
      },
    );
    return () => {
      active = false;
    };
  }, [slug]);

  const onToggleFavorite = (favorited: boolean) => {
    setArticle(a =>
      a
        ? {
            ...a,
            favorited,
            favoritesCount: favorited ? a.favoritesCount + 1 : a.favoritesCount - 1,
          }
        : a,
    );
  };

  const onToggleFollowing = (profile: Profile) => {
    setArticle(a => (a ? { ...a, author: { ...a.author, following: profile.following } } : a));
  };

  const onDeleteArticle = async () => {
    if (!article) return;
    setIsDeleting(true);
    await deleteArticle(article.slug);
    navigate('/');
  };

  const onAddComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!article) return;

    setIsSubmitting(true);
    setCommentFormErrors(null);

    try {
      const comment = await addComment(article.slug, commentBody);
      setComments(current => [comment, ...current]);
      setCommentBody('');
      setIsSubmitting(false);
    } catch (err) {
      setIsSubmitting(false);
      setCommentFormErrors(err as Errors);
    }
  };

  const onDeleteComment = async (comment: Comment) => {
    if (!article) return;

    setDeleteCommentErrors(null);
    try {
      await deleteComment(comment.id, article.slug);
      setComments(current => current.filter(item => item.id !== comment.id));
    } catch (err) {
      setDeleteCommentErrors(err as Errors);
    }
  };

  const renderActions = (a: Article): ReactNode =>
    canModify ? (
      <span>
        <Link className="btn btn-sm btn-outline-secondary" to={`/editor/${a.slug}`}>
          <i className="ion-edit"></i> Edit Article
        </Link>

        <button
          className={['btn', 'btn-sm', 'btn-outline-danger', isDeleting ? 'disabled' : ''].filter(Boolean).join(' ')}
          onClick={onDeleteArticle}
        >
          <i className="ion-trash-a"></i> Delete Article
        </button>
      </span>
    ) : (
      <span>
        <FollowButton profile={a.author} onToggle={onToggleFollowing} isAuthenticated={!!currentUser} />

        <FavoriteButton article={a} onToggle={onToggleFavorite} isAuthenticated={!!currentUser}>
          {a.favorited ? 'Unfavorite' : 'Favorite'} Article <span className="counter">({a.favoritesCount})</span>
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

              <ArticleMeta article={article}>{renderActions(article)}</ArticleMeta>
            </div>
          </div>

          <div className="container page">
            <div className="row article-content">
              <div className="col-md-12">
                <div dangerouslySetInnerHTML={{ __html: markdown(article.body) }}></div>

                <ul className="tag-list">
                  {article.tagList.map(tag => (
                    <li key={tag} className="tag-default tag-pill tag-outline">
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <hr />

            <div className="article-actions">
              <ArticleMeta article={article}>{renderActions(article)}</ArticleMeta>
            </div>

            <div className="row">
              <div className="col-xs-12 col-md-8 offset-md-2">
                <IfAuthenticated condition={true}>
                  <div>
                    <ListErrors errors={commentFormErrors} />
                    <form className="card comment-form" onSubmit={onAddComment}>
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
                </IfAuthenticated>

                <IfAuthenticated condition={false}>
                  <div>
                    <Link to="/login">Sign in</Link> or <Link to="/register">sign up</Link> to add comments on this
                    article.
                  </div>
                </IfAuthenticated>

                <ListErrors errors={deleteCommentErrors} />

                {comments.map(comment => (
                  <ArticleComment key={comment.id} comment={comment} onDelete={() => onDeleteComment(comment)} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
