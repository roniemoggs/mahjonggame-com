// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Vite plugin to simulate Cloudflare Pages Functions (/functions/api/...) in local Astro dev server
 */
function cloudflarePagesFunctionsDevPlugin() {
  return {
    name: 'cloudflare-pages-functions-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/mahjong-matchmake')) {
          try {
            const { handleMatchmake } = await import('./functions/api/mahjong-matchmake.ts');
            let body = {};
            if (req.method === 'POST') {
              const buffers = [];
              for await (const chunk of req) {
                buffers.push(chunk);
              }
              const raw = Buffer.concat(buffers).toString();
              if (raw) {
                try {
                  body = JSON.parse(raw);
                } catch {}
              }
            } else if (req.method === 'GET') {
              const url = new URL(req.url, 'http://localhost:4321');
              url.searchParams.forEach((val, key) => {
                body[key] = val;
              });
            }
            const result = await handleMatchmake(body);
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.statusCode = 200;
            res.end(JSON.stringify(result));
            return;
          } catch (err) {
            console.error('Pages Functions dev middleware error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ status: 'error', message: err?.message || 'Server error' }));
            return;
          }
        }
        next();
      });
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: 'https://mahjong-game.com',
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  server: {
    host: true,
    port: 4321,
  },
  integrations: [react()],
  vite: {
    server: {
      cors: true,
    },
    plugins: [tailwindcss(), cloudflarePagesFunctionsDevPlugin()],
  },
});


