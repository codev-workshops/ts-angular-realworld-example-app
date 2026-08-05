import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';

/** Port of `app.component.html`: header, router outlet, footer. */
export function AppShell() {
  return (
    <>
      <Header />

      <Outlet />

      <Footer />
    </>
  );
}
