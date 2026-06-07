const KEYS = {
  transactions: 'ss_tx',
  prices:       'ss_prices',
  watchlist:    'ss_watchlist',
  sectors:      'ss_sectors',
}

function load(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
function save(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
}

// ── Sectors ──────────────────────────────────────────────────────────────────
export function getSectors() {
  try { return JSON.parse(localStorage.getItem(KEYS.sectors)) ?? {} } catch { return {} }
}
export function setSector(symbol, sector) {
  const m = getSectors(); m[symbol] = sector
  try { localStorage.setItem(KEYS.sectors, JSON.stringify(m)) } catch {}
}

// ── Transactions ──────────────────────────────────────────────────────────────
export function getTransactions() { return load(KEYS.transactions) }

export function addTransaction(tx) {
  const item = { ...tx, id: Date.now().toString() }
  save(KEYS.transactions, [item, ...getTransactions()])
  if (tx.sector && tx.symbol) setSector(tx.symbol, tx.sector)
  return item
}

export function deleteTransaction(id) {
  save(KEYS.transactions, getTransactions().filter(t => t.id !== id))
}

// ── Holdings (derived) ────────────────────────────────────────────────────────
export function getHoldings() {
  const txs     = getTransactions()
  const sectors = getSectors()
  const map     = {}

  for (const t of txs) {
    if (t.type === 'dividend') continue
    if (!map[t.symbol]) map[t.symbol] = { symbol: t.symbol, name: t.name, buys: [], sells: [] }
    if (t.type === 'buy') map[t.symbol].buys.push(t)
    else                   map[t.symbol].sells.push(t)
  }

  // Dividends grouped by symbol
  const divMap = {}
  txs.filter(t => t.type === 'dividend').forEach(t => {
    ;(divMap[t.symbol] = divMap[t.symbol] ?? []).push(t)
  })

  return Object.values(map).map(h => {
    const totalBoughtQty  = h.buys.reduce((s, t) => s + t.qty, 0)
    const totalSoldQty    = h.sells.reduce((s, t) => s + t.qty, 0)
    const netQty          = totalBoughtQty - totalSoldQty
    const totalInvested   = h.buys.reduce((s, t) => s + t.qty * t.price, 0)
    const totalSoldValue  = h.sells.reduce((s, t) => s + t.qty * t.price, 0)
    const avgBuyPrice     = totalBoughtQty > 0 ? totalInvested / totalBoughtQty : 0

    // Break-even: what price remaining shares need to reach to recover all cost
    const breakEven = netQty > 0 ? (totalInvested - totalSoldValue) / netQty : null

    // SIP
    const sipBuys     = h.buys.filter(t => t.isSip)
    const isSip       = sipBuys.length > 0
    const sipCount    = sipBuys.length
    const sipStart    = sipBuys.length ? sipBuys.map(t => t.date).sort()[0] : null
    const sipTotalQty = sipBuys.reduce((s, t) => s + t.qty, 0)
    const sipAvg      = sipTotalQty > 0
      ? sipBuys.reduce((s, t) => s + t.qty * t.price, 0) / sipTotalQty
      : 0

    // Dividends
    const divs           = divMap[h.symbol] ?? []
    const totalDividends = divs.reduce((s, d) => s + (d.amount ?? d.price), 0)
    const oneYrAgo       = new Date(); oneYrAgo.setFullYear(oneYrAgo.getFullYear() - 1)
    const annualDivs     = divs
      .filter(d => new Date(d.date) >= oneYrAgo)
      .reduce((s, d) => s + (d.amount ?? d.price), 0)
    const divYieldOnCost = avgBuyPrice > 0 ? (annualDivs / avgBuyPrice) * 100 : 0

    return {
      symbol: h.symbol, name: h.name,
      sector: sectors[h.symbol] ?? null,
      qty: netQty, avgBuyPrice, totalInvested, totalSoldValue,
      breakEven,
      isSip, sipCount, sipStart, sipAvg,
      totalDividends, divYieldOnCost,
      txCount: h.buys.length + h.sells.length,
    }
  }).filter(h => h.qty > 0).sort((a, b) => b.totalInvested - a.totalInvested)
}

// ── Current prices ────────────────────────────────────────────────────────────
export function getPrices() {
  try { return JSON.parse(localStorage.getItem(KEYS.prices)) ?? {} } catch { return {} }
}
export function setPrice(symbol, price) {
  const m = getPrices(); m[symbol] = { price: Number(price), updatedAt: new Date().toLocaleDateString('en-IN') }
  try { localStorage.setItem(KEYS.prices, JSON.stringify(m)) } catch {}
}

// ── Watchlist ─────────────────────────────────────────────────────────────────
export function getWatchlist() { return load(KEYS.watchlist) }
export function addWatchlistItem(item) {
  const entry = { ...item, id: Date.now().toString(), addedDate: new Date().toLocaleDateString('en-IN') }
  save(KEYS.watchlist, [entry, ...getWatchlist()])
  return entry
}
export function deleteWatchlistItem(id) {
  save(KEYS.watchlist, getWatchlist().filter(w => w.id !== id))
}
export function updateWatchlistItem(id, updates) {
  save(KEYS.watchlist, getWatchlist().map(w => w.id === id ? { ...w, ...updates } : w))
}
