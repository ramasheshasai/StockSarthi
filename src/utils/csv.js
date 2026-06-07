const HEADERS = ['Type', 'Symbol', 'Company', 'Quantity', 'Price', 'Date', 'Notes']

export function exportCSV(transactions) {
  const rows = [
    HEADERS.join(','),
    ...transactions.map(tx =>
      [
        tx.type,
        tx.symbol,
        `"${(tx.name || '').replace(/"/g, '""')}"`,
        tx.qty,
        tx.price,
        tx.date,
        `"${(tx.notes || '').replace(/"/g, '""')}"`,
      ].join(',')
    ),
  ]
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `stocksarthi_portfolio_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function parseCSV(text) {
  const lines  = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row')

  const header = lines[0].toLowerCase()
  if (!header.includes('type') || !header.includes('symbol')) {
    throw new Error('CSV must have Type and Symbol columns')
  }

  const results = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i])
    const type = cols[0]?.toLowerCase().trim()
    if (type !== 'buy' && type !== 'sell') continue

    const qty   = parseFloat(cols[3])
    const price = parseFloat(cols[4])
    const date  = cols[5]?.trim()

    if (!cols[1] || !qty || !price || !date) continue

    results.push({
      type,
      symbol: cols[1].trim().toUpperCase(),
      name:   cols[2]?.replace(/^"|"$/g, '').trim() || cols[1].trim().toUpperCase(),
      qty,
      price,
      date,
      notes:  cols[6]?.replace(/^"|"$/g, '').trim() || '',
      id:     `${Date.now()}_${i}`,
    })
  }
  if (results.length === 0) throw new Error('No valid transactions found in CSV')
  return results
}

function splitCSVLine(line) {
  const result = []
  let cur = '', inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      result.push(cur); cur = ''
    } else cur += ch
  }
  result.push(cur)
  return result
}

export const CSV_TEMPLATE = `Type,Symbol,Company,Quantity,Price,Date,Notes
Buy,RELIANCE,Reliance Industries,10,2450.00,2024-01-15,Long term hold
Buy,TCS,Tata Consultancy Services,5,3654.00,2024-02-10,
Sell,TCS,Tata Consultancy Services,2,4200.00,2024-08-20,Partial exit`
