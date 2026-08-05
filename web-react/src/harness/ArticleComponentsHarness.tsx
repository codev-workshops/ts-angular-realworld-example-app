import { useEffect, useState } from 'react';
import { ArticleComment } from '../features/article/ArticleComment';
import { ArticleList } from '../features/article/ArticleList';
import { ArticleMeta } from '../features/article/ArticleMeta';
import { ArticlePreview } from '../features/article/ArticlePreview';
import { Comment, getComments } from '../features/article/comment';
import { ArticleListConfig } from '../features/article/list-config';
import { Article } from '../features/article/model';
import { queryArticles } from '../features/article/api';

const listConfig: ArticleListConfig = { type: 'all', filters: {} };

/**
 * TEMPORARY harness route (`/harness/article-components`).
 *
 * Wave 5 deletes `src/harness/` entirely once the real router table lands.
 */
export function ArticleComponentsHarness() {
  const [article, setArticle] = useState<Article | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    queryArticles({ type: 'all', filters: { limit: 1 } })
      .then(async ({ articles }) => {
        const first = articles[0] ?? null;
        setArticle(first);
        if (first) {
          setComments(await getComments(first.slug));
        }
      })
      .catch(() => setArticle(null));
  }, []);

  return (
    <div className="container page">
      <h1>Article components harness</h1>

      <h2>ArticleMeta</h2>
      {article ? <ArticleMeta article={article} /> : <p>Loading article...</p>}

      <h2>ArticlePreview</h2>
      {article ? <ArticlePreview article={article} /> : <p>Loading article...</p>}

      <h2>ArticleComment</h2>
      {comments.length > 0 ? (
        comments.map(comment => (
          <ArticleComment
            key={comment.id}
            comment={comment}
            onDelete={() => setComments(current => current.filter(c => c.id !== comment.id))}
          />
        ))
      ) : (
        <p>No comments on this article.</p>
      )}

      <h2>ArticleList</h2>
      <ArticleList limit={10} config={listConfig} />
    </div>
  );
}
