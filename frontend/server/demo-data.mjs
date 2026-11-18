// Demo data generator for VAULT frontend
// Produces a plausible 30-turn simulation dataset when vault.db is unavailable

const RUN_ID = 0
const TURNS = 30

const TOWNS = [
  { name: 'Riverton',  terrain: 'RIVER',     start_price: 5,  min: 4,  max: 7  },
  { name: 'Valley',    terrain: 'PLAINS',    start_price: 6,  min: 5,  max: 8  },
  { name: 'Port',      terrain: 'COAST',     start_price: 9,  min: 8,  max: 12 },
  { name: 'Woodhaven', terrain: 'FOREST',    start_price: 8,  min: 7,  max: 11 },
  { name: 'Saltmarsh', terrain: 'MARSH',     start_price: 10, min: 9,  max: 13 },
  { name: 'Hill',      terrain: 'HILLS',     start_price: 8,  min: 7,  max: 10 },
  { name: 'Sandreach', terrain: 'DESERT',    start_price: 13, min: 11, max: 15 },
  { name: 'Highpeak',  terrain: 'MOUNTAINS', start_price: 14, min: 12, max: 17 },
]

const ROADS = [
  { town_a: 'Valley',    town_b: 'Riverton',  distance: 6,  terrain: 'RIVER',     coins: 1, food: 1 },
  { town_a: 'Valley',    town_b: 'Port',      distance: 12, terrain: 'PLAINS',    coins: 2, food: 2 },
  { town_a: 'Valley',    town_b: 'Hill',      distance: 8,  terrain: 'HILLS',     coins: 2, food: 1 },
  { town_a: 'Riverton',  town_b: 'Port',      distance: 14, terrain: 'RIVER',     coins: 2, food: 2 },
  { town_a: 'Riverton',  town_b: 'Woodhaven', distance: 10, terrain: 'FOREST',    coins: 2, food: 2 },
  { town_a: 'Woodhaven', town_b: 'Hill',      distance: 9,  terrain: 'FOREST',    coins: 2, food: 2 },
  { town_a: 'Port',      town_b: 'Saltmarsh', distance: 7,  terrain: 'COAST',     coins: 1, food: 1 },
  { town_a: 'Saltmarsh', town_b: 'Sandreach', distance: 12, terrain: 'DESERT',    coins: 3, food: 3 },
  { town_a: 'Sandreach', town_b: 'Highpeak',  distance: 8,  terrain: 'MOUNTAINS', coins: 2, food: 2 },
  { town_a: 'Hill',      town_b: 'Highpeak',  distance: 10, terrain: 'MOUNTAINS', coins: 2, food: 2 },
]

const FARMERS = [
  { name: 'Meena',   start_town: 'Riverton',  neighbors: ['Valley', 'Port', 'Woodhaven'] },
  { name: 'Kumar',   start_town: 'Valley',    neighbors: ['Riverton', 'Port', 'Hill'] },
  { name: 'Selvi',   start_town: 'Port',      neighbors: ['Valley', 'Riverton', 'Saltmarsh'] },
  { name: 'Ganesh',  start_town: 'Woodhaven', neighbors: ['Riverton', 'Hill'] },
  { name: 'Lakshmi', start_town: 'Saltmarsh', neighbors: ['Port', 'Sandreach'] },
  { name: 'Anita',   start_town: 'Hill',      neighbors: ['Valley', 'Woodhaven', 'Highpeak'] },
  { name: 'Murugan', start_town: 'Sandreach', neighbors: ['Saltmarsh', 'Highpeak'] },
  { name: 'Devi',    start_town: 'Highpeak',  neighbors: ['Sandreach', 'Hill'] },
]

const TRADERS = [
  { name: 'Ravi',   start_town: 'Valley',    route: ['Valley', 'Riverton', 'Port', 'Valley'] },
  { name: 'Arun',   start_town: 'Port',      route: ['Port', 'Saltmarsh', 'Sandreach', 'Highpeak', 'Sandreach', 'Port'] },
  { name: 'Joseph', start_town: 'Riverton',  route: ['Riverton', 'Woodhaven', 'Hill', 'Valley', 'Riverton'] },
  { name: 'Kavya',  start_town: 'Hill',      route: ['Hill', 'Highpeak', 'Sandreach', 'Saltmarsh', 'Port', 'Hill'] },
  { name: 'Farah',  start_town: 'Saltmarsh', route: ['Saltmarsh', 'Port', 'Riverton', 'Woodhaven', 'Hill', 'Saltmarsh'] },
]

