import { Link } from 'react-router-dom';

/** Port of `src/app/core/layout/footer.component.html`. */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer>
      <div className="container">
        <Link className="logo-font" to="/">
          conduit
        </Link>
        <span className="attribution">
          &copy; {year}. An interactive learning project from{' '}
          <a href="https://github.com/gothinkster/realworld">RealWorld OSS Project</a>. Code licensed under MIT.
        </span>
      </div>
    </footer>
  );
}
