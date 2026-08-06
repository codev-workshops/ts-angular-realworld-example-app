import { Link } from 'react-router-dom';

/**
 * Placeholder shell. Phase 2 replaces this with the real header/footer plus the
 * router skeleton (nested routes + lazy route components).
 */
export function App() {
  return (
    <>
      <nav className="navbar navbar-light">
        <div className="container">
          <Link className="navbar-brand" to="/">
            conduit
          </Link>
        </div>
      </nav>

      <div className="container page">
        <p>Migration in progress.</p>
      </div>

      <footer>
        <div className="container">
          <Link to="/" className="logo-font">
            conduit
          </Link>
          <span className="attribution">
            An interactive learning project from <a href="https://thinkster.io">Thinkster</a>. Code &amp; design
            licensed under MIT.
          </span>
        </div>
      </footer>
    </>
  );
}
