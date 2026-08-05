import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http as mswHttp } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { API_URL, server } from '../../test/msw-server';
import { FavoriteButton } from './FavoriteButton';
import { Article } from './model';

const article: Article = {
  slug: 'how-to-train-your-dragon',
  title: 'How to train your dragon',
  description: 'Ever wonder how?',
  body: 'It takes a Jacobian',
  tagList: ['dragons'],
  createdAt: '2016-02-18T03:22:56.637Z',
  updatedAt: '2016-02-18T03:48:35.824Z',
  favorited: false,
  favoritesCount: 1,
  author: { username: 'jake', bio: null, image: null, following: false },
};

/** Mirrors `ArticlePreviewComponent.toggleFavorite`: the parent owns the count. */
function Harness({ isAuthenticated = true }: { isAuthenticated?: boolean }) {
  const [current, setCurrent] = useState(article);
  return (
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={
            <FavoriteButton
              article={current}
              isAuthenticated={isAuthenticated}
              onToggle={favorited =>
                setCurrent(a => ({
                  ...a,
                  favorited,
                  favoritesCount: favorited ? a.favoritesCount + 1 : a.favoritesCount - 1,
                }))
              }
            >
              {current.favoritesCount}
            </FavoriteButton>
          }
        />
        <Route path="/register" element={<div>register page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('FavoriteButton', () => {
  it('renders the outline variant and the favorites count', () => {
    render(<Harness />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-outline-primary');
    expect(button).toHaveTextContent('1');
  });

  it('favorites the article and bumps the count', async () => {
    server.use(
      mswHttp.post(`${API_URL}/articles/${article.slug}/favorite`, () =>
        HttpResponse.json({ article: { ...article, favorited: true, favoritesCount: 2 } }),
      ),
    );

    render(<Harness />);
    await userEvent.click(screen.getByRole('button'));

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('2');
    expect(button).toHaveClass('btn-primary');
  });

  it('unfavorites the article and decrements the count', async () => {
    server.use(
      mswHttp.post(`${API_URL}/articles/${article.slug}/favorite`, () =>
        HttpResponse.json({ article: { ...article, favorited: true, favoritesCount: 2 } }),
      ),
      mswHttp.delete(`${API_URL}/articles/${article.slug}/favorite`, () => new HttpResponse(null, { status: 200 })),
    );

    render(<Harness />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByRole('button'));

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('1');
    expect(button).toHaveClass('btn-outline-primary');
  });

  it('redirects anonymous users to /register without calling the API', async () => {
    render(<Harness isAuthenticated={false} />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByText('register page')).toBeInTheDocument();
  });

  it('leaves the count untouched when the request fails', async () => {
    server.use(
      mswHttp.post(`${API_URL}/articles/${article.slug}/favorite`, () =>
        HttpResponse.json({ errors: { body: ['boom'] } }, { status: 422 }),
      ),
    );

    render(<Harness />);
    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toHaveTextContent('1');
  });
});
