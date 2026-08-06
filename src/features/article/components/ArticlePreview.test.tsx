import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ArticlePreview } from './ArticlePreview';
import { useAuthStore } from '@/core/auth/store';
import type { Article } from '../models/article';

const favorite = vi.fn();
const unfavorite = vi.fn();
vi.mock('../services/articles', () => ({
  favorite: (slug: string) => favorite(slug),
  unfavorite: (slug: string) => unfavorite(slug),
}));

const article = (overrides: Partial<Article> = {}): Article => ({
  slug: 'how-to-train',
  title: 'How to train',
  description: 'Ever wonder how?',
  body: 'body',
  tagList: ['dragons', 'training'],
  createdAt: '2024-01-02T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
  favorited: false,
  favoritesCount: 3,
  author: { username: 'jane', bio: null, image: null, following: false },
  ...overrides,
});

const renderPreview = (a: Article) =>
  render(
    <MemoryRouter>
      <ArticlePreview article={a} />
    </MemoryRouter>,
  );

describe('ArticlePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      currentUser: { email: 'a@b.c', token: 'jwt', username: 'jane', bio: null, image: null },
      authState: 'authenticated',
    });
  });

  it('renders the Angular DOM structure', () => {
    const { container } = renderPreview(article());

    expect(container.querySelector('.article-preview')).toBeInTheDocument();
    expect(container.querySelector('a.preview-link')?.getAttribute('href')).toBe('/article/how-to-train');
    expect(screen.getByRole('heading', { name: 'How to train' })).toBeInTheDocument();
    expect(screen.getByText('Ever wonder how?')).toBeInTheDocument();
    expect(screen.getByText('Read more...')).toBeInTheDocument();

    const tags = container.querySelectorAll('.tag-list .tag-default.tag-pill.tag-outline');
    expect([...tags].map(tag => tag.textContent)).toEqual(['dragons', 'training']);
  });

  it('puts the favorite button, with the count, in the article meta', () => {
    const { container } = renderPreview(article());

    const button = container.querySelector('.article-meta button.btn.btn-sm');
    expect(button).toHaveClass('btn-outline-primary', 'pull-xs-right');
    expect(button?.textContent).toContain('3');
  });

  it('increments the count optimistically when favorited', async () => {
    favorite.mockResolvedValue(article({ favorited: true, favoritesCount: 4 }));

    const { container } = renderPreview(article());
    await userEvent.click(screen.getByRole('button'));

    expect(favorite).toHaveBeenCalledWith('how-to-train');
    const button = container.querySelector('button');
    expect(button?.textContent).toContain('4');
    expect(button).toHaveClass('btn-primary');
  });

  it('decrements the count when unfavorited', async () => {
    unfavorite.mockResolvedValue(undefined);

    const { container } = renderPreview(article({ favorited: true }));
    await userEvent.click(screen.getByRole('button'));

    expect(unfavorite).toHaveBeenCalledWith('how-to-train');
    const button = container.querySelector('button');
    expect(button?.textContent).toContain('2');
    expect(button).toHaveClass('btn-outline-primary');
  });

  it('re-syncs when the parent hands down a different article', () => {
    const { rerender, container } = renderPreview(article());

    rerender(
      <MemoryRouter>
        <ArticlePreview article={article({ slug: 'other', title: 'Other', favoritesCount: 9 })} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Other' })).toBeInTheDocument();
    expect(container.querySelector('button')?.textContent).toContain('9');
  });
});
