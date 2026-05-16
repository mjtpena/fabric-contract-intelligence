import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env vars (including non-VITE_ prefixed) for the dev-server plugin
  const env = loadEnv(mode, process.cwd(), '');
  const isFabricDev = mode === 'dev';

  return {
    plugins: [
      react(),
      // Fabric DevGateway manifest endpoints — only active in `dev` mode (npm run dev:fabric)
      ...(isFabricDev ? [{
        name: 'fabric-dev-manifest',
        configureServer(server: { middlewares: { use: (p: string, h: (req: IncomingMessage, res: ServerResponse) => void) => void } }) {
          // GET /manifests_new/metadata — workload dev parameters consumed by the Fabric portal
          server.middlewares.use('/manifests_new/metadata', (_req: IncomingMessage, res: ServerResponse) => {
            const devParams = {
              name: env.WORKLOAD_NAME ?? 'Org.Orqentis',
              url: 'http://127.0.0.1:60006',
              devAADAppConfig: {
                audience: env.DEV_AAD_CONFIG_AUDIENCE ?? '',
                appId: env.DEV_AAD_CONFIG_APPID ?? '',
                redirectUri: env.DEV_AAD_CONFIG_REDIRECT_URI ?? 'http://localhost:60006/close',
              },
            };
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            });
            res.end(JSON.stringify({ extension: devParams }));
          });

          // GET /manifests_new — serves the pre-built NuGet manifest package to DevGateway / Fabric portal
          server.middlewares.use('/manifests_new', (_req: IncomingMessage, res: ServerResponse) => {
            const pkgPath = path.resolve(__dirname, 'tools/dist/ManifestPackage.nupkg');
            if (!fs.existsSync(pkgPath)) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Manifest package not found. Run: npm run build:dev-manifest' }));
              return;
            }
            const pkgBuffer = fs.readFileSync(pkgPath);
            res.writeHead(200, {
              'Content-Type': 'application/octet-stream',
              'Content-Disposition': 'attachment; filename="ManifestPackage.nupkg"',
              'Access-Control-Allow-Origin': '*',
              'Content-Length': String(pkgBuffer.length),
            });
            res.end(pkgBuffer);
          });
        },
      }] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: isFabricDev ? 60006 : 5173,
      strictPort: true,
      cors: true,
      headers: isFabricDev ? {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      } : {},
    },
    build: {
      outDir: 'dist',
      sourcemap: mode === 'production' ? false : true,
      target: 'es2022',
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      exclude: ['**/node_modules/**', '**/e2e/**', '**/dist/**'],
      alias: [
        // @/monaco/setup uses ?worker imports that can't run in JSDOM; stub out the whole module.
        // Must come BEFORE the generic '@' alias so the longer path wins.
        { find: /^@\/monaco\/setup/, replacement: path.resolve(__dirname, './src/test/mocks/monaco-setup.ts') },
        // Monaco editor API import used by loader.config({ monaco }) — redirect to a shape-compatible stub.
        { find: /^monaco-editor\/esm\/vs\/editor\/editor\.api(\.js)?$/, replacement: path.resolve(__dirname, './src/test/mocks/monaco-editor.ts') },
        // monaco-editor sub-path imports (e.g. esm/vs/.../editor.worker) — redirect to empty stub.
        // The ?worker Vite query is stripped before alias matching.
        { find: /^monaco-editor\//, replacement: path.resolve(__dirname, './src/test/mocks/empty-module.ts') },
        // Bare monaco-editor import used in loader.config({ monaco }) — redirect to a shape-compatible stub.
        { find: 'monaco-editor', replacement: path.resolve(__dirname, './src/test/mocks/monaco-editor.ts') },
        // monaco-yaml uses DOM/worker APIs incompatible with JSDOM.
        { find: 'monaco-yaml', replacement: path.resolve(__dirname, './src/test/mocks/monaco-yaml.ts') },
        // Standard path alias (must come AFTER the more-specific @/monaco/setup override above).
        { find: '@', replacement: path.resolve(__dirname, './src') },
      ],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary'],
        include: ['src/components/ContractEditor/**/*.tsx'],
        thresholds: {
          lines: 80,
          statements: 80,
          functions: 80,
          branches: 70,
        },
      },
    },
  };
});

