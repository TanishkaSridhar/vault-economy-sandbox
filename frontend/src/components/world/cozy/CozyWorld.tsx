import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, QuadraticBezierLine } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import '@fontsource/itim/400.css'
import './cozy.css'
import type { AgentMeta, AgentState, Decision, Road, TownMeta, TownState } from '../../../hooks/useSimData'
import { useSettings } from '../../../hooks/useSettings'
import { useTurn } from '../../../hooks/useTurn'
import { C, ROLE_STYLE, TERRAIN_ACCENT, roleStyle } from './palette'
import { buildRoads, computeLayout, landmarkSpots, worldBounds, TOWN_SCALE, type XZ } from './layout'
import { scatterTrees } from './scatter'
import { Forest } from './props'
import { CozyCtx } from './ctx'
import { TownBlock } from './TownBlock'
import { Slab, Roads, Clouds } from './Ground'
import { AgentsLayer } from './AgentsLayer'
import { VILLAGER_SCALE } from './Villager'
import { DecisionCard } from './DecisionCard'
import { LabelProjector } from './labels'
import { useElementRegistry } from './useElementRegistry'
import type { AnchorMap } from './anchors'

export interface CozyWorldProps {
  agents: AgentMeta[]
  towns: TownMeta[]
  roads: Road[]
  agentStates: AgentState[]
  townStates: TownState[]
  decisions: Decision[]          // current turn
  focusTown?: string | null      // zoom to one town (Towns page)
  onTownClick?: (name: string) => void
  showLegend?: boolean
  style?: React.CSSProperties
  /** Fill the parent edge to edge (no rounded corners). */
  fill?: boolean
  /** When given, the World page drives what is shown instead of the global turn. */
  playback?: Playback
}

/**
 * - 'map':    frame the whole map (when chosen), then stay
 * - 'follow': track the acting agent as they walk, gliding to the next one; whole map when nobody acts
 * - 'free':   never move by itself; only the user moves it
 */
export type CameraMode = 'map' | 'follow' | 'free'

/** Something an agent says out loud right now. */
export interface Bubble { agent: string; title: string; text?: string; tone: 'act' | 'trade' | 'good' | 'bad' | 'info' | 'fail'; fan?: number }
/** Two agents talking or trading right now (drawn as an arc between them). */
export interface Link { from: string; to: string; tone: 'trade' | 'good' | 'bad' }

