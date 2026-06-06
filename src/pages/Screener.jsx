import { useState, useMemo, useEffect } from 'react'
import { Search, Star, ChevronUp, ChevronDown, Filter } from 'lucide-react'
import { useQuotes } from '../hooks/useStockData'
import { formatPct, isPositive } from '../utils/format'
import { SCREENER_STOCKS } from '../utils/stocks'
import { SkeletonStockRow } from '../components/Skeleton'
import StockRow from '../components/StockRow'

const CAP_LABELS = { all: 'All', large: 'Large Cap', mid: 'Mid Cap', small: 'Small Cap' }
const SORT_OPTIONS = [
  { key: 'symbol', label: 'Symbol' },
  { key: 'price', label: 'Price' },
  { key: 'change', label: '% Change' },
]

const WATCHLIST_KEY = 'stocksarthi_watchlist'
function loadWatchlist() { try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY)) ?? [] } catch { return [] } }
function saveWatchlist(w) { try { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(w)) } catch {} }

export default function Screener() {
  const [search, setSearch] = useState('')
  const [capFilter, setCapFilter] = useState('all')
  const [sortKey, setSortKey] = useState('change')
  const [sortDir, setSortDir] = useState('desc')
  const [watchlist, setWatchlist] = useState(loadWatchlist)
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false)

  const symbols = useMemo(() => SCREENER_STOCKS.map(s => s.symbolNS), [])
  const { data: quotes, loading } = useQuotes(symbols)

  const quoteMap = useMemo(() => {
    const m = {}
    quotes?.forEach(q => { m[q.symbol] = q })
    return m
  }, [quotes])

  const metaMap = useMemo(() => {
    const m = {}
    SCREENER_STOCKS.forEach(s => { m[s.symbolNS] = s })
    return m
  }, [])

  const toggleStar = (sym) => {
    const next = watchlist.includes(sym)
      ? watchlist.filter(s => s !== sym)
      : [...watchlist, sym]
    setWatchlist(next)
    saveWatchlist(next)
  }

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    let list = SCREENER_STOCKS.filter(s => {
      const q = quoteMap[s.symbolNS]
      if (capFilter !== 'all' && s.cap !== capFilter) return false
      if (showWatchlistOnly && !watchlist.includes(s.symbolNS)) return false
      if (search) {
        const sq = search.toLowerCase()
        return s.symbol.toLowerCase().includes(sq) || s.name.toLowerCase().includes(sq)
      }
      return true
    })

    list.sort((a, b) => {
      const qa = quoteMap[a.symbolNS], qb = quoteMap[b.symbolNS]
      let va = 0, vb = 0
      if (sortKey === 'symbol') { va = a.symbol; vb = b.symbol }
      else if (sortKey === 'price') { va = qa?.regularMarketPrice ?? 0; vb = qb?.regularMarketPrice ?? 0 }
      else if (sortKey === 'change') { va = qa?.regularMarketChangePercent ?? -999; vb = qb?.regularMarketChangePercent ?? -999 }
      if (sortKey === 'symbol') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      return sortDir === 'asc' ? va - vb : vb - va
    })

    return list
  }, [quoteMap, capFilter, search, sortKey, sortDir, watchlist, showWatchlistOnly])

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return <ChevronDown size={12} className="text-[#475569]" />
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-[#6366f1]" /> : <ChevronDown size={12} className="text-[#6366f1]" />
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0f172a]/95 backdrop-blur border-b border-[#334155] px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-[#f1f5f9] font-bold text-base">Screener</h1>
            <p className="text-[#64748b] text-[11px]">{filtered.length} stocks</p>
          </div>
          <button
            onClick={() => setShowWatchlistOnly(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              showWatchlistOnly
                ? 'bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30'
                : 'bg-[#1e293b] text-[#64748b] border border-[#334155]'
            }`}
          >
            <Star size={12} className={showWatchlistOnly ? 'fill-[#f59e0b]' : ''} />
            Watchlist
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or symbol…"
            className="w-full bg-[#1e293b] border border-[#334155] rounded-lg pl-9 pr-3 py-2.5 text-[#f1f5f9] text-sm placeholder-[#475569] focus:outline-none focus:border-[#6366f1] transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {Object.entries(CAP_LABELS).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setCapFilter(k)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                capFilter === k
                  ? 'bg-[#6366f1]/20 text-[#6366f1] border border-[#6366f1]/30'
                  : 'bg-[#1e293b] text-[#64748b] border border-[#334155]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sort bar */}
        <div className="flex gap-2">
          {SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleSort(key)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                sortKey === key
                  ? 'bg-[#1e293b] text-[#6366f1] border border-[#6366f1]/30'
                  : 'text-[#64748b] hover:text-[#94a3b8]'
              }`}
            >
              {label} <SortIcon k={key} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 py-3 space-y-2">
        {loading ? (
          <SkeletonStockRow count={10} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[#64748b] text-sm">No stocks match your filter</p>
          </div>
        ) : (
          filtered.map(s => {
            const q = quoteMap[s.symbolNS]
            return (
              <StockRow
                key={s.symbolNS}
                quote={q ?? { symbol: s.symbolNS, regularMarketPrice: null, regularMarketChangePercent: null }}
                meta={s}
                starred={watchlist.includes(s.symbolNS)}
                onStar={() => toggleStar(s.symbolNS)}
                showSector
              />
            )
          })
        )}
      </div>
    </div>
  )
}
