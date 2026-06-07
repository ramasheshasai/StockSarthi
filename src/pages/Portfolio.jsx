import { useState, useMemo } from 'react'
import { Plus, ChevronDown, ChevronUp, Trash2, TrendingUp, Edit3, Clock,
         Repeat2, Gift, Target, StickyNote, Calculator, TrendingDown, ChevronRight } from 'lucide-react'
import { getHoldings, getClosedPositions, getPrices, setPrice,
         addTransaction, deleteTransaction, getTransactions, setNote } from '../utils/storage'
import { formatCurrency } from '../utils/format'
import { holdingPeriod, taxCategory, calcAverageDown } from '../utils/calculations'
import AddTransactionModal from '../components/AddTransactionModal'

const SECTOR_COLORS = {
  'IT / Technology':'#6366f1','Banking & Finance':'#06b6d4','Pharma & Healthcare':'#22c55e',
  'FMCG':'#f59e0b','Auto':'#f97316','Energy & Oil':'#ef4444','Infrastructure':'#8b5cf6',
  'Metals & Mining':'#64748b','Chemicals':'#84cc16','Telecom':'#ec4899',
  'Defence':'#14b8a6','Retail':'#fb923c','Others':'#94a3b8',
}

// ── Inline price editor ───────────────────────────────────────────────────────
function PriceInput({ symbol, prices, onSave }) {
  const [open, setOpen] = useState(false)
  const [val, setVal]   = useState(prices[symbol]?.price ?? '')
  const cp = prices[symbol]?.price

  if (!open) return (
    <button onClick={() => setOpen(true)} className="flex items-center gap-1 text-xs text-[#6366f1] font-semibold">
      <Edit3 size={11} />
      {cp ? `CMP ₹${cp.toLocaleString('en-IN')} · ${prices[symbol]?.updatedAt}` : 'Set current price →'}
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
        step="any" className="w-28 bg-[#070d1a] border border-[#6366f1] rounded-xl px-3 py-1.5 text-[#f1f5f9] text-sm focus:outline-none font-data" />
      <button type="submit" className="font-bold text-[#22c55e]">✓</button>
      <button type="button" onClick={() => setOpen(false)} className="text-[#475569]">✕</button>
    </form>
  )
}

