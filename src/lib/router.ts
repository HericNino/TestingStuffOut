// Hash-based routing so the app works as plain static files (GitHub Pages).

import { useEffect, useState } from 'react'

export type Route = 'dashboard' | 'jobs' | 'learn' | 'stories' | 'assistant' | 'profile'

export const ROUTES: Route[] = ['dashboard', 'jobs', 'learn', 'stories', 'assistant', 'profile']

export function parseHash(hash: string): { route: Route; param?: string } {
  const [name, param] = hash.replace(/^#\/?/, '').split('/')
  const route = (ROUTES as string[]).includes(name) ? (name as Route) : 'dashboard'
  return { route, param: param ? decodeURIComponent(param) : undefined }
}

export function useHashRoute() {
  const [location, setLocation] = useState(() => parseHash(window.location.hash))
  useEffect(() => {
    const onChange = () => setLocation(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return location
}

export function navigate(route: Route, param?: string) {
  window.location.hash = `/${route}${param ? `/${encodeURIComponent(param)}` : ''}`
}
