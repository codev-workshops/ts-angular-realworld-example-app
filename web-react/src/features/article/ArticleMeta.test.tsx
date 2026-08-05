import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ArticleMeta, formatLongDate } from './ArticleMeta';
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

function renderMeta(value: Article = article) {
  return render(
    <MemoryRouter>
      <ArticleMeta article={value}>
        <span data-testid="slot">slotted</span>
      </ArticleMeta>
    </MemoryRouter>,
  );
}

describe('ArticleMeta', () => {
  it('renders the author links, avatar and long date', () => {
    const { container } = renderMeta();

    const author = screen.getByRole('link', { name: 'jake' });
    expect(author).toHaveClass('author');
    expect(author).toHaveAttribute('href', '/profile/jake');
    expect(container.querySelector('.article-meta')).toBeInTheDocument();
    expect(container.querySelector('.info')).toBeInTheDocument();
    expect(container.querySelector('.date')).toHaveTextContent('February 18, 2016');
    expect(container.querySelector('img')).toHaveAttribute('src', '/assets/images/default-avatar.svg');
  });

  it('renders the author image when present', () => {
    const { container } = renderMeta({
      ...article,
      author: { ...article.author, image: 'https://example.com/jake.png' },
    });

    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/jake.png');
  });

  it('renders projected children (ng-content)', () => {
    renderMeta();
    expect(screen.getByTestId('slot')).toBeInTheDocument();
  });

  it('formats dates with the Angular longDate pattern and tolerates bad input', () => {
    expect(formatLongDate('2016-02-18T03:22:56.637Z')).toBe('February 18, 2016');
    expect(formatLongDate('not-a-date')).toBe('');
  });
});
