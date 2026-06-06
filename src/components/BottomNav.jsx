import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Briefcase, TrendingUp, Search } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/portfolio', icon: Briefcase, label: 'Portfolio' },
  { to: '/charts', icon: TrendingUp, label: 'Charts' },
  { to: '/screener', icon: Search, label: 'Screener' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex lg:hidden bg-[#0a1120]/95 backdrop-blur border-t border-[#334155]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
              isActive ? 'text-[#6366f1]' : 'text-[#64748b]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className="relative flex items-center justify-center">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                {isActive && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#6366f1] live-dot" />
                )}
              </div>
              <span className="text-[10px] font-medium mt-0.5">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
