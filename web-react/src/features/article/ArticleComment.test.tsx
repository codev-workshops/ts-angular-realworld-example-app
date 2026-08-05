import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../core/auth/store';
import { ArticleComment } from './ArticleComment';
import { Comment } from './comment';

const comment: Comment = {
  id: '1',
  body: 'It takes a Jacobian',
  createdAt: '2016-02-18T03:22:56.637Z',
  author: { username: 'jake', bio: null, image: null, following: false },
};

function signInAs(username: string) {
  useAuthStore.setState({
    currentUser: { email: `${username}@jake.jake`, token: 'jwt', username, bio: null, image: null },
    authState: 'authenticated',
  });
}

function renderComment(onDelete = vi.fn()) {
  const view = render(
    <MemoryRouter>
      <ArticleComment comment={comment} onDelete={onDelete} />
    </MemoryRouter>,
  );
  return { ...view, onDelete };
}

describe('ArticleComment', () => {
  beforeEach(() => {
    useAuthStore.setState({ currentUser: null, authState: 'unauthenticated' });
  });

  it('renders the comment body, author and posted date', () => {
    const { container } = renderComment();

    expect(container.querySelector('.card-text')).toHaveTextContent('It takes a Jacobian');
    expect(container.querySelector('.date-posted')).toHaveTextContent('February 18, 2016');
    expect(container.querySelector('img.comment-author-img')).toHaveAttribute(
      'src',
      '/assets/images/default-avatar.svg',
    );

    const authorLinks = container.querySelectorAll('a.comment-author');
    expect(authorLinks).toHaveLength(2);
    authorLinks.forEach(link => expect(link).toHaveAttribute('href', '/profile/jake'));
  });

  it('hides the delete option for anonymous visitors', () => {
    const { container } = renderComment();
    expect(container.querySelector('.mod-options')).toBeNull();
  });

  it('hides the delete option for other users', () => {
    signInAs('someone-else');
    const { container } = renderComment();
    expect(container.querySelector('.mod-options')).toBeNull();
  });

  it('emits delete when the author clicks the trash icon', async () => {
    signInAs('jake');
    const { container, onDelete } = renderComment();

    const trash = container.querySelector('.mod-options .ion-trash-a');
    expect(trash).toBeInTheDocument();

    await userEvent.click(trash!);
    expect(onDelete).toHaveBeenCalledWith(true);
  });

  it('renders nothing without a comment', () => {
    const { container } = render(
      <MemoryRouter>
        <ArticleComment comment={undefined as unknown as Comment} onDelete={vi.fn()} />
      </MemoryRouter>,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
