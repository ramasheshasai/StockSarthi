const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR',
  minimumFractionDigits: 2, maximumFractionDigits: 2,
})
const NUM = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
})
const COMPACT = new Intl.NumberFormat('en-IN', {
  notation: 'compact', maximumFractionDigits: 2,
})

export const formatCurrency = (val) => val == null ? '₹—' : INR.format(val)
export const formatNum = (val) => val == null ? '—' : NUM.format(val)
export const formatCompact = (val) => val == null ? '—' : COMPACT.format(val)
export const formatPct = (val) => val == null ? '—' : `${val >= 0 ? '+' : ''}${NUM.format(val)}%`
export const formatChange = (val) => val == null ? '—' : `${val >= 0 ? '+' : ''}${NUM.format(val)}`
export const isPositive = (val) => val != null && val >= 0
export const formatTime = (date = new Date()) =>
  date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
export const formatDateShort = (ts) =>
  ts ? new Date(ts * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''
