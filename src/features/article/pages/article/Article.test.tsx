import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Article from './Article';
import { useAuthStore } from '@/core/auth/store';
import type { Article as ArticleModel } from '../../models/article';
import type { Comment } from '../../models/comment';

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const getArticle = vi.fn();
const removeArticle = vi.fn();
const favorite = vi.fn();
const unfavorite = vi.fn();
vi.mock('@/features/article/services/articles', () => ({
  get: (slug: string) => getArticle(slug),
  remove: (slug: string) => removeArticle(slug),
  favorite: (slug: string) => favorite(slug),
  unfavorite: (slug: string) => unfavorite(slug),
}));

const getComments = vi.fn();
const addComment = vi.fn();
const removeComment = vi.fn();
vi.mock('../../services/comments', () => ({
  getAll: (slug: string) => getComments(slug),
  add: (slug: string, body: string) => addComment(slug, body),
  remove: (id: string, slug: string) => removeComment(id, slug),
}));

const follow = vi.fn();
const unfollow = vi.fn();
vi.mock('@/features/profile/services/profile', () => ({
  follow: (username: string) => follow(username),
  unfollow: (username: string) => unfollow(username),
}));

const article: ArticleModel = {
  slug: 'a-slug',
  title: 'The title',
  description: 'description',
  body: '# Heading\n\nSome **body**',
  tagList: ['dragons'],
  createdAt: '2024-01-02T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
  favorited: false,
  favoritesCount: 2,
  author: { username: 'jane', bio: null, image: null, following: false },
};

const comment: Comment = {
  id: '7',
  body: 'First!',
  createdAt: '2024-01-03T00:00:00.000Z',
  author: { username: 'bob', bio: null, image: null, following: false },
};

const login = (username: string) =>
  useAuthStore.setState({
    currentUser: { email: 'a@b.c', token: 'jwt', username, bio: null, image: null },
    authState: 'authenticated',
  });

const renderArticle = () =>
  render(
    <MemoryRouter initialEntries={['/article/a-slug']}>
      <Routes>
        <Route path="/article/:slug" element={<Article />} />
      </Routes>
    </MemoryRouter>,
  );

