import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { FavoriteButton } from './FavoriteButton';
import { useAuthStore } from '@/core/auth/store';
import type { Article } from '../models/article';

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const favorite = vi.fn();
const unfavorite = vi.fn();
vi.mock('../services/articles', () => ({
  favorite: (slug: string) => favorite(slug),
  unfavorite: (slug: string) => unfavorite(slug),
}));

const article = (favorited: boolean): Article => ({
  slug: 'a-slug',
  title: 'title',
  description: 'description',
  body: 'body',
  tagList: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  favorited,
  favoritesCount: 1,
  author: { username: 'author', bio: null, image: null, following: false },
});

const authenticate = () =>
  useAuthStore.setState({
    currentUser: { email: 'a@b.c', token: 'jwt', username: 'author', bio: null, image: null },
    authState: 'authenticated',
  });

describe('FavoriteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ currentUser: null, authState: 'unauthenticated' });
  });

  it('redirects anonymous users to register without calling the API', async () => {
    render(
      <MemoryRouter>
        <FavoriteButton article={article(false)}>Favorite</FavoriteButton>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button'));

    expect(navigate).toHaveBeenCalledWith('/register');
    expect(favorite).not.toHaveBeenCalled();
  });

  it('favorites an unfavorited article and reports the new value', async () => {
    authenticate();
    favorite.mockResolvedValue(article(true));
    const onToggle = vi.fn();

    render(
      <MemoryRouter>
        <FavoriteButton article={article(false)} onToggle={onToggle}>
          Favorite
        </FavoriteButton>
      </MemoryRouter>,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-outline-primary');

    await userEvent.click(button);

    expect(favorite).toHaveBeenCalledWith('a-slug');
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('unfavorites a favorited article', async () => {
    authenticate();
    unfavorite.mockResolvedValue(undefined);
    const onToggle = vi.fn();

    render(
      <MemoryRouter>
        <FavoriteButton article={article(true)} onToggle={onToggle}>
          Unfavorite
        </FavoriteButton>
      </MemoryRouter>,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-primary');

    await userEvent.click(button);

    expect(unfavorite).toHaveBeenCalledWith('a-slug');
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('does not report a toggle when the request fails', async () => {
    authenticate();
    favorite.mockRejectedValue({ errors: { network: ['nope'] }, status: 0 });
    const onToggle = vi.fn();

    render(
      <MemoryRouter>
        <FavoriteButton article={article(false)} onToggle={onToggle}>
          Favorite
        </FavoriteButton>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button'));

    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).not.toHaveClass('disabled');
  });
});
