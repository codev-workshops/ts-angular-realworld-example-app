import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ArticleList } from '../ArticleList';
import { ArticleListConfig } from '../list-config';
import { getTags } from '../tags';
import { IfAuthenticated } from '../../../core/auth/IfAuthenticated';
import { useAuthStore } from '../../../core/auth/store';
import './home.css';

/**
 * Port of `home.component.ts`.
 *
 * The Angular `combineLatest([isAuthenticated, route.params, route.queryParams])`
 * subscription becomes direct reads of `useParams` / `useSearchParams`: the URL
 * is the single source of truth, so back/forward navigation and direct links
 * resolve the same feed. `feed=following` without a session still redirects to
 * `/login`, but only once auth has settled (the store starts in 'loading' while
 * `GET /user` validates a stored token).
 */
export function Home() {
  const { tag } = useParams<{ tag?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const authState = useAuthStore(s => s.authState);
  const isAuthenticated = useAuthStore(s => !!s.currentUser);

  const feed = searchParams.get('feed');
  const pageParam = searchParams.get('page');
  const currentPage = pageParam ? parseInt(pageParam, 10) : 1;

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

  const { data: tags, isSuccess: tagsLoaded } = useQuery({ queryKey: ['tags'], queryFn: getTags });

  const onPageChange = (page: number) => {
    const params = new URLSearchParams();

    // Preserve feed param if present
    const currentFeed = searchParams.get('feed');
    if (currentFeed) {
      params.set('feed', currentFeed);
    }

    // Only add page param if not page 1
    if (page > 1) {
      params.set('page', String(page));
    }

    setSearchParams(params);
  };

  // If feed=following but not authenticated, redirect to login
  if (feed === 'following' && authState !== 'loading' && !isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="home-page">
      <IfAuthenticated condition={false}>
        <div className="banner">
          <div className="container">
            <h1 className="logo-font">conduit</h1>
            <p>
              A place to share your <i>Angular</i> knowledge.
            </p>
          </div>
        </div>
      </IfAuthenticated>

      <div className="container page">
        <div className="row">
          <div className="col-md-9">
            <div className="feed-toggle">
              <ul className="nav nav-pills outline-active">
                <IfAuthenticated condition={true}>
                  <li className="nav-item">
                    <Link className={listConfig.type === 'feed' ? 'nav-link active' : 'nav-link'} to="/?feed=following">
                      Your Feed
                    </Link>
                  </li>
                </IfAuthenticated>
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
                    {' '}
                    <i className="ion-pound"></i> {listConfig.filters.tag}{' '}
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

          {tags && (
            <div className="col-md-3">
              <div className="sidebar">
                <p>Popular Tags</p>

                <div className="tag-list">
                  {tags.map(tagName => (
                    <Link key={tagName} className="tag-default tag-pill" to={`/tag/${tagName}`}>
                      {tagName}
                    </Link>
                  ))}
                </div>

                <div hidden={tagsLoaded}>Loading tags...</div>

                <div hidden={!tagsLoaded || tags.length > 0}>No tags are here... yet.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
