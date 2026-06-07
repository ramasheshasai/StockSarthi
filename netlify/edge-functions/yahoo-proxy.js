// Netlify Edge Function — yahoo-proxy.js
// Proxies /yahoo/* → query2.finance.yahoo.com with cookie + crumb auth
// Module-level session persists between invocations on the same edge node

let session = { cookie: '', crumb: '', ts: 0 }
const SESSION_TTL = 45 * 60 * 1000
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function parseCookies(headers) {
  const setCookies =
    typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : (headers.get('set-cookie') || '').split(/,(?=[^ ])/)
  return setCookies
    .map((c) => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ')
}

async function refreshSession() {
  let cookie = ''

  // Method 1: fc.yahoo.com — the dedicated consent/cookie endpoint (most reliable)
  try {
    const fcRes = await fetch('https://fc.yahoo.com/', {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })
    cookie = parseCookies(fcRes.headers)
  } catch {}

  // Method 2: fallback to finance.yahoo.com home page
  if (!cookie) {
    try {
      const homeRes = await fetch('https://finance.yahoo.com/', {
        headers: {
          'User-Agent': UA,
          'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
      })
      cookie = parseCookies(homeRes.headers)
    } catch {}
  }

  // Exchange cookies for a crumb
  for (const host of ['query2.finance.yahoo.com', 'query1.finance.yahoo.com']) {
    try {
      const r = await fetch(`https://${host}/v1/test/getcrumb`, {
        headers: {
          'User-Agent': UA,
          'Cookie': cookie,
          'Accept': 'text/plain',
          'Referer': 'https://finance.yahoo.com/',
        },
      })
      const crumb = (await r.text()).trim()
      if (
        crumb &&
        crumb.length < 50 &&
        !crumb.includes('<') &&
        !crumb.toLowerCase().includes('too many') &&
        !crumb.toLowerCase().includes('error') &&
        !crumb.toLowerCase().includes('unauthorized')
      ) {
        session = { cookie, crumb, ts: Date.now() }
        return session
      }
    } catch {}
  }

  // Return whatever we have (stale is better than nothing)
  return session
}

async function getSession() {
  if (session.crumb && Date.now() - session.ts < SESSION_TTL) return session
  return refreshSession()
}

function buildYahooUrl(path, searchParams, crumb) {
  const params = new URLSearchParams(searchParams)
  if (crumb) params.set('crumb', crumb)
  return `https://query2.finance.yahoo.com${path}?${params.toString()}`
}

async function yahooFetch(url, cookie) {
  return fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'application/json, */*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://finance.yahoo.com/',
      'Origin': 'https://finance.yahoo.com',
      ...(cookie ? { Cookie: cookie } : {}),
    },
  })
}

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    })
  }

  const sess = await getSession()
  const reqUrl = new URL(request.url)
  const yahooPath = reqUrl.pathname.replace(/^\/yahoo/, '')

  let yahooUrl = buildYahooUrl(yahooPath, reqUrl.searchParams, sess.crumb)

  try {
    let res = await yahooFetch(yahooUrl, sess.cookie)

    // On 401/403 the crumb has expired — force refresh and retry once
    if (res.status === 401 || res.status === 403) {
      session = { cookie: '', crumb: '', ts: 0 }
      const freshSess = await refreshSession()
      if (freshSess.crumb) {
        yahooUrl = buildYahooUrl(yahooPath, reqUrl.searchParams, freshSess.crumb)
        res = await yahooFetch(yahooUrl, freshSess.cookie)
      }
    }

    const body = await res.text()
    return new Response(body, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}

export const config = { path: '/yahoo/*' }
