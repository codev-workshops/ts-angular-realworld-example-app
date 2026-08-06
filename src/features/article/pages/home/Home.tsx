import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArticleList } from '@/features/article/components/ArticleList';
import { useAuthStore } from '@/core/auth/store';
import { useIsAuthenticated } from '@/core/auth/useIsAuthenticated';
import { getAll as getAllTags } from '@/features/article/services/tags';
import type { ArticleListConfig } from '@/features/article/models/article-list-config';

/**
 * Port of `src/app/features/article/pages/home/home.component.*`.
 *
 * The Angular component derived its list config from
 * `combineLatest([isAuthenticated, route.params, route.queryParams])`; here the same
 * inputs are the route param, the query string and the auth store, and the config is
 * derived during render (memoized so `ArticleList` only re-fetches when it changes).
 */
export default function Home() {
  const { tag } = useParams<{ tag?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();
  const authState = useAuthStore(s => s.authState);

  const feed = searchParams.get('feed');
  const pageParam = searchParams.get('page');
  const currentPage = pageParam ? parseInt(pageParam, 10) : 1;

  // feed=following without a session is the Angular guard-like redirect to /login. It has
  // to wait out the startup GET /user ('loading'), which the Angular stream did implicitly
  // by only emitting once `isAuthenticated` had a value.
  const mustRedirect = feed === 'following' && !isAuthenticated && authState !== 'loading';

  useEffect(() => {
    if (mustRedirect) {
      void navigate('/login');
    }
  }, [mustRedirect, navigate]);

  const listConfig = useMemo<ArticleListConfig>(() => {
    if (tag) {
      return { type: 'all', filters: { tag } };
    }
    if (feed === 'following') {
      return { type: 'feed', filters: {} };
    }
    return { type: 'all', filters: {} };
  }, [tag, feed]);

  const isFollowingFeed = listConfig.type === 'feed';

  const onPageChange = (page: number) => {
    const queryParams = new URLSearchParams();
    if (feed) {
      queryParams.set('feed', feed);
    }
    if (page > 1) {
      queryParams.set('page', String(page));
    }
    const query = queryParams.toString();
    void navigate({ search: query ? `?${query}` : '' });
  };

  const [tags, setTags] = useState<string[]>([]);
  const [tagsLoaded, setTagsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    getAllTags()
      .then(loaded => {
        if (active) {
          setTags(loaded);
          setTagsLoaded(true);
        }
      })
      .catch(() => {
        // `*rxLet` rendered nothing on error: the sidebar keeps its "Loading tags..." copy.
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="home-page">
      {!isAuthenticated && (
        <div className="banner">
          <div className="container">
            <h1 className="logo-font">conduit</h1>
            <p>
              A place to share your <i>Angular</i> knowledge.
            </p>
          </div>
        </div>
      )}

      <div className="container page">
        <div className="row">
          <div className="col-md-9">
            <div className="feed-toggle">
              <ul className="nav nav-pills outline-active">
                {isAuthenticated && (
                  <li className="nav-item">
                    <Link className={listConfig.type === 'feed' ? 'nav-link active' : 'nav-link'} to="/?feed=following">
                      Your Feed
                    </Link>
                  </li>
                )}
                <li className="nav-item">
                  <Link
                    className={listConfig.type === 'all' && !listConfig.filters.tag ? 'nav-link active' : 'nav-link'}
                    to="/"
                  >
                    Global Feed
                  </Link>
                </li>
                <li className="nav-item" hidden={!listConfig.filters.tag}>
                  <a className="nav-link active">
                    <i className="ion-pound"></i> {listConfig.filters.tag}
                  </a>
                </li>
              </ul>
            </div>

            <ArticleList
              limit={10}
              config={listConfig}
              currentPage={currentPage}
              isFollowingFeed={isFollowingFeed}
              onPageChange={onPageChange}
            />
          </div>

          <div className="col-md-3">
            <div className="sidebar">
              <p>Popular Tags</p>

              <div className="tag-list">
                {tags.map(item => (
                  <Link className="tag-default tag-pill" to={`/tag/${item}`} key={item}>
                    {item}
                  </Link>
                ))}
              </div>

              <div hidden={tagsLoaded}>Loading tags...</div>

              <div hidden={!tagsLoaded || tags.length > 0}>No tags are here... yet.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
