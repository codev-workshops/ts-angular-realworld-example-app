import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../core/auth/auth-context';
import type { ApiError } from '../../../core/api/client';
import type { Errors } from '../../../core/models/errors';
import { ListErrors } from '../../../shared/components/ListErrors';
import { defaultImage } from '../../../shared/util/defaultImage';
import { renderMarkdown } from '../../../shared/util/markdown';
import { FollowButton } from '../../profile/components/FollowButton';
import type { Profile } from '../../profile/models/profile';
import { ArticleComment } from '../components/ArticleComment';
import { ArticleMeta } from '../components/ArticleMeta';
import { FavoriteButton } from '../components/FavoriteButton';
import type { Article } from '../models/article';
import type { Comment } from '../models/comment';
import { deleteArticle, getArticle } from '../services/articles';
import { addComment, deleteComment, getComments } from '../services/comments';

export default function ArticlePage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [article, setArticle] = useState<Article | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [errors, setErrors] = useState<Errors | null>(null);
  const [renderedBody, setRenderedBody] = useState<{ source: string; html: string } | null>(null);

  const [commentText, setCommentText] = useState('');
  const [commentFormErrors, setCommentFormErrors] = useState<Errors | null>(null);
  const [deleteCommentErrors, setDeleteCommentErrors] = useState<Errors | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([getArticle(slug, controller.signal), getComments(slug, controller.signal)])
      .then(([loadedArticle, loadedComments]) => {
        setArticle(loadedArticle);
        setComments(loadedComments);
      })
      .catch((err: ApiError) => {
        if (controller.signal.aborted) {
          return;
        }
        // The Angular component stores `err.errors` itself (not the wrapper), so
        // ListErrors reads `.errors` off it, finds nothing and renders an empty
        // list. Reproduced verbatim.
        setErrors((err.errors ?? { error: ['Failed to load article'] }) as unknown as Errors);
      });

    return () => controller.abort();
  }, [slug]);

  const source = article?.body;

  useEffect(() => {
    if (source === undefined) {
      return;
    }
    let active = true;
    void renderMarkdown(source).then(html => {
      if (active) {
        setRenderedBody({ source, html });
      }
    });
    return () => {
      active = false;
    };
  }, [source]);

  // Angular's markdown pipe is async too, so the body appears one tick later.
  const body = renderedBody && renderedBody.source === source ? renderedBody.html : '';

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

  const onDeleteArticle = async () => {
    if (!article) {
      return;
    }
    setIsDeleting(true);
    await deleteArticle(article.slug);
    void navigate('/');
  };

  const onAddComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!article) {
      return;
    }
    setIsSubmitting(true);
    setCommentFormErrors(null);
    try {
      const comment = await addComment(article.slug, commentText);
      setComments(current => [comment, ...current]);
      setCommentText('');
      setIsSubmitting(false);
    } catch (err) {
      setIsSubmitting(false);
      setCommentFormErrors(err as Errors);
    }
  };

  const onDeleteComment = async (comment: Comment) => {
    if (!article) {
      return;
    }
    setDeleteCommentErrors(null);
    try {
      await deleteComment(comment.id, article.slug);
      setComments(current => current.filter(item => item !== comment));
    } catch (err) {
      setDeleteCommentErrors(err as Errors);
    }
  };

  const articleActions = (a: Article) =>
    canModify ? (
      <span>
        <Link className="btn btn-sm btn-outline-secondary" to={`/editor/${a.slug}`}>
          <i className="ion-edit"></i> Edit Article
        </Link>
        <button
          className={isDeleting ? 'btn btn-sm btn-outline-danger disabled' : 'btn btn-sm btn-outline-danger'}
          onClick={() => void onDeleteArticle()}
        >
          <i className="ion-trash-a"></i> Delete Article
        </button>
      </span>
    ) : (
      <span>
        <FollowButton profile={a.author} onToggle={toggleFollowing} />
        <FavoriteButton article={a} onToggle={onToggleFavorite}>
          {` ${a.favorited ? 'Unfavorite' : 'Favorite'} Article `}
          <span className="counter">{`(${a.favoritesCount})`}</span>
        </FavoriteButton>
      </span>
    );

  return (
    <app-article-page>
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
                  <div dangerouslySetInnerHTML={{ __html: body }}></div>

                  <ul className="tag-list">
                    {article.tagList.map(tag => (
                      <li className="tag-default tag-pill tag-outline" key={tag}>
                        {` ${tag} `}
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
                  {currentUser ? (
                    <div>
                      <ListErrors errors={commentFormErrors} />
                      <form className="card comment-form" onSubmit={event => void onAddComment(event)}>
                        <fieldset disabled={isSubmitting}>
                          <div className="card-block">
                            <textarea
                              className="form-control"
                              placeholder="Write a comment..."
                              rows={3}
                              value={commentText}
                              onChange={event => setCommentText(event.target.value)}
                            ></textarea>
                          </div>
                          <div className="card-footer">
                            <img src={defaultImage(currentUser.image)} className="comment-author-img" />
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
                    <ArticleComment key={comment.id} comment={comment} onDelete={() => void onDeleteComment(comment)} />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </app-article-page>
  );
}
