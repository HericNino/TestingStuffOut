// Market data is fetched at most every 12 hours and kept in localStorage, so the app
// works offline with the last copy and the report isn't downloaded on every visit.

import { createContext, useContext } from 'react'
import { isMarketReport, type Market, type MarketReport } from './market'

export interface MarketState {
  market: Market | null
  status: 'off' | 'loading' | 'ready' | 'error'
  fetchedAt: number | null
  refresh: () => void
}

export const MarketContext = createContext<MarketState>({ market: null, status: 'off', fetchedAt: null, refresh: () => {} })

export function useMarket(): MarketState {
  return useContext(MarketContext)
}

const CACHE_KEY = 'launchpad:market'
export const MAX_AGE_MS = 12 * 60 * 60 * 1000

interface Cached {
  url: string
  fetchedAt: number
  report: MarketReport
}

export function readCache(url: string): Cached | null {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as Cached | null
    return cached && cached.url === url && isMarketReport(cached.report) ? cached : null
  } catch {
    return null
  }
}

export function writeCache(cached: Cached): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached))
  } catch {
    // storage full or disabled: we just fetch again next time
  }
}

export async function fetchReport(url: string, signal?: AbortSignal): Promise<MarketReport> {
  const response = await fetch(url, { signal, cache: 'no-cache' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data: unknown = await response.json()
  if (!isMarketReport(data)) throw new Error('not a jobpulse report')
  return data
}
