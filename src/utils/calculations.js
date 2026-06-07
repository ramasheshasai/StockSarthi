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
    if (tx.type === 'dividend' || tx.type === 'split' || tx.type === 'bonus') continue
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

// ── Tax category ──────────────────────────────────────────────────────────────
export function taxCategory(firstBuyDate) {
  const days = (Date.now() - new Date(firstBuyDate).getTime()) / 86400_000
  return days >= 365 ? 'LTCG' : 'STCG'
}

// ── Capital gains (FIFO) ──────────────────────────────────────────────────────
export function capitalGainsSummary(transactions) {
  const buyQueues = {}, realised = []
  const sorted = [...transactions]
    .filter(t => t.type === 'buy' || t.type === 'sell')
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  for (const tx of sorted) {
    if (tx.type === 'buy') {
      ;(buyQueues[tx.symbol] = buyQueues[tx.symbol] ?? []).push({ qty: tx.qty, price: tx.price, date: tx.date })
    } else {
      let rem = tx.qty
      const q = buyQueues[tx.symbol] ?? []
      while (rem > 0 && q.length > 0) {
        const lot = q[0], matched = Math.min(rem, lot.qty)
        const days = (new Date(tx.date) - new Date(lot.date)) / 86400_000
        realised.push({ symbol: tx.symbol, qty: matched, buyPrice: lot.price,
          sellPrice: tx.price, gain: matched * (tx.price - lot.price),
          type: days >= 365 ? 'LTCG' : 'STCG', sellDate: tx.date })
        rem -= matched; lot.qty -= matched
        if (lot.qty <= 0) q.shift()
      }
    }
  }

  const ltcg = realised.filter(r => r.type === 'LTCG').reduce((s, r) => s + r.gain, 0)
  const stcg = realised.filter(r => r.type === 'STCG').reduce((s, r) => s + r.gain, 0)
  return {
    realised, ltcg, stcg,
    ltcgTax: Math.max(0, ltcg - 125000) * 0.125,
    stcgTax: Math.max(0, stcg) * 0.20,
    total: ltcg + stcg,
  }
}

// ── LTCG ₹1.25L Exemption tracker (FY Apr–Mar) ───────────────────────────────
export function ltcgExemptionStatus(realisedGains) {
  const now    = new Date()
  const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  const fyStart = new Date(`${fyYear}-04-01`)
  const fyEnd   = new Date(`${fyYear + 1}-03-31`)

  const fyLTCG = realisedGains
    .filter(r => r.type === 'LTCG' && r.gain > 0)
    .filter(r => { const d = new Date(r.sellDate); return d >= fyStart && d <= fyEnd })
    .reduce((s, r) => s + r.gain, 0)

  const EXEMPTION = 125000
  const used      = Math.min(fyLTCG, EXEMPTION)
  const remaining = Math.max(0, EXEMPTION - fyLTCG)
  const daysLeft  = Math.ceil((fyEnd.getTime() - now.getTime()) / 86400_000)

  return {
    used, remaining, daysLeft,
    pctUsed: Math.min(100, (fyLTCG / EXEMPTION) * 100),
    fyLabel: `FY ${fyYear}-${String(fyYear + 1).slice(2)}`,
    exemption: EXEMPTION,
  }
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

// ── Portfolio Health Score (0–100) ────────────────────────────────────────────
export function portfolioHealthScore({ holdings, prices, xirr, totalInvested }) {
  if (!holdings?.length) return null

  let score = 100
  const issues = [], positives = []

  // Diversification
  if (holdings.length < 3) { score -= 20; issues.push('Add more stocks — very concentrated') }
  else if (holdings.length < 6) { score -= 8; issues.push('Consider diversifying to 6+ stocks') }
  else positives.push(`Good spread across ${holdings.length} stocks`)

  // Single stock concentration
  const maxWeight = totalInvested > 0
    ? Math.max(...holdings.map(h => (h.totalInvested / totalInvested) * 100)) : 0
  if (maxWeight > 60) { score -= 18; issues.push(`${maxWeight.toFixed(0)}% in one stock — high single-stock risk`) }
  else if (maxWeight > 40) { score -= 8; issues.push('One stock exceeds 40% — consider trimming') }
  else positives.push('No single stock is over-concentrated')

  // Sector concentration
  const sectorMap = {}
  for (const h of holdings) {
    const s = h.sector ?? 'Uncategorised'
    sectorMap[s] = (sectorMap[s] ?? 0) + h.totalInvested
  }
  const maxSectorPct = totalInvested > 0
    ? Math.max(...Object.values(sectorMap)) / totalInvested * 100 : 0
  if (maxSectorPct > 60) { score -= 12; issues.push(`Sector concentration at ${maxSectorPct.toFixed(0)}%`) }
  else if (maxSectorPct > 40) { score -= 5; issues.push('One sector dominates your portfolio') }

  // XIRR vs benchmarks
  if (xirr !== null) {
    if (xirr < 0)   { score -= 15; issues.push('Overall portfolio in loss') }
    else if (xirr < 7)  { score -= 10; issues.push('Returns below FD rate (7%) — review holdings') }
    else if (xirr < 12) { score -= 4;  issues.push('Returns below Nifty long-term avg (12%)') }
    else if (xirr >= 15) positives.push(`Excellent XIRR of ${xirr.toFixed(1)}%`)
    else positives.push(`Healthy XIRR of ${xirr.toFixed(1)}%`)
  }

  // Long-term holding bonus
  const ltcgCount = holdings.filter(h => {
    if (!h.firstBuyDate) return false
    return (Date.now() - new Date(h.firstBuyDate).getTime()) / 86400_000 >= 365
  }).length
  if (ltcgCount > 0 && ltcgCount === holdings.length) {
    score += 5; positives.push('All holdings are LTCG eligible — tax efficient')
  } else if (ltcgCount > holdings.length / 2) {
    positives.push('Majority of holdings are long-term')
  }

  const final = Math.min(100, Math.max(0, score))
  const grade = final >= 80 ? 'Excellent' : final >= 65 ? 'Good' : final >= 50 ? 'Fair' : 'Needs Work'
  const color = final >= 80 ? '#22c55e' : final >= 65 ? '#6366f1' : final >= 50 ? '#f59e0b' : '#ef4444'

  return { score: final, grade, color, issues: issues.slice(0, 3), positives: positives.slice(0, 2) }
}

// ── Average Down Calculator ───────────────────────────────────────────────────
export function calcAverageDown({ currentQty, currentAvg, addQty, addPrice }) {
  const q = parseFloat(addQty), p = parseFloat(addPrice)
  if (!q || !p || q <= 0 || p <= 0) return null
  const newQty       = currentQty + q
  const newAvg       = (currentQty * currentAvg + q * p) / newQty
  const totalInvested = newQty * newAvg
  return { newQty, newAvg, totalInvested, addedCost: q * p }
}
