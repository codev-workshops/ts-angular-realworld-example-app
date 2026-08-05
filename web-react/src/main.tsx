import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { initAuth } from './core/auth/initAuth';
import './styles.css';

/**
 * Orchestrator-owned bootstrap. Wave 1 adds the `initAuth()` startup gate and
 * the `window.__conduit_debug__` installation here.
 */
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

// Installs `window.__conduit_debug__` and kicks off the (non-blocking) auth check.
initAuth(to => void router.navigate(to));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
