// ── XIRR ─────────────────────────────────────────────────────────────────────
export function calculateXIRR(cashflows, dates) {
  if (cashflows.length < 2) return null
  const t0    = Math.min(...dates.map(d => d.getTime()))
  const years = dates.map(d => (d.getTime() - t0) / (365.25 * 86400_000))
  const npv   = r => cashflows.reduce((s, cf, i) => s + cf / (1 + r) ** years[i], 0)
  const dnpv  = r => cashflows.reduce((s, cf, i) => s - years[i] * cf / (1 + r) ** (years[i] + 1), 0)
  let r = 0.1
  for (let i = 0; i < 300; i++) {
    const f = npv(r), df = dnpv(r)
    if (Math.abs(df) < 1e-10) break
    const r1 = r - f / df
    if (!isFinite(r1) || r1 <= -1) { r = Math.random() * 0.5; continue }
    if (Math.abs(r1 - r) < 1e-8) { r = r1; break }
    r = r1
  }
  return isFinite(r) && r > -1 ? r * 100 : null
}

export function portfolioXIRR(transactions, holdings, prices) {
  const cfs = [], dates = []
  for (const tx of transactions) {
    if (tx.type === 'dividend') continue
    cfs.push(tx.type === 'buy' ? -tx.qty * tx.price : tx.qty * tx.price)
    dates.push(new Date(tx.date))
  }
  let cv = 0
  for (const h of holdings) {
    const cp = prices[h.symbol]?.price
    cv += cp ? cp * h.qty : h.totalInvested
  }
  if (cv > 0) { cfs.push(cv); dates.push(new Date()) }
  return calculateXIRR(cfs, dates)
}

// ── Holding period ────────────────────────────────────────────────────────────
export function holdingPeriod(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400_000)
  const y = Math.floor(days / 365), m = Math.floor((days % 365) / 30)
  if (y > 0 && m > 0) return `${y}Y ${m}M`
  if (y > 0) return `${y}Y`
  if (m > 0) return `${m}M`
  return `${days}D`
}

// ── LTCG / STCG ───────────────────────────────────────────────────────────────
export function taxCategory(firstBuyDate) {
  const days = (Date.now() - new Date(firstBuyDate).getTime()) / 86400_000
  return days >= 365 ? 'LTCG' : 'STCG'
}

// ── Capital gains (FIFO) ──────────────────────────────────────────────────────
export function capitalGainsSummary(transactions) {
  const buyQueues = {}, realised = []
  for (const tx of [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date))) {
    if (tx.type === 'buy') {
      ;(buyQueues[tx.symbol] = buyQueues[tx.symbol] ?? []).push({ qty: tx.qty, price: tx.price, date: tx.date })
    } else if (tx.type === 'sell') {
      let rem = tx.qty
      const q = buyQueues[tx.symbol] ?? []
      while (rem > 0 && q.length > 0) {
        const lot = q[0], matched = Math.min(rem, lot.qty)
        const days = (new Date(tx.date) - new Date(lot.date)) / 86400_000
        realised.push({ symbol: tx.symbol, qty: matched, buyPrice: lot.price, sellPrice: tx.price,
          gain: matched * (tx.price - lot.price), type: days >= 365 ? 'LTCG' : 'STCG', sellDate: tx.date })
        rem -= matched; lot.qty -= matched
        if (lot.qty <= 0) q.shift()
      }
    }
  }
  const ltcg = realised.filter(r => r.type === 'LTCG').reduce((s, r) => s + r.gain, 0)
  const stcg = realised.filter(r => r.type === 'STCG').reduce((s, r) => s + r.gain, 0)
  return { realised, ltcg, stcg, ltcgTax: Math.max(0, ltcg - 125000) * 0.125, stcgTax: Math.max(0, stcg) * 0.20, total: ltcg + stcg }
}

// ── Portfolio timeline ────────────────────────────────────────────────────────
export function portfolioTimeline(transactions) {
  const sorted = [...transactions]
    .filter(t => t.type === 'buy' || t.type === 'sell')
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  if (sorted.length === 0) return []

  const dateMap = {}
  let invested = 0, proceeds = 0
  for (const tx of sorted) {
    if (tx.type === 'buy')  invested  += tx.qty * tx.price
    else                    proceeds  += tx.qty * tx.price
    dateMap[tx.date] = {
      date:     tx.date,
      label:    new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }),
      invested: +invested.toFixed(0),
      proceeds: +proceeds.toFixed(0),
      net:      +(invested - proceeds).toFixed(0),
    }
  }
  return Object.values(dateMap).sort((a, b) => new Date(a.date) - new Date(b.date))
}

// ── Sector concentration ──────────────────────────────────────────────────────
export function sectorConcentration(holdings, totalInvested) {
  const map = {}
  for (const h of holdings) {
    const s = h.sector ?? 'Uncategorised'
    map[s] = (map[s] ?? 0) + h.totalInvested
  }
  return Object.entries(map)
    .map(([sector, amount]) => ({ sector, amount, pct: totalInvested > 0 ? (amount / totalInvested) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount)
}
