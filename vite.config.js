import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Front-end-only POC. Note: VITE_OPENAI_API_KEY is bundled into the client —
// acceptable for a local demo only, never for production.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
});
