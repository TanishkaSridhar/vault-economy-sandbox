import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import '@fontsource/itim/400.css'
import './cozy.css'
import type { AgentMeta, AgentState, Decision, Road, TownMeta, TownState } from '../../../hooks/useSimData'
import { useSettings } from '../../../hooks/useSettings'
import { useTurn } from '../../../hooks/useTurn'
import { C, ROLE_STYLE, TERRAIN_ICON, roleStyle } from './palette'
import { buildRoads, computeLayout, landmarkSpots, worldBounds, type XZ } from './layout'
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
  const { agents, towns, roads, agentStates, townStates, decisions, focusTown = null, onTownClick, showLegend = true, style } = props
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
  const cur = useMemo(() => agentStates.filter(s => s.turn === turn), [agentStates, turn])
  const prev = useMemo(() => agentStates.filter(s => s.turn === turn - 1), [agentStates, turn])
  const priceNow = useMemo(() => new Map(townStates.filter(s => s.turn === turn).map(s => [s.town, s])), [townStates, turn])
  const pricePrev = useMemo(() => new Map(townStates.filter(s => s.turn === turn - 1).map(s => [s.town, s])), [townStates, turn])
  const walkMs = playing ? Math.max(300, Math.min(2600, (1000 / speed) * 0.9)) : 1600
  const roleOf = useMemo(() => new Map(agents.map(a => [a.name, a.role])), [agents])
  const decisionOf = useMemo(() => new Map(decisions.map(d => [d.agent, d])), [decisions])
  // Stagger pill heights for villagers sharing a town so they overlap less
  const lift = useMemo(() => {
    const byTown = new Map<string, string[]>()
    for (const s of cur) byTown.set(s.town, [...(byTown.get(s.town) ?? []), s.agent].sort())
    const out = new Map<string, number>()
    for (const list of byTown.values()) list.forEach((n, i) => out.set(n, (i % 3) * 0.42))
    return out
  }, [cur])
  const liftRef = useRef(lift)
  useEffect(() => { liftRef.current = lift }, [lift])

  // Town label anchors are static; villager anchors follow the villagers every frame
  useEffect(() => {
    for (const t of world.townInfo) anchors.current.set(`town:${t.name}`, { pos: new THREE.Vector3(t.at[0], 0, t.at[1] - 2.6), h: 6.2 })
  }, [world])
  const onPosition = useCallback((name: string, p: THREE.Vector3) => {
    const h = 1.38 * VILLAGER_SCALE + (liftRef.current.get(name) ?? 0)
    const a = anchors.current.get(`agent:${name}`)
    if (a && a.pos === p) a.h = h
    else anchors.current.set(`agent:${name}`, { pos: p, h })
    const c = anchors.current.get(`card:${name}`)
    if (c && c.pos === p) c.h = h + 0.55
    else anchors.current.set(`card:${name}`, { pos: p, h: h + 0.55 })
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

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 20, overflow: 'hidden', background: C.sky, ...style }}>
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
            <CameraRig bounds={world.bounds} layout={world.layout} focus={fly ?? focusTown} resetKey={resetKey} baseZoomRef={baseZoom} />
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
                decisions={decisions}
                layout={world.layout}
                roads={world.paths}
                turn={turn}
                walkMs={walkMs}
                selected={selected}
                onSelect={setSelected}
                onHover={setHoverAgent}
                onPosition={onPosition}
              />
              <Clouds bounds={world.bounds} />
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
                  <div className="cz-town-name"><span aria-hidden>{TERRAIN_ICON[t.terrain] ?? '🏡'}</span>{t.name}</div>
                  {now && (
                    <div className="cz-town-stats">
                      <span className={`cz-chip ${trend > 0 ? 'up' : trend < 0 ? 'down' : ''}`}>🪙 {now.price.toFixed(1)}{trend > 0 ? ' ▲' : trend < 0 ? ' ▼' : ''}</span>
                      <span className="cz-chip">📦 {now.stock}</span>
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
                  title={`${role}: click for details`}
                  aria-label={`${s.agent}, ${role}`}
                >
                  <span aria-hidden>{rs.icon}</span>{role}{s.food <= 0 && <span className="cz-hungry" title="hungry">🍽️</span>}
                </div>
              </div>
            )
          })}
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

      {showLegend && ready && (
        <>
          <div className="cz-overlay" style={{ left: 14, bottom: 14 }}>
            {Object.entries(ROLE_STYLE).map(([role, s]) => (
              <div key={role} className="cz-legend-row">
                <span className="cz-pill" style={{ background: s.color, color: s.ink }}>{s.icon} {role}</span>
              </div>
            ))}
            <div style={{ fontSize: 11.5, color: 'var(--cz-ink-soft)', marginTop: 4, maxWidth: 170, lineHeight: 1.25 }}>
              Click a villager to see their decision. Drag to orbit, scroll to zoom.
            </div>
          </div>
          <div style={{ position: 'absolute', right: 14, top: 14, display: 'flex', gap: 8 }}>
            <button className="cz-btn" onClick={() => { setFly(null); setResetKey(k => k + 1) }} aria-label="Reset camera view">⟲ Reset view</button>
          </div>
        </>
      )}
      {!ready && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: 'var(--cz-font)', color: '#6b4a32', fontSize: 18 }}>
          Building the world…
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

function CameraRig({ bounds, layout, focus, resetKey, baseZoomRef }: {
  bounds: [number, number, number, number]; layout: Record<string, XZ>; focus: string | null; resetKey: number
  baseZoomRef: React.RefObject<number>
}) {
  const { size } = useThree()
  const controls = useRef<OrbitControlsImpl>(null)
  const goal = useRef({ target: new THREE.Vector3(), zoom: 10, active: false, dir: ISO_DIR.clone() })

  // Fill the frame: the diorama corners are empty grass, so crop them a little
  const fullZoom = useMemo(() => fitZoom(bounds, size.width, size.height, ISO_DIR) * 1.3, [bounds, size])
  useEffect(() => { baseZoomRef.current = fullZoom }, [fullZoom, baseZoomRef])

  useEffect(() => {
    const g = goal.current
    const c = focus ? layout[focus] : null
    if (c) {
      const box: [number, number, number, number] = [c[0] - 4.6, c[1] - 4.6, c[0] + 4.6, c[1] + 4.6]
      g.target.set(c[0], 1.0, c[1])
      g.zoom = fitZoom(box, size.width, size.height, ISO_DIR, 3.5, 0)
    } else {
      g.target.set((bounds[0] + bounds[2]) / 2, 0, (bounds[1] + bounds[3]) / 2 + 1.5)
      g.zoom = fullZoom
    }
    g.dir = ISO_DIR.clone() // reset/focus always returns to the isometric angle
    g.active = true
  }, [focus, bounds, layout, fullZoom, size, resetKey])

  useFrame((state, dt) => {
    const g = goal.current
    const ctl = controls.current
    if (!g.active || !ctl) return
    const k = 1 - Math.pow(0.0015, dt) // frame-rate independent easing
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
      minZoom={fullZoom * 0.7}
      maxZoom={fullZoom * 8}
      minPolarAngle={0.45}
      maxPolarAngle={1.2}
      screenSpacePanning
      onStart={() => { goal.current.active = false }}
    />
  )
}
