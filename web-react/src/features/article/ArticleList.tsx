import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { queryArticles } from './api';
import { ArticleListConfig } from './list-config';
import { ArticlePreview } from './ArticlePreview';

/** Port of `core/models/loading-state.model.ts` (owned by another wave). */
export const LoadingState = {
  NOT_LOADED: 'NOT_LOADED',
  LOADING: 'LOADING',
  LOADED: 'LOADED',
} as const;
export type LoadingState = (typeof LoadingState)[keyof typeof LoadingState];

export interface ArticleListProps {
  limit: number;
  config: ArticleListConfig;
  currentPage?: number;
  isFollowingFeed?: boolean;
  /** Angular `@Output() pageChange`. */
  onPageChange?: (page: number) => void;
}

/**
 * Port of `article-list.component.ts`.
 *
 * `ngOnChanges` + `runQuery()` become a TanStack Query keyed on the config, the
 * limit and the page; `takeUntilDestroyed` is handled by the query cache. The
 * Angular page-reset rule is preserved: a new `config` resets to page 1 unless
 * `currentPage` changed in the same update.
 */
export function ArticleList({
  limit,
  config,
  currentPage = 1,
  isFollowingFeed = false,
  onPageChange,
}: ArticleListProps) {
  const [page, setPage] = useState(currentPage);
  const previousConfig = useRef(config);
  const previousCurrentPage = useRef(currentPage);

  useEffect(() => {
    const configChanged = previousConfig.current !== config;
    const currentPageChanged = previousCurrentPage.current !== currentPage;
    previousConfig.current = config;
    previousCurrentPage.current = currentPage;

    if (currentPageChanged) {
      setPage(currentPage);
    } else if (configChanged) {
      setPage(1);
    }
  }, [config, currentPage]);

  const query: ArticleListConfig = limit
    ? { ...config, filters: { ...config.filters, limit, offset: limit * (page - 1) } }
    : config;

  const { data, isFetching, isSuccess } = useQuery({
    queryKey: ['articles', query],
    queryFn: () => queryArticles(query),
  });

  const loading: LoadingState = isFetching
    ? LoadingState.LOADING
    : isSuccess
      ? LoadingState.LOADED
      : LoadingState.NOT_LOADED;

  // http://www.jstips.co/en/create-range-0...n-easily-using-one-line/
  const totalPages =
    isSuccess && limit ? Array.from(new Array(Math.ceil(data.articlesCount / limit)), (_val, index) => index + 1) : [];
  const results = isSuccess ? data.articles : [];

  const setPageTo = (pageNumber: number) => {
    if (pageNumber !== page) {
      setPage(pageNumber);
      onPageChange?.(pageNumber);
    }
  };

  return (
    <>
      {loading === LoadingState.LOADING && <div className="article-preview">Loading articles...</div>}

      {loading === LoadingState.LOADED && (
        <>
          {results.length > 0 ? (
            results.map(article => <ArticlePreview key={article.slug} article={article} />)
          ) : (
            <div className="article-preview empty-feed-message">
              {isFollowingFeed ? (
                <>
                  Your feed is empty. Follow some users to see their articles here, or check out the{' '}
                  <Link to="/">Global Feed</Link>!
                </>
              ) : (
                <>No articles are here... yet.</>
              )}
            </div>
          )}

          <nav>
            <ul className="pagination">
              {totalPages.map(pageNumber => (
                <li key={pageNumber} className={pageNumber === page ? 'page-item active' : 'page-item'}>
                  <button className="page-link" style={{ cursor: 'pointer' }} onClick={() => setPageTo(pageNumber)}>
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
