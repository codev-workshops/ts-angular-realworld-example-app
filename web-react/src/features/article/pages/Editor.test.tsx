import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http as mswHttp } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { API_URL, server } from '../../../test/msw-server';
import { Article } from '../model';
import { Editor } from './Editor';

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

const user = { email: 'jake@jake.jake', token: 'jwt', username: 'jake', bio: null, image: null };

function renderEditor(path = '/editor') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/editor" element={<Editor />} />
        <Route path="/editor/:slug" element={<Editor />} />
        <Route path="/article/:slug" element={<div>article page</div>} />
        <Route path="/" element={<div>home page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Editor', () => {
  it('creates an article and navigates to it', async () => {
    let body: unknown;
    server.use(
      mswHttp.post(`${API_URL}/articles/`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ article });
      }),
    );

    renderEditor();
    await userEvent.type(screen.getByPlaceholderText('Article Title'), 'How to train your dragon');
    await userEvent.type(screen.getByPlaceholderText("What's this article about?"), 'Ever wonder how?');
    await userEvent.type(screen.getByPlaceholderText('Write your article (in markdown)'), 'It takes a Jacobian');
    await userEvent.type(screen.getByPlaceholderText('Enter tags'), 'dragons{Enter}');

    expect(screen.getByText('dragons')).toHaveClass('tag-default', 'tag-pill');

    await userEvent.click(screen.getByRole('button', { name: 'Publish Article' }));

    expect(await screen.findByText('article page')).toBeInTheDocument();
    expect(body).toEqual({
      article: {
        title: 'How to train your dragon',
        description: 'Ever wonder how?',
        body: 'It takes a Jacobian',
        tagList: ['dragons'],
      },
    });
  });

  it('adds the pending tag field value on submit and ignores duplicates', async () => {
    let body: { article: { tagList: string[] } } | undefined;
    server.use(
      mswHttp.post(`${API_URL}/articles/`, async ({ request }) => {
        body = (await request.json()) as { article: { tagList: string[] } };
        return HttpResponse.json({ article });
      }),
    );

    renderEditor();
    await userEvent.type(screen.getByPlaceholderText('Enter tags'), 'dragons{Enter}');
    await userEvent.type(screen.getByPlaceholderText('Enter tags'), 'dragons{Enter}');
    await userEvent.type(screen.getByPlaceholderText('Enter tags'), 'training');
    await userEvent.click(screen.getByRole('button', { name: 'Publish Article' }));

    await screen.findByText('article page');
    expect(body?.article.tagList).toEqual(['dragons', 'training']);
  });

  it('removes a tag when its close icon is clicked', async () => {
    renderEditor();
    await userEvent.type(screen.getByPlaceholderText('Enter tags'), 'dragons{Enter}');

    const icon = document.querySelector('.tag-list .ion-close-round');
    expect(icon).not.toBeNull();
    await userEvent.click(icon as Element);

    expect(screen.queryByText('dragons')).not.toBeInTheDocument();
  });

  it('renders API errors through ListErrors', async () => {
    server.use(
      mswHttp.post(`${API_URL}/articles/`, () =>
        HttpResponse.json({ errors: { title: ["can't be blank"] } }, { status: 422 }),
      ),
    );

    renderEditor();
    await userEvent.click(screen.getByRole('button', { name: 'Publish Article' }));

    expect(await screen.findByText("title can't be blank")).toBeInTheDocument();
  });

  it('loads the article in edit mode and updates it', async () => {
    let body: unknown;
    server.use(
      mswHttp.get(`${API_URL}/articles/${article.slug}`, () => HttpResponse.json({ article })),
      mswHttp.get(`${API_URL}/user`, () => HttpResponse.json({ user })),
      mswHttp.put(`${API_URL}/articles/${article.slug}`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ article: { ...article, title: 'Updated' } });
      }),
    );

    renderEditor(`/editor/${article.slug}`);

    const title = await screen.findByDisplayValue(article.title);
    expect(screen.getByDisplayValue(article.description)).toBeInTheDocument();
    expect(screen.getByDisplayValue(article.body)).toBeInTheDocument();
    expect(screen.getByText('dragons')).toBeInTheDocument();

    await userEvent.clear(title);
    await userEvent.type(title, 'Updated');
    await userEvent.click(screen.getByRole('button', { name: 'Publish Article' }));

    expect(await screen.findByText('article page')).toBeInTheDocument();
    expect(body).toEqual({
      article: {
        title: 'Updated',
        description: article.description,
        body: article.body,
        tagList: ['dragons'],
        slug: article.slug,
      },
    });
  });

  it('redirects to home when the current user is not the author', async () => {
    server.use(
      mswHttp.get(`${API_URL}/articles/${article.slug}`, () => HttpResponse.json({ article })),
      mswHttp.get(`${API_URL}/user`, () => HttpResponse.json({ user: { ...user, username: 'someone-else' } })),
    );

    renderEditor(`/editor/${article.slug}`);

    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
  });
});
