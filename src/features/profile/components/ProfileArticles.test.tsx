import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProfileArticles from './ProfileArticles';
import type { ArticleListConfig } from '@/features/article/models/article-list-config';

const get = vi.fn();
vi.mock('../services/profile', () => ({
  get: (username: string) => get(username),
}));

let received: { limit: number; config: ArticleListConfig } | null = null;
vi.mock('@/features/article/components/ArticleList', () => ({
  ArticleList: (props: { limit: number; config: ArticleListConfig }) => {
    received = props;
    return <div data-testid="article-list">{JSON.stringify(props.config)}</div>;
  },
}));

const renderAt = () =>
  render(
    <MemoryRouter initialEntries={['/profile/johndoe']}>
      <Routes>
        <Route path="/profile/:username" element={<ProfileArticles />} />
      </Routes>
    </MemoryRouter>,
  );

describe('ProfileArticles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    received = null;
  });

  it('fetches the profile and feeds ArticleList an author filter', async () => {
    get.mockResolvedValue({ username: 'johndoe', bio: null, image: null, following: false });
    renderAt();

    expect(get).toHaveBeenCalledWith('johndoe');
    await waitFor(() => expect(screen.getByTestId('article-list')).toBeInTheDocument());
    expect(received).toEqual({ limit: 10, config: { type: 'all', filters: { author: 'johndoe' } } });
  });

  it('renders nothing until the profile resolves', async () => {
    let resolve!: (v: unknown) => void;
    get.mockReturnValue(new Promise(r => (resolve = r)));
    renderAt();

    expect(screen.queryByTestId('article-list')).not.toBeInTheDocument();
    resolve({ username: 'johndoe', bio: null, image: null, following: false });
    await waitFor(() => expect(screen.getByTestId('article-list')).toBeInTheDocument());
  });
});
