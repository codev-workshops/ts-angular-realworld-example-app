import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Serves on the same port as the Angular app so the shared e2e suite needs no
// baseURL change; only one of the two apps runs at a time.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4200,
    strictPort: true,
    // The stylesheet is shared with the Angular app, one directory up.
    fs: { allow: ['..'] },
  },
});
