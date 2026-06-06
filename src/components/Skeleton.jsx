export function SkeletonIndexCard() {
  return (
    <div className="min-w-[160px] h-[110px] rounded-xl bg-[#1e293b] border border-[#334155] p-4 shrink-0">
      <div className="skeleton h-3 w-16 rounded mb-2" />
      <div className="skeleton h-6 w-28 rounded mb-2" />
      <div className="skeleton h-5 w-20 rounded-full" />
    </div>
  )
}

export function SkeletonStockRow({ count = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#1e293b] border border-[#334155]">
          <div className="space-y-2 flex-1">
            <div className="skeleton h-4 w-20 rounded" />
            <div className="skeleton h-3 w-32 rounded" />
          </div>
          <div className="text-right space-y-2">
            <div className="skeleton h-4 w-20 rounded" />
            <div className="skeleton h-5 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonChart() {
  return (
    <div className="space-y-3">
      <div className="skeleton h-64 w-full rounded-xl" />
      <div className="skeleton h-16 w-full rounded-xl" />
    </div>
  )
}

export function SkeletonText({ w = 'w-24', h = 'h-4' }) {
  return <div className={`skeleton ${h} ${w} rounded`} />
}
