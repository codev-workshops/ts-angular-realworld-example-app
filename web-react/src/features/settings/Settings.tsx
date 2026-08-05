import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../core/auth/store';
import { Errors } from '../../core/models/errors';
import { ListErrors } from '../../shared/ListErrors';

/**
 * The reused Playwright suite selects the inputs by Angular's
 * `formControlName` attribute, so the markup keeps it (HTML attribute names
 * are case-insensitive, so the lowercase spelling still matches
 * `input[formControlName="image"]`).
 */
declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    formcontrolname?: string;
  }
}

interface SettingsForm {
  image: string;
  username: string;
  bio: string;
  email: string;
  password: string;
}

const emptyForm: SettingsForm = { image: '', username: '', bio: '', email: '', password: '' };

/**
 * Port of `settings.component.ts` + `.html`.
 */
export function Settings() {
  const currentUser = useAuthStore(s => s.currentUser);
  const update = useAuthStore(s => s.update);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();

  const [form, setForm] = useState<SettingsForm>(emptyForm);
  const [errors, setErrors] = useState<Errors | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Angular prefilled once in `ngOnInit` from `getCurrentUserSync()`; here the
   * user may still be loading on mount, so prefill when it arrives. A null
   * `bio`/`image` becomes `''` so the inputs never show the string "null".
   */
  useEffect(() => {
    if (!currentUser) {
      return;
    }
    setForm(previous => ({
      ...previous,
      image: currentUser.image ?? '',
      username: currentUser.username,
      bio: currentUser.bio ?? '',
      email: currentUser.email,
    }));
  }, [currentUser]);

  const setField = (field: keyof SettingsForm, value: string) => setForm(previous => ({ ...previous, [field]: value }));

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const user = await update(form);
      navigate(`/profile/${user.username}`);
    } catch (error) {
      setErrors(error as Errors);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="container page">
        <div className="row">
          <div className="col-md-6 offset-md-3 col-xs-12">
            <h1 className="text-xs-center">Your Settings</h1>

            <ListErrors errors={errors} />

            <form onSubmit={submitForm}>
              <fieldset disabled={isSubmitting}>
                <fieldset className="form-group">
                  <input
                    className="form-control"
                    type="text"
                    placeholder="URL of profile picture"
                    formcontrolname="image"
                    value={form.image}
                    onChange={event => setField('image', event.target.value)}
                  />
                </fieldset>

                <fieldset className="form-group">
                  <input
                    className="form-control form-control-lg"
                    type="text"
                    placeholder="Username"
                    formcontrolname="username"
                    value={form.username}
                    onChange={event => setField('username', event.target.value)}
                  />
                </fieldset>

                <fieldset className="form-group">
                  <textarea
                    className="form-control form-control-lg"
                    rows={8}
                    placeholder="Short bio about you"
                    formcontrolname="bio"
                    value={form.bio}
                    onChange={event => setField('bio', event.target.value)}
                  ></textarea>
                </fieldset>

                <fieldset className="form-group">
                  <input
                    className="form-control form-control-lg"
                    type="email"
                    placeholder="Email"
                    formcontrolname="email"
                    value={form.email}
                    onChange={event => setField('email', event.target.value)}
                  />
                </fieldset>

                <fieldset className="form-group">
                  <input
                    className="form-control form-control-lg"
                    type="password"
                    placeholder="New Password"
                    formcontrolname="password"
                    value={form.password}
                    onChange={event => setField('password', event.target.value)}
                  />
                </fieldset>

                <button className="btn btn-lg btn-primary pull-xs-right" type="submit">
                  Update Settings
                </button>
              </fieldset>
            </form>

            {/* Line break for logout button */}
            <hr />

            <button className="btn btn-outline-danger" onClick={() => logout()}>
              Or click here to logout.
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