// ── Average Down Calculator ───────────────────────────────────────────────────
function AvgDownCalc({ holding }) {
  const [open, setOpen] = useState(false)
  const [addQty, setAddQty]   = useState('')
  const [addPrice, setAddPrice] = useState('')
  const result = calcAverageDown({ currentQty: holding.qty, currentAvg: holding.avgPrice, addQty, addPrice })

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-1 text-xs text-[#94a3b8] font-medium hover:text-[#f1f5f9] transition-colors">
      <Calculator size={11} /> Avg Down Calc
    </button>
  )
  return (
    <div className="mt-3 p-3 rounded-2xl bg-[#070d1a] border border-[#1e2d45] space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[#94a3b8] text-xs font-bold flex items-center gap-1.5"><Calculator size={12} /> Average Down Calculator</p>
        <button onClick={() => setOpen(false)} className="text-[#475569] text-xs">✕</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[#475569] text-[10px] block mb-1">Qty to buy</label>
          <input type="number" value={addQty} onChange={e => setAddQty(e.target.value)}
            placeholder="10" step="any"
            className="w-full bg-[#0d1526] border border-[#1e2d45] rounded-xl px-3 py-2 text-[#f1f5f9] text-sm focus:outline-none focus:border-[#6366f1] font-data" />
        </div>
        <div>
          <label className="text-[#475569] text-[10px] block mb-1">At price ₹</label>
          <input type="number" value={addPrice} onChange={e => setAddPrice(e.target.value)}
            placeholder="1800" step="any"
            className="w-full bg-[#0d1526] border border-[#1e2d45] rounded-xl px-3 py-2 text-[#f1f5f9] text-sm focus:outline-none focus:border-[#6366f1] font-data" />
        </div>
      </div>
      {result && (
        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          {[
            { label: 'New Avg', value: `₹${result.newAvg.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, color: '#6366f1' },
            { label: 'New Qty', value: result.newQty.toLocaleString('en-IN'), color: '#94a3b8' },
            { label: 'Total Cost', value: formatCurrency(result.totalInvested), color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} className="bg-[#0d1526] rounded-xl p-2">
              <p className="text-[#475569] text-[9px] mb-0.5">{s.label}</p>
              <p className="font-data font-bold text-xs" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Holding card ──────────────────────────────────────────────────────────────
function HoldingCard({ holding, prices, totalPortfolio, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [showModal, setShowModal]   = useState(false)
  const [modalType, setModalType]   = useState('buy')
  const [editingNote, setEditingNote] = useState(false)
  const [noteText, setNoteText]     = useState(holding.notes)
  const [tick, setTick]             = useState(0)

  const txs = useMemo(() =>
    getTransactions().filter(t => t.symbol === holding.symbol)
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [holding.symbol, tick]
  )

  const cp           = prices[holding.symbol]?.price ?? null
  const currentValue = cp ? cp * holding.qty : null
  const pnl          = currentValue != null ? currentValue - holding.totalInvested : null
  const pnlPct       = pnl != null && holding.totalInvested > 0 ? (pnl / holding.totalInvested) * 100 : null
  const pos          = pnl != null && pnl >= 0
  const weight       = totalPortfolio > 0 ? (holding.totalInvested / totalPortfolio) * 100 : 0
  const taxCat       = holding.firstBuyDate ? taxCategory(holding.firstBuyDate) : null
  const period       = holding.firstBuyDate ? holdingPeriod(holding.firstBuyDate) : null
  const sectorColor  = holding.sector ? (SECTOR_COLORS[holding.sector] ?? '#6366f1') : null
  const borderColor  = pnl == null ? '#1e2d45' : pos ? '#22c55e' : '#ef4444'

  const openModal = (type) => { setModalType(type); setShowModal(true) }
  const doDelete  = (id) => { deleteTransaction(id); setTick(t => t + 1); onRefresh() }
  const doAdd     = (tx) => { addTransaction(tx); setTick(t => t + 1); onRefresh() }
  const saveNote  = () => { setNote(holding.symbol, noteText); setEditingNote(false); onRefresh() }

  return (
    <div className="rounded-3xl overflow-hidden border border-[#1e2d45] border-l-4 bg-[#0d1526]"
      style={{ borderLeftColor: borderColor }}>

      {/* ── Main tap area ── */}
      <button className="w-full text-left p-4" onClick={() => setExpanded(e => !e)}>
        {/* Top row */}
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <span className="font-headline text-[#f1f5f9] font-bold text-xl">{holding.symbol}</span>
              {holding.isSip && (
                <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#6366f1]/20 text-[#818cf8]">
                  <Repeat2 size={8} /> SIP
                </span>
              )}
              {holding.hasSplit && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#f59e0b]/20 text-[#fbbf24]">✂ SPLIT</span>
              )}
              {taxCat && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  taxCat === 'LTCG' ? 'bg-[#22c55e]/15 text-[#4ade80]' : 'bg-[#f59e0b]/15 text-[#fbbf24]'
                }`}>{taxCat}</span>
              )}
            </div>
            <p className="text-[#475569] text-xs truncate">{holding.name}</p>
            {sectorColor && (
              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${sectorColor}18`, color: sectorColor }}>
                ● {holding.sector}
              </span>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="font-data text-[#f1f5f9] font-bold text-lg">{formatCurrency(holding.totalInvested)}</p>
            {pnlPct != null && (
              <p className={`text-sm font-bold font-data ${pos ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {pos ? '▲ +' : '▼ '}{Math.abs(pnlPct).toFixed(2)}%
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {[
            { l: 'QTY', v: holding.qty.toLocaleString('en-IN', { maximumFractionDigits: 4 }) },
            { l: 'AVG', v: `₹${holding.avgPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` },
            { l: 'WEIGHT', v: `${weight.toFixed(1)}%` },
          ].map(s => (
            <div key={s.l} className="bg-[#070d1a] rounded-xl py-2 text-center">
              <p className="text-[#2d4057] text-[9px] font-bold uppercase">{s.l}</p>
              <p className="font-data text-[#f1f5f9] text-xs font-bold mt-0.5">{s.v}</p>
            </div>
          ))}
        </div>

        {/* Weight bar */}
        <div className="h-1 rounded-full bg-[#070d1a] overflow-hidden mb-3">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(weight, 100)}%`, background: weight > 40 ? '#f59e0b' : sectorColor ?? '#6366f1' }} />
        </div>

        {/* Break-even */}
        {holding.breakEven != null && holding.totalSoldValue > 0 && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-[#070d1a] border border-[#1e2d45]">
            <Target size={11} className="text-[#f59e0b] shrink-0" />
            <p className="text-[#94a3b8] text-xs">
              Break-even <span className="font-data font-bold text-[#f59e0b]">
                ₹{holding.breakEven.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
              {cp && (
                <span className={`ml-2 font-semibold text-[10px] ${cp >= holding.breakEven ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  {cp >= holding.breakEven ? '✓ Safe' : `₹${(holding.breakEven - cp).toFixed(2)} to go`}
                </span>
              )}
            </p>
          </div>
        )}

        {/* SIP summary */}
        {holding.isSip && holding.sipCount > 1 && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-[#6366f1]/10 border border-[#6366f1]/20">
            <Repeat2 size={11} className="text-[#818cf8] shrink-0" />
            <p className="text-[#818cf8] text-xs">
              {holding.sipCount} SIP installments · Avg ₹{holding.sipAvg.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <PriceInput symbol={holding.symbol} prices={prices} onSave={onRefresh} />
          <div className="flex items-center gap-2.5">
            {period && <span className="flex items-center gap-1 text-[#475569] text-[10px]"><Clock size={10} /> {period}</span>}
            {holding.divYieldOnCost > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-[#f59e0b]">
                <Gift size={10} /> {holding.divYieldOnCost.toFixed(1)}%
              </span>
            )}
            {expanded ? <ChevronUp size={14} className="text-[#475569]" /> : <ChevronDown size={14} className="text-[#475569]" />}
          </div>
        </div>

        {/* P&L row */}
        {pnl != null && (
          <div className={`mt-3 flex items-center justify-between px-4 py-2.5 rounded-2xl ${
            pos ? 'bg-[#22c55e]/10 border border-[#22c55e]/20' : 'bg-[#ef4444]/10 border border-[#ef4444]/20'
          }`}>
            <span className="text-[#475569] text-xs">Current Value</span>
            <span className="font-data font-bold text-[#f1f5f9] text-sm">{formatCurrency(currentValue)}</span>
            <span className={`font-data font-bold text-sm ${pos ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
              {pos ? '+' : ''}{formatCurrency(pnl)}
            </span>
          </div>
        )}
      </button>

      {/* ── Expanded section ── */}
      {expanded && (
        <div className="border-t border-[#1e2d45] bg-[#070d1a]/70">
          {/* Quick actions */}
          <div className="flex border-b border-[#1e2d45]">
            {[
              { label: '▲ Buy More', type: 'buy', color: '#22c55e' },
              { label: '▼ Sell',     type: 'sell', color: '#ef4444' },
              { label: '₹ Dividend', type: 'dividend', color: '#f59e0b' },
            ].map(a => (
              <button key={a.type} onClick={() => openModal(a.type)}
                className="flex-1 py-3 text-xs font-bold border-r last:border-r-0 border-[#1e2d45] transition-all active:opacity-70"
                style={{ color: a.color }}>
                {a.label}
              </button>
            ))}
          </div>

          {/* Notes */}
          <div className="px-4 py-3 border-b border-[#1e2d45]">
            {!editingNote ? (
              <button onClick={() => setEditingNote(true)}
                className="w-full text-left flex items-start gap-2 group">
                <StickyNote size={13} className="text-[#475569] mt-0.5 group-hover:text-[#6366f1] transition-colors shrink-0" />
                <p className={`text-xs leading-relaxed ${holding.notes ? 'text-[#94a3b8]' : 'text-[#2d4057]'}`}>
                  {holding.notes || 'Add investment notes, thesis, exit strategy…'}
                </p>
              </button>
            ) : (
              <div>
                <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3}
                  placeholder="Investment thesis, exit strategy, reminders…"
                  autoFocus
                  className="w-full bg-[#0d1526] border border-[#6366f1]/40 rounded-xl px-3 py-2 text-[#f1f5f9] text-xs resize-none focus:outline-none" />
                <div className="flex gap-2 mt-2">
                  <button onClick={saveNote} className="px-3 py-1.5 rounded-lg bg-[#6366f1] text-white text-xs font-bold">Save</button>
                  <button onClick={() => setEditingNote(false)} className="px-3 py-1.5 rounded-lg bg-[#1e293b] text-[#64748b] text-xs">Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Avg down calculator */}
          <div className="px-4 py-2 border-b border-[#1e2d45]">
            <AvgDownCalc holding={holding} />
          </div>

          {/* Transactions list */}
          {txs.filter(t => t.type !== 'dividend').map(tx => (
            <div key={tx.id} className="flex items-center px-4 py-3 border-b border-[#1e2d45]/40 last:border-0">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg shrink-0 mr-3 ${
                tx.type === 'buy'   ? 'bg-[#22c55e]/15 text-[#22c55e]' :
                tx.type === 'sell'  ? 'bg-[#ef4444]/15 text-[#ef4444]' :
                tx.type === 'split' ? 'bg-[#6366f1]/15 text-[#818cf8]' :
                                      'bg-[#a855f7]/15 text-[#c084fc]'
              }`}>
                {tx.type.toUpperCase()}{tx.isSip ? ' SIP' : ''}
                {(tx.type === 'split' || tx.type === 'bonus') && tx.ratio ? ` ${tx.ratio[0]}:${tx.ratio[1]}` : ''}
              </span>
              <div className="flex-1 min-w-0">
                {tx.type === 'buy' || tx.type === 'sell' ? (
                  <p className="text-[#f1f5f9] text-xs font-semibold">
                    {tx.qty} × ₹{tx.price.toLocaleString('en-IN')} = {formatCurrency(tx.qty * tx.price)}
                  </p>
                ) : (
                  <p className="text-[#f1f5f9] text-xs font-semibold">
                    Ratio {tx.ratio?.[0]}:{tx.ratio?.[1]}
                  </p>
                )}
                <p className="text-[#475569] text-[10px]">{tx.date}{tx.notes ? ` · ${tx.notes}` : ''}</p>
              </div>
              <button onClick={() => doDelete(tx.id)}
                className="w-7 h-7 rounded-xl bg-[#ef4444]/10 flex items-center justify-center text-[#ef4444]/50 hover:text-[#ef4444] ml-2 shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          {/* Dividend rows */}
          {txs.filter(t => t.type === 'dividend').map(tx => (
            <div key={tx.id} className="flex items-center px-4 py-3 border-b border-[#1e2d45]/40 last:border-0">
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg shrink-0 mr-3 bg-[#f59e0b]/15 text-[#f59e0b]">DIVIDEND</span>
              <div className="flex-1">
                <p className="text-[#f59e0b] text-xs font-semibold">{formatCurrency(tx.amount ?? tx.price)}</p>
                <p className="text-[#475569] text-[10px]">{tx.date}{tx.notes ? ` · ${tx.notes}` : ''}</p>
              </div>
              <button onClick={() => doDelete(tx.id)}
                className="w-7 h-7 rounded-xl bg-[#ef4444]/10 flex items-center justify-center text-[#ef4444]/50 hover:text-[#ef4444] ml-2 shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddTransactionModal
          onAdd={doAdd} onClose={() => setShowModal(false)}
          defaultType={modalType} prefillSymbol={holding.symbol} />
      )}
    </div>
  )
}

// ── Closed position card ──────────────────────────────────────────────────────
function ClosedCard({ pos }) {
  const pnlPos = pos.realizedPnl >= 0
  const period = pos.firstBuyDate && pos.lastSellDate
    ? `${holdingPeriod(pos.firstBuyDate)} hold` : null

  return (
    <div className="flex items-center justify-between px-4 py-3.5 bg-[#0d1526] border border-[#1e2d45] rounded-2xl opacity-75">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[#94a3b8] font-bold text-sm">{pos.symbol}</span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#334155]/50 text-[#64748b]">CLOSED</span>
        </div>
        <p className="text-[#475569] text-[10px]">{pos.name}{period ? ` · ${period}` : ''}</p>
      </div>
      <div className="text-right shrink-0 ml-2">
        <p className={`font-data font-bold text-sm ${pnlPos ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {pnlPos ? '+' : ''}{formatCurrency(pos.realizedPnl)}
        </p>
        <p className="text-[#475569] text-[10px]">Realized P&L</p>
      </div>
    </div>
  )
}

// ── Main Portfolio page ───────────────────────────────────────────────────────
export default function Portfolio() {
  const [showModal, setShowModal] = useState(false)
  const [showClosed, setShowClosed] = useState(false)
  const [tick, setTick] = useState(0)

  const holdings = useMemo(() => getHoldings(), [tick])
  const closed   = useMemo(() => getClosedPositions(), [tick])
  const prices   = useMemo(() => getPrices(), [tick])

  const totalInvested = holdings.reduce((s, h) => s + h.totalInvested, 0)
  const currentValue  = holdings.reduce((s, h) => {
    const cp = prices[h.symbol]?.price
    return s + (cp ? cp * h.qty : h.totalInvested)
  }, 0)
  const pnl    = currentValue - totalInvested
  const hasCMP = Object.keys(prices).length > 0
  const refresh = () => setTick(t => t + 1)

  const totalRealized = closed.reduce((s, p) => s + p.realizedPnl, 0)

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-[#070d1a]/95 backdrop-blur border-b border-[#1e2d45] px-4 py-3">
        <h1 className="font-headline text-[#f1f5f9] font-bold text-xl">Holdings</h1>
        {holdings.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-0.5 text-xs font-data">
            <span className="text-[#475569]">
              Invested <span className="text-[#f1f5f9] font-bold">{formatCurrency(totalInvested)}</span>
            </span>
            {hasCMP && (
              <>
                <span className="text-[#475569]">
                  Value <span className="text-[#f1f5f9] font-bold">{formatCurrency(currentValue)}</span>
                </span>
                <span className={`font-bold ${pnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
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
            <p className="text-[#f1f5f9] font-bold text-lg mb-1">No holdings</p>
            <p className="text-[#475569] text-sm mb-6">Log your first stock purchase to get started</p>
            <button onClick={() => setShowModal(true)}
              className="px-8 py-3.5 bg-[#6366f1] text-white rounded-2xl font-bold shadow-lg shadow-[#6366f1]/30 active:scale-95">
              + Add Entry
            </button>
          </div>
        ) : (
          holdings.map(h => (
            <HoldingCard key={h.symbol} holding={h} prices={prices}
              totalPortfolio={totalInvested} onRefresh={refresh} />
          ))
        )}

        {/* Closed Positions section */}
        {closed.length > 0 && (
          <div className="mt-4">
            <button onClick={() => setShowClosed(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#0d1526] border border-[#1e2d45] rounded-2xl mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[#64748b] text-sm font-semibold">Closed Positions</span>
                <span className="text-[10px] bg-[#334155]/50 text-[#64748b] px-2 py-0.5 rounded-full">{closed.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-data text-sm font-bold ${totalRealized >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  {totalRealized >= 0 ? '+' : ''}{formatCurrency(totalRealized)}
                </span>
                {showClosed ? <ChevronUp size={14} className="text-[#475569]" /> : <ChevronDown size={14} className="text-[#475569]" />}
              </div>
            </button>
            {showClosed && (
              <div className="space-y-2">
                {closed.map(p => <ClosedCard key={p.symbol} pos={p} />)}
              </div>
            )}
          </div>
        )}
      </div>

      {holdings.length > 0 && (
        <button onClick={() => setShowModal(true)}
          className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40 flex items-center gap-2 px-5 py-3.5 rounded-full bg-[#6366f1] text-white font-bold shadow-2xl shadow-[#6366f1]/40 active:scale-95 transition-all">
          <Plus size={18} strokeWidth={2.5} /> Add
        </button>
      )}

      {showModal && (
        <AddTransactionModal
          onAdd={tx => { addTransaction(tx); refresh() }}
          onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
