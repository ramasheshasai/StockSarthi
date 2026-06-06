import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, RefreshCw, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { useQuotes } from '../hooks/useStockData'
import { formatCurrency, formatPct, isPositive } from '../utils/format'
import AddStockModal from '../components/AddStockModal'
import { SkeletonStockRow } from '../components/Skeleton'

const STORAGE_KEY = 'stocksarthi_portfolio'

function loadPortfolio() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [] } catch { return [] }
}
function savePortfolio(p) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch {}
}

export default function Portfolio() {
  const [holdings, setHoldings] = useState(loadPortfolio)
  const [showModal, setShowModal] = useState(false)

  const symbols = useMemo(() => holdings.map(h => `${h.symbol}.NS`), [holdings])
  const { data: quotes, loading, error, refresh } = useQuotes(symbols)

  const quoteMap = useMemo(() => {
    const m = {}
    quotes?.forEach(q => { m[q.symbol] = q })
    return m
  }, [quotes])

  const enriched = useMemo(() =>
    holdings.map(h => {
      const q = quoteMap[`${h.symbol}.NS`]
      const currentPrice = q?.regularMarketPrice ?? null
      const invested = h.qty * h.buyPrice
      const current = currentPrice != null ? h.qty * currentPrice : null
      const pnl = current != null ? current - invested : null
      const pnlPct = pnl != null ? (pnl / invested) * 100 : null
      return { ...h, q, currentPrice, invested, current, pnl, pnlPct }
    }),
  [holdings, quoteMap])

  const totals = useMemo(() => {
    const invested = enriched.reduce((s, h) => s + h.invested, 0)
    const current = enriched.reduce((s, h) => s + (h.current ?? h.invested), 0)
    const pnl = current - invested
    const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0
    return { invested, current, pnl, pnlPct }
  }, [enriched])

  const addHolding = (h) => {
    const next = [...holdings, { ...h, id: Date.now() }]
    setHoldings(next)
    savePortfolio(next)
  }

  const removeHolding = (id) => {
    const next = holdings.filter(h => h.id !== id)
    setHoldings(next)
    savePortfolio(next)
  }

  const pnlPos = isPositive(totals.pnl)

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-30 bg-[#0f172a]/95 backdrop-blur border-b border-[#334155] px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-headline text-[#f1f5f9] font-bold text-base">My Portfolio</h1>
          <p className="text-[#64748b] text-[11px]">{holdings.length} stock{holdings.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={refresh}
          className="w-8 h-8 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center text-[#94a3b8] hover:text-[#f1f5f9] transition-all active:scale-95"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b] text-xs">
            <AlertCircle size={13} />
            Showing cached prices. {error}
          </div>
        )}

        {/* Summary Card */}
        {holdings.length > 0 && (
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-4 fade-in">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-[#64748b] text-[11px] mb-0.5">Invested</p>
                <p className="font-data text-[#f1f5f9] font-semibold text-base">{formatCurrency(totals.invested)}</p>
              </div>
              <div>
                <p className="text-[#64748b] text-[11px] mb-0.5">Current Value</p>
                <p className="font-data text-[#f1f5f9] font-semibold text-base">{formatCurrency(totals.current)}</p>
              </div>
            </div>
            <div className="border-t border-[#334155] pt-3 flex items-center justify-between">
              <div>
                <p className="text-[#64748b] text-[11px] mb-0.5">Total P&L</p>
                <p className={`font-data font-bold text-lg ${pnlPos ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  {pnlPos ? '+' : ''}{formatCurrency(totals.pnl)}
                </p>
              </div>
              <span
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold"
                style={{
                  background: `${pnlPos ? '#22c55e' : '#ef4444'}20`,
                  color: pnlPos ? '#22c55e' : '#ef4444',
                }}
              >
                {pnlPos ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {formatPct(totals.pnlPct)}
              </span>
            </div>
          </div>
        )}

        {/* Holdings */}
        {loading && holdings.length === 0 ? (
          <SkeletonStockRow count={4} />
        ) : holdings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center fade-in">
            <div className="w-14 h-14 rounded-2xl bg-[#1e293b] border border-[#334155] flex items-center justify-center mb-4">
              <TrendingUp size={24} className="text-[#6366f1]" />
            </div>
            <p className="text-[#f1f5f9] font-semibold mb-1">No holdings yet</p>
            <p className="text-[#64748b] text-sm mb-5">Add your first stock to track your portfolio</p>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus size={16} /> Add Stock
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {enriched.map(h => (
              <HoldingCard key={h.id} holding={h} onRemove={() => removeHolding(h.id)} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      {holdings.length > 0 && (
        <button
          onClick={() => setShowModal(true)}
          className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40 w-13 h-13 rounded-full bg-[#6366f1] hover:bg-[#4f46e5] text-white shadow-lg shadow-[#6366f1]/30 flex items-center justify-center transition-all active:scale-95"
          style={{ width: 52, height: 52 }}
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      )}

      {showModal && <AddStockModal onAdd={addHolding} onClose={() => setShowModal(false)} />}
    </div>
  )
}

function HoldingCard({ holding, onRemove }) {
  const { symbol, qty, buyPrice, currentPrice, invested, current, pnl, pnlPct, q } = holding
  const pos = isPositive(pnl)
  const color = pos ? '#22c55e' : '#ef4444'

  return (
    <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 fade-in">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[#f1f5f9] font-bold text-sm">{symbol}</p>
          <p className="text-[#64748b] text-[11px]">
            {q?.shortName || q?.longName || ''}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="w-7 h-7 rounded-lg bg-[#ef4444]/10 flex items-center justify-center text-[#ef4444]/60 hover:text-[#ef4444] hover:bg-[#ef4444]/20 transition-all"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center mb-3">
        <div>
          <p className="text-[#64748b] text-[10px] mb-0.5">Qty</p>
          <p className="font-data text-[#f1f5f9] text-sm font-medium">{qty}</p>
        </div>
        <div>
          <p className="text-[#64748b] text-[10px] mb-0.5">Avg Price</p>
          <p className="font-data text-[#f1f5f9] text-sm font-medium">₹{buyPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
        </div>
        <div>
          <p className="text-[#64748b] text-[10px] mb-0.5">LTP</p>
          <p className="font-data text-[#f1f5f9] text-sm font-medium">
            {currentPrice != null ? `₹${currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          </p>
        </div>
      </div>

      <div className="border-t border-[#334155] pt-3 flex items-center justify-between">
        <div>
          <p className="text-[#64748b] text-[10px] mb-0.5">Invested: {formatCurrency(invested)}</p>
          <p className="text-[#64748b] text-[10px]">Current: {current != null ? formatCurrency(current) : '—'}</p>
        </div>
        {pnl != null && (
          <div className="text-right">
            <p className="font-data font-semibold text-sm" style={{ color }}>
              {pos ? '+' : ''}{formatCurrency(pnl)}
            </p>
            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold mt-0.5"
              style={{ background: `${color}20`, color }}>
              {formatPct(pnlPct)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
