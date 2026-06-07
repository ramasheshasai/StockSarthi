import { useState, useMemo, useRef } from 'react'
import { Download, Upload, FileText, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area, LineChart, Line,
} from 'recharts'
import { getTransactions, getHoldings, getPrices, addTransaction } from '../utils/storage'
import { capitalGainsSummary, sectorConcentration, portfolioTimeline } from '../utils/calculations'
import { exportCSV, parseCSV } from '../utils/csv'
import { formatCurrency } from '../utils/format'

const ALLOC_COLORS  = ['#6366f1','#22c55e','#f59e0b','#ef4444','#06b6d4','#a855f7','#ec4899','#84cc16','#f97316','#14b8a6']
const SECTOR_COLORS = {
  'IT / Technology':'#6366f1','Banking & Finance':'#06b6d4','Pharma & Healthcare':'#22c55e',
  'FMCG':'#f59e0b','Auto':'#f97316','Energy & Oil':'#ef4444','Infrastructure':'#8b5cf6',
  'Metals & Mining':'#64748b','Chemicals':'#84cc16','Telecom':'#ec4899','Defence':'#14b8a6',
  'Others':'#94a3b8','Uncategorised':'#334155',
}

function CT({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0f172a] border border-[#334155] rounded-xl px-3 py-2 text-xs shadow-2xl">
      {label && <p className="text-[#475569] mb-1">{label}</p>}
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-data font-semibold">
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

function Section({ title, sub, children }) {
  return (
    <div className="bg-[#1e293b] border border-[#334155] rounded-3xl p-4">
      <p className="text-[#94a3b8] text-xs font-bold uppercase tracking-wider">{title}</p>
      {sub && <p className="text-[#475569] text-[10px] mb-3">{sub}</p>}
      {!sub && <div className="mb-3" />}
      {children}
    </div>
  )
}

export default function Analytics() {
  const [tick, setTick]           = useState(0)
  const [importErr, setImportErr] = useState('')
  const [imported, setImported]   = useState(0)
  const fileRef = useRef()

  const txs      = useMemo(() => getTransactions(), [tick])
  const holdings = useMemo(() => getHoldings(), [tick])
  const prices   = useMemo(() => getPrices(), [tick])
  const gains    = useMemo(() => capitalGainsSummary(txs), [tick])
  const timeline = useMemo(() => portfolioTimeline(txs), [tick])

  const totalInvested  = holdings.reduce((s, h) => s + h.totalInvested, 0)
  const totalDividends = holdings.reduce((s, h) => s + h.totalDividends, 0)

  // Allocation pie
  const pieData = holdings.map((h, i) => ({
    name: h.symbol, value: h.totalInvested,
    pct: totalInvested > 0 ? ((h.totalInvested / totalInvested) * 100).toFixed(1) : 0,
    color: ALLOC_COLORS[i % ALLOC_COLORS.length],
  }))

  // Sector concentration
  const sectorData = useMemo(() => sectorConcentration(holdings, totalInvested), [tick])
  const topSector  = sectorData[0]
  const isConcentrated = topSector?.pct > 40

  // P&L data
  const pnlData = holdings
    .filter(h => prices[h.symbol]?.price)
    .map(h => {
      const pnl = prices[h.symbol].price * h.qty - h.totalInvested
      return { name: h.symbol, pnl: +pnl.toFixed(0), pos: pnl >= 0 }
    }).sort((a, b) => b.pnl - a.pnl)

  // Bar chart
  const barData = holdings.map(h => ({
    name: h.symbol,
    Invested: +h.totalInvested.toFixed(0),
    ...(prices[h.symbol]?.price ? { Current: +(prices[h.symbol].price * h.qty).toFixed(0) } : {}),
  })).sort((a, b) => b.Invested - a.Invested).slice(0, 7)

  const handleImport = async (e) => {
    setImportErr(''); setImported(0)
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const parsed = parseCSV(await file.text())
      parsed.forEach(tx => addTransaction(tx))
      setImported(parsed.length); setTick(t => t + 1)
    } catch (err) { setImportErr(err.message) }
    e.target.value = ''
  }

  if (holdings.length === 0 && txs.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="px-4 pt-6 pb-4">
          <h1 className="font-headline text-[#f1f5f9] font-bold text-2xl">Analytics</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center pb-24">
          <div className="w-16 h-16 rounded-3xl bg-[#1e293b] border border-[#334155] flex items-center justify-center mb-4 text-2xl">📊</div>
          <p className="text-[#f1f5f9] font-bold text-lg mb-1">No data yet</p>
          <p className="text-[#64748b] text-sm mb-6">Add stocks or import a CSV to see analytics</p>
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#1e293b] border border-[#334155] text-[#f1f5f9] text-sm font-semibold active:scale-95">
              <Upload size={15} className="text-[#6366f1]" /> Import
            </button>
            <button onClick={() => exportCSV(txs)}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#6366f1]/15 border border-[#6366f1]/30 text-[#818cf8] text-sm font-semibold active:scale-95">
              <Download size={15} /> Export
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-4 pt-6 pb-3">
        <h1 className="font-headline text-[#f1f5f9] font-bold text-2xl">Analytics</h1>
        <p className="text-[#475569] text-xs mt-0.5">{txs.length} transactions · {holdings.length} holdings</p>
      </div>

      <div className="flex-1 px-4 space-y-4 pb-28">

        {/* Import / Export */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#1e293b] border border-[#334155] text-[#f1f5f9] text-sm font-semibold active:scale-95">
            <Upload size={16} className="text-[#6366f1]" /> Import CSV
          </button>
          <button onClick={() => exportCSV(txs)}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#6366f1]/15 border border-[#6366f1]/30 text-[#818cf8] text-sm font-semibold active:scale-95">
            <Download size={16} /> Export CSV
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />

        {imported > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] text-sm font-semibold">
            <CheckCircle2 size={15} /> Imported {imported} transaction{imported !== 1 ? 's' : ''} successfully
          </div>
        )}
        {importErr && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444] text-sm">
            <AlertCircle size={14} /> {importErr}
          </div>
        )}

        {/* ── Portfolio Timeline ── */}
        {timeline.length >= 2 && (
          <Section title="Investment Journey" sub="How much capital you have deployed over time">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={timeline} margin={{ top: 5, right: 0, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="tGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false}
                  tickFormatter={v => v >= 100000 ? `${(v/100000).toFixed(1)}L` : `${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<CT />} />
                <Area type="monotone" dataKey="invested" name="Invested" stroke="#6366f1" strokeWidth={2.5}
                  fill="url(#tGrad)" dot={false} activeDot={{ r: 4, fill: '#6366f1' }} />
                {timeline.some(t => t.proceeds > 0) && (
                  <Line type="monotone" dataKey="proceeds" name="Proceeds" stroke="#22c55e" strokeWidth={1.5}
                    dot={false} strokeDasharray="5 3" />
                )}
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-xs text-[#475569]">
                <span className="inline-block w-3 h-0.5 bg-[#6366f1] rounded" /> Invested
              </span>
              {timeline.some(t => t.proceeds > 0) && (
                <span className="flex items-center gap-1.5 text-xs text-[#475569]">
                  <span className="inline-block w-3 h-0.5 bg-[#22c55e] rounded" style={{ borderTop: '2px dashed #22c55e', background: 'none' }} /> Proceeds
                </span>
              )}
            </div>
          </Section>
        )}

        {/* ── Sector Concentration ── */}
        {sectorData.length > 0 && (
          <div className={`rounded-3xl p-4 border ${
            isConcentrated
              ? 'bg-[#f59e0b]/5 border-[#f59e0b]/30'
              : 'bg-[#1e293b] border-[#334155]'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              {isConcentrated
                ? <AlertTriangle size={15} className="text-[#f59e0b]" />
                : <CheckCircle2 size={15} className="text-[#22c55e]" />}
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: isConcentrated ? '#f59e0b' : '#94a3b8' }}>
                Sector Concentration
              </p>
            </div>
            {isConcentrated && (
              <p className="text-[#f59e0b] text-xs mb-3 font-medium">
                ⚠️ {topSector.pct.toFixed(0)}% of your portfolio is in {topSector.sector}. Consider diversifying.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {sectorData.map(s => (
                <div key={s.sector} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: SECTOR_COLORS[s.sector] ?? '#6366f1' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#94a3b8] text-[10px] truncate">{s.sector}</p>
                    <div className="h-1 rounded-full bg-[#334155] mt-0.5 overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${s.pct}%`,
                        background: SECTOR_COLORS[s.sector] ?? '#6366f1',
                      }} />
                    </div>
                  </div>
                  <span className="text-[#64748b] text-[10px] font-bold shrink-0">{s.pct.toFixed(0)}%</span>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={sectorData} cx="50%" cy="50%" innerRadius={35} outerRadius={60}
                  paddingAngle={3} dataKey="amount">
                  {sectorData.map((s, i) => (
                    <Cell key={i} fill={SECTOR_COLORS[s.sector] ?? ALLOC_COLORS[i % ALLOC_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Stock Allocation Pie ── */}
        {pieData.length > 0 && (
          <Section title="Stock Allocation" sub="% of total invested per stock">
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={3} dataKey="value">
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip content={<CT />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-1">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-[#94a3b8] text-xs truncate">{d.name}</span>
                  <span className="text-[#475569] text-xs ml-auto font-bold">{d.pct}%</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Invested vs Current ── */}
        {barData.length > 0 && (
          <Section title={Object.keys(prices).length > 0 ? 'Invested vs Current Value' : 'Invested by Stock'}>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false}
                  tickFormatter={v => v >= 100000 ? `${(v/100000).toFixed(0)}L` : `${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<CT />} />
                <Bar dataKey="Invested" fill="#6366f1" radius={[5,5,0,0]} />
                {Object.keys(prices).length > 0 && <Bar dataKey="Current" fill="#22c55e" radius={[5,5,0,0]} opacity={0.75} />}
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2">
              <Dot color="#6366f1" label="Invested" />
              {Object.keys(prices).length > 0 && <Dot color="#22c55e" label="Current" />}
            </div>
          </Section>
        )}

        {/* ── P&L by Stock ── */}
        {pnlData.length > 0 && (
          <Section title="P&L by Stock">
            {pnlData.map(d => {
              const max = Math.max(...pnlData.map(x => Math.abs(x.pnl)))
              const w   = max > 0 ? (Math.abs(d.pnl) / max) * 100 : 0
              return (
                <div key={d.name} className="mb-3 last:mb-0">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#f1f5f9] font-semibold">{d.name}</span>
                    <span className={`font-data font-bold ${d.pos ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                      {d.pos ? '+' : ''}{formatCurrency(d.pnl)}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#0f172a] overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${w}%`, background: d.pos ? '#22c55e' : '#ef4444' }} />
                  </div>
                </div>
              )
            })}
          </Section>
        )}

        {/* ── Dividend Income ── */}
        {totalDividends > 0 && (
          <Section title="Dividend Income">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#f1f5f9] font-data font-bold text-xl">{formatCurrency(totalDividends)}</p>
              <p className="text-[#475569] text-xs">Total received</p>
            </div>
            {holdings.filter(h => h.totalDividends > 0).map(h => (
              <div key={h.symbol} className="flex items-center justify-between py-2 border-b border-[#334155]/50 last:border-0">
                <div>
                  <p className="text-[#f1f5f9] text-sm font-semibold">{h.symbol}</p>
                  {h.divYieldOnCost > 0 && (
                    <p className="text-[#f59e0b] text-[10px]">{h.divYieldOnCost.toFixed(2)}% yield on cost</p>
                  )}
                </div>
                <p className="font-data text-[#f59e0b] font-bold">{formatCurrency(h.totalDividends)}</p>
              </div>
            ))}
          </Section>
        )}

        {/* ── Capital Gains Summary ── */}
        {gains.realised.length > 0 && (
          <Section title="Capital Gains Summary" sub="For tax filing · FY 2024-25 rates">
            <div className="space-y-3">
              {[
                { label: 'Long Term Gains (LTCG)', labelSub: '12.5% tax above ₹1.25L', value: gains.ltcg, tax: gains.ltcgTax, color: '#6366f1' },
                { label: 'Short Term Gains (STCG)', labelSub: '20% tax', value: gains.stcg, tax: gains.stcgTax, color: '#f59e0b' },
              ].map(g => (
                <div key={g.label} className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: g.color }} />
                      <p className="text-[#f1f5f9] text-xs font-semibold">{g.label}</p>
                    </div>
                    <p className="text-[#475569] text-[10px] ml-4">{g.labelSub} · Est. tax: {formatCurrency(g.tax)}</p>
                  </div>
                  <p className={`font-data font-bold text-sm ${g.value >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                    {g.value >= 0 ? '+' : ''}{formatCurrency(g.value)}
                  </p>
                </div>
              ))}
              <div className="border-t border-[#334155] pt-3 flex justify-between">
                <p className="text-[#f1f5f9] font-semibold text-sm">Total Realised</p>
                <p className={`font-data font-bold text-sm ${gains.total >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  {gains.total >= 0 ? '+' : ''}{formatCurrency(gains.total)}
                </p>
              </div>
              <p className="text-[#475569] text-[10px]">
                Total estimated tax: {formatCurrency(gains.ltcgTax + gains.stcgTax)}
              </p>
            </div>
          </Section>
        )}

        {/* CSV format hint */}
        <div className="flex items-start gap-3 p-4 bg-[#1e293b] border border-[#334155] rounded-2xl">
          <FileText size={18} className="text-[#6366f1] shrink-0 mt-0.5" />
          <div>
            <p className="text-[#f1f5f9] text-sm font-semibold">CSV Import Format</p>
            <p className="font-data text-[#475569] text-[10px] mt-1 leading-relaxed">
              Type, Symbol, Company, Quantity, Price, Date, Notes<br />
              Buy,RELIANCE,Reliance Industries,10,2450,2024-01-15,
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Dot({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
      <span className="text-[#475569] text-xs">{label}</span>
    </div>
  )
}
