import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ArticleComment } from './ArticleComment';
import { useAuthStore } from '@/core/auth/store';
import type { Comment } from '../models/comment';

const comment: Comment = {
  id: '1',
  body: 'Nice article',
  createdAt: '2024-01-02T00:00:00.000Z',
  author: { username: 'jane', bio: null, image: null, following: false },
};

const login = (username: string) =>
  useAuthStore.setState({
    currentUser: { email: 'a@b.c', token: 'jwt', username, bio: null, image: null },
    authState: 'authenticated',
  });

const renderComment = (onDelete = vi.fn()) => {
  render(
    <MemoryRouter>
      <ArticleComment comment={comment} onDelete={onDelete} />
    </MemoryRouter>,
  );
  return onDelete;
};

describe('ArticleComment', () => {
  beforeEach(() => {
    useAuthStore.setState({ currentUser: null, authState: 'unauthenticated' });
  });

  it('renders the body, author and long date', () => {
    renderComment();

    expect(screen.getByText('Nice article')).toBeInTheDocument();
    expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '/profile/jane');
    expect(screen.getByText('January 2, 2024')).toBeInTheDocument();
  });

  it('falls back to the default avatar when the author has no image', () => {
    renderComment();

    expect(document.querySelector('img.comment-author-img')).toHaveAttribute(
      'src',
      '/assets/images/default-avatar.svg',
    );
  });

  it('hides the delete control for other users comments', () => {
    login('bob');
    renderComment();

    expect(document.querySelector('.mod-options')).toBeNull();
  });

  it('emits delete when the author clicks the trash icon', async () => {
    login('jane');
    const onDelete = renderComment();

    const trash = document.querySelector('.mod-options i.ion-trash-a');
    expect(trash).not.toBeNull();
    await userEvent.click(trash as Element);

    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
