import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ROLE_STYLE } from '../world/cozy/palette'
import { Play, Pause, SkipBack, StepBack, StepForward, PanelRightClose, PanelRightOpen, Moon, Video } from 'lucide-react'
import { CozyWorld, type Bubble, type CameraMode, type Link, type Playback } from '../world/cozy/CozyWorld'
import { SlidingTabs } from '../ui/SlidingTabs'
import { useTurn, type PlayMode } from '../../hooks/useTurn'
import { useRunData, useRuns, useTurnDecisions, type AgentState, type Decision, type GameEvent } from '../../hooks/useSimData'

const MODES = ['Turn by turn', 'Decision by decision'] as const
const MODE_OF: Record<typeof MODES[number], PlayMode> = { 'Turn by turn': 'turn', 'Decision by decision': 'decision' }
const CAMERAS = ['Whole map', 'Follow', 'Free'] as const
const CAMERA_OF: Record<typeof CAMERAS[number], CameraMode> = { 'Whole map': 'map', Follow: 'follow', Free: 'free' }
const CAMERA_HELP: Record<CameraMode, string> = {
  map: 'Camera shows the whole map.',
  follow: 'Camera follows whoever is acting and switches to the next one.',
  free: 'Camera stays where you put it: drag to orbit, right-drag to pan, scroll to zoom.',
}
const SPEEDS = ['0.5x', '1x', '2x', '4x'] as const
const SPEED_OF: Record<typeof SPEEDS[number], number> = { '0.5x': 0.5, '1x': 1, '2x': 2, '4x': 4 }

/** How long one step stays on screen at 1x. */
const MS_TURN = 2600
const MS_DECISION = 2000
const MS_NIGHT = 3200

const clip = (s: string | undefined, n = 120) => !s ? undefined : s.length > n ? s.slice(0, n - 3).trimEnd() + '...' : s
const data = (e: GameEvent): Record<string, unknown> => { try { return e.data_json ? JSON.parse(e.data_json) : {} } catch { return {} } }
const num = (x: unknown) => (typeof x === 'number' ? (Number.isInteger(x) ? String(x) : x.toFixed(1)) : String(x ?? ''))

/** A short, plain description of a decision for the feed and the tags. */
function shortResult(d: Decision): string {
  if (!d.success) return `could not ${d.action.toLowerCase()}: ${d.result}`
  const r = d.result
  switch (d.action) {
    case 'SELL': { const m = r.match(/OFFERED (\d+) food at ([\d.]+)/); return m ? `offered ${m[1]} food at ${m[2]}` : r }
    case 'BUY': { const i = r.indexOf(': '); return i > 0 ? `bought ${r.slice(i + 2)}` : r.toLowerCase() }
    case 'TRAVEL': return `walked to ${d.town_after}${d.target && d.target !== d.town_after ? ` (heading for ${d.target})` : ''}`
    case 'FARM': { const m = r.match(/FARMED (\d+)/); return m ? `farmed ${m[1]} food` : r }
    case 'REST': return 'rested'
    default: return r
  }
}
const TAG: Record<string, string> = { SELL: 'selling', BUY: 'buying', TRAVEL: 'travelling', FARM: 'farming', REST: 'resting' }

