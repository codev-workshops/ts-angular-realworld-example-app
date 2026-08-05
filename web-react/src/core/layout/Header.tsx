import { Link, NavLink } from 'react-router-dom';
import { useAuthStore } from '../auth/store';
import { defaultImage } from '../../shared/defaultImage';

/** `routerLinkActive="active"` on an `a.nav-link`. */
const navLinkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link active' : 'nav-link');

/**
 * Port of `header.component.html`.
 *
 * The navbar is a four-way switch on `authState`, never a boolean: `unavailable`
 * keeps the authenticated links (the token is still held while the server is
 * retried) but swaps the profile link for `Connecting...`.
 */
export function Header() {
  const authState = useAuthStore(s => s.authState);
  const currentUser = useAuthStore(s => s.currentUser);

  return (
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
                  <img src={defaultImage(currentUser.image)} className="user-pic" />
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
  );
}
