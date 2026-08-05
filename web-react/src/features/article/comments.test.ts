import { HttpResponse, http as mswHttp } from 'msw';
import { describe, expect, it } from 'vitest';
import { API_URL, server } from '../../test/msw-server';
import { Comment, addComment, deleteComment, getComments } from './comment';

const mockComment: Comment = {
  id: '1',
  body: 'Test comment',
  createdAt: '2024-01-01',
  author: {
    username: 'testuser',
    bio: 'Test bio',
    image: 'https://example.com/avatar.jpg',
    following: false,
  },
};

const mockComments: Comment[] = [mockComment, { ...mockComment, id: '2', body: 'Second comment' }];

describe('comments api', () => {
  describe('getComments', () => {
    it('fetches all comments for an article', async () => {
      let method = '';
      let pathname = '';
      server.use(
        mswHttp.get(`${API_URL}/articles/test-article/comments`, ({ request }) => {
          method = request.method;
          pathname = new URL(request.url).pathname;
          return HttpResponse.json({ comments: mockComments });
        }),
      );

      const comments = await getComments('test-article');

      expect(method).toBe('GET');
      expect(pathname).toBe('/api/articles/test-article/comments');
      expect(comments).toEqual(mockComments);
      expect(comments.length).toBe(2);
    });

    it('extracts the comments array from the response wrapper', async () => {
      server.use(
        mswHttp.get(`${API_URL}/articles/test-article/comments`, () => HttpResponse.json({ comments: mockComments })),
      );

      const comments = await getComments('test-article');
      expect(Array.isArray(comments)).toBe(true);
      expect((comments as unknown as { comments?: unknown }).comments).toBeUndefined();
    });

    it('handles an empty comments list', async () => {
      server.use(
        mswHttp.get(`${API_URL}/articles/article-no-comments/comments`, () => HttpResponse.json({ comments: [] })),
      );

      await expect(getComments('article-no-comments')).resolves.toEqual([]);
    });

    it('handles article not found', async () => {
      server.use(
        mswHttp.get(`${API_URL}/articles/nonexistent/comments`, () =>
          HttpResponse.json({ errors: { article: ['not found'] } }, { status: 404 }),
        ),
      );

      await expect(getComments('nonexistent')).rejects.toMatchObject({ status: 404 });
    });

    it('handles comments with a null author bio', async () => {
      const commentsWithNullBio = mockComments.map(c => ({ ...c, author: { ...c.author, bio: null } }));
      server.use(
        mswHttp.get(`${API_URL}/articles/test-article/comments`, () =>
          HttpResponse.json({ comments: commentsWithNullBio }),
        ),
      );

      const comments = await getComments('test-article');
      expect(comments[0].author.bio).toBeNull();
    });

    it('handles a very long comment body', async () => {
      const longBody = 'a'.repeat(1000);
      server.use(
        mswHttp.get(`${API_URL}/articles/test-article/comments`, () =>
          HttpResponse.json({ comments: [{ ...mockComment, body: longBody }] }),
        ),
      );

      const comments = await getComments('test-article');
      expect(comments[0].body).toBe(longBody);
    });

    it('handles a server error', async () => {
      server.use(
        mswHttp.get(`${API_URL}/articles/test-article/comments`, () =>
          HttpResponse.json({ errors: { body: ['server error'] } }, { status: 500 }),
        ),
      );

      await expect(getComments('test-article')).rejects.toMatchObject({ status: 500 });
    });

    it('handles multiple comments from different authors', async () => {
      const multiAuthorComments: Comment[] = [
        mockComment,
        { ...mockComment, id: '2', author: { ...mockComment.author, username: 'anotheruser' } },
        { ...mockComment, id: '3', author: { ...mockComment.author, username: 'thirduser' } },
      ];
      server.use(
        mswHttp.get(`${API_URL}/articles/popular-article/comments`, () =>
          HttpResponse.json({ comments: multiAuthorComments }),
        ),
      );

      const comments = await getComments('popular-article');
      expect(comments.map(c => c.author.username)).toEqual(['testuser', 'anotheruser', 'thirduser']);
    });
  });

  describe('addComment', () => {
    it('posts a comment wrapped in `{ comment: { body } }`', async () => {
      const commentBody = 'This is a new comment';
      let method = '';
      let body: unknown;
      server.use(
        mswHttp.post(`${API_URL}/articles/test-article/comments`, async ({ request }) => {
          method = request.method;
          body = await request.json();
          return HttpResponse.json({ comment: { ...mockComment, body: commentBody } });
        }),
      );

      const comment = await addComment('test-article', commentBody);

      expect(method).toBe('POST');
      expect(body).toEqual({ comment: { body: commentBody } });
      expect(comment.body).toBe(commentBody);
      expect(comment.id).toBeDefined();
    });

    it('extracts the comment from the response wrapper', async () => {
      server.use(
        mswHttp.post(`${API_URL}/articles/test-article/comments`, () => HttpResponse.json({ comment: mockComment })),
      );

      const comment = await addComment('test-article', 'Test comment');
      expect((comment as unknown as { comment?: unknown }).comment).toBeUndefined();
    });

    it.each([
      ['an empty body', '', 422],
      ['a whitespace-only body', '   ', 422],
      ['an unauthorized request', 'Unauthorized comment', 401],
    ])('rejects on %s', async (_label, commentBody, status) => {
      server.use(
        mswHttp.post(`${API_URL}/articles/test-article/comments`, () =>
          HttpResponse.json({ errors: { body: ['invalid'] } }, { status }),
        ),
      );

      await expect(addComment('test-article', commentBody)).rejects.toMatchObject({ status });
    });

    it('handles article not found', async () => {
      server.use(
        mswHttp.post(`${API_URL}/articles/nonexistent/comments`, () =>
          HttpResponse.json({ errors: { article: ['not found'] } }, { status: 404 }),
        ),
      );

      await expect(addComment('nonexistent', 'Comment on nonexistent article')).rejects.toMatchObject({ status: 404 });
    });

    it.each([
      ['a very long comment', 'a'.repeat(5000)],
      ['special characters', 'Comment with émojis 🚀 and special chars!@#$%'],
      ['newlines', 'Line 1\nLine 2\nLine 3'],
      ['HTML tags', '<script>alert("xss")</script>'],
      ['markdown', '**Bold** and *italic* text'],
    ])('round-trips %s', async (_label, commentBody) => {
      server.use(
        mswHttp.post(`${API_URL}/articles/test-article/comments`, () =>
          HttpResponse.json({ comment: { ...mockComment, body: commentBody } }),
        ),
      );

      const comment = await addComment('test-article', commentBody);
      expect(comment.body).toBe(commentBody);
    });
  });

  describe('deleteComment', () => {
    it.each([
      ['a numeric id', '123'],
      ['a UUID id', '550e8400-e29b-41d4-a716-446655440000'],
    ])('deletes a comment with %s', async (_label, commentId) => {
      let method = '';
      let pathname = '';
      server.use(
        mswHttp.delete(`${API_URL}/articles/test-article/comments/${commentId}`, ({ request }) => {
          method = request.method;
          pathname = new URL(request.url).pathname;
          return new HttpResponse(null, { status: 200 });
        }),
      );

      await expect(deleteComment(commentId, 'test-article')).resolves.toBeUndefined();
      expect(method).toBe('DELETE');
      expect(pathname).toBe(`/api/articles/test-article/comments/${commentId}`);
    });

    it('accepts a 204 response', async () => {
      server.use(
        mswHttp.delete(`${API_URL}/articles/test-article/comments/123`, () => new HttpResponse(null, { status: 204 })),
      );

      await expect(deleteComment('123', 'test-article')).resolves.toBeUndefined();
    });

    it.each([404, 403, 401])('rejects with status %i', async status => {
      server.use(
        mswHttp.delete(`${API_URL}/articles/test-article/comments/123`, () =>
          HttpResponse.json({ errors: { comment: ['failed'] } }, { status }),
        ),
      );

      await expect(deleteComment('123', 'test-article')).rejects.toMatchObject({ status });
    });
  });

  describe('integration scenarios', () => {
    it('adds then deletes a comment', async () => {
      server.use(
        mswHttp.post(`${API_URL}/articles/test-article/comments`, () => HttpResponse.json({ comment: mockComment })),
        mswHttp.delete(
          `${API_URL}/articles/test-article/comments/${mockComment.id}`,
          () => new HttpResponse(null, { status: 200 }),
        ),
      );

      const comment = await addComment('test-article', 'Test comment');
      await expect(deleteComment(comment.id, 'test-article')).resolves.toBeUndefined();
    });

    it('reflects an added comment in a subsequent fetch', async () => {
      let stored = [...mockComments];
      server.use(
        mswHttp.get(`${API_URL}/articles/test-article/comments`, () => HttpResponse.json({ comments: stored })),
        mswHttp.post(`${API_URL}/articles/test-article/comments`, () => {
          stored = [...stored, mockComment];
          return HttpResponse.json({ comment: mockComment });
        }),
      );

      expect((await getComments('test-article')).length).toBe(2);
      await addComment('test-article', 'New comment');
      expect((await getComments('test-article')).length).toBe(3);
    });
  });
});
