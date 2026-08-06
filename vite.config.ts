import { defineConfig, configDefaults } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_TARGET ?? 'http://localhost:3000'

  // React Router v7's package `exports` map points every condition at
  // `dist/development/*`, so a production build ships the dev bundle
  // (`ENABLE_DEV_WARNINGS = true` → per-navigation debug logging + overhead).
  // The `dist/production/*` build is byte-for-byte the same API with warnings
  // compiled out. Redirect the two bare specifiers used by react-router-dom
  // to it for `vite build` only — the dev server + vitest keep the dev
  // warnings. Verify after a build: the "Matched leaf route at location" debug
  // string must be absent from `dist/assets/*.js`.
  const reactRouterProdAliases =
    mode === 'production'
      ? [
          {
            find: /^react-router$/,
            replacement: path.resolve(
              __dirname,
              'node_modules/react-router/dist/production/index.mjs',
            ),
          },
          {
            find: /^react-router\/dom$/,
            replacement: path.resolve(
              __dirname,
              'node_modules/react-router/dist/production/dom-export.mjs',
            ),
          },
        ]
      : []

  return {
    plugins: [react()],
    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(__dirname, './src') },
        ...reactRouterProdAliases,
      ],
    },
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: false,
      // e2e/ holds Playwright specs (own runner) — keep them out of vitest.
      exclude: [...configDefaults.exclude, 'e2e/**'],
    },
  }
})
