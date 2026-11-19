import { useCallback, useRef } from 'react'

/** Keeps DOM elements by id, with stable ref callbacks (no churn between renders). */
export function useElementRegistry() {
  const els = useRef(new Map<string, HTMLElement>())
  const fns = useRef(new Map<string, (el: HTMLElement | null) => void>())
  const refFor = useCallback((id: string) => {
    let fn = fns.current.get(id)
    if (!fn) {
      fn = (el: HTMLElement | null) => { if (el) els.current.set(id, el); else els.current.delete(id) }
      fns.current.set(id, fn)
    }
    return fn
  }, [])
  return { els, refFor }
}
