// Module-level session — persists between invocations on the same edge node
let session = { cookie: '', crumb: '', ts: 0 }
const SESSION_TTL = 50 * 60 * 1000 // refresh every 50 min
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function refreshSession() {
  try {
    // Step 1 — visit finance.yahoo.com to get session cookies
    const homeRes = await fetch('https://finance.yahoo.com/', {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })

    // Parse all Set-Cookie headers (getSetCookie is standard in Deno)
    const setCookies =
      typeof homeRes.headers.getSetCookie === 'function'
        ? homeRes.headers.getSetCookie()
        : (homeRes.headers.get('set-cookie') || '').split(/,(?=[^ ])/)
    const cookie = setCookies.map((c) => c.split(';')[0].trim()).join('; ')

    // Step 2 — exchange cookies for a crumb
    for (const host of ['query2.finance.yahoo.com', 'query1.finance.yahoo.com']) {
      const r = await fetch(`https://${host}/v1/test/getcrumb`, {
        headers: { 'User-Agent': UA, Cookie: cookie, Accept: 'text/plain' },
      })
      const crumb = (await r.text()).trim()
      if (crumb && crumb.length < 50 && !crumb.includes('<') && !crumb.toLowerCase().includes('too many')) {
        session = { cookie, crumb, ts: Date.now() }
        return session
      }
    }
  } catch {}
  return session
}

async function getSession() {
  if (session.crumb && Date.now() - session.ts < SESSION_TTL) return session
  return refreshSession()
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
  const url = new URL(request.url)
  const yahooPath = url.pathname.replace(/^\/yahoo/, '')

  // Append crumb to query string
  if (sess.crumb) url.searchParams.set('crumb', sess.crumb)
  const yahooUrl = `https://query2.finance.yahoo.com${yahooPath}?${url.searchParams.toString()}`

  try {
    const res = await fetch(yahooUrl, {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json, */*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://finance.yahoo.com/',
        'Origin': 'https://finance.yahoo.com',
        ...(sess.cookie ? { Cookie: sess.cookie } : {}),
      },
    })

    // If 401/403, the crumb may have expired — refresh once and retry
    if (res.status === 401 || res.status === 403) {
      session = { cookie: '', crumb: '', ts: 0 } // force refresh
      const freshSess = await refreshSession()
      if (freshSess.crumb) url.searchParams.set('crumb', freshSess.crumb)
      const retryUrl = `https://query2.finance.yahoo.com${yahooPath}?${url.searchParams.toString()}`
      const retryRes = await fetch(retryUrl, {
        headers: {
          'User-Agent': UA,
          'Accept': 'application/json, */*',
          'Referer': 'https://finance.yahoo.com/',
          ...(freshSess.cookie ? { Cookie: freshSess.cookie } : {}),
        },
      })
      const body = await retryRes.text()
      return new Response(body, {
        status: retryRes.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60' },
      })
    }

    const body = await res.text()
    return new Response(body, {
      status: res.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}

export const config = { path: '/yahoo/*' }
