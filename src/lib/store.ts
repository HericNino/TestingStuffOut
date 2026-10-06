// Components get state and dispatch from here; persistence lives in StoreProvider.

import { createContext, useContext, type Dispatch } from 'react'
import type { Action } from './reducer'
import type { AppState } from './types'

export const StoreContext = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null)

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