export interface Playback {
  states: AgentState[]        // where everyone is and what they hold at this moment
  prevStates: AgentState[]    // the moment before (to walk from)
  counter: number             // goes up by exactly 1 for a single forward step, more for a jump
  walkMs: number
  activeDecisions: Decision[] // decisions happening at this moment (for little reactions)
  bubbles: Bubble[]
  links: Link[]
  camera: CameraMode          // how the camera behaves
  followAgent: string | null  // Follow mode: who is acting right now (null = the clicked villager, else the whole map)
  tags?: Map<string, string>  // short action tag under each name (turn-by-turn mode)
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

export function CozyWorld(props: CozyWorldProps) {
  const { agents, towns, roads, agentStates, townStates, decisions, focusTown = null, onTownClick, showLegend = true, style, fill = false, playback } = props
  const { lowGraphics } = useSettings()
  const reducedMotion = usePrefersReducedMotion()
  const { turn, playing, speed } = useTurn()
  const [selected, setSelected] = useState<string | null>(null)
  const [hoverAgent, setHoverAgent] = useState<string | null>(null)
  const [hoverTown, setHoverTown] = useState<string | null>(null)
  const [fly, setFly] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const flyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const anchors = useRef<AnchorMap>(new Map())
  const baseZoom = useRef(10)
  const { els, refFor } = useElementRegistry()

  // ----- static world (only changes with the run's towns/roads) -----
  const world = useMemo(() => {
    const names = towns.map(t => t.name)
    const rIn = roads.map(r => ({ town_a: r.town_a, town_b: r.town_b, terrain: r.terrain, distance: r.distance }))
    const layout = computeLayout(names, rIn)
    const paths = buildRoads(rIn, layout)
    const bounds = worldBounds(layout, 11)
    const townInfo = towns.filter(t => layout[t.name]).map(t => ({
      name: t.name, terrain: t.terrain, at: layout[t.name] as XZ, spots: landmarkSpots(t.name, t.terrain, layout, paths),
    }))
    return { layout, paths, bounds, townInfo }
  }, [towns, roads])
  const trees = useMemo(
    () => scatterTrees(world.townInfo, world.paths.map(p => p.points), world.bounds, lowGraphics ? 0.5 : 1),
    [world, lowGraphics],
  )

  // ----- per-turn data -----
  const curTurn = useMemo(() => agentStates.filter(s => s.turn === turn), [agentStates, turn])
  const prevTurn = useMemo(() => agentStates.filter(s => s.turn === turn - 1), [agentStates, turn])
  const cur = playback?.states ?? curTurn
  const prev = playback?.prevStates ?? prevTurn
  const clock = playback?.counter ?? turn
  const moodDecisions = playback?.activeDecisions ?? decisions
  const priceNow = useMemo(() => new Map(townStates.filter(s => s.turn === turn).map(s => [s.town, s])), [townStates, turn])
  const pricePrev = useMemo(() => new Map(townStates.filter(s => s.turn === turn - 1).map(s => [s.town, s])), [townStates, turn])
  const walkMs = playback?.walkMs ?? (playing ? Math.max(300, Math.min(2600, (1000 / speed) * 0.9)) : 1600)
  const roleOf = useMemo(() => new Map(agents.map(a => [a.name, a.role])), [agents])
  const decisionOf = useMemo(() => new Map(decisions.map(d => [d.agent, d])), [decisions])
  // Stagger pill heights for villagers sharing a town so they overlap less
  const lift = useMemo(() => {
    const byTown = new Map<string, string[]>()
    for (const s of cur) byTown.set(s.town, [...(byTown.get(s.town) ?? []), s.agent].sort())
    const out = new Map<string, number>()
    for (const list of byTown.values()) list.forEach(n => out.set(n, 0)) // tags are decluttered on screen instead
    return out
  }, [cur])
  const liftRef = useRef(lift)
  useEffect(() => { liftRef.current = lift }, [lift])

  // Town label anchors are static; villager anchors follow the villagers every frame
  useEffect(() => {
    for (const t of world.townInfo) anchors.current.set(`town:${t.name}`, { pos: new THREE.Vector3(t.at[0], 0, t.at[1] - 2.6 * TOWN_SCALE), h: 5.6 * TOWN_SCALE })
  }, [world])
  const onPosition = useCallback((name: string, p: THREE.Vector3) => {
    const h = 1.38 * VILLAGER_SCALE + (liftRef.current.get(name) ?? 0)
    const a = anchors.current.get(`agent:${name}`)
    if (a && a.pos === p) a.h = h
    else anchors.current.set(`agent:${name}`, { pos: p, h })
    for (const kind of ['card', 'bubble']) {
      const c = anchors.current.get(`${kind}:${name}`)
      if (c && c.pos === p) c.h = h + 0.55
      else anchors.current.set(`${kind}:${name}`, { pos: p, h: h + 0.55 })
    }
  }, [])

  // ----- interaction -----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => () => { if (flyTimer.current) clearTimeout(flyTimer.current) }, [])

  const handleTownClick = useCallback((name: string) => {
    if (!onTownClick) return
    setFly(name)
    if (flyTimer.current) clearTimeout(flyTimer.current)
    flyTimer.current = setTimeout(() => onTownClick(name), 650)
  }, [onTownClick])

  const ready = world.townInfo.length > 0

  // camera: who to track, and when to show the whole map
  const camMode = playback?.camera
  const track = camMode === 'follow' ? (playback?.followAgent ?? selected) : null
  const viewKey = !playback ? 'static' : camMode === 'free' ? 'free' : track ? 'track' : camMode === 'map' ? 'map' : 'idle'

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: fill ? 0 : 'var(--radius-card)', overflow: 'hidden', background: C.sky, ...style }}>
      {ready && (
        <Canvas
          orthographic
          shadows={!lowGraphics}
          dpr={lowGraphics ? 1 : [1, 1.75]}
          camera={{ position: [60, 55, 60], zoom: 10, near: 1, far: 400 }}
          gl={{ antialias: true }}
          onCreated={({ gl }) => {
            gl.setClearColor(C.sky)
            // dev-only hook so automated checks can read draw-call stats
            if (import.meta.env.DEV) (window as unknown as { __vaultGl?: THREE.WebGLRenderer }).__vaultGl = gl
          }}
          onPointerMissed={() => setSelected(null)}
          onDoubleClick={() => { setFly(null); setResetKey(k => k + 1) }}
          aria-label="3D map of the towns and villagers"
        >
          <CozyCtx.Provider value={{ low: lowGraphics, reducedMotion }}>
            <Lights bounds={world.bounds} low={lowGraphics} />
            <CameraRig bounds={world.bounds} layout={world.layout} focus={fly ?? (playback ? null : focusTown)}
              span={4.6 * TOWN_SCALE} resetKey={resetKey} baseZoomRef={baseZoom}
              viewKey={viewKey} track={track} anchorsRef={anchors} />
            <Suspense fallback={null}>
              <Slab bounds={world.bounds} />
              <Roads roads={world.paths} />
              <Forest trees={trees} />
              {world.townInfo.map(t => {
                const now = priceNow.get(t.name)
                return (
                  <TownBlock
                    key={t.name}
                    name={t.name}
                    terrain={t.terrain}
                    center={t.at}
                    spots={t.spots}
                    stock={now?.stock}
                    hovered={hoverTown === t.name}
                    onHover={setHoverTown}
                    onClick={handleTownClick}
                  />
                )
              })}
              <AgentsLayer
                agents={agents}
                states={cur}
                prevStates={prev}
                decisions={moodDecisions}
                layout={world.layout}
                roads={world.paths}
                turn={clock}
                walkMs={walkMs}
                selected={selected}
                onSelect={setSelected}
                onHover={setHoverAgent}
                onPosition={onPosition}
              />
              <Clouds bounds={world.bounds} />
              {playback && playback.links.length > 0 && <Links links={playback.links} anchorsRef={anchors} />}
            </Suspense>
            <LabelProjector anchorsRef={anchors} elsRef={els} baseZoomRef={baseZoom} />
          </CozyCtx.Provider>
        </Canvas>
      )}

      {/* DOM labels positioned by LabelProjector */}
      {ready && (
        <div className="cz-labels">
          {world.townInfo.map(t => {
            const now = priceNow.get(t.name), before = pricePrev.get(t.name)
            const trend = now && before ? Math.sign(Math.round((now.price - before.price) * 10)) : 0
            return (
              <div key={t.name} ref={refFor(`town:${t.name}`)} className="cz-anchor">
                <div
                  className={`cz-town${hoverTown === t.name ? ' is-hover' : ''}`}
                  onClick={() => handleTownClick(t.name)}
                  onMouseEnter={() => setHoverTown(t.name)}
                  onMouseLeave={() => setHoverTown(null)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') handleTownClick(t.name) }}
                  aria-label={`${t.name}, price ${now?.price ?? 'unknown'}, stock ${now?.stock ?? 'unknown'}`}
                >
                  <div className="cz-town-name"><span className="cz-dot" style={{ background: TERRAIN_ACCENT[t.terrain] ?? C.grassDark }} aria-hidden />{t.name}</div>
                  {now && (
                    <div className="cz-town-stats">
                      <span className={`cz-chip ${trend > 0 ? 'up' : trend < 0 ? 'down' : ''}`}>price {now.price.toFixed(1)}{trend > 0 ? ' \u25B2' : trend < 0 ? ' \u25BC' : ''}</span>
                      <span className="cz-chip">stock {now.stock}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {cur.map(s => {
            const role = roleOf.get(s.agent) ?? 'Villager'
            const rs = roleStyle(role)
            const dim = hoverAgent !== null && hoverAgent !== s.agent
            return (
              <div key={s.agent} ref={refFor(`agent:${s.agent}`)} className="cz-anchor" data-agent={s.agent}>
                <div
                  className={`cz-role${dim ? ' is-dim' : ''}${selected === s.agent ? ' is-selected' : ''}`}
                  style={{ background: rs.color, color: rs.ink }}
                  onClick={() => setSelected(selected === s.agent ? null : s.agent)}
                  title={`${s.agent} (${role}): click for details`}
                  aria-label={`${s.agent}, ${role}`}
                >
                  {s.agent}
                  {playback?.tags?.get(s.agent) && <span className="cz-tag">{playback.tags.get(s.agent)}</span>}
                  {s.food <= 0 && <span className="cz-hungry" title="no food">hungry</span>}
                </div>
              </div>
            )
          })}
          {playback?.bubbles.map(b => (
            <div key={`b:${b.agent}`} ref={refFor(`bubble:${b.agent}`)} className="cz-anchor" data-z="1" style={{ zIndex: 90000 }}>
              <div className={`cz-bubble tone-${b.tone}`} key={`${clock}:${b.title}`}
                style={b.fan ? { left: b.fan * 205, top: Math.abs(b.fan) * -18 } : undefined}>
                <div className="cz-bubble-who">{b.agent}</div>
                <div className="cz-bubble-title">{b.title}</div>
                {b.text && <div className="cz-bubble-text">{b.text}</div>}
              </div>
            </div>
          ))}
          {selected && cur.some(s => s.agent === selected) && (
            <div ref={refFor(`card:${selected}`)} className="cz-anchor" data-fixed="1" data-z="1" style={{ zIndex: 100000 }}>
              <div>
                <DecisionCard
                  name={selected}
                  role={roleOf.get(selected) ?? 'Villager'}
                  state={cur.find(s => s.agent === selected)!}
                  decision={decisionOf.get(selected)}
                  onClose={() => setSelected(null)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {ready && (
        <>
          {showLegend && <div className="cz-overlay" style={{ left: 14, bottom: 14 }}>
            {Object.entries(ROLE_STYLE).map(([role, s]) => (
              <div key={role} className="cz-legend-row">
                <span className="cz-pill" style={{ background: s.color, color: s.ink }}>{role}</span>
              </div>
            ))}
            <div style={{ fontSize: 11.5, color: 'var(--cz-ink-soft)', marginTop: 4, maxWidth: 170, lineHeight: 1.25 }}>
              Click a villager to see their decision. Drag to orbit, scroll to zoom.
            </div>
          </div>}
          <div style={{ position: 'absolute', right: 14, top: 14, display: 'flex', gap: 8 }}>
            <button className="cz-btn" onClick={() => { setFly(null); setResetKey(k => k + 1) }} aria-label="Reset camera view">Reset view</button>
          </div>
        </>
      )}
      {!ready && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: 'var(--cz-font)', color: '#6b4a32', fontSize: 18 }}>
          Building the world...
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function Lights({ bounds, low }: { bounds: [number, number, number, number]; low: boolean }) {
  const [minX, minZ, maxX, maxZ] = bounds
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2
  const half = Math.max(maxX - minX, maxZ - minZ) * 0.62
  const light = useRef<THREE.DirectionalLight>(null)
  useEffect(() => {
    if (!light.current) return
    light.current.target.position.set(cx, 0, cz)
    light.current.target.updateMatrixWorld()
  }, [cx, cz])
  return (
    <>
      <hemisphereLight args={['#fff6e6', '#b8d3a6', 1.25]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        ref={light}
        position={[cx + 30, 55, cz + 18]}
        intensity={2.1}
        color="#fff0d8"
        castShadow={!low}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0008}
        shadow-normalBias={0.04}
        shadow-camera-left={-half}
        shadow-camera-right={half}
        shadow-camera-top={half}
        shadow-camera-bottom={-half}
        shadow-camera-near={1}
        shadow-camera-far={160}
      />
    </>
  )
}

const UP = new THREE.Vector3(0, 1, 0)
const ISO_DIR = new THREE.Vector3(1, 0.92, 1).normalize()

/** Orthographic zoom that fits a ground box (plus some height) into the viewport. */
function fitZoom(box: [number, number, number, number], w: number, h: number, dir: THREE.Vector3, top = 4, bottom = -2.6) {
  const f = dir.clone().negate()
  const right = new THREE.Vector3().crossVectors(f, UP).normalize()
  const up = new THREE.Vector3().crossVectors(right, f).normalize()
  const cx = (box[0] + box[2]) / 2, cz = (box[1] + box[3]) / 2
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const x of [box[0], box[2]]) for (const z of [box[1], box[3]]) for (const y of [bottom, top]) {
    const p = new THREE.Vector3(x - cx, y, z - cz)
    const sx = p.dot(right), sy = p.dot(up)
    minX = Math.min(minX, sx); maxX = Math.max(maxX, sx); minY = Math.min(minY, sy); maxY = Math.max(maxY, sy)
  }
  return Math.min(w / (maxX - minX), h / (maxY - minY))
}

const TRACK_SPAN = 14   // half-width of the area kept in view around a followed agent
const T = new THREE.Vector3(), OFFSET = new THREE.Vector3()

function CameraRig({ bounds, layout, focus, span, resetKey, baseZoomRef, viewKey, track, anchorsRef }: {
  bounds: [number, number, number, number]; layout: Record<string, XZ>; focus: string | null; span: number; resetKey: number
  baseZoomRef: React.RefObject<number>
  viewKey: string                       // 'static' | 'map' | 'idle' | 'track' | 'free'
  track: string | null                  // agent to follow
  anchorsRef: React.RefObject<AnchorMap>
}) {
  const { size } = useThree()
  const controls = useRef<OrbitControlsImpl>(null)
  const goal = useRef({ target: new THREE.Vector3(), zoom: 10, active: false, zooming: false, dir: ISO_DIR.clone() })
  const lastReset = useRef(resetKey)

  // Fill the frame: the diorama corners are empty grass, so crop them a little
  // full-screen maps crop harder: the diorama's corners are empty grass anyway
  const fullZoom = useMemo(() => fitZoom(bounds, size.width, size.height, ISO_DIR) * 1.08, [bounds, size])
  useEffect(() => { baseZoomRef.current = fullZoom }, [fullZoom, baseZoomRef])

  useEffect(() => {
    const g = goal.current
    const c = focus ? layout[focus] : null
    // Free never moves by itself (only a fresh press of Reset view); tracking is handled frame by frame below
    const resetPressed = resetKey !== lastReset.current
    lastReset.current = resetKey
    if (!c && (viewKey === 'track' || (viewKey === 'free' && !resetPressed))) return
    if (c) {
      const box: [number, number, number, number] = [c[0] - span, c[1] - span, c[0] + span, c[1] + span]
      g.target.set(c[0], 1.0, c[1] + span * 0.12)
      g.zoom = fitZoom(box, size.width, size.height, ISO_DIR, 3.5, 0)
    } else {
      g.target.set((bounds[0] + bounds[2]) / 2, 0, (bounds[1] + bounds[3]) / 2 + 1.5)
      g.zoom = fullZoom
    }
    g.dir = ISO_DIR.clone() // reset/focus always returns to the isometric angle
    g.active = true
  }, [focus, span, bounds, layout, fullZoom, size, resetKey, viewKey])

  // A new agent to follow: zoom in once; after that the user's zoom and angle are kept
  useEffect(() => {
    if (!track || focus) return
    const g = goal.current
    g.zoom = fitZoom([-TRACK_SPAN, -TRACK_SPAN, TRACK_SPAN, TRACK_SPAN], size.width, size.height, ISO_DIR, 3.5, 0)
    g.zooming = true
    g.active = false
  }, [track, focus, size])

  useFrame((state, dt) => {
    const g = goal.current
    const ctl = controls.current
    if (!ctl) return
    const k = 1 - Math.pow(0.0015, dt) // frame-rate independent easing
    if (track && !focus) {
      const a = anchorsRef.current.get(`agent:${track}`)
      if (!a) return
      const cam = state.camera as THREE.OrthographicCamera
      T.set(a.pos.x, 1.0, a.pos.z)
      OFFSET.copy(cam.position).sub(ctl.target) // keep whatever angle the user has orbited to
      ctl.target.lerp(T, Math.min(1, k * 0.9))
      cam.position.copy(ctl.target).add(OFFSET)
      if (g.zooming) {
        cam.zoom += (g.zoom - cam.zoom) * k
        if (Math.abs(cam.zoom - g.zoom) < 0.01) g.zooming = false
      }
      cam.updateProjectionMatrix()
      ctl.update()
      return
    }
    if (!g.active) return
    ctl.target.lerp(g.target, k)
    const cam = state.camera as THREE.OrthographicCamera
    cam.zoom += (g.zoom - cam.zoom) * k
    const dist = 90
    const wantPos = ctl.target.clone().addScaledVector(g.dir, dist)
    cam.position.lerp(wantPos, k)
    cam.updateProjectionMatrix()
    ctl.update()
    if (ctl.target.distanceTo(g.target) < 0.02 && Math.abs(cam.zoom - g.zoom) < 0.01 && cam.position.distanceTo(wantPos) < 0.05) g.active = false
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.5}
      minZoom={fullZoom * 0.6}
      maxZoom={fullZoom * 8}
      minPolarAngle={0.45}
      maxPolarAngle={1.2}
      screenSpacePanning
      onStart={() => { goal.current.active = false; goal.current.zooming = false }}
    />
  )
}

// ---------------------------------------------------------------------------

const LINK_COLOR = { trade: '#c9962e', good: '#5b7a34', bad: '#a8492c' } as const
const A = new THREE.Vector3(), B = new THREE.Vector3(), M = new THREE.Vector3()

/** Arcs between agents who are trading or passing on a rumour right now; they follow the walkers. */
function Links({ links, anchorsRef }: { links: Link[]; anchorsRef: React.RefObject<AnchorMap> }) {
  return <>{links.map(l => <LinkArc key={`${l.from}>${l.to}`} link={l} anchorsRef={anchorsRef} />)}</>
}

type ArcLine = THREE.Object3D & {
  setPoints: (a: THREE.Vector3, b: THREE.Vector3, m: THREE.Vector3) => void
  material: THREE.Material & { dashOffset: number }
}

function LinkArc({ link, anchorsRef }: { link: Link; anchorsRef: React.RefObject<AnchorMap> }) {
  const ref = useRef<ArcLine>(null)
  useFrame((_, dt) => {
    const a = anchorsRef.current.get(`agent:${link.from}`), b = anchorsRef.current.get(`agent:${link.to}`)
    const line = ref.current
    if (!line) return
    line.visible = !!a && !!b
    if (!a || !b) return
    A.set(a.pos.x, a.pos.y + 1.6, a.pos.z)
    B.set(b.pos.x, b.pos.y + 1.6, b.pos.z)
    M.copy(A).lerp(B, 0.5)
    M.y += Math.max(1.2, A.distanceTo(B) * 0.35)
    line.setPoints(A, B, M)
    line.material.dashOffset -= dt * 1.6 // dashes flow from the first agent to the second
  })
  return (
    <QuadraticBezierLine
      ref={ref as never}
      start={[0, 0, 0]}
      end={[0, 0, 1]}
      color={LINK_COLOR[link.tone]}
      lineWidth={3}
      dashed
      dashScale={2}
      dashSize={0.5}
      gapSize={0.35}
    />
  )
}
