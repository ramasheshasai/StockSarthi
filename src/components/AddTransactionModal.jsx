import { useState } from 'react'
import { X, Repeat2 } from 'lucide-react'
import { getSectors } from '../utils/storage'

const SECTORS = [
  'Banking & Finance','IT / Technology','FMCG','Pharma & Healthcare',
  'Auto','Energy & Oil','Infrastructure','Metals & Mining',
  'Real Estate','Telecom','Chemicals','Defence','Retail','Others',
]

const INPUT = 'w-full bg-[#0a0f1e] border border-[#1e293b] rounded-xl px-4 py-3 text-[#f1f5f9] text-sm placeholder-[#334155] focus:outline-none focus:border-[#6366f1] transition-colors'
const SELECT = `${INPUT} appearance-none`

const TYPES = [
  { key: 'buy',      label: '▲ Buy',      color: '#22c55e', bg: 'bg-[#22c55e]' },
  { key: 'sell',     label: '▼ Sell',     color: '#ef4444', bg: 'bg-[#ef4444]' },
  { key: 'dividend', label: '₹ Dividend', color: '#f59e0b', bg: 'bg-[#f59e0b]' },
]

export default function AddTransactionModal({ onAdd, onClose, defaultType = 'buy' }) {
  const [type, setType]         = useState(defaultType)
  const [symbol, setSymbol]     = useState('')
  const [name, setName]         = useState('')
  const [qty, setQty]           = useState('')
  const [price, setPrice]       = useState('')
  const [amount, setAmount]     = useState('')   // for dividend
  const [date, setDate]         = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes]       = useState('')
  const [isSip, setIsSip]       = useState(false)
  const [sector, setSector]     = useState(() => {
    const sectors = getSectors()
    return symbol ? (sectors[symbol.toUpperCase()] ?? '') : ''
  })
  const [err, setErr] = useState('')

  const isDividend = type === 'dividend'
  const isBuy      = type === 'buy'
  const active     = TYPES.find(t => t.key === type)

  const handleSubmit = (e) => {
    e.preventDefault()
    const s = symbol.trim().toUpperCase()
    if (!s) return setErr('Enter stock symbol')
    if (!date) return setErr('Select a date')

    if (isDividend) {
      const a = parseFloat(amount)
      if (!a || a <= 0) return setErr('Enter dividend amount received')
      onAdd({ type: 'dividend', symbol: s, name: name.trim() || s, amount: a, price: a, qty: 1, date, notes: notes.trim() })
    } else {
      const q = parseFloat(qty), p = parseFloat(price)
      if (!q || q <= 0) return setErr('Enter valid quantity')
      if (!p || p <= 0) return setErr('Enter valid price')
      onAdd({ type, symbol: s, name: name.trim() || s, qty: q, price: p, date,
              notes: notes.trim(), isSip: isBuy ? isSip : false, sector: sector || null })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0f172a] border border-[#1e293b] rounded-t-3xl shadow-2xl"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#1e293b]" />
        </div>

        <div className="px-5 pt-2 pb-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-headline text-[#f1f5f9] text-lg font-bold">Add Transaction</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#1e293b] flex items-center justify-center text-[#64748b] active:scale-95">
              <X size={15} />
            </button>
          </div>

          {/* Type tabs */}
          <div className="flex gap-1.5 p-1 bg-[#0a0f1e] rounded-2xl mb-5">
            {TYPES.map(t => (
              <button key={t.key} type="button" onClick={() => { setType(t.key); setErr('') }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  type === t.key ? `${t.bg} text-white shadow-lg` : 'text-[#475569]'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Symbol + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#475569] text-[11px] font-semibold uppercase tracking-wide block mb-1.5">Symbol *</label>
                <input value={symbol} onChange={e => { setSymbol(e.target.value.toUpperCase()); setErr('') }}
                  placeholder="RELIANCE" className={INPUT} />
              </div>
              <div>
                <label className="text-[#475569] text-[11px] font-semibold uppercase tracking-wide block mb-1.5">Date *</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className={INPUT} />
              </div>
            </div>

            {/* Company name */}
            <div>
              <label className="text-[#475569] text-[11px] font-semibold uppercase tracking-wide block mb-1.5">Company Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Reliance Industries Ltd" className={INPUT} />
            </div>

            {isDividend ? (
              <div>
                <label className="text-[#475569] text-[11px] font-semibold uppercase tracking-wide block mb-1.5">Total Dividend Received ₹ *</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="2500.00" min="0.01" step="any" className={INPUT} />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#475569] text-[11px] font-semibold uppercase tracking-wide block mb-1.5">Quantity *</label>
                    <input type="number" value={qty} onChange={e => setQty(e.target.value)}
                      placeholder="10" min="0.001" step="any" className={INPUT} />
                  </div>
                  <div>
                    <label className="text-[#475569] text-[11px] font-semibold uppercase tracking-wide block mb-1.5">Price ₹ *</label>
                    <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                      placeholder="2450.00" min="0.01" step="any" className={INPUT} />
                  </div>
                </div>

                {/* Total preview */}
                {qty && price && (
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#0a0f1e] border border-[#1e293b]">
                    <span className="text-[#475569] text-sm">Total {isBuy ? 'invested' : 'received'}</span>
                    <span className="font-data font-bold text-[#f1f5f9]">
                      ₹{(parseFloat(qty || 0) * parseFloat(price || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {/* Sector */}
                <div>
                  <label className="text-[#475569] text-[11px] font-semibold uppercase tracking-wide block mb-1.5">Sector</label>
                  <select value={sector} onChange={e => setSector(e.target.value)} className={SELECT}>
                    <option value="">Select sector (optional)</option>
                    {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* SIP toggle (buy only) */}
                {isBuy && (
                  <button type="button" onClick={() => setIsSip(v => !v)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                      isSip
                        ? 'bg-[#6366f1]/15 border-[#6366f1]/40 text-[#818cf8]'
                        : 'bg-[#0a0f1e] border-[#1e293b] text-[#475569]'
                    }`}>
                    <div className="flex items-center gap-2.5">
                      <Repeat2 size={16} />
                      <div className="text-left">
                        <p className="text-sm font-semibold">Mark as SIP</p>
                        <p className="text-[10px] opacity-70">Systematic Investment Plan installment</p>
                      </div>
                    </div>
                    <div className={`w-11 h-6 rounded-full transition-all relative ${isSip ? 'bg-[#6366f1]' : 'bg-[#1e293b]'}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isSip ? 'left-6' : 'left-1'}`} />
                    </div>
                  </button>
                )}
              </>
            )}

            {/* Notes */}
            <div>
              <label className="text-[#475569] text-[11px] font-semibold uppercase tracking-wide block mb-1.5">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)}
                placeholder={isDividend ? 'Q3 FY25 dividend...' : 'Investment thesis, why you bought...'}
                className={INPUT} />
            </div>

            {err && <p className="text-[#ef4444] text-xs px-1 font-medium">{err}</p>}

            <button type="submit"
              className={`w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.98] shadow-lg mt-1`}
              style={{ background: active.color, boxShadow: `0 8px 25px ${active.color}40` }}>
              {active.label} Entry
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
