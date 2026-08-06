import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LoadingState } from '@/core/models/loading-state';
import { query as queryArticles } from '../services/articles';
import { ArticlePreview } from './ArticlePreview';
import type { Article } from '../models/article';
import type { ArticleListConfig } from '../models/article-list-config';

interface ArticleListProps {
  /**
   * Page size. Also drives `filters.offset` and the number of pagination links, exactly
   * like the Angular `limit` input.
   */
  limit: number;
  /**
   * The query. A new object reference means "the query changed": re-fetch and reset to
   * page 1 unless `currentPage` changed in the same render, which mirrors Angular's
   * `ngOnChanges` reference comparison. Callers should memoize it (`useMemo`).
   */
  config: ArticleListConfig;
  /** Page owned by the parent (URL `?page=N`); changing it re-fetches. */
  currentPage?: number;
  /** Switches the empty message to the "Your feed is empty" copy. */
  isFollowingFeed?: boolean;
  /** `@Output() pageChange`: fired only for clicks on a pagination link. */
  onPageChange?: (page: number) => void;
}

/** Port of `src/app/features/article/components/article-list.component.ts`. */
export function ArticleList({
  limit,
  config,
  currentPage = 1,
  isFollowingFeed = false,
  onPageChange,
}: ArticleListProps) {
  const [results, setResults] = useState<Article[]>([]);
  const [page, setPage] = useState(currentPage);
  const [totalPages, setTotalPages] = useState<number[]>([]);
  const [loading, setLoading] = useState(LoadingState.NOT_LOADED);

  const previousConfig = useRef<ArticleListConfig | null>(null);
  const previousPage = useRef<number | null>(null);
  // Ignores responses of superseded requests, the `takeUntilDestroyed` + re-subscribe
  // equivalent: only the newest query may write to state.
  const requestId = useRef(0);

  const runQuery = (pageNumber: number) => {
    const id = ++requestId.current;
    setLoading(LoadingState.LOADING);
    setResults([]);

    const filters = limit ? { ...config.filters, limit, offset: limit * (pageNumber - 1) } : { ...config.filters };

    queryArticles({ ...config, filters })
      .then(data => {
        if (id !== requestId.current) {
          return;
        }
        setLoading(LoadingState.LOADED);
        setResults(data.articles);
        setTotalPages(
          limit ? Array.from(new Array(Math.ceil(data.articlesCount / limit)), (_value, index) => index + 1) : [],
        );
      })
      .catch(() => {
        // Angular's subscribe had no error handler: a failed query leaves the list in its
        // loading state rather than rendering an empty feed.
      });
  };

  useEffect(() => {
    const configChanged = previousConfig.current !== config;
    const pageChanged = previousPage.current !== currentPage;
    previousConfig.current = config;
    previousPage.current = currentPage;

    if (!configChanged && !pageChanged) {
      return;
    }

    // A config change resets to page 1 unless the parent moved the page at the same time.
    const nextPage = pageChanged ? currentPage : 1;
    setPage(nextPage);
    runQuery(nextPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, currentPage]);

  const setPageTo = (pageNumber: number) => {
    if (pageNumber !== page) {
      setPage(pageNumber);
      previousPage.current = pageNumber;
      onPageChange?.(pageNumber);
      runQuery(pageNumber);
    }
  };

  return (
    <>
      {loading === LoadingState.LOADING && <div className="article-preview">Loading articles...</div>}

      {loading === LoadingState.LOADED && (
        <>
          {results.length > 0 ? (
            results.map(article => <ArticlePreview article={article} key={article.slug} />)
          ) : (
            <div className="article-preview empty-feed-message">
              {isFollowingFeed ? (
                <>
                  Your feed is empty. Follow some users to see their articles here, or check out the{' '}
                  <Link to="/">Global Feed</Link>!
                </>
              ) : (
                'No articles are here... yet.'
              )}
            </div>
          )}

          <nav>
            <ul className="pagination">
              {totalPages.map(pageNumber => (
                <li className={pageNumber === page ? 'page-item active' : 'page-item'} key={pageNumber}>
                  <button className="page-link" onClick={() => setPageTo(pageNumber)}>
                    {pageNumber}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
    </>
  );
}
