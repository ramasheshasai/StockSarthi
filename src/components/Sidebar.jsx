import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Briefcase, BarChart2, Star, TrendingUp } from 'lucide-react'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/portfolio', icon: Briefcase, label: 'Portfolio' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/watchlist', icon: Star, label: 'Watchlist' },
]

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-[#0a1120] border-r border-[#334155] px-3 py-5 shrink-0">
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-9 h-9 rounded-lg bg-[#6366f1] flex items-center justify-center shrink-0">
          <TrendingUp size={18} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <p className="font-headline text-[#f1f5f9] font-bold text-base leading-tight">StockSarthi</p>
          <p className="text-[#64748b] text-[10px]">My Portfolio Tracker</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1">
        {NAV.map(({ to, icon: Icon, label }) => (
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
            <Icon size={17} /> {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
