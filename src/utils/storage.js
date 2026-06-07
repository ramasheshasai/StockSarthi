const KEYS = {
  transactions: 'ss_tx',
  prices:       'ss_prices',
  watchlist:    'ss_watchlist',
  sectors:      'ss_sectors',
  notes:        'ss_notes',
}

function load(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
function loadObj(key) {
  try { return JSON.parse(localStorage.getItem(key)) ?? {} } catch { return {} }
}
function save(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
}

// ── Sectors ───────────────────────────────────────────────────────────────────
export function getSectors() { return loadObj(KEYS.sectors) }
export function setSector(symbol, sector) {
  const m = getSectors(); m[symbol] = sector; save(KEYS.sectors, m)
}

// ── Notes per stock ───────────────────────────────────────────────────────────
export function getNotes() { return loadObj(KEYS.notes) }
export function setNote(symbol, text) {
  const m = getNotes(); m[symbol] = text; save(KEYS.notes, m)
}

// ── Transactions ──────────────────────────────────────────────────────────────
export function getTransactions() { return load(KEYS.transactions) }

export function addTransaction(tx) {
  const item = { ...tx, id: tx.id ?? Date.now().toString() }
  save(KEYS.transactions, [item, ...getTransactions()])
  if (tx.sector && tx.symbol) setSector(tx.symbol, tx.sector)
  return item
}

export function deleteTransaction(id) {
  save(KEYS.transactions, getTransactions().filter(t => t.id !== id))
}

// ── Core holdings calculation (handles buy/sell/split/bonus) ─────────────────
function processSymbol(symbol, allTxs, sectors, notes) {
  const txs    = allTxs.filter(t => t.symbol === symbol && t.type !== 'dividend')
  const divTxs = allTxs.filter(t => t.symbol === symbol && t.type === 'dividend')
  const sorted = [...txs].sort((a, b) => new Date(a.date) - new Date(b.date))

  const name    = sorted.find(t => t.name)?.name ?? symbol
  let qty       = 0   // current running qty (post-splits)
  let costBasis = 0   // total money still "in" the stock
  let totalSoldValue = 0
  let realizedPnl    = 0
  const buyTxs = [], sellTxs = [], sipBuys = []

  for (const tx of sorted) {
    if (tx.type === 'buy') {
      qty       += tx.qty
      costBasis += tx.qty * tx.price
      buyTxs.push(tx)
      if (tx.isSip) sipBuys.push(tx)
    } else if (tx.type === 'sell') {
      const avgCostNow = qty > 0 ? costBasis / qty : 0
      const soldCost   = tx.qty * avgCostNow
      realizedPnl      += tx.qty * tx.price - soldCost
      costBasis        -= soldCost
      totalSoldValue   += tx.qty * tx.price
      qty              -= tx.qty
      sellTxs.push(tx)
    } else if (tx.type === 'split') {
      const [n, d] = tx.ratio ?? [2, 1]
      qty = qty * (n / d)          // more shares, same money
    } else if (tx.type === 'bonus') {
      const [b, e] = tx.ratio ?? [1, 1]
      qty = qty + qty * (b / e)    // extra free shares
    }
  }

  qty = Math.round(qty * 10000) / 10000

  // SIP summary
  const sipTotalQty = sipBuys.reduce((s, t) => s + t.qty, 0)
  const sipAvg      = sipTotalQty > 0
    ? sipBuys.reduce((s, t) => s + t.qty * t.price, 0) / sipTotalQty : 0
  const sipStart    = sipBuys.length ? sipBuys.map(t => t.date).sort()[0] : null

  // Dividends
  const totalDividends = divTxs.reduce((s, d) => s + (d.amount ?? d.price ?? 0), 0)
  const oneYrAgo       = new Date(); oneYrAgo.setFullYear(oneYrAgo.getFullYear() - 1)
  const annualDivs     = divTxs
    .filter(d => new Date(d.date) >= oneYrAgo)
    .reduce((s, d) => s + (d.amount ?? d.price ?? 0), 0)

  const avgPrice       = qty > 0 ? costBasis / qty : 0
  const divYieldOnCost = avgPrice > 0 ? (annualDivs / avgPrice) * 100 : 0
  const firstBuyDate   = buyTxs.map(t => t.date).sort()[0] ?? null
  const lastSellDate   = sellTxs.map(t => t.date).sort().reverse()[0] ?? null

  return {
    symbol, name,
    sector:         sectors[symbol] ?? null,
    notes:          notes[symbol] ?? '',
    qty, avgPrice,
    totalInvested:  costBasis,
    costBasis,
    totalSoldValue,
    realizedPnl,
    breakEven:      qty > 0 ? costBasis / qty : null,
    isSip:          sipBuys.length > 0,
    sipCount:       sipBuys.length,
    sipStart,
    sipAvg,
    totalDividends, divYieldOnCost,
    txCount:        buyTxs.length + sellTxs.length,
    hasSplit:       sorted.some(t => t.type === 'split' || t.type === 'bonus'),
    firstBuyDate,
    lastSellDate,
  }
}

export function getHoldings() {
  const txs     = getTransactions()
  const sectors = getSectors()
  const notes   = getNotes()
  const symbols = [...new Set(txs.filter(t => t.type !== 'dividend').map(t => t.symbol))]
  return symbols
    .map(sym => processSymbol(sym, txs, sectors, notes))
    .filter(h => h.qty > 0.001)
    .sort((a, b) => b.totalInvested - a.totalInvested)
}

export function getClosedPositions() {
  const txs     = getTransactions()
  const sectors = getSectors()
  const notes   = getNotes()
  const symbols = [...new Set(txs.filter(t => t.type !== 'dividend').map(t => t.symbol))]
  return symbols
    .map(sym => processSymbol(sym, txs, sectors, notes))
    .filter(h => h.qty <= 0.001 && h.txCount > 0)
    .sort((a, b) => new Date(b.lastSellDate) - new Date(a.lastSellDate))
}

// ── Current prices ────────────────────────────────────────────────────────────
export function getPrices() { return loadObj(KEYS.prices) }
export function setPrice(symbol, price) {
  const m    = getPrices()
  m[symbol]  = { price: Number(price), updatedAt: new Date().toLocaleDateString('en-IN'), updatedTs: Date.now() }
  save(KEYS.prices, m)
}

// ── Watchlist ─────────────────────────────────────────────────────────────────
export function getWatchlist() { return load(KEYS.watchlist) }
export function addWatchlistItem(item) {
  const entry = { ...item, id: Date.now().toString(), addedDate: new Date().toLocaleDateString('en-IN') }
  save(KEYS.watchlist, [entry, ...getWatchlist()])
  return entry
}
export function deleteWatchlistItem(id) { save(KEYS.watchlist, getWatchlist().filter(w => w.id !== id)) }
export function updateWatchlistItem(id, updates) {
  save(KEYS.watchlist, getWatchlist().map(w => w.id === id ? { ...w, ...updates } : w))
}
