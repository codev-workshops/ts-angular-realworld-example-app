import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Editor from './Editor';
import { useAuthStore } from '@/core/auth/store';
import type { Article } from '../../models/article';

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const getArticle = vi.fn();
const create = vi.fn();
const update = vi.fn();
vi.mock('@/features/article/services/articles', () => ({
  get: (slug: string) => getArticle(slug),
  create: (article: Partial<Article>) => create(article),
  update: (article: Partial<Article>) => update(article),
}));

const article: Article = {
  slug: 'a-slug',
  title: 'The title',
  description: 'description',
  body: 'body',
  tagList: ['dragons'],
  createdAt: '2024-01-02T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
  favorited: false,
  favoritesCount: 0,
  author: { username: 'jane', bio: null, image: null, following: false },
};

const login = (username: string) =>
  useAuthStore.setState({
    currentUser: { email: 'a@b.c', token: 'jwt', username, bio: null, image: null },
    authState: 'authenticated',
  });

const renderEditor = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/editor" element={<Editor />} />
        <Route path="/editor/:slug" element={<Editor />} />
      </Routes>
    </MemoryRouter>,
  );

const fields = () => ({
  title: document.querySelector('input[formControlName="title"]') as HTMLInputElement,
  description: document.querySelector('input[formControlName="description"]') as HTMLInputElement,
  body: document.querySelector('textarea[formControlName="body"]') as HTMLTextAreaElement,
});

describe('Editor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    login('jane');
  });

  it('keeps the formControlName attributes the e2e suite selects on', () => {
    renderEditor('/editor');

    const { title, description, body } = fields();
    expect(title).toBeInTheDocument();
    expect(description).toBeInTheDocument();
    expect(body).toBeInTheDocument();
  });

  it('creates an article from the form values and navigates to it', async () => {
    create.mockResolvedValue({ ...article, slug: 'new-slug' });
    renderEditor('/editor');

    const { title, description, body } = fields();
    await userEvent.type(title, 'A title');
    await userEvent.type(description, 'A description');
    await userEvent.type(body, 'A body');
    await userEvent.click(screen.getByRole('button', { name: 'Publish Article' }));

    expect(create).toHaveBeenCalledWith({
      title: 'A title',
      description: 'A description',
      body: 'A body',
      tagList: [],
    });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/article/new-slug'));
    expect(getArticle).not.toHaveBeenCalled();
  });

  it('adds tags on Enter, ignores duplicates and blanks, and removes them again', async () => {
    create.mockResolvedValue(article);
    renderEditor('/editor');

    const tagInput = screen.getByPlaceholderText('Enter tags');
    await userEvent.type(tagInput, 'dragons{Enter}');
    await userEvent.type(tagInput, 'dragons{Enter}');
    await userEvent.type(tagInput, '   {Enter}');
    await userEvent.type(tagInput, 'training{Enter}');

    expect(Array.from(document.querySelectorAll('.tag-list .tag-pill')).map(node => node.textContent?.trim())).toEqual([
      'dragons',
      'training',
    ]);
    expect(tagInput).toHaveValue('');

    await userEvent.click(document.querySelectorAll('.tag-list .ion-close-round')[0]);
    expect(Array.from(document.querySelectorAll('.tag-list .tag-pill')).map(node => node.textContent?.trim())).toEqual([
      'training',
    ]);
  });

  it('does not publish when Enter is pressed in the tag input', async () => {
    renderEditor('/editor');

    await userEvent.type(screen.getByPlaceholderText('Enter tags'), 'dragons{Enter}');

    expect(create).not.toHaveBeenCalled();
  });

  it('commits the tag left in the input when publishing', async () => {
    create.mockResolvedValue(article);
    renderEditor('/editor');

    await userEvent.type(fields().title, 'A title');
    await userEvent.type(screen.getByPlaceholderText('Enter tags'), 'pending');
    await userEvent.click(screen.getByRole('button', { name: 'Publish Article' }));

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ tagList: ['pending'] }));
  });

  it('loads the article for /editor/:slug and updates it', async () => {
    getArticle.mockResolvedValue(article);
    update.mockResolvedValue({ ...article, slug: 'updated-slug' });
    renderEditor('/editor/a-slug');

    await waitFor(() => expect(fields().title).toHaveValue('The title'));
    expect(fields().description).toHaveValue('description');
    expect(fields().body).toHaveValue('body');
    expect(document.querySelector('.tag-list .tag-pill')).toHaveTextContent('dragons');

    await userEvent.clear(fields().title);
    await userEvent.type(fields().title, 'New title');
    await userEvent.click(screen.getByRole('button', { name: 'Publish Article' }));

    expect(update).toHaveBeenCalledWith({
      slug: 'a-slug',
      title: 'New title',
      description: 'description',
      body: 'body',
      tagList: ['dragons'],
    });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/article/updated-slug'));
  });

  it('sends users who do not own the article back home', async () => {
    login('bob');
    getArticle.mockResolvedValue(article);
    renderEditor('/editor/a-slug');

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));
    expect(fields().title).toHaveValue('');
  });

  it('renders the API errors and re-enables the form when publishing fails', async () => {
    create.mockRejectedValue({ errors: { title: ["can't be blank"] }, status: 422 });
    renderEditor('/editor');

    await userEvent.click(screen.getByRole('button', { name: 'Publish Article' }));

    await waitFor(() => expect(screen.getByText("title can't be blank")).toBeInTheDocument());
    expect(fields().title).not.toBeDisabled();
  });
});
