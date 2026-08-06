import { Link } from 'react-router-dom';
import { year } from '../../shared/util/formatDate';

const today = Date.now();

export function Footer() {
  return (
    <app-layout-footer>
      <footer>
        <div className="container">
          <Link className="logo-font" to="/">
            conduit
          </Link>
          <span className="attribution">
            {` © ${year(today)}. An interactive learning project from `}
            <a href="https://github.com/gothinkster/realworld">RealWorld OSS Project</a>. Code licensed under MIT.
          </span>
        </div>
      </footer>
    </app-layout-footer>
  );
}
