import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/core/auth/store';
import type { User } from '@/core/auth/user';
import { ListErrors } from '@/shared/components/ListErrors';
import type { Errors } from '@/core/models/errors';

interface SettingsFormValues {
  image: string;
  username: string;
  bio: string;
  email: string;
  password: string;
}

/**
 * Port of `src/app/features/settings/settings.component.*`. The Angular component patched
 * the form from `getCurrentUserSync()` in `ngOnInit`; here the cached store user seeds the
 * form through `reset()` once it is available (it may still be loading on a hard reload).
 */
export default function Settings() {
  const navigate = useNavigate();
  const currentUser = useAuthStore(s => s.currentUser);
  const update = useAuthStore(s => s.update);
  const logout = useAuthStore(s => s.logout);
  const [errors, setErrors] = useState<Errors | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset } = useForm<SettingsFormValues>({
    defaultValues: { image: '', username: '', bio: '', email: '', password: '' },
  });

  useEffect(() => {
    if (currentUser) {
      reset({
        image: currentUser.image ?? '',
        username: currentUser.username,
        bio: currentUser.bio ?? '',
        email: currentUser.email,
        password: '',
      });
    }
  }, [currentUser, reset]);

  const submitForm = handleSubmit(async values => {
    setIsSubmitting(true);

    try {
      // The API rejects an empty password (it must be 8-128 chars), so an untouched
      // password field means "keep the current one" and is left out of the payload.
      const payload: Partial<User> & { password?: string } = { ...values };
      if (!payload.password) {
        delete payload.password;
      }
      const user = await update(payload);
      void navigate(`/profile/${user.username}`);
    } catch (error) {
      setErrors(error as Errors);
      setIsSubmitting(false);
    }
  });

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
                    formControlName="image"
                    {...register('image')}
                  />
                </fieldset>

                <fieldset className="form-group">
                  <input
                    className="form-control form-control-lg"
                    type="text"
                    placeholder="Username"
                    formControlName="username"
                    {...register('username')}
                  />
                </fieldset>

                <fieldset className="form-group">
                  <textarea
                    className="form-control form-control-lg"
                    rows={8}
                    placeholder="Short bio about you"
                    formControlName="bio"
                    {...register('bio')}
                  ></textarea>
                </fieldset>

                <fieldset className="form-group">
                  <input
                    className="form-control form-control-lg"
                    type="email"
                    placeholder="Email"
                    formControlName="email"
                    {...register('email')}
                  />
                </fieldset>

                <fieldset className="form-group">
                  <input
                    className="form-control form-control-lg"
                    type="password"
                    placeholder="New Password"
                    formControlName="password"
                    {...register('password')}
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
