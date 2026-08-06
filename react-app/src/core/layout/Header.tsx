import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { defaultImage } from '../../shared/util/defaultImage';

const activeClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link active' : 'nav-link');

export function Header() {
  const { authState, currentUser } = useAuth();
  const location = useLocation();

  // Angular marks the Home link active with `{ exact: true }`, which also
  // requires an exact query-param match; `/?feed=following` is therefore not
  // "Home". React Router's NavLink only looks at the pathname.
  const homeClass = location.pathname === '/' && location.search === '' ? 'nav-link active' : 'nav-link';

  return (
    <app-layout-header>
      <nav className="navbar navbar-light">
        <div className="container">
          <Link className="navbar-brand" to="/">
            conduit
          </Link>

          {authState === 'unauthenticated' && (
            <ul className="nav navbar-nav pull-xs-right">
              <li className="nav-item">
                <Link className="nav-link" to="/">
                  {' '}
                  Home{' '}
                </Link>
              </li>

              <li className="nav-item">
                <NavLink className={activeClass} to="/login">
                  {' '}
                  Sign in{' '}
                </NavLink>
              </li>

              <li className="nav-item">
                <NavLink className={activeClass} to="/register">
                  {' '}
                  Sign up{' '}
                </NavLink>
              </li>
            </ul>
          )}

          {authState === 'authenticated' && (
            <ul className="nav navbar-nav pull-xs-right">
              <li className="nav-item">
                <Link className={homeClass} to="/">
                  {' '}
                  Home{' '}
                </Link>
              </li>

              <li className="nav-item">
                <NavLink className={activeClass} to="/editor">
                  <i className="ion-compose"></i>&nbsp;New Article
                </NavLink>
              </li>

              <li className="nav-item">
                <NavLink className={activeClass} to="/settings">
                  <i className="ion-gear-a"></i>&nbsp;Settings
                </NavLink>
              </li>

              {currentUser && (
                <li className="nav-item">
                  <NavLink className={activeClass} to={`/profile/${currentUser.username}`}>
                    <img src={defaultImage(currentUser.image)} className="user-pic" />
                    {` ${currentUser.username} `}
                  </NavLink>
                </li>
              )}
            </ul>
          )}

          {authState === 'unavailable' && (
            <ul className="nav navbar-nav pull-xs-right">
              <li className="nav-item">
                <Link className={homeClass} to="/">
                  {' '}
                  Home{' '}
                </Link>
              </li>

              <li className="nav-item">
                <NavLink className={activeClass} to="/editor">
                  <i className="ion-compose"></i>&nbsp;New Article
                </NavLink>
              </li>

              <li className="nav-item">
                <NavLink className={activeClass} to="/settings">
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

          {authState === 'loading' && (
            <ul className="nav navbar-nav pull-xs-right">
              <li className="nav-item">
                <Link className="nav-link" to="/">
                  {' '}
                  Home{' '}
                </Link>
              </li>
              <li className="nav-item">
                <span className="nav-link">Loading...</span>
              </li>
            </ul>
          )}
        </div>
      </nav>
    </app-layout-header>
  );
}
