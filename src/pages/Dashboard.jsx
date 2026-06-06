import { useState, useEffect, useMemo } from 'react'
import { RefreshCw, Bell, Activity, AlertCircle } from 'lucide-react'
import { useQuotes } from '../hooks/useStockData'
import { fetchChart } from '../utils/api'
import { INDICES, NIFTY50_SYMBOLS } from '../utils/stocks'
import { formatTime } from '../utils/format'
import IndexCard from '../components/IndexCard'
import StockRow from '../components/StockRow'
import { SkeletonStockRow } from '../components/Skeleton'

export default function Dashboard() {
  const indexSymbols = INDICES.map(i => i.symbol)
  const [activeTab, setActiveTab] = useState('gainers')
  const [sparkData, setSparkData] = useState({})

  const {
    data: indexData, loading: indexLoading, error: indexError,
    lastUpdated, refresh,
  } = useQuotes(indexSymbols, true, 60_000)

  const {
    data: niftyData, loading: niftyLoading, error: niftyError,
  } = useQuotes(NIFTY50_SYMBOLS, true, 60_000)

  useEffect(() => {
    INDICES.forEach(async ({ symbol }) => {
      try {
        const chart = await fetchChart(symbol, '5m', '1d')
        const closes = chart?.indicators?.quote?.[0]?.close?.filter(v => v != null) ?? []
        if (closes.length > 4) {
          setSparkData(prev => ({ ...prev, [symbol]: closes.slice(-20) }))
        }
      } catch {}
    })
  }, [])

  const indexMap = useMemo(() => {
    const m = {}
    indexData?.forEach(q => { m[q.symbol] = q })
    return m
  }, [indexData])

  const sortedStocks = useMemo(() => {
    if (!niftyData) return []
    return [...niftyData].sort((a, b) =>
      (b.regularMarketChangePercent ?? 0) - (a.regularMarketChangePercent ?? 0)
    )
  }, [niftyData])

  const gainers = sortedStocks.slice(0, 5)
  const losers = [...sortedStocks].reverse().slice(0, 5)
  const displayList = activeTab === 'gainers' ? gainers : losers

  const hasError = indexError || niftyError

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0f172a]/95 backdrop-blur border-b border-[#334155] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#6366f1] flex items-center justify-center lg:hidden">
            <Activity size={15} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-headline text-[#f1f5f9] font-bold text-base leading-tight lg:text-lg">
              StockSarthi
            </h1>
            {lastUpdated && (
              <p className="text-[#64748b] text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] live-dot inline-block" />
                Updated {formatTime(lastUpdated)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasError && (
            <div className="flex items-center gap-1 text-[#f59e0b] text-[11px]">
              <AlertCircle size={13} />
              <span className="hidden sm:inline">Using cached data</span>
            </div>
          )}
          <button
            onClick={refresh}
            className="w-8 h-8 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center text-[#94a3b8] hover:text-[#f1f5f9] hover:border-[#6366f1] transition-all active:scale-95"
          >
            <RefreshCw size={14} className={indexLoading ? 'animate-spin' : ''} />
          </button>
          <button className="w-8 h-8 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center text-[#94a3b8]">
            <Bell size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-5">
        {/* Index Cards */}
        <section>
          <h2 className="text-[#94a3b8] text-xs font-semibold uppercase tracking-wider mb-3">Market Overview</h2>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scroll-smooth">
            {INDICES.map(({ symbol, name }) => (
              <IndexCard
                key={symbol}
                name={name}
                quote={indexMap[symbol]}
                sparkData={sparkData[symbol]}
                loading={indexLoading}
              />
            ))}
          </div>
        </section>

        {/* Gainers / Losers */}
        <section>
          <div className="flex items-center gap-1 mb-3">
            <button
              onClick={() => setActiveTab('gainers')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === 'gainers'
                  ? 'bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30'
                  : 'text-[#64748b] hover:text-[#94a3b8]'
              }`}
            >
              Top Gainers
            </button>
            <button
              onClick={() => setActiveTab('losers')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === 'losers'
                  ? 'bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30'
                  : 'text-[#64748b] hover:text-[#94a3b8]'
              }`}
            >
              Top Losers
            </button>
          </div>

          {niftyLoading ? (
            <SkeletonStockRow count={5} />
          ) : (
            <div className="space-y-2">
              {displayList.map(q => (
                <StockRow key={q.symbol} quote={q} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
