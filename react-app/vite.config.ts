import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Angular app owns port 4200; the React port is distinct so both can run side by side
// while the parity harness drives them.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4300,
    strictPort: true,
  },
  preview: {
    port: 4300,
    strictPort: true,
  },
});
