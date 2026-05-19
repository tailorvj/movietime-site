import netlify from '@astrojs/netlify'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

/** Netlify adapter only for `npm run build`, not for local `astro dev`. */
const isProductionBuild = process.env.npm_lifecycle_event === 'build'
/** Set in scripts/netlify-dev.sh — Astro runs behind Netlify Dev on :8888. */
const behindNetlifyDev = process.env.ASTRO_NETLIFY_DEV_PROXY === '1'

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 4321,
    strictPort: true,
  },
  // Dev toolbar loads @fs modules that Netlify Dev proxies poorly (ERR_CONTENT_LENGTH_MISMATCH).
  devToolbar: { enabled: false },
  ...(isProductionBuild ? { adapter: netlify() } : {}),
  vite: {
    plugins: [tailwindcss()],
    ...(behindNetlifyDev
      ? {
          server: {
            // Serve Vite assets from :4321 directly; avoids broken proxy for hoisted node_modules.
            origin: 'http://127.0.0.1:4321',
            fs: { allow: ['..', '../..'] },
          },
        }
      : {}),
  },
})
