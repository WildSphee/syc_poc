import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

function openaiDevProxy(env) {
  return {
    name: 'openai-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/openai/responses', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const apiKey = env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY;
        if (!apiKey) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing OPENAI_API_KEY or VITE_OPENAI_API_KEY' }));
          return;
        }

        try {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const body = Buffer.concat(chunks).toString('utf8');

          const upstream = await fetch(OPENAI_RESPONSES_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body,
          });

          const text = await upstream.text();
          res.statusCode = upstream.status;
          res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
          res.end(text);
        } catch (error) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: error?.message || String(error) }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), openaiDevProxy(env)],
    server: {
      host: true,
      port: 5173,
    },
  };
});
