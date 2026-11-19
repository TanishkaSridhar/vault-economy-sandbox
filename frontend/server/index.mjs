import express from 'express'
import cors from 'cors'
import { createRequire } from 'module'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { buildDemoData } from './demo-data.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

const app = express()
app.use(cors())
app.use(express.json())

// VAULT_DB_PATH overrides the default location (useful for testing demo mode)
const DB_PATH = process.env.VAULT_DB_PATH
  ? path.resolve(process.env.VAULT_DB_PATH)
  : path.resolve(__dirname, '..', '..', 'vault.db')

// How often (ms) a request may re-check the db file; requests in between reuse the last answer
const SOURCE_CHECK_MS = Math.max(0, Number(process.env.VAULT_SOURCE_CHECK_MS ?? 3000))

let db = null
let usingDemo = true
let demoData = null

function getDemo() {
  if (!demoData) demoData = buildDemoData()
  return demoData
}

// better-sqlite3 is a native module; if it fails to load we stay in demo mode for good
let Database = null
let driverError = null
try {
  Database = require('better-sqlite3')
} catch (e) {
  driverError = e.message
  console.log(`[VAULT bridge] better-sqlite3 failed to load (${e.message}) — demo mode only`)
}

// ---- Live/demo source, re-checked per request (cached for SOURCE_CHECK_MS) ----
const source = {
  checkedAt: 0,      // when we last looked at the file
  fingerprint: null, // mtime+size of vault.db and its -wal file at the last (re)open
  mtimeMs: null,     // newest modification time seen
  runCount: 0,
  reason: 'not checked yet',
}

/** mtime/size of the db and its WAL file, or null if the db file is missing. */
function statDb() {
  let main
  try { main = fs.statSync(DB_PATH) } catch { return null }
  let wal = null
  try { wal = fs.statSync(DB_PATH + '-wal') } catch { /* no WAL file */ }
  return {
    mtimeMs: Math.max(main.mtimeMs, wal?.mtimeMs ?? 0),
    key: `${main.mtimeMs}:${main.size}:${wal?.mtimeMs ?? 0}:${wal?.size ?? 0}`,
  }
}

function closeDb() {
  if (db) { try { db.close() } catch { /* already closed */ } }
  db = null
}

function setSource(demo, reason) {
  const changed = demo !== usingDemo || reason !== source.reason
  usingDemo = demo
  source.reason = reason
  if (changed) console.log(`[VAULT bridge] Source: ${demo ? 'DEMO' : 'LIVE'} (${reason})`)
}

/** Re-evaluate live vs demo. Cheap when nothing changed: one or two stat() calls. */
function refreshSource(force = false) {
  const now = Date.now()
  if (!force && now - source.checkedAt < SOURCE_CHECK_MS) return
  source.checkedAt = now

  if (!Database) return setSource(true, `better-sqlite3 unavailable: ${driverError}`)

  const st = statDb()
  if (!st) {
    closeDb(); source.fingerprint = null; source.mtimeMs = null; source.runCount = 0
    return setSource(true, 'vault.db not found')
  }
  if (st.key === source.fingerprint) { // unchanged since last check
    if (!usingDemo && !db) openDb()     // closed while idle: reopen the same file
    return
  }
  source.fingerprint = st.key
  source.mtimeMs = st.mtimeMs

  // New or changed file: reopen read-only (handles a replaced file as well as appended runs)
  closeDb()
  try {
    openDb()
    source.runCount = db.prepare('SELECT COUNT(*) AS c FROM runs').get().c
    if (source.runCount === 0) { closeDb(); return setSource(true, 'vault.db has no runs') }
    setSource(false, `vault.db with ${source.runCount} run(s)`)
  } catch (e) {
    closeDb(); source.runCount = 0
    setSource(true, `vault.db not readable: ${e.message}`)
  }
}

function openDb() {
  db = new Database(DB_PATH, { readonly: true, fileMustExist: true })
}

// Windows locks an open SQLite file, which would stop the simulation from deleting or
// replacing vault.db. So the connection is closed after a short idle period and reopened
// on the next request.
const IDLE_CLOSE_MS = Math.max(200, Number(process.env.VAULT_IDLE_CLOSE_MS ?? 1500))
let idleTimer = null
let inFlight = 0

refreshSource(true)
closeDb() // nothing to serve yet
app.use('/api', (req, res, next) => {
  clearTimeout(idleTimer)
  inFlight++
  res.on('close', () => {
    if (--inFlight === 0) idleTimer = setTimeout(closeDb, IDLE_CLOSE_MS)
  })
  try {
    refreshSource()
    if (!usingDemo && !db) openDb()
  } catch (e) {
    closeDb(); source.fingerprint = null
    setSource(true, `vault.db not readable: ${e.message}`)
  }
  next()
})

// ---- Helper ----
function demoRunFilter(runId, arr) {
  const id = parseInt(runId, 10)
  return arr.filter(x => x.run_id === id)
}

// ---- Routes ----

