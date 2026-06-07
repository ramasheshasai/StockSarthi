import { useState, useMemo } from 'react'
import { Plus, Trash2, Star, Target, StickyNote, X } from 'lucide-react'
import { getWatchlist, addWatchlistItem, deleteWatchlistItem } from '../utils/storage'

const INPUT = 'w-full bg-[#0f172a] border border-[#334155] rounded-xl px-4 py-3 text-[#f1f5f9] text-sm placeholder-[#475569] focus:outline-none focus:border-[#6366f1] transition-colors'

function AddWatchlistModal({ onAdd, onClose }) {
  const [symbol, setSymbol] = useState('')
  const [name, setName] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const s = symbol.trim().toUpperCase()
    if (!s) return setErr('Enter stock symbol')
    onAdd({ symbol: s, name: name.trim() || s, targetPrice: targetPrice ? parseFloat(targetPrice) : null, notes: notes.trim() })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#1e293b] rounded-t-3xl px-5 pt-5 pb-8 shadow-2xl"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
        <div className="w-10 h-1 rounded-full bg-[#334155] mx-auto mb-5" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-headline text-[#f1f5f9] text-lg font-bold">Add to Watchlist</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#334155] flex items-center justify-center text-[#94a3b8]">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#94a3b8] text-xs font-medium block mb-1.5">Symbol *</label>
              <input value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="TCS" className={INPUT} />
            </div>
            <div>
              <label className="text-[#94a3b8] text-xs font-medium block mb-1.5">Target Price ₹</label>
              <input type="number" value={targetPrice} onChange={e => setTargetPrice(e.target.value)}
                placeholder="3500" step="any" className={INPUT} />
            </div>
          </div>
          <div>
            <label className="text-[#94a3b8] text-xs font-medium block mb-1.5">Company Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Tata Consultancy Services" className={INPUT} />
          </div>
          <div>
            <label className="text-[#94a3b8] text-xs font-medium block mb-1.5">Notes / Reason</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Why I want to buy this stock, what to watch for..."
              className={`${INPUT} resize-none`} />
          </div>
          {err && <p className="text-[#ef4444] text-xs px-1">{err}</p>}
          <button type="submit"
            className="w-full py-3.5 rounded-xl bg-[#f59e0b] text-white font-bold text-base active:scale-95 transition-all">
            ★ Add to Watchlist
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Watchlist() {
  const [showModal, setShowModal] = useState(false)
  const [tick, setTick] = useState(0)

  const watchlist = useMemo(() => getWatchlist(), [tick])

  const handleAdd = (item) => { addWatchlistItem(item); setTick(t => t + 1) }
  const handleDelete = (id) => { deleteWatchlistItem(id); setTick(t => t + 1) }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-4 pt-5 pb-3">
        <h1 className="font-headline text-[#f1f5f9] font-bold text-2xl">Watchlist</h1>
        <p className="text-[#64748b] text-xs mt-0.5">Stocks you want to buy</p>
      </div>

      <div className="flex-1 px-4 space-y-3 pb-6">
        {watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#1e293b] border border-[#334155] flex items-center justify-center mb-4">
              <Star size={28} className="text-[#f59e0b]" />
            </div>
            <p className="text-[#f1f5f9] font-bold text-base mb-1">Watchlist is empty</p>
            <p className="text-[#64748b] text-sm mb-6">Add stocks you're planning to buy</p>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-[#f59e0b] text-white rounded-xl font-bold text-sm active:scale-95 transition-all">
              <Plus size={16} /> Add Stock
            </button>
          </div>
        ) : (
          watchlist.map(item => (
            <div key={item.id} className="bg-[#1e293b] border border-[#334155] rounded-2xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Star size={13} className="fill-[#f59e0b] text-[#f59e0b] shrink-0" />
                    <p className="text-[#f1f5f9] font-bold text-base">{item.symbol}</p>
                  </div>
                  <p className="text-[#64748b] text-xs mt-0.5">{item.name}</p>
                </div>
                <button onClick={() => handleDelete(item.id)}
                  className="w-7 h-7 rounded-lg bg-[#ef4444]/10 flex items-center justify-center text-[#ef4444]/50 hover:text-[#ef4444] shrink-0 ml-2">
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="flex gap-3 flex-wrap mt-3">
                {item.targetPrice && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-lg">
                    <Target size={12} className="text-[#f59e0b]" />
                    <span className="text-[#f59e0b] text-xs font-semibold">
                      Target ₹{item.targetPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-[#64748b] text-xs">
                  <span>Added {item.addedDate}</span>
                </div>
              </div>

              {item.notes && (
                <div className="flex gap-2 mt-3 p-3 bg-[#0f172a] rounded-xl">
                  <StickyNote size={13} className="text-[#64748b] shrink-0 mt-0.5" />
                  <p className="text-[#94a3b8] text-xs leading-relaxed">{item.notes}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {watchlist.length > 0 && (
        <button onClick={() => setShowModal(true)}
          className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40 w-14 h-14 rounded-full bg-[#f59e0b] text-white shadow-xl shadow-[#f59e0b]/30 flex items-center justify-center active:scale-95 transition-all">
          <Plus size={24} strokeWidth={2.5} />
        </button>
      )}

      {showModal && <AddWatchlistModal onAdd={handleAdd} onClose={() => setShowModal(false)} />}
    </div>
  )
}
