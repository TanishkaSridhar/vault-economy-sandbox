import express from 'express'
import cors from 'cors'
import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'
import { buildDemoData } from './demo-data.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

const app = express()
app.use(cors())
app.use(express.json())

const DB_PATH = path.resolve(__dirname, '..', '..', 'vault.db')

let db = null
let usingDemo = false
let demoData = null

function getDemo() {
  if (!demoData) demoData = buildDemoData()
  return demoData
}

// Try opening live DB
try {
  const Database = require('better-sqlite3')
  db = new Database(DB_PATH, { readonly: true })
  const runCount = db.prepare('SELECT COUNT(*) as c FROM runs').get()
  if (!runCount || runCount.c === 0) {
    console.log('[VAULT bridge] vault.db has no runs — using demo data')
    db.close()
    db = null
    usingDemo = true
  } else {
    console.log(`[VAULT bridge] Connected to vault.db (${runCount.c} run(s))`)
  }
} catch (e) {
  console.log(`[VAULT bridge] vault.db not available (${e.message}) — using demo data`)
  usingDemo = true
}

// ---- Helper ----
function demoRunFilter(runId, arr) {
  const id = parseInt(runId, 10)
  return arr.filter(x => x.run_id === id)
}

// ---- Routes ----

app.get('/api/meta', (req, res) => {
  if (usingDemo) {
    return res.json({ source: 'demo', dbPath: DB_PATH })
  }
  res.json({ source: 'live', dbPath: DB_PATH })
})

app.get('/api/runs', (req, res) => {
  if (usingDemo) return res.json(getDemo().runs)
  try {
    res.json(db.prepare('SELECT * FROM runs ORDER BY id').all())
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/runs/:runId/agents', (req, res) => {
  if (usingDemo) return res.json(demoRunFilter(req.params.runId, getDemo().agents))
  try {
    res.json(db.prepare('SELECT * FROM agents WHERE run_id = ?').all(req.params.runId))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/runs/:runId/towns', (req, res) => {
  if (usingDemo) return res.json(demoRunFilter(req.params.runId, getDemo().towns))
  try {
    res.json(db.prepare('SELECT * FROM towns WHERE run_id = ?').all(req.params.runId))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/runs/:runId/roads', (req, res) => {
  if (usingDemo) return res.json(demoRunFilter(req.params.runId, getDemo().roads))
  try {
    res.json(db.prepare('SELECT * FROM roads WHERE run_id = ?').all(req.params.runId))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/runs/:runId/agent-states', (req, res) => {
  const { turn } = req.query
  if (usingDemo) {
    let rows = demoRunFilter(req.params.runId, getDemo().agentStates)
    if (turn !== undefined) rows = rows.filter(r => r.turn === parseInt(turn, 10))
    return res.json(rows)
  }
  try {
    const sql = turn !== undefined
      ? 'SELECT * FROM agent_states WHERE run_id = ? AND turn = ? ORDER BY agent'
      : 'SELECT * FROM agent_states WHERE run_id = ? ORDER BY turn, agent'
    const args = turn !== undefined ? [req.params.runId, turn] : [req.params.runId]
    res.json(db.prepare(sql).all(...args))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/runs/:runId/town-states', (req, res) => {
  const { turn } = req.query
  if (usingDemo) {
    let rows = demoRunFilter(req.params.runId, getDemo().townStates)
    if (turn !== undefined) rows = rows.filter(r => r.turn === parseInt(turn, 10))
    return res.json(rows)
  }
  try {
    const sql = turn !== undefined
      ? 'SELECT * FROM town_states WHERE run_id = ? AND turn = ? ORDER BY town'
      : 'SELECT * FROM town_states WHERE run_id = ? ORDER BY turn, town'
    const args = turn !== undefined ? [req.params.runId, turn] : [req.params.runId]
    res.json(db.prepare(sql).all(...args))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/runs/:runId/decisions', (req, res) => {
  const page = parseInt(req.query.page || '0', 10)
  const limit = parseInt(req.query.limit || '50', 10)
  const offset = page * limit
  if (usingDemo) {
    const rows = demoRunFilter(req.params.runId, getDemo().decisions)
    return res.json(rows.slice(offset, offset + limit))
  }
  try {
    res.json(db.prepare(
      'SELECT * FROM decisions WHERE run_id = ? ORDER BY id LIMIT ? OFFSET ?'
    ).all(req.params.runId, limit, offset))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/runs/:runId/events', (req, res) => {
  const { turn } = req.query
  if (usingDemo) {
    let rows = demoRunFilter(req.params.runId, getDemo().events)
    if (turn !== undefined) rows = rows.filter(r => r.turn === parseInt(turn, 10))
    return res.json(rows)
  }
  try {
    const sql = turn !== undefined
      ? 'SELECT * FROM events WHERE run_id = ? AND turn = ? ORDER BY id'
      : 'SELECT * FROM events WHERE run_id = ? ORDER BY turn, id'
    const args = turn !== undefined ? [req.params.runId, turn] : [req.params.runId]
    res.json(db.prepare(sql).all(...args))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/runs/:runId/relationships', (req, res) => {
  const { turn } = req.query
  if (usingDemo) {
    let rows = demoRunFilter(req.params.runId, getDemo().relationships)
    if (turn !== undefined) rows = rows.filter(r => r.turn === parseInt(turn, 10))
    return res.json(rows)
  }
  try {
    const sql = turn !== undefined
      ? 'SELECT * FROM relationships WHERE run_id = ? AND turn = ?'
      : 'SELECT * FROM relationships WHERE run_id = ?'
    const args = turn !== undefined ? [req.params.runId, turn] : [req.params.runId]
    res.json(db.prepare(sql).all(...args))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`[VAULT bridge] Listening on http://localhost:${PORT}`)
  console.log(`[VAULT bridge] Source: ${usingDemo ? 'DEMO' : 'LIVE (vault.db)'}`)
})
