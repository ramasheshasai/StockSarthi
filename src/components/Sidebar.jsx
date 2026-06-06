import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Briefcase, TrendingUp, Search, Activity } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/portfolio', icon: Briefcase, label: 'Portfolio' },
  { to: '/charts', icon: TrendingUp, label: 'Charts' },
  { to: '/screener', icon: Search, label: 'Screener' },
]

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-[#0a1120] border-r border-[#334155] px-3 py-5 shrink-0">
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-9 h-9 rounded-lg bg-[#6366f1] flex items-center justify-center shrink-0">
          <Activity size={19} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <p className="font-headline text-[#f1f5f9] font-bold text-base leading-tight">StockSarthi</p>
          <p className="text-[#64748b] text-[10px]">सारथी · Indian Markets</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#6366f1]/15 text-[#6366f1] border border-[#6366f1]/25'
                  : 'text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#1e293b]'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-3 rounded-lg bg-[#1e293b] border border-[#334155] mt-4">
        <p className="text-[#64748b] text-[11px] leading-relaxed">
          Data via Yahoo Finance<br />
          <span className="text-[#475569]">NSE · BSE · 60s refresh</span>
        </p>
      </div>
    </aside>
  )
}
