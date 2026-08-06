import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ArticleMeta } from './ArticleMeta';
import { formatLongDate } from '@/shared/utils/format-date';
import type { Article } from '../models/article';

const article = (overrides: Partial<Article> = {}): Article => ({
  slug: 'a-slug',
  title: 'title',
  description: 'description',
  body: 'body',
  tagList: [],
  createdAt: '2024-01-02T12:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
  favorited: false,
  favoritesCount: 0,
  author: { username: 'jane', bio: null, image: null, following: false },
  ...overrides,
});

describe('formatLongDate', () => {
  it('matches the Angular longDate format', () => {
    expect(formatLongDate('2024-01-02T12:00:00.000Z')).toBe('January 2, 2024');
  });

  it('renders nothing for an unparseable date', () => {
    expect(formatLongDate('not-a-date')).toBe('');
  });
});

describe('ArticleMeta', () => {
  const renderMeta = (a: Article) =>
    render(
      <MemoryRouter>
        <ArticleMeta article={a}>
          <span className="counter">slot</span>
        </ArticleMeta>
      </MemoryRouter>,
    );

  it('links the avatar and the author name to the profile', () => {
    const { container } = renderMeta(article());

    const links = container.querySelectorAll('.article-meta a');
    expect(links[0].getAttribute('href')).toBe('/profile/jane');
    expect(container.querySelector('a.author')?.getAttribute('href')).toBe('/profile/jane');
    expect(screen.getByText('jane')).toBeInTheDocument();
  });

  it('falls back to the default avatar when the author has no image', () => {
    const { container } = renderMeta(article());
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/assets/images/default-avatar.svg');
  });

  it('uses the author image when present', () => {
    const { container } = renderMeta(
      article({ author: { username: 'jane', bio: null, image: 'x.png', following: false } }),
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe('x.png');
  });

  it('renders the formatted creation date', () => {
    const { container } = renderMeta(article());
    expect(container.querySelector('.info .date')?.textContent).toBe('January 2, 2024');
  });

  it('renders the projected content', () => {
    const { container } = renderMeta(article());
    expect(container.querySelector('.article-meta .counter')).toBeInTheDocument();
  });
});