app.get('/api/meta', (req, res) => {
  res.json({
    source: usingDemo ? 'demo' : 'live',
    dbPath: DB_PATH,
    reason: source.reason,
    dbModifiedAt: source.mtimeMs ? new Date(source.mtimeMs).toISOString() : null,
    runCount: usingDemo ? getDemo().runs.length : source.runCount,
    checkedAt: new Date(source.checkedAt).toISOString(),
  })
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

// ---- Decisions: server-side paging, search and filters ----
const DECISIONS_MAX_LIMIT = 500

function intParam(v, { min, max, fallback }) {
  if (v === undefined || v === '') return fallback
  const n = Number(v)
  if (!Number.isInteger(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

/** Parse and bound the decision query string. Unknown/invalid values are ignored. */
function parseDecisionQuery(q) {
  const str = v => (typeof v === 'string' && v !== '' && v !== 'All' ? v.slice(0, 200) : null)
  const turn = intParam(q.turn, { min: 0, max: 1e6, fallback: null })
  return {
    limit: intParam(q.limit, { min: 1, max: DECISIONS_MAX_LIMIT, fallback: 50 }),
    offset: intParam(q.offset, { min: 0, max: 1e9, fallback: 0 }),
    q: str(q.q),
    agent: str(q.agent),
    action: str(q.action),
    success: q.success === '1' ? 1 : q.success === '0' ? 0 : null,
    turnFrom: turn ?? intParam(q.turnFrom, { min: 0, max: 1e6, fallback: null }),
    turnTo: turn ?? intParam(q.turnTo, { min: 0, max: 1e6, fallback: null }),
  }
}

/** Build a parameterised WHERE clause for the decisions table. */
function decisionWhere(runId, f) {
  const clauses = ['run_id = ?']
  const args = [runId]
  if (f.agent) { clauses.push('agent = ?'); args.push(f.agent) }
  if (f.action) { clauses.push('action = ?'); args.push(f.action) }
  if (f.success !== null) { clauses.push('success = ?'); args.push(f.success) }
  if (f.turnFrom !== null) { clauses.push('turn >= ?'); args.push(f.turnFrom) }
  if (f.turnTo !== null) { clauses.push('turn <= ?'); args.push(f.turnTo) }
  if (f.q) {
    clauses.push("(agent LIKE ? ESCAPE '\\' OR action LIKE ? ESCAPE '\\' OR reason LIKE ? ESCAPE '\\' OR result LIKE ? ESCAPE '\\')")
    const like = '%' + f.q.replace(/[\\%_]/g, c => '\\' + c) + '%'
    args.push(like, like, like, like)
  }
  return { sql: clauses.join(' AND '), args }
}

/** Same filter for the in-memory demo rows. */
function demoDecisionFilter(rows, f) {
  const q = f.q?.toLowerCase()
  return rows.filter(d =>
    (!f.agent || d.agent === f.agent) &&
    (!f.action || d.action === f.action) &&
    (f.success === null || Number(d.success) === f.success) &&
    (f.turnFrom === null || d.turn >= f.turnFrom) &&
    (f.turnTo === null || d.turn <= f.turnTo) &&
    (!q || [d.agent, d.action, d.reason, d.result].some(s => (s ?? '').toLowerCase().includes(q)))
  )
}

// Newest first: GET /api/runs/:runId/decisions?limit&offset&q&agent&action&success&turn&turnFrom&turnTo
// Response: { rows, total, limit, offset }
app.get('/api/runs/:runId/decisions', (req, res) => {
  const f = parseDecisionQuery(req.query)
  if (usingDemo) {
    const all = demoDecisionFilter(demoRunFilter(req.params.runId, getDemo().decisions), f)
      .sort((a, b) => b.turn - a.turn || b.id - a.id)
    return res.json({ rows: all.slice(f.offset, f.offset + f.limit), total: all.length, limit: f.limit, offset: f.offset })
  }
  try {
    const w = decisionWhere(req.params.runId, f)
    const total = db.prepare(`SELECT COUNT(*) AS c FROM decisions WHERE ${w.sql}`).get(...w.args).c
    const rows = db.prepare(
      `SELECT * FROM decisions WHERE ${w.sql} ORDER BY turn DESC, id DESC LIMIT ? OFFSET ?`
    ).all(...w.args, f.limit, f.offset)
    res.json({ rows, total, limit: f.limit, offset: f.offset })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Distinct values for the Decisions page filters (not derived from a truncated page)
app.get('/api/runs/:runId/decisions/facets', (req, res) => {
  if (usingDemo) {
    const rows = demoRunFilter(req.params.runId, getDemo().decisions)
    const turns = rows.map(r => r.turn)
    return res.json({
      agents: [...new Set(rows.map(r => r.agent))].sort(),
      actions: [...new Set(rows.map(r => r.action))].sort(),
      minTurn: turns.length ? Math.min(...turns) : 0,
      maxTurn: turns.length ? Math.max(...turns) : 0,
      total: rows.length,
    })
  }
  try {
    const id = req.params.runId
    const agents = db.prepare('SELECT DISTINCT agent FROM decisions WHERE run_id = ? ORDER BY agent').all(id).map(r => r.agent)
    const actions = db.prepare('SELECT DISTINCT action FROM decisions WHERE run_id = ? ORDER BY action').all(id).map(r => r.action)
    const t = db.prepare('SELECT MIN(turn) AS minTurn, MAX(turn) AS maxTurn, COUNT(*) AS total FROM decisions WHERE run_id = ?').get(id)
    res.json({ agents, actions, minTurn: t.minTurn ?? 0, maxTurn: t.maxTurn ?? 0, total: t.total })
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

const PORT = Number(process.env.VAULT_PORT ?? 3001)
app.listen(PORT, () => {
  console.log(`[VAULT bridge] Listening on http://localhost:${PORT} (db: ${DB_PATH})`)
})
