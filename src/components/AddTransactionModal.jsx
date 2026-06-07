import { useState } from 'react'
import { X, Repeat2, Scissors, Gift as GiftIcon } from 'lucide-react'
import { getSectors } from '../utils/storage'

const SECTORS = [
  'Banking & Finance','IT / Technology','FMCG','Pharma & Healthcare',
  'Auto','Energy & Oil','Infrastructure','Metals & Mining',
  'Real Estate','Telecom','Chemicals','Defence','Retail','Others',
]

const INPUT = 'w-full bg-[#070d1a] border border-[#1e2d45] rounded-xl px-4 py-3 text-[#f1f5f9] text-sm placeholder-[#2d4057] focus:outline-none focus:border-[#6366f1] transition-colors'
const SELECT = `${INPUT} appearance-none cursor-pointer`

const TYPES = [
  { key: 'buy',      label: '▲ Buy',      bg: '#22c55e', show: 'trade' },
  { key: 'sell',     label: '▼ Sell',     bg: '#ef4444', show: 'trade' },
  { key: 'dividend', label: '₹ Div',      bg: '#f59e0b', show: 'income' },
  { key: 'split',    label: '✂ Split',    bg: '#6366f1', show: 'corporate' },
  { key: 'bonus',    label: '⊕ Bonus',    bg: '#a855f7', show: 'corporate' },
]

