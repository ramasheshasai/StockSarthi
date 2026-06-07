import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Dev-only plugin: intercepts /yahoo/* and injects Yahoo crumb + cookies
// (The production equivalent is netlify/edge-functions/yahoo-proxy.js)
function yahooDevProxy() {
  let session = { cookie: '', crumb: '', ts: 0 }
  const SESSION_TTL = 45 * 60 * 1000
  const UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

  async function refreshSession() {
    let cookie = ''
    try {
      // fc.yahoo.com is the most reliable source of fresh Yahoo cookies
      const fcRes = await fetch('https://fc.yahoo.com/', {
        headers: { 'User-Agent': UA, Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
        redirect: 'follow',
      })
      const raw = fcRes.headers.get('set-cookie') || ''
      cookie = raw
        .split(/,(?=[^ ])/)
        .map((c) => c.split(';')[0].trim())
        .filter(Boolean)
        .join('; ')
    } catch {}

    if (!cookie) {
      try {
        const homeRes = await fetch('https://finance.yahoo.com/', {
          headers: { 'User-Agent': UA, Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
          redirect: 'follow',
        })
        const raw = homeRes.headers.get('set-cookie') || ''
        cookie = raw
          .split(/,(?=[^ ])/)
          .map((c) => c.split(';')[0].trim())
          .filter(Boolean)
          .join('; ')
      } catch {}
    }

    for (const host of ['query2.finance.yahoo.com', 'query1.finance.yahoo.com']) {
      try {
        const r = await fetch(`https://${host}/v1/test/getcrumb`, {
          headers: { 'User-Agent': UA, Cookie: cookie, Accept: 'text/plain', Referer: 'https://finance.yahoo.com/' },
        })
        const crumb = (await r.text()).trim()
        if (crumb && crumb.length < 50 && !crumb.includes('<') && !crumb.toLowerCase().includes('error')) {
          session = { cookie, crumb, ts: Date.now() }
          console.log('[yahoo-dev] crumb acquired ✓')
          return session
        }
      } catch {}
    }
    console.warn('[yahoo-dev] crumb acquisition failed, requests may 401')
    return session
  }

  async function getSession() {
    if (session.crumb && Date.now() - session.ts < SESSION_TTL) return session
    return refreshSession()
  }

  return {
    name: 'yahoo-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/yahoo', async (req, res) => {
        const sess = await getSession()

        // Build upstream URL with crumb
        const [pathname, qs = ''] = req.url.split('?')
        const params = new URLSearchParams(qs)
        if (sess.crumb) params.set('crumb', sess.crumb)
        let upstreamUrl = `https://query2.finance.yahoo.com${pathname}?${params.toString()}`

        const doFetch = async (url, cookie) =>
          fetch(url, {
            headers: {
              'User-Agent': UA,
              Accept: 'application/json, */*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              Referer: 'https://finance.yahoo.com/',
              Origin: 'https://finance.yahoo.com',
              ...(cookie ? { Cookie: cookie } : {}),
            },
          })

        try {
          let upstream = await doFetch(upstreamUrl, sess.cookie)

          // On 401/403, refresh session and retry once
          if (upstream.status === 401 || upstream.status === 403) {
            session = { cookie: '', crumb: '', ts: 0 }
            const fresh = await refreshSession()
            if (fresh.crumb) {
              params.set('crumb', fresh.crumb)
              upstreamUrl = `https://query2.finance.yahoo.com${pathname}?${params.toString()}`
              upstream = await doFetch(upstreamUrl, fresh.cookie)
            }
          }

          const body = await upstream.text()
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.statusCode = upstream.status
          res.end(body)
        } catch (e) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: e.message }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    yahooDevProxy(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'StockSarthi',
        short_name: 'StockSarthi',
        description: 'Your Indian Stock Market Companion',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /\/yahoo\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'yahoo-finance-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 300 },
              networkTimeoutSeconds: 12,
            },
          },
        ],
      },
    }),
  ],
})
