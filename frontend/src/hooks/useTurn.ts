import { create } from 'zustand'

interface TurnState {
  turn: number
  maxTurn: number
  playing: boolean
  speed: number
  runId: number
}

interface TurnActions {
  setTurn: (n: number) => void
  play: () => void
  pause: () => void
  setSpeed: (x: number) => void
  setRun: (id: number) => void
  setMaxTurn: (n: number) => void
}

export const useTurn = create<TurnState & TurnActions>((set, get) => ({
  turn: 1,
  maxTurn: 30,
  playing: false,
  speed: 1,
  runId: 1,

  setTurn: (n) => set({ turn: Math.max(1, Math.min(n, get().maxTurn)) }),
  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  setSpeed: (x) => set({ speed: x }),
  setRun: (id) => set({ runId: id, turn: 1, playing: false }),
  setMaxTurn: (n) => set({ maxTurn: n }),
}))
