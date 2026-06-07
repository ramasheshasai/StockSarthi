import { useState, useMemo } from 'react'
import { Plus, TrendingUp, TrendingDown, Zap, Award, AlertTriangle, Gift } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { getTransactions, getHoldings, getPrices, addTransaction } from '../utils/storage'
import { portfolioXIRR, portfolioTimeline } from '../utils/calculations'
import { formatCurrency } from '../utils/format'
import AddTransactionModal from '../components/AddTransactionModal'

function TimelineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0f172a] border border-[#334155] rounded-xl px-3 py-2.5 text-xs shadow-2xl">
      <p className="text-[#64748b] mb-1.5">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-data font-semibold">
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [showModal, setShowModal] = useState(false)
  const [tick, setTick]           = useState(0)

  const txs      = useMemo(() => getTransactions(), [tick])
  const holdings = useMemo(() => getHoldings(), [tick])
  const prices   = useMemo(() => getPrices(), [tick])

  const totalInvested  = holdings.reduce((s, h) => s + h.totalInvested, 0)
  const currentValue   = holdings.reduce((s, h) => {
    const cp = prices[h.symbol]?.price
    return s + (cp ? cp * h.qty : h.totalInvested)
  }, 0)
  const pnl    = currentValue - totalInvested
  const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0
  const isUp   = pnl >= 0

  const xirr = useMemo(() => portfolioXIRR(txs, holdings, prices), [tick])

  const totalDividends = holdings.reduce((s, h) => s + h.totalDividends, 0)

  const performers = holdings
    .filter(h => prices[h.symbol]?.price)
    .map(h => ({ ...h, pct: ((prices[h.symbol].price - h.avgBuyPrice) / h.avgBuyPrice) * 100 }))
    .sort((a, b) => b.pct - a.pct)
  const best  = performers[0]
  const worst = performers[performers.length - 1]

  const timeline    = useMemo(() => portfolioTimeline(txs), [tick])
  const recentTxs   = txs.slice(0, 5)
  const hasTimeline = timeline.length >= 2

  const handleAdd = (tx) => { addTransaction(tx); setTick(t => t + 1) }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-4 pt-5 pb-2 flex items-center gap-3 lg:pt-6">
        <img src="/logo.svg" alt="StockSarthi" className="w-10 h-10 rounded-xl shrink-0 lg:hidden" />
        <div>
          <p className="font-headline text-[#f1f5f9] font-bold text-2xl leading-tight">StockSarthi</p>
          <p className="text-[#475569] text-[11px]">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      <div className="flex-1 px-4 space-y-4 pb-28">

        {/* ── Hero card ── */}
        <div className={`relative overflow-hidden rounded-3xl p-5 border ${
          totalInvested === 0
            ? 'bg-[#1e293b] border-[#334155]'
            : isUp
              ? 'border-[#16a34a]/30 bg-gradient-to-br from-[#052e16] via-[#14532d] to-[#15803d]'
              : 'border-[#dc2626]/30 bg-gradient-to-br from-[#450a0a] via-[#7f1d1d] to-[#991b1b]'
        }`}>
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-10"
            style={{ background: isUp ? '#22c55e' : '#ef4444' }} />
          <div className="absolute -right-2 -bottom-4 w-16 h-16 rounded-full opacity-5"
            style={{ background: isUp ? '#22c55e' : '#ef4444' }} />

          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">Portfolio Value</p>
          <p className="font-headline text-white font-bold text-4xl leading-none tracking-tight">
            {formatCurrency(currentValue || totalInvested)}
          </p>

          {totalInvested > 0 && (
            <div className="flex items-center gap-0 mt-4 flex-wrap">
              {[
                { label: 'INVESTED', value: formatCurrency(totalInvested), color: 'text-white/80' },
                { label: 'P&L', value: `${isUp ? '+' : ''}${formatCurrency(pnl)}`, color: isUp ? 'text-[#4ade80]' : 'text-[#f87171]' },
                { label: 'RETURN', value: `${isUp ? '+' : ''}${pnlPct.toFixed(2)}%`, color: isUp ? 'text-[#4ade80]' : 'text-[#f87171]' },
                ...(xirr != null ? [{ label: 'XIRR', value: `${xirr >= 0 ? '+' : ''}${xirr.toFixed(1)}%`, color: xirr >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]', icon: <Zap size={10} /> }] : []),
              ].map((s, i, arr) => (
                <div key={s.label} className="flex items-center">
                  <div className="pr-3 pl-0 first:pl-0">
                    <p className="text-white/40 text-[9px] font-bold tracking-widest">{s.label}</p>
                    <p className={`font-data font-bold text-sm flex items-center gap-0.5 ${s.color}`}>
                      {s.icon}{s.value}
                    </p>
                  </div>
                  {i < arr.length - 1 && <div className="h-8 w-px bg-white/15 mr-3" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Portfolio Timeline Chart ── */}
        {hasTimeline && (
          <div className="bg-[#1e293b] border border-[#334155] rounded-3xl p-4">
            <p className="text-[#94a3b8] text-xs font-semibold uppercase tracking-wider mb-1">Investment Journey</p>
            <p className="text-[#475569] text-[10px] mb-3">Cumulative capital deployed over time</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={timeline} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="investGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="proceedsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false}
                  tickFormatter={v => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<TimelineTooltip />} />
                <Area type="monotone" dataKey="invested" name="Invested" stroke="#6366f1" strokeWidth={2}
                  fill="url(#investGrad)" dot={false} />
                {timeline.some(t => t.proceeds > 0) && (
                  <Area type="monotone" dataKey="proceeds" name="Proceeds" stroke="#22c55e" strokeWidth={1.5}
                    fill="url(#proceedsGrad)" dot={false} strokeDasharray="4 2" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Quick Stats ── */}
        <div className="grid grid-cols-2 gap-3">
          {best && (
            <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-3.5">
              <div className="flex items-center gap-1.5 mb-2">
                <Award size={13} className="text-[#f59e0b]" />
                <p className="text-[#475569] text-[10px] font-bold uppercase tracking-wide">Best Performer</p>
              </div>
              <p className="text-[#f1f5f9] font-headline font-bold text-lg leading-tight">{best.symbol}</p>
              <p className="font-data text-[#22c55e] font-bold">+{best.pct.toFixed(2)}%</p>
            </div>
          )}
          {worst && worst.symbol !== best?.symbol && (
            <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-3.5">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle size={13} className="text-[#64748b]" />
                <p className="text-[#475569] text-[10px] font-bold uppercase tracking-wide">Needs Attention</p>
              </div>
              <p className="text-[#f1f5f9] font-headline font-bold text-lg leading-tight">{worst.symbol}</p>
              <p className="font-data text-[#ef4444] font-bold">{worst.pct.toFixed(2)}%</p>
            </div>
          )}
          {totalDividends > 0 && (
            <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-3.5 col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#f59e0b]/15 flex items-center justify-center">
                    <Gift size={15} className="text-[#f59e0b]" />
                  </div>
                  <div>
                    <p className="text-[#475569] text-[10px] font-bold uppercase tracking-wide">Total Dividends</p>
                    <p className="font-data text-[#f1f5f9] font-bold text-lg">{formatCurrency(totalDividends)}</p>
                  </div>
                </div>
                <p className="text-[#475569] text-xs text-right">
                  Extra income<br />from holdings
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Recent Activity ── */}
        <div>
          <p className="text-[#475569] text-xs font-bold uppercase tracking-wider mb-3">Recent Activity</p>
          {recentTxs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 rounded-3xl bg-[#1e293b] border border-[#334155] text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#6366f1]/10 flex items-center justify-center mb-3">
                <TrendingUp size={26} className="text-[#6366f1]" />
              </div>
              <p className="text-[#f1f5f9] font-bold">No entries yet</p>
              <p className="text-[#64748b] text-sm mt-1">Tap + to log your first stock purchase</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTxs.map(tx => {
                const isBuy = tx.type === 'buy'
                const isDiv = tx.type === 'dividend'
                const total = isDiv ? tx.amount ?? tx.price : tx.qty * tx.price
                const colors = isBuy ? { bg: 'bg-[#22c55e]/15', icon: <TrendingUp size={15} className="text-[#22c55e]" />, tag: 'text-[#22c55e]', label: 'BOUGHT' }
                  : isDiv ? { bg: 'bg-[#f59e0b]/15', icon: <Gift size={15} className="text-[#f59e0b]" />, tag: 'text-[#f59e0b]', label: 'DIVID.' }
                  : { bg: 'bg-[#ef4444]/15', icon: <TrendingDown size={15} className="text-[#ef4444]" />, tag: 'text-[#ef4444]', label: 'SOLD' }
                return (
                  <div key={tx.id} className="flex items-center gap-3 px-4 py-3.5 bg-[#1e293b] border border-[#334155] rounded-2xl">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colors.bg}`}>
                      {colors.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[#f1f5f9] font-bold text-sm">{tx.symbol}</p>
                        {tx.isSip && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#6366f1]/20 text-[#818cf8]">SIP</span>}
                      </div>
                      <p className="text-[#475569] text-xs">{tx.date}{!isDiv ? ` · ${tx.qty} @ ₹${tx.price.toLocaleString('en-IN')}` : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-data text-[#f1f5f9] font-semibold text-sm">{formatCurrency(total)}</p>
                      <p className={`text-[10px] font-bold ${colors.tag}`}>{colors.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <button onClick={() => setShowModal(true)}
        className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40 flex items-center gap-2 px-5 py-3.5 rounded-full bg-[#6366f1] text-white font-bold shadow-2xl shadow-[#6366f1]/40 active:scale-95 transition-all">
        <Plus size={20} strokeWidth={2.5} /> Add Entry
      </button>

      {showModal && <AddTransactionModal onAdd={handleAdd} onClose={() => setShowModal(false)} />}
    </div>
  )
}
