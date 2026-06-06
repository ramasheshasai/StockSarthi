import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchQuotes, fetchChart } from '../utils/api'

export function useQuotes(symbols, autoRefresh = false, intervalMs = 60_000) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const timerRef = useRef(null)

  const symbolsKey = (symbols ?? []).join(',')

  const load = useCallback(async () => {
    const syms = symbolsKey ? symbolsKey.split(',') : []
    if (!syms.length) { setLoading(false); return }
    try {
      const result = await fetchQuotes(syms)
      setData(result)
      setLastUpdated(new Date())
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [symbolsKey])

  useEffect(() => {
    clearInterval(timerRef.current)
    setLoading(true)
    load()
    if (autoRefresh) {
      timerRef.current = setInterval(load, intervalMs)
    }
    return () => clearInterval(timerRef.current)
  }, [load, autoRefresh, intervalMs])

  return { data, loading, error, lastUpdated, refresh: load }
}

export function useChart(symbol, interval, range) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!symbol) return
    setLoading(true)
    setError(null)
    setData(null)
    fetchChart(symbol, interval, range)
      .then(r => { setData(r); setError(null) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [symbol, interval, range])

  return { data, loading, error }
}
