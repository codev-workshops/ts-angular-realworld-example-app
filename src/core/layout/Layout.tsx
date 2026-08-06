import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Header } from '@/core/layout/Header';
import { Footer } from '@/core/layout/Footer';
import { setNavigator } from '@/core/auth/store';

/** Gives the store the router's navigate so `logout()` can do `router.navigate(['/'])`. */
function useStoreNavigator() {
  const navigate = useNavigate();
  useEffect(() => setNavigator(path => void navigate(path)), [navigate]);
}

/** App shell: header, routed page, footer. */
export function Layout() {
  useStoreNavigator();

  return (
    <>
      <Header />
      <Outlet />
      <Footer />
    </>
  );
}
