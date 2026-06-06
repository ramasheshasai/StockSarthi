import { formatNum, formatPct, formatChange, isPositive } from '../utils/format'

function MiniSparkline({ data, positive }) {
  if (!data?.length || data.length < 2) return null
  const valid = data.filter(v => v != null)
  if (valid.length < 2) return null
  const min = Math.min(...valid)
  const max = Math.max(...valid)
  const range = max - min || 1
  const W = 72, H = 24
  const pts = valid.map((v, i) =>
    `${(i / (valid.length - 1)) * W},${H - ((v - min) / range) * H}`
  ).join(' L')
  const color = positive ? '#22c55e' : '#ef4444'
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mt-2 opacity-80">
      <defs>
        <linearGradient id={`sg${positive ? 'g' : 'r'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M${pts} L${W},${H} L0,${H} Z`}
        fill={`url(#sg${positive ? 'g' : 'r'})`}
      />
      <path d={`M${pts}`} stroke={color} strokeWidth="1.5" fill="none"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function IndexCard({ name, quote, sparkData, loading }) {
  if (loading || !quote) {
    return (
      <div className="min-w-[155px] h-[115px] rounded-xl bg-[#1e293b] border border-[#334155] p-4 shrink-0 skeleton" />
    )
  }

  const pos = isPositive(quote.regularMarketChangePercent)
  const color = pos ? '#22c55e' : '#ef4444'

  return (
    <div className="min-w-[155px] rounded-xl bg-[#1e293b] border border-[#334155] p-4 shrink-0 fade-in">
      <p className="text-[#94a3b8] text-[11px] font-medium mb-1 truncate">{name}</p>
      <p className="font-data text-[#f1f5f9] text-[17px] font-semibold leading-tight">
        {formatNum(quote.regularMarketPrice)}
      </p>
      <span
        className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
        style={{ background: `${color}20`, color }}
      >
        {pos ? '▲' : '▼'} {formatPct(quote.regularMarketChangePercent)}
      </span>
      <p className="text-[#64748b] text-[10px] font-data mt-0.5">
        {formatChange(quote.regularMarketChange)}
      </p>
      <MiniSparkline data={sparkData} positive={pos} />
    </div>
  )
}
