import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../core/auth/auth-context';
import { ArticleList } from '../components/ArticleList';
import type { ArticleListConfig } from '../models/article-list-config';
import { getTags } from '../services/tags';

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const { tag } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [tags, setTags] = useState<string[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getTags(controller.signal)
      .then(setTags)
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const feed = searchParams.get('feed');
  const pageParam = searchParams.get('page');
  const currentPage = pageParam ? parseInt(pageParam, 10) : 1;

  useEffect(() => {
    if (feed === 'following' && !isAuthenticated) {
      void navigate('/login');
    }
  }, [feed, isAuthenticated, navigate]);

  let listConfig: ArticleListConfig;
  if (tag) {
    listConfig = { type: 'all', filters: { tag } };
  } else if (feed === 'following') {
    listConfig = { type: 'feed', filters: {} };
  } else {
    listConfig = { type: 'all', filters: {} };
  }
  const isFollowingFeed = listConfig.type === 'feed';

  const onPageChange = (page: number) => {
    const params = new URLSearchParams();
    if (feed) {
      params.set('feed', feed);
    }
    if (page > 1) {
      params.set('page', String(page));
    }
    void setSearchParams(params);
  };

  return (
    <app-home-page>
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
                      <Link
                        className={listConfig.type === 'feed' ? 'nav-link active' : 'nav-link'}
                        to="/?feed=following"
                      >
                        {' '}
                        Your Feed{' '}
                      </Link>
                    </li>
                  )}
                  <li className="nav-item">
                    <Link
                      className={listConfig.type === 'all' && !listConfig.filters.tag ? 'nav-link active' : 'nav-link'}
                      to="/"
                    >
                      {' '}
                      Global Feed{' '}
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

            {tags !== null && (
              <div className="col-md-3">
                <div className="sidebar">
                  <p>Popular Tags</p>

                  <div className="tag-list">
                    {tags.map(tag => (
                      <Link className="tag-default tag-pill" to={`/tag/${tag}`} key={tag}>
                        {` ${tag} `}
                      </Link>
                    ))}
                  </div>

                  <div hidden>Loading tags...</div>

                  <div hidden={!(tags.length === 0)}>No tags are here... yet.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </app-home-page>
  );
}
