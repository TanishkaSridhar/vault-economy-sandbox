export interface Run {
  id: number
  started_at: string
  finished_at?: string
  seed: number
  turns_planned: number
  turns_completed: number
  code_version?: string
  config_json?: string
}

export interface Agent {
  run_id: number
  name: string
  role: 'Farmer' | 'Trader' | 'Diplomat'
  brain: string
  start_town: string
  start_money: number
  start_food: number
}

export interface Town {
  run_id: number
  name: string
  terrain: 'RIVER' | 'PLAINS' | 'COAST' | 'FOREST' | 'MARSH' | 'HILLS' | 'DESERT' | 'MOUNTAINS'
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
}

export interface Event {
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

export interface SimData {
  runs: Run[]
  agents: Agent[]
  towns: Town[]
  roads: Road[]
  agentStates: AgentState[]
  townStates: TownState[]
  decisions: Decision[]
  events: Event[]
  relationships: Relationship[]
  meta: { source: 'live' | 'demo'; dbPath: string }
}
