import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ArticleList } from './ArticleList';
import type { Article } from '../models/article';
import type { ArticleListConfig } from '../models/article-list-config';

const query = vi.fn();
vi.mock('../services/articles', () => ({
  query: (config: ArticleListConfig) => query(config),
  favorite: vi.fn(),
  unfavorite: vi.fn(),
}));

const article = (slug: string): Article => ({
  slug,
  title: slug,
  description: 'description',
  body: 'body',
  tagList: [],
  createdAt: '2024-01-02T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
  favorited: false,
  favoritesCount: 0,
  author: { username: 'jane', bio: null, image: null, following: false },
});

const feed = (slugs: string[], articlesCount = slugs.length) => ({
  articles: slugs.map(article),
  articlesCount,
});

const globalConfig: ArticleListConfig = { type: 'all', filters: {} };

const renderList = (props: Partial<React.ComponentProps<typeof ArticleList>> = {}) =>
  render(
    <MemoryRouter>
      <ArticleList limit={2} config={globalConfig} {...props} />
    </MemoryRouter>,
  );

describe('ArticleList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the loading placeholder while the query is in flight', async () => {
    let resolve!: (value: ReturnType<typeof feed>) => void;
    query.mockReturnValue(new Promise(r => (resolve = r)));

    renderList();

    expect(screen.getByText('Loading articles...')).toBeInTheDocument();

    resolve(feed(['a']));
    await waitFor(() => expect(screen.queryByText('Loading articles...')).not.toBeInTheDocument());
  });

  it('adds limit and offset to the query filters without mutating the config', async () => {
    query.mockResolvedValue(feed(['a', 'b'], 4));

    renderList();

    await waitFor(() => expect(query).toHaveBeenCalledTimes(1));
    expect(query).toHaveBeenCalledWith({ type: 'all', filters: { limit: 2, offset: 0 } });
    expect(globalConfig.filters).toEqual({});
  });

  it('renders one preview per article', async () => {
    query.mockResolvedValue(feed(['a', 'b'], 2));

    const { container } = renderList();

    await waitFor(() => expect(container.querySelectorAll('.article-preview')).toHaveLength(2));
  });

  it('renders the global empty message when there are no articles', async () => {
    query.mockResolvedValue(feed([], 0));

    const { container } = renderList();

    await screen.findByText('No articles are here... yet.');
    expect(container.querySelector('.article-preview.empty-feed-message')).toBeInTheDocument();
  });

  it('renders the follow-feed empty message with a link to the global feed', async () => {
    query.mockResolvedValue(feed([], 0));

    renderList({ isFollowingFeed: true });

    expect(await screen.findByText(/Your feed is empty/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Global Feed' })).toHaveAttribute('href', '/');
  });

  it('builds one pagination link per page and marks the current one active', async () => {
    query.mockResolvedValue(feed(['a', 'b'], 5));

    const { container } = renderList();

    await waitFor(() => expect(container.querySelectorAll('.pagination .page-item')).toHaveLength(3));
    expect(container.querySelectorAll('.pagination .page-link')[0]).toHaveTextContent('1');
    expect(container.querySelectorAll('.pagination .page-item')[0]).toHaveClass('active');
  });

  it('renders a single pagination link when everything fits on one page', async () => {
    query.mockResolvedValue(feed(['a'], 1));

    const { container } = renderList();

    await waitFor(() => expect(container.querySelectorAll('.article-preview')).toHaveLength(1));
    expect(container.querySelectorAll('.page-item')).toHaveLength(1);
  });

  it('renders no pagination link when the feed is empty', async () => {
    query.mockResolvedValue(feed([], 0));

    const { container } = renderList();

    await screen.findByText('No articles are here... yet.');
    expect(container.querySelectorAll('.page-item')).toHaveLength(0);
  });

  it('re-queries with the new offset and reports the page when a link is clicked', async () => {
    query.mockResolvedValue(feed(['a', 'b'], 5));
    const onPageChange = vi.fn();

    const { container } = renderList({ onPageChange });

    await waitFor(() => expect(container.querySelectorAll('.page-item')).toHaveLength(3));
    await userEvent.click(screen.getByRole('button', { name: '2' }));

    expect(onPageChange).toHaveBeenCalledWith(2);
    expect(query).toHaveBeenLastCalledWith({ type: 'all', filters: { limit: 2, offset: 2 } });
    await waitFor(() => expect(container.querySelectorAll('.page-item')[1]).toHaveClass('active'));
  });

  it('ignores a click on the page that is already active', async () => {
    query.mockResolvedValue(feed(['a', 'b'], 5));
    const onPageChange = vi.fn();

    const { container } = renderList({ onPageChange });

    await waitFor(() => expect(container.querySelectorAll('.page-item')).toHaveLength(3));
    await userEvent.click(screen.getByRole('button', { name: '1' }));

    expect(onPageChange).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('resets to page 1 when the config changes', async () => {
    query.mockResolvedValue(feed(['a', 'b'], 5));

    const { container, rerender } = render(
      <MemoryRouter>
        <ArticleList limit={2} config={globalConfig} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(container.querySelectorAll('.page-item')).toHaveLength(3));
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    await waitFor(() => expect(container.querySelectorAll('.page-item')[1]).toHaveClass('active'));

    rerender(
      <MemoryRouter>
        <ArticleList limit={2} config={{ type: 'all', filters: { tag: 'dragons' } }} />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(query).toHaveBeenLastCalledWith({ type: 'all', filters: { tag: 'dragons', limit: 2, offset: 0 } }),
    );
    await waitFor(() => expect(container.querySelectorAll('.page-item')[0]).toHaveClass('active'));
  });

  it('follows the page the parent owns', async () => {
    query.mockResolvedValue(feed(['a', 'b'], 5));

    const { container, rerender } = render(
      <MemoryRouter>
        <ArticleList limit={2} config={globalConfig} currentPage={1} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(query).toHaveBeenCalledTimes(1));

    rerender(
      <MemoryRouter>
        <ArticleList limit={2} config={globalConfig} currentPage={3} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(query).toHaveBeenLastCalledWith({ type: 'all', filters: { limit: 2, offset: 4 } }));
    await waitFor(() => expect(container.querySelectorAll('.page-item')[2]).toHaveClass('active'));
  });

  it('does not re-query when unrelated props change', async () => {
    query.mockResolvedValue(feed(['a'], 1));

    const { rerender } = render(
      <MemoryRouter>
        <ArticleList limit={2} config={globalConfig} isFollowingFeed={false} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(query).toHaveBeenCalledTimes(1));

    rerender(
      <MemoryRouter>
        <ArticleList limit={2} config={globalConfig} isFollowingFeed />
      </MemoryRouter>,
    );

    expect(query).toHaveBeenCalledTimes(1);
  });

  it('stays in the loading state when the query fails, like the Angular original', async () => {
    query.mockRejectedValue({ errors: { network: ['nope'] }, status: 0 });

    renderList();

    await waitFor(() => expect(query).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Loading articles...')).toBeInTheDocument();
  });

  it('ignores the response of a superseded query', async () => {
    let resolveFirst!: (value: ReturnType<typeof feed>) => void;
    query.mockReturnValueOnce(new Promise(r => (resolveFirst = r)));
    query.mockResolvedValue(feed(['second'], 1));

    const { container, rerender } = render(
      <MemoryRouter>
        <ArticleList limit={2} config={globalConfig} />
      </MemoryRouter>,
    );

    rerender(
      <MemoryRouter>
        <ArticleList limit={2} config={{ type: 'feed', filters: {} }} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole('heading', { name: 'second' })).toBeInTheDocument());

    resolveFirst(feed(['first'], 1));

    await waitFor(() => expect(container.querySelectorAll('.article-preview')).toHaveLength(1));
    expect(screen.queryByRole('heading', { name: 'first' })).not.toBeInTheDocument();
  });
});
