import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { ListErrors } from '@/shared/components/ListErrors';
import { useAuthStore } from '@/core/auth/store';
import { create, get as getArticle, update } from '@/features/article/services/articles';
import type { Errors } from '@/core/models/errors';

interface ArticleForm {
  title: string;
  description: string;
  body: string;
}

/**
 * Port of `src/app/features/article/pages/editor/editor.component.*`.
 *
 * Reactive Forms become React Hook Form; the inputs keep their `formControlName`
 * attributes because the e2e suite selects on them. `/editor` creates,
 * `/editor/:slug` loads the article and updates it, redirecting non-authors home.
 */
export default function Editor() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore(s => s.currentUser);

  const [tagList, setTagList] = useState<string[]>([]);
  const [tagField, setTagField] = useState('');
  const [errors, setErrors] = useState<Errors | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, reset, getValues } = useForm<ArticleForm>({
    defaultValues: { title: '', description: '', body: '' },
  });

  // The Angular component re-fetched the current user alongside the article; the route
  // guard only mounts this page once the store holds one, so it is read from there.
  const currentUsername = currentUser?.username;

  useEffect(() => {
    if (!slug || !currentUsername) {
      return;
    }

    let active = true;

    getArticle(slug)
      .then(article => {
        if (!active) {
          return;
        }
        if (article.author.username !== currentUsername) {
          void navigate('/');
          return;
        }
        setTagList(article.tagList);
        reset({ title: article.title, description: article.description, body: article.body });
      })
      .catch(() => {
        // Angular had no error handler here either: the form stays empty.
      });

    return () => {
      active = false;
    };
  }, [slug, currentUsername, navigate, reset]);

  /** Returns the resulting tag list so `submitForm` can use the pending tag immediately. */
  const addTag = (): string[] => {
    const tag = tagField.trim() === '' ? null : tagField;
    let next = tagList;
    if (tag !== null && tagList.indexOf(tag) < 0) {
      next = [...tagList, tag];
      setTagList(next);
    }
    setTagField('');
    return next;
  };

  const onTagKeyUp = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      addTag();
    }
  };

  const removeTag = (tagName: string) => setTagList(tags => tags.filter(tag => tag !== tagName));

  const submitForm = () => {
    setIsSubmitting(true);
    // Angular committed whatever was left in the tag input before submitting.
    const tags = addTag();
    const values = getValues();
    const articleData = { ...values, tagList: tags };

    const request = slug ? update({ ...articleData, slug }) : create(articleData);

    request
      .then(article => void navigate(`/article/${article.slug}`))
      .catch((error: Errors) => {
        setErrors(error);
        setIsSubmitting(false);
      });
  };

  return (
    <div className="editor-page">
      <div className="container page">
        <div className="row">
          <div className="col-md-10 offset-md-1 col-xs-12">
            <ListErrors errors={errors} />

            {/* The Angular form had no ngSubmit: Enter in the tag input must add a tag,
                never publish, so implicit submission is swallowed here too. */}
            <form onSubmit={(event: FormEvent) => event.preventDefault()}>
              <fieldset disabled={isSubmitting}>
                <fieldset className="form-group">
                  <input
                    className="form-control form-control-lg"
                    formControlName="title"
                    type="text"
                    placeholder="Article Title"
                    {...register('title')}
                  />
                </fieldset>

                <fieldset className="form-group">
                  <input
                    className="form-control"
                    formControlName="description"
                    type="text"
                    placeholder="What's this article about?"
                    {...register('description')}
                  />
                </fieldset>

                <fieldset className="form-group">
                  <textarea
                    className="form-control"
                    formControlName="body"
                    rows={8}
                    placeholder="Write your article (in markdown)"
                    {...register('body')}
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

                <button className="btn btn-lg pull-xs-right btn-primary" type="button" onClick={submitForm}>
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
