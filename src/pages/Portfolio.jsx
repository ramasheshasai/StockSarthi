import { useState, useMemo } from 'react'
import { Plus, ChevronDown, ChevronUp, Trash2, TrendingUp, Edit3, Clock, Repeat2, Gift, Target } from 'lucide-react'
import { getHoldings, getPrices, setPrice, addTransaction, deleteTransaction, getTransactions } from '../utils/storage'
import { formatCurrency } from '../utils/format'
import { holdingPeriod, taxCategory } from '../utils/calculations'
import AddTransactionModal from '../components/AddTransactionModal'

const SECTOR_COLORS = {
  'IT / Technology': '#6366f1',
  'Banking & Finance': '#06b6d4',
  'Pharma & Healthcare': '#22c55e',
  'FMCG': '#f59e0b',
  'Auto': '#f97316',
  'Energy & Oil': '#ef4444',
  'Infrastructure': '#8b5cf6',
  'Metals & Mining': '#64748b',
  'Chemicals': '#84cc16',
  'Telecom': '#ec4899',
  'Defence': '#14b8a6',
  'Others': '#94a3b8',
}

function getSectorColor(sector) { return SECTOR_COLORS[sector] ?? '#6366f1' }

function PriceInput({ symbol, prices, onSave }) {
  const [open, setOpen] = useState(false)
  const [val, setVal]   = useState(prices[symbol]?.price ?? '')
  const current         = prices[symbol]?.price
  const updatedAt       = prices[symbol]?.updatedAt

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-1.5 text-xs text-[#6366f1] font-semibold">
      <Edit3 size={11} />
      {current ? `CMP ₹${current.toLocaleString('en-IN')} · ${updatedAt}` : 'Set current price →'}
    </button>
  )

  return (
    <form className="flex items-center gap-2" onSubmit={e => {
      e.preventDefault()
      const n = parseFloat(val)
      if (n > 0) { setPrice(symbol, n); onSave() }
      setOpen(false)
    }}>
      <span className="text-[#475569] text-sm">₹</span>
      <input autoFocus type="number" value={val} onChange={e => setVal(e.target.value)}
        placeholder="current price" step="any"
        className="w-28 bg-[#0a0f1e] border border-[#6366f1] rounded-xl px-3 py-1.5 text-[#f1f5f9] text-sm focus:outline-none font-data" />
      <button type="submit" className="text-sm font-bold text-[#22c55e]">✓</button>
      <button type="button" onClick={() => setOpen(false)} className="text-sm text-[#475569]">✕</button>
    </form>
  )
}

