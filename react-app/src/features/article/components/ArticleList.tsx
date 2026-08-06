import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Article } from '../models/article';
import type { ArticleListConfig } from '../models/article-list-config';
import { queryArticles } from '../services/articles';
import { ArticlePreview } from './ArticlePreview';

interface Results {
  key: string;
  articles: Article[];
  totalPages: number[];
}

export function ArticleList({
  limit,
  config,
  currentPage = 1,
  isFollowingFeed = false,
  onPageChange,
}: {
  limit: number;
  config: ArticleListConfig;
  currentPage?: number;
  isFollowingFeed?: boolean;
  onPageChange?: (page: number) => void;
}) {
  // The Angular component owns its page number and only notifies the parent: the
  // home page mirrors it into the URL and feeds it back in, the profile pages let
  // it stay internal. A config change resets it to page 1.
  const filtersKey = JSON.stringify(config);
  const [page, setPage] = useState(currentPage);
  const [lastInputs, setLastInputs] = useState({ currentPage, filtersKey });
  const [results, setResults] = useState<Results | null>(null);

  if (lastInputs.currentPage !== currentPage || lastInputs.filtersKey !== filtersKey) {
    setLastInputs({ currentPage, filtersKey });
    setPage(currentPage);
  }

  const queryKey = `${filtersKey}|${page}|${limit}`;

  useEffect(() => {
    const controller = new AbortController();

    const query: ArticleListConfig = { ...config, filters: { ...config.filters } };
    if (limit) {
      query.filters.limit = limit;
      query.filters.offset = limit * (page - 1);
    }

    queryArticles(query, controller.signal)
      .then(data =>
        setResults({
          key: queryKey,
          articles: data.articles,
          totalPages: Array.from(new Array(Math.ceil(data.articlesCount / limit)), (_val, index) => index + 1),
        }),
      )
      .catch(() => {});

    return () => controller.abort();
    // `config` is serialised into `queryKey`; the request depends on nothing else.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const setPageTo = (pageNumber: number) => {
    if (pageNumber !== page) {
      setPage(pageNumber);
      onPageChange?.(pageNumber);
    }
  };

  const loaded = results?.key === queryKey ? results : null;

  if (!loaded) {
    return (
      <app-article-list>
        <div className="article-preview">Loading articles...</div>
      </app-article-list>
    );
  }

  return (
    <app-article-list>
      {loaded.articles.length > 0 ? (
        loaded.articles.map(article => <ArticlePreview articleInput={article} key={article.slug} />)
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
          {loaded.totalPages.map(pageNumber => (
            <li className={pageNumber === page ? 'page-item active' : 'page-item'} key={pageNumber}>
              <button className="page-link" onClick={() => setPageTo(pageNumber)}>
                {` ${pageNumber} `}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </app-article-list>
  );
}
