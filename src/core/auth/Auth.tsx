import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/core/auth/store';
import { ListErrors } from '@/shared/components/ListErrors';
import type { Errors } from '@/core/models/errors';

export type AuthType = 'login' | 'register';

interface AuthProps {
  authType: AuthType;
}

interface AuthFormValues {
  email: string;
  password: string;
  /** Registered (and submitted) only in register mode, like the Angular `addControl`. */
  username?: string;
}

/**
 * Port of `src/app/core/auth/auth.component.*`: one component for /login and /register,
 * with the mode coming from the route. The Angular version created the form with
 * email + password and called `addControl('username', ...)` in `ngOnInit` for register;
 * the React equivalent renders the username input only in register mode, so React Hook
 * Form registers/unregisters that field and it is absent from the submitted values on
 * login — no second form and no stray control.
 */
export default function Auth({ authType }: AuthProps) {
  const navigate = useNavigate();
  const login = useAuthStore(s => s.login);
  const registerUser = useAuthStore(s => s.register);
  const [errors, setErrors] = useState<Errors>({ errors: {} });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title = authType === 'login' ? 'Sign in' : 'Sign up';

  const { register, handleSubmit, formState } = useForm<AuthFormValues>({
    mode: 'onChange',
    shouldUnregister: true,
    defaultValues: { email: '', password: '' },
  });

  const submitForm = handleSubmit(async values => {
    setIsSubmitting(true);
    setErrors({ errors: {} });

    try {
      if (authType === 'login') {
        await login({ email: values.email, password: values.password });
      } else {
        await registerUser({
          username: values.username ?? '',
          email: values.email,
          password: values.password,
        });
      }
      void navigate('/');
    } catch (error) {
      setErrors(error as Errors);
      setIsSubmitting(false);
    }
  });

  return (
    <div className="auth-page">
      <div className="container page">
        <div className="row">
          <div className="col-md-6 offset-md-3 col-xs-12">
            <h1 className="text-xs-center">{title}</h1>
            <p className="text-xs-center">
              {authType === 'register' && <Link to="/login">Have an account?</Link>}
              {authType === 'login' && <Link to="/register">Need an account?</Link>}
            </p>
            <ListErrors errors={errors} />
            <form onSubmit={submitForm}>
              <fieldset disabled={isSubmitting}>
                <fieldset className="form-group">
                  {authType === 'register' && (
                    <input
                      formControlName="username"
                      placeholder="Username"
                      className="form-control form-control-lg"
                      type="text"
                      {...register('username', { required: true })}
                    />
                  )}
                </fieldset>
                <fieldset className="form-group">
                  <input
                    formControlName="email"
                    placeholder="Email"
                    className="form-control form-control-lg"
                    type="text"
                    {...register('email', { required: true })}
                  />
                </fieldset>
                <fieldset className="form-group">
                  <input
                    formControlName="password"
                    placeholder="Password"
                    className="form-control form-control-lg"
                    type="password"
                    {...register('password', { required: true })}
                  />
                </fieldset>
                <button className="btn btn-lg btn-primary pull-xs-right" disabled={!formState.isValid} type="submit">
                  {title}
                </button>
              </fieldset>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
