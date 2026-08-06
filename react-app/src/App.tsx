import { lazy, Suspense, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './core/auth/auth-context';
import { Header } from './core/layout/Header';
import { Footer } from './core/layout/Footer';
import { ProfilePage } from './features/profile/pages/ProfilePage';

const HomePage = lazy(() => import('./features/article/pages/HomePage'));
const AuthPage = lazy(() => import('./core/auth/AuthPage'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));
const EditorPage = lazy(() => import('./features/article/pages/EditorPage'));
const ArticlePage = lazy(() => import('./features/article/pages/ArticlePage'));
const ProfileArticles = lazy(() => import('./features/profile/components/ProfileArticles'));
const ProfileFavorites = lazy(() => import('./features/profile/components/ProfileFavorites'));

/**
 * Angular runs guards when a route is entered, not continuously. Capturing the
 * decision on mount keeps that behaviour: logging out while on /settings leaves
 * the page up until the component navigates away itself.
 */
function useGuardDecision(pass: boolean): boolean {
  const [decision] = useState(pass);
  return decision;
}

/** Angular `requireAuth` guard: redirects to /login when unauthenticated. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return useGuardDecision(isAuthenticated) ? children : <Navigate to="/login" replace />;
}

/**
 * Angular guard on /login and /register. Angular cancels the navigation when the
 * user is already authenticated, which leaves the URL untouched and no routed
 * component rendered; that is reproduced here.
 */
function RequireAnonymous({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return useGuardDecision(!isAuthenticated) ? children : null;
}

export function App() {
  return (
    <>
      <Header />

      {/* Angular leaves the (empty) <router-outlet> element in the DOM and
          renders the routed component as its next sibling. */}
      <router-outlet></router-outlet>

      <Suspense fallback={null}>
        <Routes>
          {/* Distinct keys: Angular creates a new component instance when the
              matched route changes, which also drops DOM focus. */}
          <Route path="/" element={<HomePage key="home" />} />
          <Route path="/tag/:tag" element={<HomePage key="tag" />} />
          <Route
            path="/login"
            element={
              <RequireAnonymous key="login">
                <AuthPage />
              </RequireAnonymous>
            }
          />
          <Route
            path="/register"
            element={
              <RequireAnonymous key="register">
                <AuthPage />
              </RequireAnonymous>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            }
          />
          <Route path="/profile/:username" element={<ProfilePage />}>
            <Route index element={<ProfileArticles key="profile-articles" />} />
            <Route path="favorites" element={<ProfileFavorites key="profile-favorites" />} />
          </Route>
          <Route
            path="/editor"
            element={
              <RequireAuth key="editor-new">
                <EditorPage />
              </RequireAuth>
            }
          />
          <Route
            path="/editor/:slug"
            element={
              <RequireAuth key="editor-edit">
                <EditorPage />
              </RequireAuth>
            }
          />
          <Route path="/article/:slug" element={<ArticlePage />} />
        </Routes>
      </Suspense>

      <Footer />
    </>
  );
}
