import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http as mswHttp } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { API_URL, server } from '../../test/msw-server';
import { useAuthStore } from '../../core/auth/store';
import { ArticleList, ArticleListProps } from './ArticleList';
import { Article } from './model';

function makeArticle(slug: string): Article {
  return {
    slug,
    title: `Title ${slug}`,
    description: `Description ${slug}`,
    body: 'body',
    tagList: ['dragons'],
    createdAt: '2016-02-18T03:22:56.637Z',
    updatedAt: '2016-02-18T03:48:35.824Z',
    favorited: false,
    favoritesCount: 0,
    author: { username: 'jake', bio: null, image: null, following: false },
  };
}

function Providers({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

function renderList(props: Partial<ArticleListProps> = {}) {
  return render(
    <Providers>
      <ArticleList limit={10} config={{ type: 'all', filters: {} }} {...props} />
    </Providers>,
  );
}

describe('ArticleList', () => {
  beforeEach(() => {
    useAuthStore.setState({ currentUser: null, authState: 'unauthenticated' });
  });

  it('shows the loading state and then the previews', async () => {
    server.use(
      mswHttp.get(`${API_URL}/articles`, () =>
        HttpResponse.json({ articles: [makeArticle('a'), makeArticle('b')], articlesCount: 2 }),
      ),
    );

    const { container } = renderList();

    expect(screen.getByText('Loading articles...')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Title a')).toBeInTheDocument());
    expect(screen.getByText('Title b')).toBeInTheDocument();
    expect(container.querySelectorAll('.article-preview')).toHaveLength(2);
    expect(screen.queryByText('Loading articles...')).not.toBeInTheDocument();
  });

  it('sends limit and offset filters for the requested page', async () => {
    const urls: string[] = [];
    server.use(
      mswHttp.get(`${API_URL}/articles`, ({ request }) => {
        urls.push(request.url);
        return HttpResponse.json({ articles: [makeArticle('a')], articlesCount: 1 });
      }),
    );

    renderList({ limit: 5, currentPage: 3 });

    await waitFor(() => expect(screen.getByText('Title a')).toBeInTheDocument());
    expect(urls[0]).toContain('limit=5');
    expect(urls[0]).toContain('offset=10');
  });

  it('renders pagination and reports page changes', async () => {
    const offsets: (string | null)[] = [];
    server.use(
      mswHttp.get(`${API_URL}/articles`, ({ request }) => {
        offsets.push(new URL(request.url).searchParams.get('offset'));
        return HttpResponse.json({ articles: [makeArticle('a')], articlesCount: 25 });
      }),
    );

    const onPageChange = vi.fn();
    const { container } = renderList({ onPageChange });

    await waitFor(() => expect(container.querySelectorAll('.pagination .page-item')).toHaveLength(3));
    expect(container.querySelector('.page-item.active')).toHaveTextContent('1');

    await userEvent.click(screen.getByRole('button', { name: '3' }));

    expect(onPageChange).toHaveBeenCalledWith(3);
    await waitFor(() => expect(container.querySelector('.page-item.active')).toHaveTextContent('3'));
    expect(offsets).toEqual(['0', '20']);
  });

  it('ignores a click on the current page', async () => {
    server.use(
      mswHttp.get(`${API_URL}/articles`, () => HttpResponse.json({ articles: [makeArticle('a')], articlesCount: 25 })),
    );

    const onPageChange = vi.fn();
    renderList({ onPageChange });

    await waitFor(() => expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: '1' }));

    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('shows the global empty message when there are no articles', async () => {
    server.use(mswHttp.get(`${API_URL}/articles`, () => HttpResponse.json({ articles: [], articlesCount: 0 })));

    const { container } = renderList();

    await waitFor(() => expect(container.querySelector('.empty-feed-message')).toBeInTheDocument());
    expect(container.querySelector('.empty-feed-message')).toHaveTextContent('No articles are here... yet.');
  });

  it('shows the follow-someone message with a Global Feed link on an empty feed', async () => {
    server.use(mswHttp.get(`${API_URL}/articles/feed`, () => HttpResponse.json({ articles: [], articlesCount: 0 })));

    const { container } = renderList({ config: { type: 'feed', filters: {} }, isFollowingFeed: true });

    await waitFor(() => expect(container.querySelector('.empty-feed-message')).toBeInTheDocument());
    const message = container.querySelector('.empty-feed-message')!;
    expect(message).toHaveTextContent(
      'Your feed is empty. Follow some users to see their articles here, or check out the Global Feed!',
    );
    expect(message.querySelector('a')).toHaveAttribute('href', '/');
  });
});
