import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http as mswHttp } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { API_URL, server } from '../../test/msw-server';
import { useAuthStore } from '../../core/auth/store';
import { ArticlePreview } from './ArticlePreview';
import { Article } from './model';

const article: Article = {
  slug: 'how-to-train-your-dragon',
  title: 'How to train your dragon',
  description: 'Ever wonder how?',
  body: 'It takes a Jacobian',
  tagList: ['dragons', 'training'],
  createdAt: '2016-02-18T03:22:56.637Z',
  updatedAt: '2016-02-18T03:48:35.824Z',
  favorited: false,
  favoritesCount: 1,
  author: { username: 'jake', bio: null, image: null, following: false },
};

function signIn() {
  useAuthStore.setState({
    currentUser: { email: 'jake@jake.jake', token: 'jwt', username: 'jake', bio: null, image: null },
    authState: 'authenticated',
  });
}

function renderPreview(value: Article = article) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<ArticlePreview article={value} />} />
        <Route path="/register" element={<div>register page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ArticlePreview', () => {
  beforeEach(() => {
    useAuthStore.setState({ currentUser: null, authState: 'unauthenticated' });
  });

  it('renders the preview markup, tags and read-more link', () => {
    const { container } = renderPreview();

    expect(container.querySelector('.article-preview')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'How to train your dragon' })).toBeInTheDocument();
    expect(screen.getByText('Ever wonder how?')).toBeInTheDocument();
    expect(screen.getByText('Read more...')).toBeInTheDocument();

    const previewLink = container.querySelector('a.preview-link');
    expect(previewLink).toHaveAttribute('href', '/article/how-to-train-your-dragon');

    const tags = container.querySelectorAll('.tag-list .tag-default.tag-pill.tag-outline');
    expect([...tags].map(tag => tag.textContent)).toEqual(['dragons', 'training']);
  });

  it('renders the favorite button with the count in the meta section', () => {
    const { container } = renderPreview();

    const button = container.querySelector('.article-meta button');
    expect(button).toHaveClass('pull-xs-right');
    expect(button).toHaveClass('btn-outline-primary');
    expect(button).toHaveTextContent('1');
  });

  it('owns the optimistic favorites count when the button toggles', async () => {
    signIn();
    server.use(
      mswHttp.post(`${API_URL}/articles/${article.slug}/favorite`, () =>
        HttpResponse.json({ article: { ...article, favorited: true, favoritesCount: 2 } }),
      ),
      mswHttp.delete(`${API_URL}/articles/${article.slug}/favorite`, () => new HttpResponse(null, { status: 200 })),
    );

    renderPreview();
    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toHaveTextContent('2');
    expect(screen.getByRole('button')).toHaveClass('btn-primary');

    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toHaveTextContent('1');
    expect(screen.getByRole('button')).toHaveClass('btn-outline-primary');
  });

  it('sends anonymous visitors to /register instead of calling the API', async () => {
    renderPreview();
    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByText('register page')).toBeInTheDocument();
  });
});