export default function AddTransactionModal({ onAdd, onClose, defaultType = 'buy', prefillSymbol = '' }) {
  const [type, setType]     = useState(defaultType)
  const [symbol, setSymbol] = useState(prefillSymbol)
  const [name, setName]     = useState('')
  const [qty, setQty]       = useState('')
  const [price, setPrice]   = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate]     = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes]   = useState('')
  const [isSip, setIsSip]   = useState(false)
  const [sector, setSector] = useState('')
  const [splitN, setSplitN] = useState('2')   // split: new shares
  const [splitD, setSplitD] = useState('1')   // split: old shares
  const [bonusN, setBonusN] = useState('1')   // bonus: bonus per existing
  const [bonusD, setBonusD] = useState('1')   // bonus: existing shares
  const [err, setErr]       = useState('')

  const isTrade    = type === 'buy' || type === 'sell'
  const isDiv      = type === 'dividend'
  const isSplit    = type === 'split'
  const isBonus    = type === 'bonus'
  const active     = TYPES.find(t => t.key === type)

  const handleSubmit = (e) => {
    e.preventDefault()
    const s = symbol.trim().toUpperCase()
    if (!s) return setErr('Enter stock symbol')
    if (!date) return setErr('Select a date')

    if (isDiv) {
      const a = parseFloat(amount)
      if (!a || a <= 0) return setErr('Enter dividend amount')
      onAdd({ type: 'dividend', symbol: s, name: name.trim() || s, amount: a, price: a, qty: 1, date, notes: notes.trim() })
    } else if (isSplit) {
      const n = parseFloat(splitN), d = parseFloat(splitD)
      if (!n || !d) return setErr('Enter split ratio')
      onAdd({ type: 'split', symbol: s, name: name.trim() || s, ratio: [n, d], qty: 0, price: 0, date, notes: notes.trim() })
    } else if (isBonus) {
      const n = parseFloat(bonusN), d = parseFloat(bonusD)
      if (!n || !d) return setErr('Enter bonus ratio')
      onAdd({ type: 'bonus', symbol: s, name: name.trim() || s, ratio: [n, d], qty: 0, price: 0, date, notes: notes.trim() })
    } else {
      const q = parseFloat(qty), p = parseFloat(price)
      if (!q || q <= 0) return setErr('Enter valid quantity')
      if (!p || p <= 0) return setErr('Enter valid price')
      onAdd({ type, symbol: s, name: name.trim() || s, qty: q, price: p, date,
              notes: notes.trim(), isSip: type === 'buy' ? isSip : false,
              sector: sector || null })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0d1526] border border-[#1e2d45] rounded-t-3xl shadow-2xl"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#1e293b]" />
        </div>

        <div className="px-5 pt-3 pb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline text-[#f1f5f9] font-bold text-lg">Add Transaction</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#1e293b] flex items-center justify-center text-[#64748b] active:scale-95">
              <X size={15} />
            </button>
          </div>

          {/* Type tabs — scrollable row */}
          <div className="flex gap-1.5 p-1 bg-[#070d1a] rounded-2xl mb-4 overflow-x-auto">
            {TYPES.map(t => (
              <button key={t.key} type="button" onClick={() => { setType(t.key); setErr('') }}
                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  type === t.key ? 'text-white shadow-lg' : 'text-[#475569]'
                }`}
                style={type === t.key ? { background: t.bg, boxShadow: `0 4px 15px ${t.bg}50` } : {}}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Corporate action help text */}
          {isSplit && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-[#6366f1]/10 border border-[#6366f1]/20 text-[#818cf8] text-xs">
              Stock Split: company divides shares. A 2:1 split means every 1 share becomes 2. Avg price halves automatically.
            </div>
          )}
          {isBonus && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-[#a855f7]/10 border border-[#a855f7]/20 text-[#c084fc] text-xs">
              Bonus Issue: company gives free shares. 1:1 bonus means 1 extra share for every 1 held. Avg price adjusts automatically.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Symbol + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#475569] text-[11px] font-bold uppercase tracking-wide block mb-1.5">Symbol *</label>
                <input value={symbol} onChange={e => { setSymbol(e.target.value.toUpperCase()); setErr('') }}
                  placeholder="RELIANCE" className={INPUT} />
              </div>
              <div>
                <label className="text-[#475569] text-[11px] font-bold uppercase tracking-wide block mb-1.5">Date *</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className={INPUT} />
              </div>
            </div>

            {/* Company name — only for buy/sell/div */}
            {!isSplit && !isBonus && (
              <div>
                <label className="text-[#475569] text-[11px] font-bold uppercase tracking-wide block mb-1.5">Company Name</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="Reliance Industries Ltd" className={INPUT} />
              </div>
            )}

            {/* SPLIT form */}
            {isSplit && (
              <div>
                <label className="text-[#475569] text-[11px] font-bold uppercase tracking-wide block mb-1.5">
                  Split Ratio (New : Old)
                </label>
                <div className="flex items-center gap-3">
                  <input type="number" value={splitN} onChange={e => setSplitN(e.target.value)}
                    placeholder="2" min="1" step="1" className={INPUT} />
                  <span className="text-[#64748b] text-lg font-bold shrink-0">:</span>
                  <input type="number" value={splitD} onChange={e => setSplitD(e.target.value)}
                    placeholder="1" min="1" step="1" className={INPUT} />
                </div>
                {splitN && splitD && (
                  <p className="text-[#475569] text-xs mt-1.5 px-1">
                    Every {splitD} share(s) → {splitN} share(s). Qty ×{(parseFloat(splitN)/parseFloat(splitD)).toFixed(2)}, Avg price ÷{(parseFloat(splitN)/parseFloat(splitD)).toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {/* BONUS form */}
            {isBonus && (
              <div>
                <label className="text-[#475569] text-[11px] font-bold uppercase tracking-wide block mb-1.5">
                  Bonus Ratio (Bonus : Existing)
                </label>
                <div className="flex items-center gap-3">
                  <input type="number" value={bonusN} onChange={e => setBonusN(e.target.value)}
                    placeholder="1" min="1" step="1" className={INPUT} />
                  <span className="text-[#64748b] text-lg font-bold shrink-0">:</span>
                  <input type="number" value={bonusD} onChange={e => setBonusD(e.target.value)}
                    placeholder="1" min="1" step="1" className={INPUT} />
                </div>
                {bonusN && bonusD && (
                  <p className="text-[#475569] text-xs mt-1.5 px-1">
                    {bonusN} free share(s) for every {bonusD} held. Total qty ×{(1 + parseFloat(bonusN)/parseFloat(bonusD)).toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {/* DIVIDEND form */}
            {isDiv && (
              <div>
                <label className="text-[#475569] text-[11px] font-bold uppercase tracking-wide block mb-1.5">Total Amount Received ₹ *</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="2500.00" min="0.01" step="any" className={INPUT} />
              </div>
            )}

            {/* BUY / SELL form */}
            {isTrade && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#475569] text-[11px] font-bold uppercase tracking-wide block mb-1.5">Quantity *</label>
                    <input type="number" value={qty} onChange={e => setQty(e.target.value)}
                      placeholder="10" min="0.001" step="any" className={INPUT} />
                  </div>
                  <div>
                    <label className="text-[#475569] text-[11px] font-bold uppercase tracking-wide block mb-1.5">Price ₹ *</label>
                    <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                      placeholder="2450.00" min="0.01" step="any" className={INPUT} />
                  </div>
                </div>

                {qty && price && (
                  <div className="flex justify-between px-4 py-3 rounded-xl bg-[#070d1a] border border-[#1e2d45]">
                    <span className="text-[#475569] text-sm">Total {type === 'buy' ? 'invested' : 'received'}</span>
                    <span className="font-data font-bold text-[#f1f5f9]">
                      ₹{(+qty * +price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div>
                  <label className="text-[#475569] text-[11px] font-bold uppercase tracking-wide block mb-1.5">Sector</label>
                  <select value={sector} onChange={e => setSector(e.target.value)} className={SELECT}>
                    <option value="">Select sector (optional)</option>
                    {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {type === 'buy' && (
                  <button type="button" onClick={() => setIsSip(v => !v)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                      isSip ? 'bg-[#6366f1]/15 border-[#6366f1]/40 text-[#818cf8]' : 'bg-[#070d1a] border-[#1e2d45] text-[#475569]'
                    }`}>
                    <div className="flex items-center gap-2.5">
                      <Repeat2 size={15} />
                      <div className="text-left">
                        <p className="text-sm font-semibold">Mark as SIP</p>
                        <p className="text-[10px] opacity-70">Systematic Investment Plan installment</p>
                      </div>
                    </div>
                    <div className={`w-11 h-6 rounded-full relative transition-colors ${isSip ? 'bg-[#6366f1]' : 'bg-[#1e293b]'}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isSip ? 'left-6' : 'left-1'}`} />
                    </div>
                  </button>
                )}
              </>
            )}

            {/* Notes */}
            {!isSplit && !isBonus && (
              <div>
                <label className="text-[#475569] text-[11px] font-bold uppercase tracking-wide block mb-1.5">Notes</label>
                <input value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder={isDiv ? 'Q3 FY25 dividend...' : 'Why I bought, target price...'}
                  className={INPUT} />
              </div>
            )}

            {err && <p className="text-[#ef4444] text-xs px-1 font-medium">{err}</p>}

            <button type="submit"
              className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.98] mt-1"
              style={{ background: active.bg, boxShadow: `0 8px 24px ${active.bg}40` }}>
              Save {active.label.split(' ')[1]} Entry
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
