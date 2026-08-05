import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http as mswHttp } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { API_URL, server } from '../../../test/msw-server';
import { useAuthStore } from '../../../core/auth/store';
import { Article } from '../model';
import { Comment } from '../comment';
import { ArticlePage } from './ArticlePage';

const article: Article = {
  slug: 'how-to-train-your-dragon',
  title: 'How to train your dragon',
  description: 'Ever wonder how?',
  body: '# The Dragon Book\n\nIt takes a Jacobian.\n\n<script>alert(1)</script>',
  tagList: ['dragons', 'training'],
  createdAt: '2016-02-18T03:22:56.637Z',
  updatedAt: '2016-02-18T03:48:35.824Z',
  favorited: false,
  favoritesCount: 3,
  author: { username: 'jake', bio: null, image: null, following: false },
};

const comment: Comment = {
  id: '1',
  body: 'Thanks for the article!',
  createdAt: '2016-02-18T03:22:56.637Z',
  author: { username: 'ada', bio: null, image: null, following: false },
};

function signInAs(username: string) {
  useAuthStore.setState({
    currentUser: { email: `${username}@jake.jake`, token: 'jwt', username, bio: null, image: null },
    authState: 'authenticated',
  });
}

function mockArticle(overrides: { article?: Partial<Article>; comments?: Comment[] } = {}) {
  const loaded = { ...article, ...overrides.article };
  const comments = overrides.comments ?? [];
  server.use(
    mswHttp.get(`${API_URL}/articles/${loaded.slug}`, () => HttpResponse.json({ article: loaded })),
    mswHttp.get(`${API_URL}/articles/${loaded.slug}/comments`, () => HttpResponse.json({ comments })),
  );
  return loaded;
}

function renderPage(slug = article.slug) {
  return render(
    <MemoryRouter initialEntries={[`/article/${slug}`]}>
      <Routes>
        <Route path="/article/:slug" element={<ArticlePage />} />
        <Route path="/" element={<div>home page</div>} />
        <Route path="/login" element={<div>login page</div>} />
        <Route path="/register" element={<div>register page</div>} />
        <Route path="/editor/:slug" element={<div>editor page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ArticlePage', () => {
  beforeEach(() => {
    useAuthStore.setState({ currentUser: null, authState: 'unauthenticated' });
  });

  it('renders the banner, sanitized markdown body and tag list', async () => {
    mockArticle();
    const { container } = renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: article.title })).toBeInTheDocument();

    const content = container.querySelector('.article-content');
    expect(content?.querySelector('h1')).toHaveTextContent('The Dragon Book');
    // The markdown helper strips the injected <script> before it reaches the DOM.
    expect(content?.querySelector('script')).toBeNull();

    const tags = Array.from(container.querySelectorAll('.tag-list .tag-default')).map(el => el.textContent);
    expect(tags).toEqual(['dragons', 'training']);
  });

  it('shows follow/favorite controls to non-authors', async () => {
    mockArticle();
    renderPage();

    expect(await screen.findAllByRole('button', { name: /Favorite Article/ })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /Follow jake/ })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Delete Article' })).toBeNull();
  });

  it('shows edit/delete controls only to the author', async () => {
    signInAs(article.author.username);
    mockArticle();
    const { container } = renderPage();

    const editLinks = await screen.findAllByRole('link', { name: /Edit Article/ });
    expect(editLinks[0]).toHaveAttribute('href', `/editor/${article.slug}`);
    expect(container.querySelectorAll('button.btn-outline-danger')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /Favorite Article/ })).toBeNull();
  });

  it('deletes the article and navigates home', async () => {
    signInAs(article.author.username);
    mockArticle();
    server.use(
      mswHttp.delete(`${API_URL}/articles/${article.slug}`, () => new HttpResponse(null, { status: 200 })),
    );

    renderPage();

    const deleteButtons = await screen.findAllByRole('button', { name: 'Delete Article' });
    await userEvent.click(deleteButtons[0]);

    expect(await screen.findByText('home page')).toBeInTheDocument();
  });

  it('shows the sign-in prompt to anonymous visitors instead of the comment form', async () => {
    mockArticle();
    renderPage();

    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'sign up' })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Write a comment...')).toBeNull();
  });

  it('posts a comment, prepends it and clears the form', async () => {
    signInAs('ada');
    mockArticle();
    server.use(
      mswHttp.post(`${API_URL}/articles/${article.slug}/comments`, () =>
        HttpResponse.json({ comment: { ...comment, body: 'A brand new comment' } }),
      ),
    );

    renderPage();

    const textarea = await screen.findByPlaceholderText('Write a comment...');
    await userEvent.type(textarea, 'A brand new comment');
    await userEvent.click(screen.getByRole('button', { name: 'Post Comment' }));

    expect(await screen.findByText('A brand new comment')).toBeInTheDocument();
    expect(textarea).toHaveValue('');
  });

  it.each([200, 204])('lets the comment author delete their comment (status %i)', async status => {
    signInAs(comment.author.username);
    mockArticle({ comments: [comment] });
    server.use(
      mswHttp.delete(
        `${API_URL}/articles/${article.slug}/comments/${comment.id}`,
        () => new HttpResponse(null, { status }),
      ),
    );

    const { container } = renderPage();

    expect(await screen.findByText(comment.body)).toBeInTheDocument();

    const trash = container.querySelector('.mod-options .ion-trash-a');
    expect(trash).toBeInTheDocument();
    await userEvent.click(trash!);

    await waitFor(() => expect(screen.queryByText(comment.body)).toBeNull());
  });
});
