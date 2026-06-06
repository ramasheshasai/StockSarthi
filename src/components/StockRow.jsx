import { Star } from 'lucide-react'
import { formatCurrency, formatPct, isPositive } from '../utils/format'

export default function StockRow({ quote, meta, onStar, starred, showSector = false }) {
  if (!quote) return null
  const pos = isPositive(quote.regularMarketChangePercent)
  const color = pos ? '#22c55e' : '#ef4444'
  const name = meta?.name || quote.shortName || quote.longName || quote.symbol

  return (
    <div className="flex items-center justify-between px-3 py-3 rounded-xl bg-[#1e293b] border border-[#334155] fade-in">
      <div className="flex items-center gap-3 min-w-0">
        {onStar && (
          <button
            onClick={() => onStar(quote.symbol)}
            className="shrink-0 transition-colors"
          >
            <Star
              size={15}
              className={starred ? 'fill-[#f59e0b] text-[#f59e0b]' : 'text-[#475569]'}
            />
          </button>
        )}
        <div className="min-w-0">
          <p className="text-[#f1f5f9] text-sm font-semibold truncate">
            {quote.symbol?.replace('.NS', '').replace('.BO', '')}
          </p>
          <p className="text-[#64748b] text-[11px] truncate leading-tight">
            {name}
            {showSector && meta?.sector && (
              <span className="ml-1.5 text-[#475569]">· {meta.sector}</span>
            )}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0 ml-2">
        <p className="font-data text-[#f1f5f9] text-sm font-medium">
          ₹{(quote.regularMarketPrice ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <span
          className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ background: `${color}20`, color }}
        >
          {pos ? '▲' : '▼'} {formatPct(quote.regularMarketChangePercent)}
        </span>
      </div>
    </div>
  )
}
