import { useState } from 'react'
import { X } from 'lucide-react'

export default function AddStockModal({ onAdd, onClose }) {
  const [symbol, setSymbol] = useState('')
  const [qty, setQty] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [err, setErr] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const s = symbol.trim().toUpperCase()
    const q = parseFloat(qty)
    const p = parseFloat(buyPrice)
    if (!s) return setErr('Enter a stock symbol')
    if (!q || q <= 0) return setErr('Enter valid quantity')
    if (!p || p <= 0) return setErr('Enter valid buy price')
    onAdd({ symbol: s, qty: q, buyPrice: p })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-[#1e293b] border border-[#334155] rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-headline text-[#f1f5f9] text-lg font-bold">Add Stock</h2>
          <button onClick={onClose} className="text-[#64748b] hover:text-[#f1f5f9] transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[#94a3b8] text-xs font-medium mb-1.5 block">NSE Symbol</label>
            <input
              value={symbol}
              onChange={e => setSymbol(e.target.value)}
              placeholder="e.g. RELIANCE, TCS, INFY"
              className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-[#f1f5f9] text-sm placeholder-[#475569] focus:outline-none focus:border-[#6366f1] transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#94a3b8] text-xs font-medium mb-1.5 block">Quantity</label>
              <input
                type="number"
                value={qty}
                onChange={e => setQty(e.target.value)}
                placeholder="10"
                min="0.01" step="any"
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-[#f1f5f9] text-sm placeholder-[#475569] focus:outline-none focus:border-[#6366f1] transition-colors"
              />
            </div>
            <div>
              <label className="text-[#94a3b8] text-xs font-medium mb-1.5 block">Buy Price (₹)</label>
              <input
                type="number"
                value={buyPrice}
                onChange={e => setBuyPrice(e.target.value)}
                placeholder="2450.00"
                min="0.01" step="any"
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-[#f1f5f9] text-sm placeholder-[#475569] focus:outline-none focus:border-[#6366f1] transition-colors"
              />
            </div>
          </div>

          {err && <p className="text-[#ef4444] text-xs">{err}</p>}

          <button
            type="submit"
            className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white font-semibold py-3 rounded-lg transition-colors text-sm"
          >
            Add to Portfolio
          </button>
        </form>
      </div>
    </div>
  )
}
