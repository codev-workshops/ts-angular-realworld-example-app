import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Home from './Home';
import { useAuthStore } from '@/core/auth/store';
import type { ArticleListConfig } from '../../models/article-list-config';

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const getAllTags = vi.fn();
vi.mock('../../services/tags', () => ({ getAll: () => getAllTags() }));

const listProps = vi.fn();
vi.mock('@/features/article/components/ArticleList', () => ({
  ArticleList: (props: { config: ArticleListConfig; currentPage: number; isFollowingFeed: boolean }) => {
    listProps(props);
    return <div data-testid="article-list" />;
  },
}));

const renderHome = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tag/:tag" element={<Home />} />
      </Routes>
    </MemoryRouter>,
  );

const authenticate = () =>
  useAuthStore.setState({
    currentUser: { email: 'a@b.c', token: 'jwt', username: 'jane', bio: null, image: null },
    authState: 'authenticated',
  });

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllTags.mockResolvedValue(['angular', 'react']);
    useAuthStore.setState({ currentUser: null, authState: 'unauthenticated' });
  });

  it('shows the banner and the global feed for anonymous visitors', async () => {
    renderHome('/');

    expect(screen.getByText('conduit')).toBeInTheDocument();
    expect(screen.queryByText('Your Feed')).not.toBeInTheDocument();
    expect(screen.getByText('Global Feed')).toHaveClass('active');
    expect(listProps).toHaveBeenCalledWith(
      expect.objectContaining({ config: { type: 'all', filters: {} }, currentPage: 1, isFollowingFeed: false }),
    );
    await waitFor(() => expect(screen.getByText('angular')).toBeInTheDocument());
  });

  it('hides the banner and offers Your Feed once authenticated', () => {
    authenticate();
    renderHome('/');

    expect(screen.queryByText('conduit')).not.toBeInTheDocument();
    expect(screen.getByText('Your Feed')).toBeInTheDocument();
  });

  it('uses the feed config when ?feed=following and the user is authenticated', () => {
    authenticate();
    renderHome('/?feed=following');

    expect(screen.getByText('Your Feed')).toHaveClass('active');
    expect(listProps).toHaveBeenCalledWith(
      expect.objectContaining({ config: { type: 'feed', filters: {} }, isFollowingFeed: true }),
    );
  });

  it('redirects anonymous visitors away from ?feed=following', () => {
    renderHome('/?feed=following');

    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('waits out the loading auth state before redirecting away from the feed', () => {
    useAuthStore.setState({ currentUser: null, authState: 'loading' });
    renderHome('/?feed=following');

    expect(navigate).not.toHaveBeenCalled();
  });

  it('filters by tag on /tag/:tag and marks the tag pill active', () => {
    renderHome('/tag/dragons');

    expect(listProps).toHaveBeenCalledWith(
      expect.objectContaining({ config: { type: 'all', filters: { tag: 'dragons' } }, isFollowingFeed: false }),
    );
    expect(screen.getByText('Global Feed')).not.toHaveClass('active');
    expect(screen.getByText('dragons')).toBeInTheDocument();
  });

  it('reads the page from ?page=', () => {
    renderHome('/?page=3');

    expect(listProps).toHaveBeenCalledWith(expect.objectContaining({ currentPage: 3 }));
  });

  it('writes the page back to the query string, dropping page 1 and keeping feed', () => {
    authenticate();
    renderHome('/?feed=following');

    const onPageChange = listProps.mock.calls.at(-1)?.[0].onPageChange as (page: number) => void;

    onPageChange(2);
    expect(navigate).toHaveBeenCalledWith({ search: '?feed=following&page=2' });

    onPageChange(1);
    expect(navigate).toHaveBeenLastCalledWith({ search: '?feed=following' });
  });

  it('shows the empty tag message when the API returns no tags', async () => {
    getAllTags.mockResolvedValue([]);
    renderHome('/');

    expect(screen.getByText('Loading tags...')).not.toHaveAttribute('hidden');
    await waitFor(() => expect(screen.getByText('No tags are here... yet.')).not.toHaveAttribute('hidden'));
    expect(screen.getByText('Loading tags...')).toHaveAttribute('hidden');
  });

  it('links each sidebar tag to its tag route', async () => {
    renderHome('/');

    await waitFor(() => expect(screen.getByText('react')).toBeInTheDocument());
    expect(screen.getByText('react')).toHaveAttribute('href', '/tag/react');
  });

  it('keeps the tag sidebar in its loading copy when the tags request fails', async () => {
    getAllTags.mockRejectedValue({ errors: { network: ['nope'] }, status: 0 });
    renderHome('/');

    await waitFor(() => expect(getAllTags).toHaveBeenCalled());
    expect(screen.getByText('Loading tags...')).not.toHaveAttribute('hidden');
  });

  it('does not re-create the list config when unrelated state changes', async () => {
    renderHome('/');

    await waitFor(() => expect(screen.getByText('angular')).toBeInTheDocument());
    const configs = listProps.mock.calls.map(call => call[0].config as ArticleListConfig);
    expect(new Set(configs).size).toBe(1);
  });
});
