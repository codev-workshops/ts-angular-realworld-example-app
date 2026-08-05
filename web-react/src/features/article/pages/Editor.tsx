import { FormEvent, KeyboardEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCurrentUser } from '../../../core/auth/api';
import { Errors } from '../../../core/models/errors';
import { ListErrors } from '../../../shared/ListErrors';
import { createArticle, getArticle, updateArticle } from '../api';

interface ArticleFormValue {
  title: string;
  description: string;
  body: string;
}

const emptyForm: ArticleFormValue = { title: '', description: '', body: '' };

/**
 * The shared `e2e/` suite selects the editor fields with
 * `input[formControlName="title"]`, so the Angular attribute is reproduced
 * verbatim. HTML attribute names are case-insensitive, and lowercasing it here
 * keeps React from warning about an unknown camelCase DOM prop.
 */
const formControlName = (name: string) => ({ formcontrolname: name });

function toErrors(error: unknown): Errors | null {
  if (error && typeof error === 'object' && 'errors' in error) {
    return error as Errors;
  }
  return null;
}

/** Port of `features/article/pages/editor/editor.component.{ts,html}`. */
export function Editor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [form, setForm] = useState<ArticleFormValue>(emptyForm);
  const [tagList, setTagList] = useState<string[]>([]);
  const [tagField, setTagField] = useState('');
  const [errors, setErrors] = useState<Errors | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Angular's `ngOnInit`: in edit mode load the article and the current user,
  // and bounce anyone who is not the author back to the home page.
  useEffect(() => {
    if (!slug) {
      return;
    }
    let cancelled = false;
    void Promise.all([getArticle(slug), getCurrentUser()]).then(([article, user]) => {
      if (cancelled) {
        return;
      }
      if (user.username === article.author.username) {
        setTagList(article.tagList);
        setForm({ title: article.title, description: article.description, body: article.body });
      } else {
        navigate('/');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [slug, navigate]);

  const addTag = (): string[] => {
    const tag = tagField;
    let next = tagList;
    // only add tag if it does not exist yet
    if (tag.trim() !== '' && tagList.indexOf(tag) < 0) {
      next = [...tagList, tag];
      setTagList(next);
    }
    // clear the input
    setTagField('');
    return next;
  };

  const removeTag = (tagName: string): void => {
    setTagList(tags => tags.filter(tag => tag !== tagName));
  };

  const onTagKeyUp = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      addTag();
    }
  };

  const submitForm = async (): Promise<void> => {
    setIsSubmitting(true);
    // update any single tag
    const tags = addTag();

    const articleData = { ...form, tagList: tags };

    try {
      const article = slug ? await updateArticle({ ...articleData, slug }) : await createArticle(articleData);
      navigate(`/article/${article.slug}`);
    } catch (error) {
      setErrors(toErrors(error));
      setIsSubmitting(false);
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
  };

  return (
    <div className="editor-page">
      <div className="container page">
        <div className="row">
          <div className="col-md-10 offset-md-1 col-xs-12">
            <ListErrors errors={errors} />

            <form onSubmit={onSubmit}>
              <fieldset disabled={isSubmitting}>
                <fieldset className="form-group">
                  <input
                    className="form-control form-control-lg"
                    {...formControlName('title')}
                    type="text"
                    placeholder="Article Title"
                    value={form.title}
                    onChange={event => setForm(f => ({ ...f, title: event.target.value }))}
                  />
                </fieldset>

                <fieldset className="form-group">
                  <input
                    className="form-control"
                    {...formControlName('description')}
                    type="text"
                    placeholder="What's this article about?"
                    value={form.description}
                    onChange={event => setForm(f => ({ ...f, description: event.target.value }))}
                  />
                </fieldset>

                <fieldset className="form-group">
                  <textarea
                    className="form-control"
                    {...formControlName('body')}
                    rows={8}
                    placeholder="Write your article (in markdown)"
                    value={form.body}
                    onChange={event => setForm(f => ({ ...f, body: event.target.value }))}
                  ></textarea>
                </fieldset>

                <fieldset className="form-group">
                  <input
                    className="form-control"
                    type="text"
                    placeholder="Enter tags"
                    value={tagField}
                    onChange={event => setTagField(event.target.value)}
                    onKeyUp={onTagKeyUp}
                  />
                  <div className="tag-list">
                    {tagList.map(tag => (
                      <span className="tag-default tag-pill" key={tag}>
                        <i className="ion-close-round" onClick={() => removeTag(tag)}></i>
                        {tag}
                      </span>
                    ))}
                  </div>
                </fieldset>

                <button
                  className="btn btn-lg pull-xs-right btn-primary"
                  type="button"
                  onClick={() => void submitForm()}
                >
                  Publish Article
                </button>
              </fieldset>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
