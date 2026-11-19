import useSWR from 'swr'
import { NO_RUN } from './useTurn'

const BASE = '/api'
const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : []).catch(() => [])

export interface RunInfo {
  id: number
  started_at: string
  finished_at?: string
  seed: number
  turns_planned: number
  turns_completed: number
  code_version?: string
}

export interface AgentMeta {
  run_id: number
  name: string
  role: string
  brain: string
  start_town: string
  start_money: number
  start_food: number
}

export interface TownMeta {
  run_id: number
  name: string
  terrain: string
  start_price: number
  start_stock: number
}

export interface Road {
  run_id: number
  town_a: string
  town_b: string
  distance: number
  terrain: string
  coins: number
  food: number
}

export interface AgentState {
  run_id: number
  turn: number
  agent: string
  town: string
  money: number
  food: number
  destination?: string
}

export interface TownState {
  run_id: number
  turn: number
  town: string
  price_before: number
  price: number
  stock: number
  sold: number
  bought: number
}

export interface Decision {
  id: number
  run_id: number
  turn: number
  agent: string
  brain: string
  action: string
  amount?: number
  target?: string
  reason: string
  success: number
  result: string
  town_before: string
  town_after: string
  money_before: number
  money_after: number
  food_before: number
  food_after: number
  brain_used?: string
  model?: string
  latency_ms?: number
  observation_json?: string
  input_tokens?: number
  output_tokens?: number
  failures_json?: string
}

export interface DecisionPage {
  rows: Decision[]
  total: number
  limit: number
  offset: number
}

export interface DecisionFacets {
  agents: string[]
  actions: string[]
  minTurn: number
  maxTurn: number
  total: number
}

export interface DecisionQuery {
  limit?: number
  offset?: number
  q?: string
  agent?: string
  action?: string
  success?: '0' | '1'
  turn?: number
  turnFrom?: number
  turnTo?: number
}

export interface GameEvent {
  id: number
  run_id: number
  turn: number
  type: string
  agent?: string
  town?: string
  message: string
  data_json?: string
}

export interface Relationship {
  run_id: number
  turn: number
  from_agent: string
  to_agent: string
  trust: number
  familiarity: number
  meetings: number
}

export function useRuns() {
  const { data, error, isLoading } = useSWR<RunInfo[]>(
    `${BASE}/runs`,
    fetcher,
    { refreshInterval: 15000 }
  )
  return { runs: data ?? [], isLoading, error }
}

// Fetches the full dataset for a run (all agent states, town states, etc.)
export function useRunData(runId: number) {
  const { data: agents } = useSWR<AgentMeta[]>(
    runId > NO_RUN ? `${BASE}/runs/${runId}/agents` : null,
    fetcher, { revalidateOnFocus: false }
  )
  const { data: towns } = useSWR<TownMeta[]>(
    runId > NO_RUN ? `${BASE}/runs/${runId}/towns` : null,
    fetcher, { revalidateOnFocus: false }
  )
  const { data: roads } = useSWR<Road[]>(
    runId > NO_RUN ? `${BASE}/runs/${runId}/roads` : null,
    fetcher, { revalidateOnFocus: false }
  )
  const { data: agentStates } = useSWR<AgentState[]>(
    runId > NO_RUN ? `${BASE}/runs/${runId}/agent-states` : null,
    fetcher, { revalidateOnFocus: false }
  )
  const { data: townStates } = useSWR<TownState[]>(
    runId > NO_RUN ? `${BASE}/runs/${runId}/town-states` : null,
    fetcher, { revalidateOnFocus: false }
  )
  const { data: events } = useSWR<GameEvent[]>(
    runId > NO_RUN ? `${BASE}/runs/${runId}/events` : null,
    fetcher, { revalidateOnFocus: false }
  )
  const { data: relationships } = useSWR<Relationship[]>(
    runId > NO_RUN ? `${BASE}/runs/${runId}/relationships` : null,
    fetcher, { revalidateOnFocus: false }
  )

  const isLoading = !agents || !towns || !agentStates || !townStates

  return {
    agents: agents ?? [],
    towns: towns ?? [],
    roads: roads ?? [],
    agentStates: agentStates ?? [],
    townStates: townStates ?? [],
    events: events ?? [],
    relationships: relationships ?? [],
    isLoading,
  }
}

const objFetcher = (url: string) => fetch(url).then(r => (r.ok ? r.json() : null)).catch(() => null)

function queryString(q: DecisionQuery): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined && v !== null && v !== '' && v !== 'All') p.set(k, String(v))
  }
  return p.toString()
}

/** One server-side page of decisions (newest first) matching the filters. */
export function useDecisions(runId: number, query: DecisionQuery) {
  const { data, isLoading, error } = useSWR<DecisionPage | null>(
    runId > NO_RUN ? `${BASE}/runs/${runId}/decisions?${queryString(query)}` : null,
    objFetcher, { revalidateOnFocus: false, keepPreviousData: true }
  )
  return { rows: data?.rows ?? [], total: data?.total ?? 0, isLoading, error }
}

/** All decisions made in one turn (at most one per agent, so never truncated). */
export function useTurnDecisions(runId: number, turn: number) {
  const { rows } = useDecisions(runId, { turn, limit: 500 })
  return rows
}

/** Distinct agents/actions and turn range for the filter controls. */
export function useDecisionFacets(runId: number) {
  const { data } = useSWR<DecisionFacets | null>(
    runId > NO_RUN ? `${BASE}/runs/${runId}/decisions/facets` : null,
    objFetcher, { revalidateOnFocus: false }
  )
  return data ?? { agents: [], actions: [], minTurn: 0, maxTurn: 0, total: 0 }
}

// Convenience: get agent states for a specific turn
export function getAgentStatesAtTurn(agentStates: AgentState[], turn: number): AgentState[] {
  return agentStates.filter(s => s.turn === turn)
}

// Convenience: get town states for a specific turn
export function getTownStatesAtTurn(townStates: TownState[], turn: number): TownState[] {
  return townStates.filter(s => s.turn === turn)
}

// Convenience: get events up to a turn
export function getEventsUpToTurn(events: GameEvent[], turn: number): GameEvent[] {
  return events.filter(e => e.turn <= turn)
}
