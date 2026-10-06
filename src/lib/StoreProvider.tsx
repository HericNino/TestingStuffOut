import { useEffect, useReducer, type ReactNode } from 'react'
import { reducer } from './reducer'
import { loadState, saveState } from './storage'
import { StoreContext } from './store'

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>
}
