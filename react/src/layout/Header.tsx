import { NavLink, Link } from 'react-router-dom';

/**
 * Navigation shell. The authenticated variants are driven by auth state, which
 * does not exist yet, so phase 0 renders the logged-out navigation only.
 */
export function Header() {
  return (
    <nav className="navbar navbar-light">
      <div className="container">
        <Link className="navbar-brand" to="/">
          conduit
        </Link>

        <ul className="nav navbar-nav pull-xs-right">
          <li className="nav-item">
            <Link className="nav-link" to="/">
              Home
            </Link>
          </li>
          <li className="nav-item">
            <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/login">
              Sign in
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/register">
              Sign up
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
}
