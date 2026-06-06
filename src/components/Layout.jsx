import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0 overflow-x-hidden">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
