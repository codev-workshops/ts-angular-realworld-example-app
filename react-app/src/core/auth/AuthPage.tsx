import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { Errors } from '../models/errors';
import { ListErrors } from '../../shared/components/ListErrors';
import { useAuth } from './auth-context';

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const authType = location.pathname.split('/').filter(Boolean).at(-1) ?? 'login';
  const title = authType === 'login' ? 'Sign in' : 'Sign up';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [errors, setErrors] = useState<Errors>({ errors: {} });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = email !== '' && password !== '' && (authType !== 'register' || username !== '');

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({ errors: {} });

    try {
      if (authType === 'login') {
        await login({ email, password });
      } else {
        await register({ email, password, username });
      }
      void navigate('/');
    } catch (err) {
      setErrors(err as Errors);
      setIsSubmitting(false);
    }
  };

  return (
    <app-auth-page>
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
              <form onSubmit={event => void submitForm(event)}>
                <fieldset disabled={isSubmitting}>
                  <fieldset className="form-group">
                    {authType === 'register' && (
                      <input
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
                      placeholder="Email"
                      className="form-control form-control-lg"
                      type="text"
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                    />
                  </fieldset>
                  <fieldset className="form-group">
                    <input
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
    </app-auth-page>
  );
}
