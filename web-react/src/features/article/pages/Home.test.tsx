import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http as mswHttp } from 'msw';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { API_URL, server } from '../../../test/msw-server';
import { useAuthStore } from '../../../core/auth/store';
import { Article } from '../model';
import { Home } from './Home';

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

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderHome(initialEntry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationDisplay />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tag/:tag" element={<Home />} />
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function authenticate() {
  useAuthStore.setState({
    currentUser: { email: 'jake@jake.jake', token: 'jwt', username: 'jake', bio: null, image: null },
    authState: 'authenticated',
  });
}

describe('Home', () => {
  beforeEach(() => {
    useAuthStore.setState({ currentUser: null, authState: 'unauthenticated' });

    server.use(
      mswHttp.get(`${API_URL}/tags`, () => HttpResponse.json({ tags: ['angular', 'react'] })),
      mswHttp.get(`${API_URL}/articles`, () => HttpResponse.json({ articles: [makeArticle('a')], articlesCount: 1 })),
      mswHttp.get(`${API_URL}/articles/feed`, () => HttpResponse.json({ articles: [], articlesCount: 0 })),
    );
  });

  it('shows the banner and the global feed for anonymous visitors', async () => {
    const { container } = renderHome('/');

    expect(container.querySelector('.banner .logo-font')).toHaveTextContent('conduit');
    expect(screen.queryByText('Your Feed')).not.toBeInTheDocument();

    const globalFeed = screen.getByText('Global Feed');
    expect(globalFeed).toHaveClass('active');
    expect(globalFeed).toHaveAttribute('href', '/');

    await waitFor(() => expect(container.querySelector('.article-preview')).toBeInTheDocument());
    await waitFor(() => expect(container.querySelectorAll('.sidebar .tag-list .tag-pill')).toHaveLength(2));
  });

  it('hides the banner and links Your Feed for authenticated users', async () => {
    authenticate();
    const { container } = renderHome('/');

    expect(container.querySelector('.banner')).not.toBeInTheDocument();
    expect(screen.getByText('Your Feed')).toHaveAttribute('href', '/?feed=following');
    await waitFor(() => expect(container.querySelector('.article-preview')).toBeInTheDocument());
  });

  it('activates Your Feed on /?feed=following when authenticated', async () => {
    authenticate();
    const { container } = renderHome('/?feed=following');

    expect(screen.getByText('Your Feed')).toHaveClass('active');
    expect(screen.getByText('Global Feed')).not.toHaveClass('active');
    await waitFor(() => expect(container.querySelector('.empty-feed-message')).toHaveTextContent('Your feed is empty'));
  });

  it('redirects to /login on /?feed=following when not authenticated', async () => {
    renderHome('/?feed=following');

    expect(await screen.findByText('login page')).toBeInTheDocument();
  });

  it('filters by tag on /tag/:tag', async () => {
    let requestedTag: string | null = null;
    server.use(
      mswHttp.get(`${API_URL}/articles`, ({ request }) => {
        requestedTag = new URL(request.url).searchParams.get('tag');
        return HttpResponse.json({ articles: [makeArticle('a')], articlesCount: 1 });
      }),
    );

    renderHome('/tag/dragons');

    const tagTab = screen.getByText('dragons', { selector: '.nav-link' });
    expect(tagTab).toHaveClass('active');
    expect(screen.getByText('Global Feed')).not.toHaveClass('active');
    await waitFor(() => expect(requestedTag).toBe('dragons'));
  });

  it('writes ?page=N to the URL and preserves feed=following', async () => {
    authenticate();
    server.use(
      mswHttp.get(`${API_URL}/articles/feed`, () =>
        HttpResponse.json({ articles: [makeArticle('a')], articlesCount: 15 }),
      ),
    );

    renderHome('/?feed=following');

    const page2 = await screen.findByRole('button', { name: '2' });
    await userEvent.click(page2);

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/?feed=following&page=2'));
  });

  it('reads ?page=N back on direct navigation', async () => {
    let requestedOffset: string | null = null;
    server.use(
      mswHttp.get(`${API_URL}/articles`, ({ request }) => {
        requestedOffset = new URL(request.url).searchParams.get('offset');
        return HttpResponse.json({ articles: [makeArticle('a')], articlesCount: 15 });
      }),
    );

    const { container } = renderHome('/tag/dragons?page=2');

    await waitFor(() => expect(requestedOffset).toBe('10'));
    await waitFor(() => expect(container.querySelector('.pagination .page-item.active')).toHaveTextContent('2'));
  });
});
