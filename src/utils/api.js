import axios from 'axios'

// Dev:  /yahoo/* → Vite proxy → query2.finance.yahoo.com
// Prod: /yahoo/* → Netlify Edge Function → query2.finance.yahoo.com (clean IPs + browser headers)
const BASE = '/yahoo'
const CACHE_TTL = 60_000
const CACHE_KEY = 'ss_'

function readCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_KEY + key)
    if (!raw) return { fresh: null, stale: null }
    const { data, ts } = JSON.parse(raw)
    return { fresh: Date.now() - ts < CACHE_TTL ? data : null, stale: data }
  } catch { return { fresh: null, stale: null } }
}

function writeCache(key, data) {
  try { localStorage.setItem(CACHE_KEY + key, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

const client = axios.create({ timeout: 14_000 })

// Normalize v8/spark result into same shape as v7/quote result
function sparkToQuotes(sparkResults = []) {
  return sparkResults.map((item) => {
    const meta = item.response?.[0]?.meta ?? {}
    const price = meta.regularMarketPrice ?? 0
    const prev = meta.chartPreviousClose ?? meta.previousClose ?? price
    return {
      symbol: item.symbol,
      shortName: meta.longName ?? meta.shortName ?? item.symbol.replace(/\.(NS|BO)$/, ''),
      regularMarketPrice: price,
      regularMarketChange: price - prev,
      regularMarketChangePercent: prev ? ((price - prev) / prev) * 100 : 0,
      regularMarketVolume: meta.regularMarketVolume ?? 0,
    }
  })
}

export async function fetchQuotes(symbols) {
  const key = `q_${symbols.join(',')}`
  const { fresh, stale } = readCache(key)
  if (fresh) return fresh

  // Primary: v7 quote (batch, has change%, shortName)
  try {
    const { data } = await client.get(`${BASE}/v7/finance/quote`, {
      params: { symbols: symbols.join(',') },
    })
    const result = data.quoteResponse?.result ?? []
    if (result.length > 0) { writeCache(key, result); return result }
  } catch { /* fall through */ }

  // Fallback: v8 spark (no crumb needed)
  try {
    const { data } = await client.get(`${BASE}/v8/finance/spark`, {
      params: { symbols: symbols.join(','), range: '1d', interval: '5m' },
    })
    const result = sparkToQuotes(data.spark?.result ?? [])
    if (result.length > 0) { writeCache(key, result); return result }
  } catch { /* fall through */ }

  if (stale) return stale
  throw new Error('Unable to fetch market data. The app works when deployed to Netlify.')
}

export async function fetchChart(symbol, interval = '1d', range = '1mo') {
  const key = `c_${symbol}_${interval}_${range}`
  const { fresh, stale } = readCache(key)
  if (fresh) return fresh

  try {
    const { data } = await client.get(`${BASE}/v8/finance/chart/${encodeURIComponent(symbol)}`, {
      params: { interval, range, includePrePost: false },
    })
    const result = data.chart?.result?.[0]
    if (!result) throw new Error('No chart data')
    writeCache(key, result)
    return result
  } catch {
    if (stale) return stale
    throw new Error('Failed to load chart data.')
  }
}