describe('Article page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ currentUser: null, authState: 'unauthenticated' });
    getArticle.mockResolvedValue(article);
    getComments.mockResolvedValue([comment]);
  });

  it('renders the banner, sanitized markdown body and tags', async () => {
    renderArticle();

    await waitFor(() => expect(document.querySelector('.banner h1')).toHaveTextContent('The title'));
    expect(document.querySelector('.article-content strong')).toHaveTextContent('body');
    expect(document.querySelector('.article-content .tag-list li')).toHaveTextContent('dragons');
    expect(document.querySelectorAll('.article-meta')).toHaveLength(2);
  });

  it('renders the API errors instead of the article when loading fails', async () => {
    getArticle.mockRejectedValue({ errors: { article: ['not found'] }, status: 404 });
    renderArticle();

    await waitFor(() => expect(screen.getByText('article not found')).toBeInTheDocument());
    expect(document.querySelector('.banner')).toBeNull();
  });

  it('falls back to a generic message when the failure has no error body', async () => {
    getComments.mockRejectedValue({ status: 500 });
    renderArticle();

    await waitFor(() => expect(screen.getByText('error Failed to load article')).toBeInTheDocument());
  });

  it('shows edit and delete for the author and deletes the article', async () => {
    login('jane');
    removeArticle.mockResolvedValue(undefined);
    renderArticle();

    await waitFor(() => expect(screen.getAllByText('Edit Article')).toHaveLength(2));
    expect(screen.getAllByRole('link', { name: /Edit Article/ })[0]).toHaveAttribute('href', '/editor/a-slug');
    expect(screen.queryByText(/Follow jane/)).not.toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: /Delete Article/ })[0]);

    expect(removeArticle).toHaveBeenCalledWith('a-slug');
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));
  });

  it('shows follow and favorite controls for other users', async () => {
    login('bob');
    favorite.mockResolvedValue({ ...article, favorited: true, favoritesCount: 3 });
    renderArticle();

    await waitFor(() => expect(screen.getAllByRole('button', { name: /Favorite Article/ })).toHaveLength(2));
    expect(screen.getAllByRole('button', { name: /Follow jane/ })).toHaveLength(2);

    await userEvent.click(screen.getAllByRole('button', { name: /Favorite Article/ })[0]);

    await waitFor(() => expect(screen.getAllByRole('button', { name: /Unfavorite Article/ })).toHaveLength(2));
    expect(screen.getAllByText('(3)')).toHaveLength(2);
  });

  it('applies the followed state reported by the follow button', async () => {
    login('bob');
    follow.mockResolvedValue({ ...article.author, following: true });
    renderArticle();

    await waitFor(() => expect(screen.getAllByRole('button', { name: /Follow jane/ })).toHaveLength(2));

    await userEvent.click(screen.getAllByRole('button', { name: /Follow jane/ })[0]);

    await waitFor(() => expect(screen.getAllByRole('button', { name: /Unfollow jane/ })).toHaveLength(2));
    expect(follow).toHaveBeenCalledWith('jane');
  });

  it('invites anonymous readers to sign in instead of showing the comment form', async () => {
    renderArticle();

    await waitFor(() => expect(screen.getByText('Sign in')).toBeInTheDocument());
    expect(screen.queryByPlaceholderText('Write a comment...')).not.toBeInTheDocument();
    expect(screen.getByText('First!')).toBeInTheDocument();
  });

  it('posts a comment, prepends it and clears the textarea', async () => {
    login('bob');
    const created: Comment = { ...comment, id: '8', body: 'Second!' };
    addComment.mockResolvedValue(created);
    renderArticle();

    const textarea = await screen.findByPlaceholderText('Write a comment...');
    await userEvent.type(textarea, 'Second!');
    await userEvent.click(screen.getByRole('button', { name: 'Post Comment' }));

    await waitFor(() => expect(screen.getByText('Second!')).toBeInTheDocument());
    expect(addComment).toHaveBeenCalledWith('a-slug', 'Second!');
    expect(textarea).toHaveValue('');
    const bodies = Array.from(document.querySelectorAll('.card:not(.comment-form) .card-text')).map(
      node => node.textContent,
    );
    expect(bodies).toEqual(['Second!', 'First!']);
  });

  it('shows the errors of a rejected comment', async () => {
    login('bob');
    addComment.mockRejectedValue({ errors: { body: ["can't be blank"] }, status: 422 });
    renderArticle();

    const textarea = await screen.findByPlaceholderText('Write a comment...');
    await userEvent.type(textarea, 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Post Comment' }));

    await waitFor(() => expect(screen.getByText("body can't be blank")).toBeInTheDocument());
    expect(textarea).toHaveValue('x');
  });

  it('deletes an own comment and keeps the others', async () => {
    login('bob');
    getComments.mockResolvedValue([comment, { ...comment, id: '9', body: 'Second!' }]);
    removeComment.mockResolvedValue(undefined);
    renderArticle();

    await waitFor(() => expect(screen.getByText('First!')).toBeInTheDocument());
    await userEvent.click(document.querySelectorAll('.mod-options i.ion-trash-a')[0]);

    await waitFor(() => expect(screen.queryByText('First!')).not.toBeInTheDocument());
    expect(removeComment).toHaveBeenCalledWith('7', 'a-slug');
    expect(screen.getByText('Second!')).toBeInTheDocument();
  });

  it('reports a failed comment deletion', async () => {
    login('bob');
    removeComment.mockRejectedValue({ errors: { comment: ['cannot be deleted'] }, status: 403 });
    renderArticle();

    await waitFor(() => expect(screen.getByText('First!')).toBeInTheDocument());
    await userEvent.click(document.querySelectorAll('.mod-options i.ion-trash-a')[0]);

    await waitFor(() => expect(screen.getByText('comment cannot be deleted')).toBeInTheDocument());
    expect(screen.getByText('First!')).toBeInTheDocument();
  });
});