export function World() {
  const { turn, maxTurn, runId, mode, step, playing, speed, setTurn, setPosition, setMode, play, pause, setSpeed, setRun } = useTurn()
  const { runs } = useRuns()
  const { agents, towns, roads, agentStates, townStates, events } = useRunData(runId)
  const rows = useTurnDecisions(runId, turn)
  useTurnDecisions(runId, Math.min(maxTurn, turn + 1)) // fetch the next day early so playback never waits
  const [camera, setCamera] = useState<CameraMode>('follow')
  const [feedOpen, setFeedOpen] = useState(true)

  // ---- the run's data, indexed ----
  const byTurn = useMemo(() => {
    const m = new Map<number, AgentState[]>()
    for (const s of agentStates) { const l = m.get(s.turn); if (l) l.push(s); else m.set(s.turn, [s]) }
    return m
  }, [agentStates])
  const eventsOf = useMemo(() => events.filter(e => e.turn === turn), [events, turn])
  // decisions in the order the agents acted (ids are assigned as they act)
  const decisions = useMemo(() => rows.filter(d => d.turn === turn).sort((a, b) => a.id - b.id), [rows, turn])
  const loaded = decisions.length > 0
  const n = decisions.length
  const s = mode === 'decision' ? Math.min(step, n) : n // n = the night (end of the day)
  const isNight = s >= n

  // ---- where everyone is at step s of this turn ----
  const displayAt = useCallback((k: number): AgentState[] => {
    if (k >= n) return byTurn.get(turn) ?? []
    const base = byTurn.get(turn - 1) ?? []
    const end = new Map((byTurn.get(turn) ?? []).map(a => [a.agent, a]))
    const acted = new Map(decisions.slice(0, k + 1).map(d => [d.agent, d]))
    return base.map(b => {
      const d = acted.get(b.agent)
      if (!d) return { ...b, turn }
      return { ...b, turn, town: d.town_after, money: d.money_after, food: d.food_after, destination: end.get(b.agent)?.destination }
    })
  }, [byTurn, turn, decisions, n])

  const states = useMemo(() => displayAt(s), [displayAt, s])
  const prevStates = useMemo(() => (s === 0 || mode === 'turn' ? byTurn.get(turn - 1) ?? [] : displayAt(s - 1)), [displayAt, s, mode, byTurn, turn])
  const perTurn = agents.length + 1
  const counter = mode === 'turn' ? turn : (turn - 1) * perTurn + s

  // ---- what is being said and done right now ----
  const { bubbles, links, actor, active } = useMemo(() => {
    const bubbles: Bubble[] = []
    const links: Link[] = []
    if (mode === 'turn') return { bubbles, links, actor: null as string | null, active: decisions }
    if (!isNight) {
      const d = decisions[s]
      if (!d) return { bubbles, links, actor: null, active: [] as Decision[] }
      const reason = clip(d.reason?.replace(/^\[rule fallback\]\s*/, ''))
      if (!d.success) {
        bubbles.push({ agent: d.agent, title: `Could not ${d.action.toLowerCase()}`, text: clip(d.result, 110), tone: 'fail' })
      } else if (d.action === 'BUY') {
        const trades = eventsOf.filter(e => e.type === 'TRADE' && e.agent === d.agent)
        bubbles.push({ agent: d.agent, title: shortResult(d).replace(/^bought/, 'Buying'), text: reason, tone: trades.length ? 'trade' : 'act' })
        for (const t of trades) {
          const x = data(t)
          const seller = String(x.seller ?? '')
          if (!seller) continue
          links.push({ from: seller, to: d.agent, tone: 'trade' })
          bubbles.push({ agent: seller, title: `Sold ${num(x.qty)} to ${d.agent}`, text: `at ${num(x.price)} each${x.fair === false ? ', above the market price' : ''}`, tone: 'trade' })
        }
      } else {
        const title = d.action === 'SELL' ? shortResult(d).replace(/^offered/, 'Selling')
          : d.action === 'TRAVEL' ? `Heading to ${d.target ?? d.town_after}`
          : d.action === 'FARM' ? shortResult(d).replace(/^farmed/, 'Farming:')
          : d.action === 'REST' ? 'Resting' : d.action
        bubbles.push({ agent: d.agent, title, text: reason, tone: 'act' })
      }
      return { bubbles, links, actor: d.agent, active: [d] }
    }
    // the night: rumours first, then food that went to the market
    const said = new Set<string>()
    for (const e of eventsOf.filter(e => e.type === 'RUMOUR')) {
      const x = data(e)
      const teller = e.agent ?? ''
      const listeners = Array.isArray(x.listeners) ? (x.listeners as string[]) : []
      const good = x.good === true
      if (!teller || said.has(teller)) continue
      said.add(teller)
      bubbles.push({
        agent: teller,
        title: `"${String(x.about)} ${good ? 'is a fair dealer' : 'is not to be trusted'}"`,
        text: `${Number(x.hops) > 1 ? 'passing on a rumour' : 'told'} ${listeners.join(', ')}`,
        tone: good ? 'good' : 'bad',
      })
      for (const l of listeners) links.push({ from: teller, to: l, tone: good ? 'good' : 'bad' })
    }
    for (const e of eventsOf.filter(e => e.type === 'MARKET_SALE')) {
      const who = e.agent ?? ''
      if (!who || said.has(who)) continue
      said.add(who)
      const x = data(e)
      bubbles.push({ agent: who, title: `${num(x.qty)} unsold went to the market`, text: `at ${num(x.price)} each`, tone: 'info' })
    }
    return { bubbles, links, actor: null, active: [] as Decision[] }
  }, [mode, isNight, decisions, s, eventsOf])

  // several people talking in one town: fan their bubbles out sideways (0, left, right, further left...)
  const fanned = useMemo(() => {
    const townOf = new Map(states.map(a => [a.agent, a.town]))
    const seen = new Map<string, number>()
    return bubbles.map(b => {
      const town = townOf.get(b.agent) ?? ''
      const k = seen.get(town) ?? 0
      seen.set(town, k + 1)
      return { ...b, fan: k === 0 ? 0 : (k % 2 ? -1 : 1) * Math.ceil(k / 2) }
    })
  }, [bubbles, states])

  const tags = useMemo(() => mode === 'turn' ? new Map(decisions.map(d => [d.agent, d.success ? TAG[d.action] ?? d.action.toLowerCase() : 'failed'])) : undefined, [mode, decisions])

  const stepMs = (mode === 'turn' ? MS_TURN : isNight ? MS_NIGHT : MS_DECISION) / speed
  const playback: Playback = {
    states, prevStates, counter,
    walkMs: Math.max(350, Math.min(2600, stepMs * 0.8)),
    activeDecisions: active, bubbles: fanned, links,
    camera,
    // turn by turn has no single actor: Follow then tracks the villager you click
    followAgent: actor,
    tags,
  }

  // ---- moving through time ----
  const forward = useCallback(() => {
    if (mode === 'turn') { if (turn < maxTurn) setTurn(turn + 1); else pause(); return }
    if (!loaded) return // wait for this day's decisions
    if (s < n) setPosition(turn, s + 1)
    else if (turn < maxTurn) setPosition(turn + 1, 0)
    else pause()
  }, [mode, turn, maxTurn, loaded, s, n, setTurn, setPosition, pause])
  const back = useCallback(() => {
    if (mode === 'turn') { setTurn(turn - 1); return }
    if (s > 0) setPosition(turn, s - 1)
    else if (turn > 1) setPosition(turn - 1, Number.MAX_SAFE_INTEGER)
  }, [mode, turn, s, setTurn, setPosition])

  useEffect(() => {
    if (!playing) return
    const id = setTimeout(forward, stepMs)
    return () => clearTimeout(id)
  }, [playing, forward, stepMs, turn, s])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      if (e.key === ' ') { e.preventDefault(); if (playing) pause(); else play() }
      else if (e.key === 'ArrowRight') { pause(); forward() }
      else if (e.key === 'ArrowLeft') { pause(); back() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [playing, play, pause, forward, back])

  // ---- the day's feed ----
  const feedRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = feedRef.current?.querySelector('[data-active="1"]') as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [s, turn, mode])
  const nightLines = useMemo(() => {
    const out: string[] = []
    const sold = eventsOf.filter(e => e.type === 'MARKET_SALE').length
    const rumours = eventsOf.filter(e => e.type === 'RUMOUR').length
    const hungry = eventsOf.filter(e => e.type === 'HUNGRY').length
    if (sold) out.push(`${sold} seller${sold > 1 ? 's' : ''} sent leftover food to the market`)
    if (rumours) out.push(`${rumours} rumour${rumours > 1 ? 's' : ''} told`)
    if (hungry) out.push(`${hungry} went hungry`)
    return out.length ? out : ['a quiet night']
  }, [eventsOf])

  const run = runs.find(r => r.id === runId)
  const stepLabel = mode === 'turn' ? 'whole day' : isNight ? 'night' : `decision ${s + 1} of ${n}: ${decisions[s]?.agent ?? ''}`

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <CozyWorld
        agents={agents}
        towns={towns}
        roads={roads}
        agentStates={agentStates}
        townStates={townStates}
        decisions={decisions}
        playback={playback}
        showLegend={false}
        fill
      />
      {/* dusk tint while the night plays */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'radial-gradient(ellipse at center, rgba(38,44,66,0.10), rgba(38,44,66,0.30))',
        opacity: mode === 'decision' && isNight ? 1 : 0, transition: 'opacity 0.8s var(--ease)',
      }} />

      {/* run + day, top left */}
      <div className="wp-panel" style={{ left: 16, top: 16, padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Day {turn}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-sub)', fontWeight: 600 }}>of {maxTurn}</div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-sub)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
          {mode === 'decision' && isNight && <Moon size={12} />}{stepLabel}
        </div>
        {runs.length > 0 && (
          <select className="wp-select" value={runId} onChange={e => setRun(Number(e.target.value))} aria-label="Run" style={{ marginTop: 8 }}>
            {[...runs].reverse().map(r => <option key={r.id} value={r.id}>Run #{r.id} · {r.turns_completed} days · seed {r.seed}</option>)}
          </select>
        )}
        <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
          {Object.entries(ROLE_STYLE).map(([role, st]) => (
            <span key={role} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: st.color, color: st.ink }}>{role}</span>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 6, maxWidth: 220, lineHeight: 1.35 }}>
          Space plays or pauses, arrow keys step. Click a villager for details; drag to orbit, scroll to zoom.
        </div>
        {run && run.turns_completed === 0 && <div style={{ fontSize: 12, color: 'var(--bad)', marginTop: 6 }}>This run has no days yet.</div>}
      </div>

      {/* the day's feed, right */}
      <div className={`wp-panel wp-feed${feedOpen ? '' : ' is-closed'}`} style={{ right: 16, top: 60, bottom: 96 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px 6px' }}>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>Day {turn}, in order</div>
          <button className="wp-icon" onClick={() => setFeedOpen(false)} aria-label="Hide the day's feed"><PanelRightClose size={15} /></button>
        </div>
        <div ref={feedRef} style={{ overflowY: 'auto', padding: '0 6px 8px', flex: 1 }}>
          {!loaded && <div style={{ padding: 12, fontSize: 12.5, color: 'var(--ink-faint)' }}>Loading the day...</div>}
          {decisions.map((d, i) => {
            const on = mode === 'decision' && s === i
            const done = mode === 'turn' || i < s
            return (
              <button key={d.id} data-active={on ? '1' : '0'} className={`wp-row${on ? ' is-on' : ''}${done ? '' : ' is-later'}`}
                onClick={() => { pause(); if (mode !== 'decision') setMode('decision'); setPosition(turn, i) }}>
                <span className="wp-num">{i + 1}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 700 }}>{d.agent}</span>{' '}
                  <span style={{ color: d.success ? 'var(--ink-sub)' : 'var(--bad)' }}>{shortResult(d)}</span>
                </span>
              </button>
            )
          })}
          {loaded && (
            <button data-active={mode === 'decision' && isNight ? '1' : '0'} className={`wp-row${mode === 'decision' && isNight ? ' is-on' : ''}`}
              onClick={() => { pause(); if (mode !== 'decision') setMode('decision'); setPosition(turn, n) }}>
              <span className="wp-num"><Moon size={11} /></span>
              <span><span style={{ fontWeight: 700 }}>Night</span> <span style={{ color: 'var(--ink-sub)' }}>{nightLines.join(', ')}</span></span>
            </button>
          )}
        </div>
      </div>
      {!feedOpen && (
        <button className="wp-panel wp-icon" style={{ right: 16, top: 60, width: 38, height: 38 }} onClick={() => setFeedOpen(true)} aria-label="Show the day's feed">
          <PanelRightOpen size={16} />
        </button>
      )}

      {/* camera, just above the player */}
      <div className="wp-panel wp-camera">
        <Video size={14} style={{ color: 'var(--ink-sub)' }} aria-hidden />
        <SlidingTabs tabs={CAMERAS} active={CAMERAS.find(k => CAMERA_OF[k] === camera) ?? 'Follow'} onChange={k => setCamera(CAMERA_OF[k])} size="sm" ariaLabel="Camera" />
        <span className="wp-camera-help">
          {camera === 'follow' && mode === 'turn' ? 'Click a villager to follow them.' : CAMERA_HELP[camera]}
        </span>
      </div>

      {/* player, bottom centre */}
      <div className="wp-panel wp-player">
        <button className="wp-icon" onClick={() => { pause(); if (mode === 'turn') setTurn(1); else setPosition(1, 0) }} aria-label="Back to day 1"><SkipBack size={15} /></button>
        <button className="wp-icon" onClick={() => { pause(); back() }} aria-label="Step back"><StepBack size={16} /></button>
        <button className="wp-play" onClick={() => (playing ? pause() : play())} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: 2 }} />}
        </button>
        <button className="wp-icon" onClick={() => { pause(); forward() }} aria-label="Step forward"><StepForward size={16} /></button>
        <div className="wp-sep" />
        <SlidingTabs tabs={MODES} active={mode === 'turn' ? MODES[0] : MODES[1]} onChange={m => setMode(MODE_OF[m])} size="sm" ariaLabel="Play by" />
        <SlidingTabs tabs={SPEEDS} active={(SPEEDS.find(k => SPEED_OF[k] === speed) ?? '1x')} onChange={k => setSpeed(SPEED_OF[k])} size="sm" ariaLabel="Speed" />
        <div className="wp-sep" />
        <input type="range" min={1} max={Math.max(1, maxTurn)} value={turn} aria-label="Day"
          onChange={e => { pause(); const t = Number(e.target.value); if (mode === 'turn') setTurn(t); else setPosition(t, 0) }}
          style={{ width: 160 }} />

      </div>
    </div>
  )
}
