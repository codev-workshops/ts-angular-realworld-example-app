import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { initAuth } from './core/auth/init';
import './styles.css';

// provideAppInitializer(initAuth): installs window.__conduit_debug__ and validates the
// stored token. Not awaited, so the shell renders while GET /user is in flight.
initAuth();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
