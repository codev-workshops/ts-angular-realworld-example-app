import { FormEvent, InputHTMLAttributes, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ListErrors } from '../../shared/ListErrors';
import { Errors } from '../models/errors';
import { useAuthStore } from './store';

/**
 * Port of `auth.component.ts` + `auth.component.html`.
 *
 * A single component serves both `/login` and `/register`; the mode comes from
 * the last URL segment (Angular read `route.snapshot.url.at(-1).path`), so the
 * page also works under a temporary route prefix. The sibling link is resolved
 * relative to the current path for the same reason.
 */
type AuthType = 'login' | 'register';

/**
 * The shared e2e suite selects inputs with `input[formControlName="..."]`. React
 * has no reactive forms, so the attribute is emitted verbatim; attribute names
 * in selectors are matched case-insensitively in HTML documents, and lowercase
 * keeps React from warning about an unrecognized DOM prop.
 */
function formControlName(name: string): InputHTMLAttributes<HTMLInputElement> {
  return { formcontrolname: name } as InputHTMLAttributes<HTMLInputElement>;
}

function toErrors(error: unknown): Errors {
  if (error && typeof error === 'object' && 'errors' in error) {
    return error as Errors;
  }
  return { errors: {} };
}

export function AuthPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const login = useAuthStore(s => s.login);
  const register = useAuthStore(s => s.register);

  const authType: AuthType = pathname.split('/').filter(Boolean).at(-1) === 'register' ? 'register' : 'login';
  const title = authType === 'login' ? 'Sign in' : 'Sign up';

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({ errors: {} });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = email !== '' && password !== '' && (authType === 'login' || username !== '');

  const submitForm = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({ errors: {} });

    try {
      if (authType === 'login') {
        await login({ email, password });
      } else {
        await register({ username, email, password });
      }
      navigate('/');
    } catch (error) {
      setErrors(toErrors(error));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="container page">
        <div className="row">
          <div className="col-md-6 offset-md-3 col-xs-12">
            <h1 className="text-xs-center">{title}</h1>
            <p className="text-xs-center">
              {authType === 'register' && (
                <Link to="../login" relative="path">
                  Have an account?
                </Link>
              )}

              {authType === 'login' && (
                <Link to="../register" relative="path">
                  Need an account?
                </Link>
              )}
            </p>
            <ListErrors errors={errors} />
            <form onSubmit={submitForm}>
              <fieldset disabled={isSubmitting}>
                <fieldset className="form-group">
                  {authType === 'register' && (
                    <input
                      {...formControlName('username')}
                      placeholder="Username"
                      className="form-control form-control-lg"
                      type="text"
                      value={username}
                      onChange={event => setUsername(event.target.value)}
                    />
                  )}
                </fieldset>
                <fieldset className="form-group">
                  <input
                    {...formControlName('email')}
                    placeholder="Email"
                    className="form-control form-control-lg"
                    type="text"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                  />
                </fieldset>
                <fieldset className="form-group">
                  <input
                    {...formControlName('password')}
                    placeholder="Password"
                    className="form-control form-control-lg"
                    type="password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                  />
                </fieldset>
                <button className="btn btn-lg btn-primary pull-xs-right" disabled={!isValid} type="submit">
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
