import { Link, NavLink } from 'react-router-dom';
import { useAuthStore } from '@/core/auth/store';
import { defaultImage } from '@/shared/utils/default-image';

/** `routerLinkActive="active"` equivalent. */
const navLinkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link active' : 'nav-link');

/** The logged-out and loading navbars render Home without `routerLinkActive`. */
function HomeLink({ active }: { active: boolean }) {
  return active ? (
    <NavLink className={navLinkClass} to="/" end>
      Home
    </NavLink>
  ) : (
    <Link className="nav-link" to="/">
      Home
    </Link>
  );
}

function AuthoringLinks() {
  return (
    <>
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
    </>
  );
}

/** Port of `src/app/core/layout/header.component.html`, one branch per auth state. */
export function Header() {
  const authState = useAuthStore(s => s.authState);
  const currentUser = useAuthStore(s => s.currentUser);

  return (
    <nav className="navbar navbar-light">
      <div className="container">
        <Link className="navbar-brand" to="/">
          conduit
        </Link>

        {authState === 'unauthenticated' && (
          <ul className="nav navbar-nav pull-xs-right">
            <li className="nav-item">
              <HomeLink active={false} />
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

        {authState === 'authenticated' && (
          <ul className="nav navbar-nav pull-xs-right">
            <li className="nav-item">
              <HomeLink active />
            </li>

            <AuthoringLinks />

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

        {authState === 'unavailable' && (
          <ul className="nav navbar-nav pull-xs-right">
            <li className="nav-item">
              <HomeLink active />
            </li>

            <AuthoringLinks />

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
              <HomeLink active={false} />
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
