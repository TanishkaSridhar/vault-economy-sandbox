import { create } from 'zustand'

/** Sentinel for "no run selected yet". Run ids start at 0 (demo run is id 0). */
export const NO_RUN = -1

/**
 * How the World map plays a run:
 * - 'turn':     one whole day at a time (everyone's moves together)
 * - 'decision': one agent's decision at a time, in the order they acted, then the night
 *               (unsold food to the market, rumours), then the next day
 */
export type PlayMode = 'turn' | 'decision'

interface TurnState {
  turn: number
  maxTurn: number
  playing: boolean
  speed: number
  runId: number
  mode: PlayMode
  /** Decision mode only: 0..n-1 = the n decisions of this turn, n = the night. */
  step: number
}

interface TurnActions {
  setTurn: (n: number) => void
  play: () => void
  pause: () => void
  setSpeed: (x: number) => void
  setRun: (id: number) => void
  setMaxTurn: (n: number) => void
  setMode: (m: PlayMode) => void
  /** Jump to a turn and step together (decision mode). */
  setPosition: (turn: number, step: number) => void
}

export const useTurn = create<TurnState & TurnActions>((set, get) => ({
  turn: 1,
  maxTurn: 30,
  playing: false,
  speed: 1,
  runId: NO_RUN,
  mode: 'turn',
  step: 0,

  setTurn: (n) => set({ turn: Math.max(1, Math.min(n, get().maxTurn)), step: Number.MAX_SAFE_INTEGER }),
  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  setSpeed: (x) => set({ speed: x }),
  setRun: (id) => set({ runId: id, turn: 1, step: 0, playing: false }),
  setMaxTurn: (n) => set({ maxTurn: n }),
  setMode: (m) => set({ mode: m, step: m === 'decision' ? 0 : Number.MAX_SAFE_INTEGER }),
  setPosition: (turn, step) => set({ turn: Math.max(1, Math.min(turn, get().maxTurn)), step: Math.max(0, step) }),
}))