function HoldingCard({ holding, prices, totalPortfolio, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [tick, setTick] = useState(0)

  const txs = useMemo(() =>
    getTransactions()
      .filter(t => t.symbol === holding.symbol)
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [holding.symbol, tick]
  )
  const divTxs = txs.filter(t => t.type === 'dividend')

  const cp           = prices[holding.symbol]?.price ?? null
  const currentValue = cp ? cp * holding.qty : null
  const pnl          = currentValue != null ? currentValue - holding.totalInvested : null
  const pnlPct       = pnl != null && holding.totalInvested > 0 ? (pnl / holding.totalInvested) * 100 : null
  const pos          = pnl != null && pnl >= 0

  const weight       = totalPortfolio > 0 ? (holding.totalInvested / totalPortfolio) * 100 : 0
  const firstBuy     = txs.filter(t => t.type === 'buy').map(t => t.date).sort()[0]
  const taxCat       = firstBuy ? taxCategory(firstBuy) : null
  const period       = firstBuy ? holdingPeriod(firstBuy) : null
  const sectorColor  = holding.sector ? getSectorColor(holding.sector) : null

  const doDelete = (id) => { deleteTransaction(id); setTick(t => t + 1); onRefresh() }
  const doAdd    = (tx) => { addTransaction(tx); setTick(t => t + 1); onRefresh() }

  return (
    <div className={`bg-[#1e293b] rounded-3xl overflow-hidden border border-[#334155] border-l-4 transition-all`}
      style={{ borderLeftColor: pnl == null ? '#334155' : pos ? '#22c55e' : '#ef4444' }}>

      <button className="w-full text-left p-4" onClick={() => setExpanded(e => !e)}>
        {/* Top row */}
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="font-headline text-[#f1f5f9] font-bold text-xl">{holding.symbol}</span>
              {holding.isSip && (
                <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#6366f1]/20 text-[#818cf8]">
                  <Repeat2 size={9} /> SIP
                </span>
              )}
              {taxCat && (
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  taxCat === 'LTCG' ? 'bg-[#22c55e]/15 text-[#4ade80]' : 'bg-[#f59e0b]/15 text-[#fbbf24]'
                }`}>{taxCat}</span>
              )}
            </div>
            <p className="text-[#475569] text-xs truncate">{holding.name}</p>
            {holding.sector && (
              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${sectorColor}20`, color: sectorColor }}>
                ● {holding.sector}
              </span>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="font-data text-[#f1f5f9] font-bold text-lg leading-tight">{formatCurrency(holding.totalInvested)}</p>
            {pnlPct != null && (
              <p className={`text-sm font-bold font-data ${pos ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {pos ? '▲ +' : '▼ '}{Math.abs(pnlPct).toFixed(2)}%
              </p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-1 text-center mb-3">
          {[
            { label: 'QTY', value: holding.qty.toLocaleString('en-IN') },
            { label: 'AVG PRICE', value: `₹${holding.avgBuyPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` },
            { label: 'WEIGHT', value: `${weight.toFixed(1)}%` },
          ].map(s => (
            <div key={s.label} className="bg-[#0f172a] rounded-xl py-2">
              <p className="text-[#475569] text-[9px] font-bold uppercase tracking-wide">{s.label}</p>
              <p className="font-data text-[#f1f5f9] text-sm font-bold mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Weight bar */}
        <div className="h-1.5 rounded-full bg-[#0f172a] overflow-hidden mb-3">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(weight, 100)}%`, background: weight > 40 ? '#f59e0b' : '#6366f1' }} />
        </div>

        {/* Break-even */}
        {holding.breakEven != null && holding.totalSoldValue > 0 && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-[#0f172a] border border-[#334155]">
            <Target size={12} className="text-[#f59e0b] shrink-0" />
            <p className="text-[#94a3b8] text-xs">
              Break-even: <span className="font-data font-bold text-[#f59e0b]">
                ₹{holding.breakEven.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
              {cp && holding.breakEven > 0 && (
                <span className={`ml-1.5 font-semibold ${cp >= holding.breakEven ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  {cp >= holding.breakEven ? '✓ Above break-even' : `₹${(holding.breakEven - cp).toLocaleString('en-IN', { maximumFractionDigits: 2 })} to go`}
                </span>
              )}
            </p>
          </div>
        )}

        {/* SIP Summary */}
        {holding.isSip && holding.sipCount > 1 && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-[#6366f1]/10 border border-[#6366f1]/20">
            <Repeat2 size={12} className="text-[#818cf8] shrink-0" />
            <p className="text-[#818cf8] text-xs">
              {holding.sipCount} SIP installments · Avg ₹{holding.sipAvg.toLocaleString('en-IN', { maximumFractionDigits: 2 })} per share
            </p>
          </div>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <PriceInput symbol={holding.symbol} prices={prices} onSave={onRefresh} />
          <div className="flex items-center gap-2">
            {period && (
              <span className="flex items-center gap-1 text-[#475569] text-[10px] font-medium">
                <Clock size={10} /> {period}
              </span>
            )}
            {holding.divYieldOnCost > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-[#f59e0b]">
                <Gift size={10} /> {holding.divYieldOnCost.toFixed(1)}%
              </span>
            )}
            {expanded ? <ChevronUp size={15} className="text-[#475569]" /> : <ChevronDown size={15} className="text-[#475569]" />}
          </div>
        </div>

        {/* P&L card */}
        {pnl != null && (
          <div className={`mt-3 flex items-center justify-between px-4 py-2.5 rounded-2xl ${
            pos ? 'bg-[#22c55e]/10 border border-[#22c55e]/20' : 'bg-[#ef4444]/10 border border-[#ef4444]/20'
          }`}>
            <span className="text-xs text-[#64748b]">Current Value</span>
            <span className="font-data font-bold text-[#f1f5f9] text-sm">{formatCurrency(currentValue)}</span>
            <span className={`font-data font-bold text-sm ${pos ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
              {pos ? '+' : ''}{formatCurrency(pnl)}
            </span>
          </div>
        )}
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-[#334155] bg-[#0f172a]/60">
          {/* Dividend summary if any */}
          {divTxs.length > 0 && (
            <div className="px-4 py-3 border-b border-[#334155]/50">
              <p className="text-[#f59e0b] text-xs font-bold flex items-center gap-1.5">
                <Gift size={12} /> Dividends: {formatCurrency(holding.totalDividends)}
                {holding.divYieldOnCost > 0 && ` · ${holding.divYieldOnCost.toFixed(2)}% yield on cost`}
              </p>
            </div>
          )}

          {txs.filter(t => t.type !== 'dividend').map(tx => (
            <div key={tx.id} className="flex items-center px-4 py-3 border-b border-[#334155]/40 last:border-0">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg shrink-0 mr-3 ${
                tx.type === 'buy' ? 'bg-[#22c55e]/15 text-[#22c55e]' : 'bg-[#ef4444]/15 text-[#ef4444]'
              }`}>
                {tx.type.toUpperCase()}{tx.isSip ? ' SIP' : ''}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[#f1f5f9] text-xs font-semibold">
                  {tx.qty} × ₹{tx.price.toLocaleString('en-IN')} = {formatCurrency(tx.qty * tx.price)}
                </p>
                <p className="text-[#475569] text-[10px]">{tx.date}{tx.notes ? ` · ${tx.notes}` : ''}</p>
              </div>
              <button onClick={() => doDelete(tx.id)}
                className="w-7 h-7 rounded-xl bg-[#ef4444]/10 flex items-center justify-center text-[#ef4444]/50 hover:text-[#ef4444] ml-2 shrink-0 active:scale-95">
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          <button onClick={() => setShowModal(true)}
            className="w-full py-3.5 text-xs text-[#6366f1] font-bold flex items-center justify-center gap-1.5 active:bg-[#6366f1]/5 transition-colors">
            <Plus size={13} /> Add transaction for {holding.symbol}
          </button>
        </div>
      )}

      {showModal && <AddTransactionModal onAdd={doAdd} onClose={() => setShowModal(false)} />}
    </div>
  )
}

export default function Portfolio() {
  const [showModal, setShowModal] = useState(false)
  const [tick, setTick]           = useState(0)

  const holdings = useMemo(() => getHoldings(), [tick])
  const prices   = useMemo(() => getPrices(), [tick])

  const totalInvested = holdings.reduce((s, h) => s + h.totalInvested, 0)
  const currentValue  = holdings.reduce((s, h) => {
    const cp = prices[h.symbol]?.price
    return s + (cp ? cp * h.qty : h.totalInvested)
  }, 0)
  const pnl    = currentValue - totalInvested
  const hasCMP = Object.keys(prices).length > 0
  const refresh = () => setTick(t => t + 1)

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-20 bg-[#0f172a]/95 backdrop-blur border-b border-[#1e293b] px-4 py-3">
        <h1 className="font-headline text-[#f1f5f9] font-bold text-xl">Holdings</h1>
        {holdings.length > 0 && (
          <div className="flex gap-4 mt-0.5 text-xs font-data flex-wrap">
            <span className="text-[#475569]">Invested <span className="text-[#f1f5f9] font-bold">{formatCurrency(totalInvested)}</span></span>
            {hasCMP && (
              <>
                <span className="text-[#475569]">Value <span className="text-[#f1f5f9] font-bold">{formatCurrency(currentValue)}</span></span>
                <span className={pnl >= 0 ? 'text-[#22c55e] font-bold' : 'text-[#ef4444] font-bold'}>
                  {pnl >= 0 ? '▲ +' : '▼ '}{formatCurrency(pnl)}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 px-4 py-4 space-y-3 pb-28">
        {holdings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-3xl bg-[#6366f1]/10 flex items-center justify-center mb-4">
              <TrendingUp size={30} className="text-[#6366f1]" />
            </div>
            <p className="text-[#f1f5f9] font-bold text-lg mb-1">No holdings yet</p>
            <p className="text-[#475569] text-sm mb-6">Start by logging your first stock purchase</p>
            <button onClick={() => setShowModal(true)}
              className="px-8 py-3.5 bg-[#6366f1] text-white rounded-2xl font-bold shadow-lg shadow-[#6366f1]/30 active:scale-95 transition-all">
              + Add Entry
            </button>
          </div>
        ) : (
          holdings.map(h => (
            <HoldingCard key={h.symbol} holding={h} prices={prices}
              totalPortfolio={totalInvested} onRefresh={refresh} />
          ))
        )}
      </div>

      {holdings.length > 0 && (
        <button onClick={() => setShowModal(true)}
          className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40 flex items-center gap-2 px-5 py-3.5 rounded-full bg-[#6366f1] text-white font-bold shadow-2xl shadow-[#6366f1]/40 active:scale-95 transition-all">
          <Plus size={18} strokeWidth={2.5} /> Add
        </button>
      )}

      {showModal && <AddTransactionModal onAdd={tx => { addTransaction(tx); refresh() }} onClose={() => setShowModal(false)} />}
    </div>
  )
}