const DIPLOMATS = [
  { name: 'Priya',  start_town: 'Valley',   route: ['Valley', 'Port', 'Saltmarsh', 'Sandreach', 'Highpeak', 'Hill', 'Valley'] },
  { name: 'Vikram', start_town: 'Riverton', route: ['Riverton', 'Woodhaven', 'Hill', 'Highpeak', 'Sandreach', 'Saltmarsh', 'Riverton'] },
  { name: 'Nisha',  start_town: 'Port',     route: ['Port', 'Valley', 'Riverton', 'Woodhaven', 'Hill', 'Valley', 'Port'] },
]

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

function drift(current, min, max, seed) {
  const delta = (Math.sin(seed * 0.37 + current * 0.13) * 1.5)
  return clamp(Math.round((current + delta) * 10) / 10, min, max)
}

export function buildDemoData() {
  const run = {
    id: RUN_ID,
    started_at: '2026-01-01T00:00:00Z',
    finished_at: '2026-01-01T03:00:00Z',
    seed: 42,
    turns_planned: TURNS,
    turns_completed: TURNS,
    code_version: 'demo-v1.0',
    config_json: JSON.stringify({ mode: 'demo' }),
  }

  const agents = [
    ...FARMERS.map(f => ({
      run_id: RUN_ID, name: f.name, role: 'Farmer', brain: 'rule_based',
      start_town: f.start_town, start_money: 20, start_food: 15,
    })),
    ...TRADERS.map(t => ({
      run_id: RUN_ID, name: t.name, role: 'Trader', brain: 'rule_based',
      start_town: t.start_town, start_money: 50, start_food: 10,
    })),
    ...DIPLOMATS.map(d => ({
      run_id: RUN_ID, name: d.name, role: 'Diplomat', brain: 'rule_based',
      start_town: d.start_town, start_money: 30, start_food: 12,
    })),
  ]

  const towns = TOWNS.map(t => ({
    run_id: RUN_ID, name: t.name, terrain: t.terrain,
    start_price: t.start_price, start_stock: 100,
  }))

  const roads = ROADS.map(r => ({ ...r, run_id: RUN_ID }))

  // ---- Simulate town states ----
  const townStates = []
  const townPrices = {}
  const townStocks = {}
  TOWNS.forEach(t => { townPrices[t.name] = t.start_price; townStocks[t.name] = 100 })

  for (let turn = 1; turn <= TURNS; turn++) {
    TOWNS.forEach((t, i) => {
      const price_before = townPrices[t.name]
      const sold = Math.floor(Math.random() * 8)
      const bought = Math.floor(Math.random() * 6)
      townStocks[t.name] = clamp(townStocks[t.name] - sold + bought, 10, 200)
      townPrices[t.name] = drift(price_before, t.min, t.max, turn * 7 + i * 3)
      townStates.push({
        run_id: RUN_ID, turn, town: t.name,
        price_before,
        price: townPrices[t.name],
        stock: townStocks[t.name],
        sold, bought,
      })
    })
  }

  // ---- Simulate agent states ----
  const agentStates = []
  const agentMoney = {}
  const agentFood = {}
  const agentTown = {}

  agents.forEach(a => {
    agentMoney[a.name] = a.start_money
    agentFood[a.name] = a.start_food
    agentTown[a.name] = a.start_town
  })

  // Build movement lookup
  const farmerInfoMap = {}
  FARMERS.forEach(f => { farmerInfoMap[f.name] = f })
  const traderRouteMap = {}
  TRADERS.forEach(t => { traderRouteMap[t.name] = t.route })
  const diplomatRouteMap = {}
  DIPLOMATS.forEach(d => { diplomatRouteMap[d.name] = d.route })

  const decisions = []
  const events = []
  let decisionId = 1
  let eventId = 1

  for (let turn = 1; turn <= TURNS; turn++) {
    // --- Farmers ---
    FARMERS.forEach(f => {
      const travel = Math.random() < 0.2 // 20% chance to travel
      let newTown = agentTown[f.name]
      let action, reason, result

      if (travel && f.neighbors.length > 0) {
        newTown = f.neighbors[Math.floor(Math.random() * f.neighbors.length)]
        action = 'TRAVEL'
        reason = `Moving to ${newTown} to find better prices`
        result = `Arrived at ${newTown}`
        agentMoney[f.name] = clamp(agentMoney[f.name] - 2, 0, 9999)
        agentFood[f.name] = clamp(agentFood[f.name] - 1, 0, 999)
        events.push({
          id: eventId++, run_id: RUN_ID, turn, type: 'TRAVELLED',
          agent: f.name, town: newTown,
          message: `${f.name} travelled to ${newTown}`,
        })
      } else {
        action = 'FARM'
        reason = 'Farming food at home town'
        const farmed = 3 + Math.floor(Math.random() * 4)
        agentFood[f.name] = clamp(agentFood[f.name] + farmed, 0, 999)
        result = `Farmed ${farmed} food`
        events.push({
          id: eventId++, run_id: RUN_ID, turn, type: 'FARMED',
          agent: f.name, town: agentTown[f.name],
          message: `${f.name} farmed ${farmed} food at ${agentTown[f.name]}`,
        })
      }

      const moneyBefore = agentMoney[f.name]
      const foodBefore = agentFood[f.name]

      decisions.push({
        id: decisionId++, run_id: RUN_ID, turn, agent: f.name, brain: 'rule_based',
        action, amount: null, target: newTown,
        reason, success: 1, result,
        town_before: agentTown[f.name], town_after: newTown,
        money_before: moneyBefore, money_after: agentMoney[f.name],
        food_before: foodBefore, food_after: agentFood[f.name],
        brain_used: 'rule_based', model: null, latency_ms: 10 + Math.floor(Math.random() * 40),
      })

      agentTown[f.name] = newTown
      agentStates.push({
        run_id: RUN_ID, turn, agent: f.name, town: newTown,
        money: agentMoney[f.name], food: agentFood[f.name],
      })
    })

    // --- Traders ---
    TRADERS.forEach(t => {
      const route = traderRouteMap[t.name]
      const stepIdx = (turn - 1) % route.length
      const prevTown = agentTown[t.name]
      const newTown = route[stepIdx]
      agentTown[t.name] = newTown

      const townData = TOWNS.find(td => td.name === newTown)
      const price = townPrices[newTown] || townData?.start_price || 8
      const moneyBefore = agentMoney[t.name]
      const foodBefore = agentFood[t.name]

      let action, reason, result, amount = 0

      if (newTown !== prevTown) {
        // Travelling
        agentMoney[t.name] = clamp(agentMoney[t.name] - 3, 0, 9999)
        agentFood[t.name] = clamp(agentFood[t.name] - 2, 0, 999)
        action = 'TRAVEL'
        reason = `Trading route: moving from ${prevTown} to ${newTown}`
        result = `Arrived at ${newTown}`
        events.push({
          id: eventId++, run_id: RUN_ID, turn, type: 'TRAVELLED',
          agent: t.name, town: newTown,
          message: `${t.name} travelled from ${prevTown} to ${newTown}`,
        })
      } else {
        // Buy or sell
        const shouldSell = Math.random() > 0.4
        if (shouldSell && agentFood[t.name] > 5) {
          amount = Math.min(5, agentFood[t.name])
          agentFood[t.name] -= amount
          agentMoney[t.name] += Math.round(amount * price)
          action = 'SELL'
          reason = `Selling food at ${newTown} for price ${price}`
          result = `Sold ${amount} food for ${Math.round(amount * price)} coins`
          events.push({
            id: eventId++, run_id: RUN_ID, turn, type: 'SOLD',
            agent: t.name, town: newTown,
            message: `${t.name} sold ${amount} food at ${newTown}`,
          })
        } else if (agentMoney[t.name] > price * 3) {
          amount = Math.floor(agentMoney[t.name] / price / 2)
          amount = clamp(amount, 1, 10)
          agentMoney[t.name] -= Math.round(amount * price)
          agentFood[t.name] += amount
          action = 'BUY'
          reason = `Buying food at ${newTown} at price ${price}`
          result = `Bought ${amount} food for ${Math.round(amount * price)} coins`
          events.push({
            id: eventId++, run_id: RUN_ID, turn, type: 'BOUGHT',
            agent: t.name, town: newTown,
            message: `${t.name} bought ${amount} food at ${newTown}`,
          })
        } else {
          action = 'REST'
          reason = 'No profitable trade available'
          result = 'Rested'
          events.push({
            id: eventId++, run_id: RUN_ID, turn, type: 'RESTED',
            agent: t.name, town: newTown,
            message: `${t.name} rested at ${newTown}`,
          })
        }
      }

      decisions.push({
        id: decisionId++, run_id: RUN_ID, turn, agent: t.name, brain: 'rule_based',
        action, amount, target: newTown, reason, success: 1, result,
        town_before: prevTown, town_after: newTown,
        money_before: moneyBefore, money_after: agentMoney[t.name],
        food_before: foodBefore, food_after: agentFood[t.name],
        brain_used: 'rule_based', model: null, latency_ms: 15 + Math.floor(Math.random() * 60),
      })

      agentStates.push({
        run_id: RUN_ID, turn, agent: t.name, town: newTown,
        money: agentMoney[t.name], food: agentFood[t.name],
      })
    })

    // --- Diplomats ---
    DIPLOMATS.forEach(d => {
      const route = diplomatRouteMap[d.name]
      const stepIdx = (turn - 1) % route.length
      const prevTown = agentTown[d.name]
      const newTown = route[stepIdx]
      agentTown[d.name] = newTown

      const moneyBefore = agentMoney[d.name]
      const foodBefore = agentFood[d.name]

      let action, reason, result

      if (newTown !== prevTown) {
        agentMoney[d.name] = clamp(agentMoney[d.name] - 2, 0, 9999)
        agentFood[d.name] = clamp(agentFood[d.name] - 1, 0, 999)
        action = 'TRAVEL'
        reason = `Diplomatic mission: travelling from ${prevTown} to ${newTown}`
        result = `Arrived at ${newTown}`
        events.push({
          id: eventId++, run_id: RUN_ID, turn, type: 'TRAVELLED',
          agent: d.name, town: newTown,
          message: `${d.name} (Diplomat) arrived at ${newTown}`,
        })
      } else {
        action = 'NEGOTIATE'
        reason = `Diplomatic negotiations at ${newTown}`
        result = 'Strengthened local relations'
        agentMoney[d.name] = clamp(agentMoney[d.name] + 5, 0, 9999)
        events.push({
          id: eventId++, run_id: RUN_ID, turn, type: 'NEGOTIATED',
          agent: d.name, town: newTown,
          message: `${d.name} negotiated at ${newTown}`,
        })
      }

      decisions.push({
        id: decisionId++, run_id: RUN_ID, turn, agent: d.name, brain: 'rule_based',
        action, amount: null, target: newTown, reason, success: 1, result,
        town_before: prevTown, town_after: newTown,
        money_before: moneyBefore, money_after: agentMoney[d.name],
        food_before: foodBefore, food_after: agentFood[d.name],
        brain_used: 'rule_based', model: null, latency_ms: 20 + Math.floor(Math.random() * 80),
      })

      agentStates.push({
        run_id: RUN_ID, turn, agent: d.name, town: newTown,
        money: agentMoney[d.name], food: agentFood[d.name],
      })
    })
  }

  // ---- Relationships (accumulate by turn) ----
  const relationships = []
  const relMap = {}

  agents.forEach(a => {
    agents.forEach(b => {
      if (a.name !== b.name) {
        relMap[`${a.name}::${b.name}`] = { trust: 0.3, familiarity: 0, meetings: 0 }
      }
    })
  })

  for (let turn = 1; turn <= TURNS; turn++) {
    // Find agents sharing a town
    const townGroups = {}
    agents.forEach(a => {
      const town = agentStates.find(s => s.turn === turn && s.agent === a.name)?.town || a.start_town
      if (!townGroups[town]) townGroups[town] = []
      townGroups[town].push(a.name)
    })

    Object.values(townGroups).forEach(group => {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const key = `${group[i]}::${group[j]}`
          const rkey = `${group[j]}::${group[i]}`
          if (relMap[key]) {
            relMap[key].meetings++
            relMap[key].familiarity = clamp(relMap[key].familiarity + 0.05, 0, 1)
            relMap[key].trust = clamp(relMap[key].trust + 0.02, 0, 1)
          }
          if (relMap[rkey]) {
            relMap[rkey].meetings++
            relMap[rkey].familiarity = clamp(relMap[rkey].familiarity + 0.05, 0, 1)
            relMap[rkey].trust = clamp(relMap[rkey].trust + 0.02, 0, 1)
          }
        }
      }
    })

    // Only emit relationships that have had at least 1 meeting
    Object.entries(relMap).forEach(([key, rel]) => {
      if (rel.meetings > 0) {
        const [from_agent, to_agent] = key.split('::')
        relationships.push({
          run_id: RUN_ID, turn, from_agent, to_agent,
          trust: Math.round(rel.trust * 100) / 100,
          familiarity: Math.round(rel.familiarity * 100) / 100,
          meetings: rel.meetings,
        })
      }
    })
  }

  return {
    runs: [run],
    agents,
    towns,
    roads,
    agentStates,
    townStates,
    decisions,
    events,
    relationships,
    meta: { source: 'demo', dbPath: '(none - demo mode)' },
  }
}
