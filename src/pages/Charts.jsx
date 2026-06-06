import { useState, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { useChart, useQuotes } from '../hooks/useStockData'
import { formatNum, formatPct, formatDateShort, isPositive } from '../utils/format'
import { SkeletonChart } from '../components/Skeleton'

const RANGES = [
  { label: '1W', interval: '30m', range: '5d' },
  { label: '1M', interval: '1d', range: '1mo' },
  { label: '3M', interval: '1d', range: '3mo' },
  { label: '6M', interval: '1wk', range: '6mo' },
  { label: '1Y', interval: '1wk', range: '1y' },
]

const POPULAR = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'TATAMOTORS', 'WIPRO', 'BAJFINANCE']

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-2.5 shadow-xl text-xs">
      <p className="text-[#64748b] mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-data font-semibold">
          {p.name === 'close' ? `₹${Number(p.value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : Number(p.value).toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  )
}

export default function Charts() {
  const [input, setInput] = useState('')
  const [symbol, setSymbol] = useState('RELIANCE')
  const [rangeIdx, setRangeIdx] = useState(1)

  const { interval, range } = RANGES[rangeIdx]
  const { data: chart, loading: chartLoading, error: chartErr } = useChart(`${symbol}.NS`, interval, range)
  const { data: quotes } = useQuotes([`${symbol}.NS`])
  const quote = quotes?.[0]

  const chartData = useMemo(() => {
    if (!chart) return []
    const ts = chart.timestamps ?? chart.timestamp ?? []
    const q = chart.indicators?.quote?.[0] ?? {}
    return ts.map((t, i) => ({
      date: formatDateShort(t),
      close: q.close?.[i] != null ? parseFloat(q.close[i].toFixed(2)) : null,
      volume: q.volume?.[i] ?? null,
      open: q.open?.[i], high: q.high?.[i], low: q.low?.[i],
    })).filter(d => d.close != null)
  }, [chart])

  const priceMin = useMemo(() => {
    if (!chartData.length) return 'auto'
    const min = Math.min(...chartData.map(d => d.close))
    return parseFloat((min * 0.995).toFixed(0))
  }, [chartData])

  const pos = isPositive(quote?.regularMarketChangePercent)
  const lineColor = pos ? '#22c55e' : '#ef4444'

  const handleSearch = (e) => {
    e.preventDefault()
    const s = input.trim().toUpperCase()
    if (s) { setSymbol(s); setInput('') }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0f172a]/95 backdrop-blur border-b border-[#334155] px-4 py-3">
        <h1 className="font-headline text-[#f1f5f9] font-bold text-base">Charts</h1>
        <form onSubmit={handleSearch} className="mt-2 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Search NSE symbol… e.g. RELIANCE, TCS"
            className="w-full bg-[#1e293b] border border-[#334155] rounded-lg pl-9 pr-8 py-2.5 text-[#f1f5f9] text-sm placeholder-[#475569] focus:outline-none focus:border-[#6366f1] transition-colors"
          />
          {input && (
            <button type="button" onClick={() => setInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b]">
              <X size={14} />
            </button>
          )}
        </form>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Popular shortcuts */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {POPULAR.map(s => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                symbol === s
                  ? 'bg-[#6366f1]/20 text-[#6366f1] border border-[#6366f1]/30'
                  : 'bg-[#1e293b] text-[#94a3b8] border border-[#334155]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Stock info */}
        {quote && (
          <div className="flex items-center justify-between fade-in">
            <div>
              <p className="text-[#f1f5f9] font-headline font-bold text-xl">{symbol}</p>
              <p className="text-[#64748b] text-xs">{quote.shortName || quote.longName}</p>
            </div>
            <div className="text-right">
              <p className="font-data text-[#f1f5f9] font-bold text-xl">
                ₹{(quote.regularMarketPrice ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span
                className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: `${lineColor}20`, color: lineColor }}
              >
                {pos ? '▲' : '▼'} {formatPct(quote.regularMarketChangePercent)}
              </span>
            </div>
          </div>
        )}

        {/* Range selector */}
        <div className="flex gap-1.5">
          {RANGES.map(({ label }, i) => (
            <button
              key={label}
              onClick={() => setRangeIdx(i)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                rangeIdx === i
                  ? 'bg-[#6366f1] text-white'
                  : 'bg-[#1e293b] text-[#64748b] border border-[#334155] hover:text-[#94a3b8]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {chartLoading ? <SkeletonChart /> : chartErr ? (
          <div className="flex items-center justify-center h-48 rounded-xl bg-[#1e293b] border border-[#334155]">
            <p className="text-[#64748b] text-sm">{chartErr}</p>
          </div>
        ) : chartData.length > 0 ? (
          <>
            {/* Price Chart */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-3 fade-in">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={lineColor} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }}
                    tickLine={false} axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[priceMin, 'auto']}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickLine={false} axisLine={false}
                    tickFormatter={v => `₹${Number(v).toLocaleString('en-IN')}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone" dataKey="close" name="close"
                    stroke={lineColor} strokeWidth={2}
                    fill="url(#priceGrad)"
                    dot={false} activeDot={{ r: 4, fill: lineColor, stroke: '#0f172a', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Volume Chart */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-3 fade-in">
              <p className="text-[#64748b] text-[11px] font-medium mb-2 px-1">Volume</p>
              <ResponsiveContainer width="100%" height={90}>
                <BarChart data={chartData} margin={{ top: 0, right: 5, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }}
                    tickLine={false} axisLine={false} interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickLine={false} axisLine={false}
                    tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="volume" name="volume" fill="#6366f1" opacity={0.7} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
