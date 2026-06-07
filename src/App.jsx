import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Portfolio from './pages/Portfolio'
import Analytics from './pages/Analytics'
import Watchlist from './pages/Watchlist'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="watchlist" element={<Watchlist />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
