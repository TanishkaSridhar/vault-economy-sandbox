import { createContext, useContext } from 'react'

/** Rendering options shared by every prop in the cozy world. */
export const CozyCtx = createContext({ low: false, reducedMotion: false })
export const useCozy = () => useContext(CozyCtx)
