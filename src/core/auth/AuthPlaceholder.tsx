import { Link } from 'react-router-dom';

interface AuthPlaceholderProps {
  authType: 'login' | 'register';
}

/**
 * Markup-only stand-in for `src/app/core/auth/auth.component.html` so `e2e/health.spec.ts`
 * passes now. Phase 6 replaces it with the React Hook Form component (submit, validation,
 * error list) and deletes this file.
 */
export default function AuthPlaceholder({ authType }: AuthPlaceholderProps) {
  const title = authType === 'login' ? 'Sign in' : 'Sign up';

  return (
    <div className="auth-page">
      <div className="container page">
        <div className="row">
          <div className="col-md-6 offset-md-3 col-xs-12">
            <h1 className="text-xs-center">{title}</h1>
            <p className="text-xs-center">
              {authType === 'register' ? (
                <Link to="/login">Have an account?</Link>
              ) : (
                <Link to="/register">Need an account?</Link>
              )}
            </p>
            <form>
              <fieldset>
                <fieldset className="form-group">
                  {authType === 'register' && (
                    <input
                      formControlName="username"
                      placeholder="Username"
                      className="form-control form-control-lg"
                      type="text"
                    />
                  )}
                </fieldset>
                <fieldset className="form-group">
                  <input
                    formControlName="email"
                    placeholder="Email"
                    className="form-control form-control-lg"
                    type="text"
                  />
                </fieldset>
                <fieldset className="form-group">
                  <input
                    formControlName="password"
                    placeholder="Password"
                    className="form-control form-control-lg"
                    type="password"
                  />
                </fieldset>
                <button className="btn btn-lg btn-primary pull-xs-right" type="submit">
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
