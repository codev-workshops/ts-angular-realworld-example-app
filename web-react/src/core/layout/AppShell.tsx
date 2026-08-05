import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '../auth/store';

const navLinkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link active' : 'nav-link');

/**
 * Port of `header.component.html` plus `app.component.html`'s router outlet.
 *
 * The navbar is a four-way switch on `authState`, never a boolean. The footer
 * (and the rest of `core/layout/`) is Wave 3c's.
 */
export function AppShell() {
  const authState = useAuthStore(s => s.authState);
  const currentUser = useAuthStore(s => s.currentUser);

  return (
    <>
      <nav className="navbar navbar-light">
        <div className="container">
          <Link className="navbar-brand" to="/">
            conduit
          </Link>

          {/* Show this for logged out users */}
          {authState === 'unauthenticated' && (
            <ul className="nav navbar-nav pull-xs-right">
              <li className="nav-item">
                <Link className="nav-link" to="/">
                  Home
                </Link>
              </li>

              <li className="nav-item">
                <NavLink className={navLinkClass} to="/login">
                  Sign in
                </NavLink>
              </li>

              <li className="nav-item">
                <NavLink className={navLinkClass} to="/register">
                  Sign up
                </NavLink>
              </li>
            </ul>
          )}

          {/* Show this for logged in users */}
          {authState === 'authenticated' && (
            <ul className="nav navbar-nav pull-xs-right">
              <li className="nav-item">
                <NavLink className={navLinkClass} to="/" end>
                  Home
                </NavLink>
              </li>

              <li className="nav-item">
                <NavLink className={navLinkClass} to="/editor">
                  <i className="ion-compose"></i>&nbsp;New Article
                </NavLink>
              </li>

              <li className="nav-item">
                <NavLink className={navLinkClass} to="/settings">
                  <i className="ion-gear-a"></i>&nbsp;Settings
                </NavLink>
              </li>

              {currentUser && (
                <li className="nav-item">
                  <NavLink className={navLinkClass} to={`/profile/${currentUser.username}`}>
                    <img src={currentUser.image || '/assets/images/default-avatar.svg'} className="user-pic" />
                    {currentUser.username}
                  </NavLink>
                </li>
              )}
            </ul>
          )}

          {/* Show this when auth is temporarily unavailable (server error) */}
          {authState === 'unavailable' && (
            <ul className="nav navbar-nav pull-xs-right">
              <li className="nav-item">
                <NavLink className={navLinkClass} to="/" end>
                  Home
                </NavLink>
              </li>

              <li className="nav-item">
                <NavLink className={navLinkClass} to="/editor">
                  <i className="ion-compose"></i>&nbsp;New Article
                </NavLink>
              </li>

              <li className="nav-item">
                <NavLink className={navLinkClass} to="/settings">
                  <i className="ion-gear-a"></i>&nbsp;Settings
                </NavLink>
              </li>

              <li className="nav-item">
                <span className="nav-link" title="Auth unavailable - retrying automatically">
                  <i className="ion-load-c"></i>&nbsp;Connecting...
                </span>
              </li>
            </ul>
          )}

          {/* Show this while loading auth state */}
          {authState === 'loading' && (
            <ul className="nav navbar-nav pull-xs-right">
              <li className="nav-item">
                <Link className="nav-link" to="/">
                  Home
                </Link>
              </li>
              <li className="nav-item">
                <span className="nav-link">Loading...</span>
              </li>
            </ul>
          )}
        </div>
      </nav>

      <Outlet />
    </>
  );
}
