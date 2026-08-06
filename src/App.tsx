import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from '@/core/routing/routes';

const router = createBrowserRouter(routes);

export function App() {
  return <RouterProvider router={router} />;
}
