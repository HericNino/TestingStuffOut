import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Market } from './market'
import { fetchReport, MarketContext, MAX_AGE_MS, readCache, writeCache, type MarketState } from './marketStore'
import { useStore } from './store'

type Entry = NonNullable<ReturnType<typeof readCache>>

export function MarketProvider({ children }: { children: ReactNode }) {
  const url = useStore().state.settings.marketUrl.trim()
  const stored = useMemo(() => (url ? readCache(url) : null), [url])
  const [fetched, setFetched] = useState<Record<string, Entry>>({})
  const [failed, setFailed] = useState<Record<string, boolean>>({})
  const [nonce, setNonce] = useState(0)
  const [checking, setChecking] = useState(false)
  const entry = fetched[url] ?? stored

  useEffect(() => {
    if (!url) return
    if (nonce === 0 && stored && Date.now() - stored.fetchedAt < MAX_AGE_MS) return
    const controller = new AbortController()
    fetchReport(url, controller.signal)
      .then((report) => {
        const next = { url, fetchedAt: Date.now(), report }
        writeCache(next)
        setFetched((all) => ({ ...all, [url]: next }))
        setFailed((all) => ({ ...all, [url]: false }))
        setChecking(false)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setFailed((all) => ({ ...all, [url]: true }))
        setChecking(false)
        console.warn('market data unavailable:', error)
      })
    return () => controller.abort()
  }, [url, nonce, stored])

  // an older copy keeps being used while checking and when a check fails
  const status: MarketState['status'] = !url ? 'off' : checking || (!entry && !failed[url]) ? 'loading' : failed[url] ? 'error' : 'ready'
  const market = useMemo(() => (url && entry ? new Market(entry.report) : null), [url, entry])
  const value = useMemo<MarketState>(
    () => ({
      market,
      status,
      fetchedAt: entry?.fetchedAt ?? null,
      refresh: () => {
        setChecking(true)
        setNonce((n) => n + 1)
      },
    }),
    [market, entry, status],
  )
  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
}
