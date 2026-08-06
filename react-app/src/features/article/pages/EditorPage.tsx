import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../core/auth/auth-context';
import type { Errors } from '../../../core/models/errors';
import { ListErrors } from '../../../shared/components/ListErrors';
import { createArticle, getArticle, updateArticle } from '../services/articles';

export default function EditorPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [body, setBody] = useState('');
  const [tagField, setTagField] = useState('');
  const [tagList, setTagList] = useState<string[]>([]);

  const [errors, setErrors] = useState<Errors | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!slug) {
      return;
    }
    const controller = new AbortController();
    getArticle(slug, controller.signal)
      .then(article => {
        if (currentUser?.username === article.author.username) {
          setTagList(article.tagList);
          setTitle(article.title);
          setDescription(article.description);
          setBody(article.body);
        } else {
          void navigate('/');
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [slug, currentUser, navigate]);

  const addTag = (tag: string, tags: string[]): string[] =>
    tag.trim() !== '' && tags.indexOf(tag) < 0 ? [...tags, tag] : tags;

  const onAddTag = () => {
    setTagList(tags => addTag(tagField, tags));
    setTagField('');
  };

  const removeTag = (tagName: string) => setTagList(tags => tags.filter(tag => tag !== tagName));

  const submitForm = async () => {
    setIsSubmitting(true);
    const tags = addTag(tagField, tagList);
    setTagList(tags);
    setTagField('');

    const articleData = { title, description, body, tagList: tags };

    try {
      const article = slug ? await updateArticle({ ...articleData, slug }) : await createArticle(articleData);
      void navigate(`/article/${article.slug}`);
    } catch (err) {
      setErrors(err as Errors);
      setIsSubmitting(false);
    }
  };

  return (
    <app-editor-page>
      <div className="editor-page">
        <div className="container page">
          <div className="row">
            <div className="col-md-10 offset-md-1 col-xs-12">
              <ListErrors errors={errors} />

              <form>
                <fieldset disabled={isSubmitting}>
                  <fieldset className="form-group">
                    <input
                      className="form-control form-control-lg"
                      type="text"
                      placeholder="Article Title"
                      value={title}
                      onChange={event => setTitle(event.target.value)}
                    />
                  </fieldset>

                  <fieldset className="form-group">
                    <input
                      className="form-control"
                      type="text"
                      placeholder="What's this article about?"
                      value={description}
                      onChange={event => setDescription(event.target.value)}
                    />
                  </fieldset>

                  <fieldset className="form-group">
                    <textarea
                      className="form-control"
                      rows={8}
                      placeholder="Write your article (in markdown)"
                      value={body}
                      onChange={event => setBody(event.target.value)}
                    ></textarea>
                  </fieldset>

                  <fieldset className="form-group">
                    <input
                      className="form-control"
                      type="text"
                      placeholder="Enter tags"
                      value={tagField}
                      onChange={event => setTagField(event.target.value)}
                      onKeyUp={event => {
                        if (event.key === 'Enter') {
                          onAddTag();
                        }
                      }}
                    />
                    <div className="tag-list">
                      {tagList.map(tag => (
                        <span className="tag-default tag-pill" key={tag}>
                          <i className="ion-close-round" onClick={() => removeTag(tag)}></i>
                          {` ${tag} `}
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
    </app-editor-page>
  );
}
