import { memo, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Look } from './looks'
import { C } from './palette'
import { toon, flat, geo } from './toon'
import { useCozy } from './ctx'
import { StaticBatch } from './batch'

const EYE = '#3b2a20'
const sphere = () => geo('v-sphere', () => new THREE.SphereGeometry(0.5, 18, 14))
const capsule = () => geo('v-capsule', () => new THREE.CapsuleGeometry(0.5, 1, 6, 12))
const cone = () => geo('v-cone', () => new THREE.ConeGeometry(0.5, 1, 14))
const cyl = () => geo('v-cyl', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 16))
const dressGeo = () => geo('v-dress', () => new THREE.CylinderGeometry(0.15, 0.27, 0.32, 16))
const shadowGeo = () => geo('v-shadow', () => { const g = new THREE.CircleGeometry(0.32, 20); g.rotateX(-Math.PI / 2); return g })

type V3 = [number, number, number]
function B({ g, color, p, s, r, outline, mat }: { g: () => THREE.BufferGeometry; color?: string; p?: V3; s?: V3 | number; r?: V3; outline?: boolean; mat?: THREE.Material }) {
  const { low } = useCozy()
  // villagers rely on their soft blob shadow, so they stay out of the shadow pass
  return <mesh geometry={g()} material={mat ?? toon(color!)} position={p} scale={s} rotation={r} userData={{ outline: outline && !low }} />
}

/** Motion request from the agents layer. */
export interface Motion {
  id: string                 // changes whenever a new motion starts
  home: THREE.Vector3        // where to stand when idle
  path?: THREE.Vector3[]     // road waypoints to walk (current position is prepended)
  duration?: number          // ms to walk the path
  snap?: boolean             // jump straight to home (scrubbing)
}

export interface Mood { hungry: boolean; traded: boolean; profit: boolean; key: string }

/** Villagers are drawn at this scale relative to their modelled size (~1.1 units tall). */
export const VILLAGER_SCALE = 1.55

interface VillagerProps {
  name: string
  look: Look
  motion: Motion
  mood: Mood
  selected: boolean
  onSelect: (name: string) => void
  onHover: (name: string | null) => void
  positionRef?: (name: string, p: THREE.Vector3) => void
}

const smooth = (t: number) => t * t * (3 - 2 * t)

function VillagerImpl({ name, look, motion, mood, selected, onSelect, onHover, positionRef }: VillagerProps) {
  const { low, reducedMotion } = useCozy()
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Group>(null), legR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null), armR = useRef<THREE.Group>(null)
  const eyes = useRef<THREE.Group>(null)
  const coins = useRef<(THREE.Mesh | null)[]>([])
  const sparkle = useRef<THREE.Mesh>(null)

  const seed = useMemo(() => [...name].reduce((s, c) => s + c.charCodeAt(0), 0) * 0.37, [name])
  const st = useRef({
    pos: motion.home.clone(),
    yaw: 0,
    phase: 0,
    path: null as THREE.Vector3[] | null,
    cum: [] as number[],
    start: 0,
    dur: 0,
    burstAt: -1e9,
    blinkAt: 0,
    initialised: false,
  })

  // New motion: walk a route (from wherever we are now) or settle at home.
  useEffect(() => {
    const s = st.current
    if (!s.initialised || motion.snap) {
      s.pos.copy(motion.home); s.path = null; s.initialised = true
      root.current?.position.copy(s.pos)
      return
    }
    if (motion.path && motion.path.length) {
      const pts = [s.pos.clone(), ...motion.path, motion.home.clone()]
      const cum = [0]
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]))
      s.path = pts; s.cum = cum; s.start = performance.now(); s.dur = Math.max(250, motion.duration ?? 1500)
    } else {
      s.path = null
    }
  }, [motion])

  // Trade / profit reactions once per turn
  useEffect(() => {
    if (mood.traded || mood.profit) st.current.burstAt = performance.now()
  }, [mood.key, mood.traded, mood.profit])

  useFrame(({ clock }, dt) => {
    const s = st.current
    const g = root.current
    if (!g) return
    const now = performance.now()
    const t = clock.elapsedTime + seed
    const prev = s.pos.clone()
    let walking = false

    if (s.path) {
      const k = Math.min(1, (now - s.start) / s.dur)
      const e = smooth(k)
      const total = s.cum[s.cum.length - 1]
      const d = e * total
      let i = 1
      while (i < s.cum.length - 1 && s.cum[i] < d) i++
      const segLen = s.cum[i] - s.cum[i - 1] || 1
      s.pos.lerpVectors(s.path[i - 1], s.path[i], (d - s.cum[i - 1]) / segLen)
      walking = k < 1
      if (k >= 1) s.path = null
    } else {
      // idle: amble back to home, then drift gently around it
      const target = motion.home.clone()
      if (!reducedMotion && !low) {
        target.x += Math.sin(t * 0.27) * 0.16
        target.z += Math.cos(t * 0.21) * 0.13
      }
      const toTarget = target.sub(s.pos)
      const dist = toTarget.length()
      const step = Math.min(dist, dt * (dist > 0.6 ? 3.2 : 0.55))
      if (dist > 0.001) s.pos.addScaledVector(toTarget.normalize(), step)
      walking = dist > 0.08
    }

    g.position.copy(s.pos)
    positionRef?.(name, s.pos)

    // face direction of travel
    const mv = s.pos.clone().sub(prev)
    const speed = mv.length() / Math.max(dt, 1e-3)
    if (mv.lengthSq() > 1e-6) {
      const want = Math.atan2(mv.x, mv.z)
      let diff = want - s.yaw
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      s.yaw += diff * Math.min(1, dt * 10)
    } else if (!walking && !reducedMotion) {
      // turn to face the camera when standing
      let diff = Math.PI / 4 - s.yaw
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      s.yaw += diff * Math.min(1, dt * 2)
    }
    g.rotation.y = s.yaw

    // walk cycle driven by distance so feet don't skate
    s.phase += mv.length() * 7.5
    const swing = walking ? Math.sin(s.phase) : 0
    const walkAmt = walking ? Math.min(1, speed / 1.2) : 0
    if (legL.current && legR.current) { legL.current.rotation.x = swing * 0.7; legR.current.rotation.x = -swing * 0.7 }
    if (armL.current && armR.current) { armL.current.rotation.x = -swing * 0.6; armR.current.rotation.x = swing * 0.6 }
    if (body.current) {
      const hopK = (now - s.burstAt) / 600
      const hop = hopK >= 0 && hopK < 1 ? Math.sin(hopK * Math.PI) * 0.28 : 0
      const breathe = reducedMotion ? 0 : Math.sin(t * 2.2) * 0.012
      body.current.position.y = Math.abs(Math.sin(s.phase)) * 0.06 * walkAmt + hop
      body.current.rotation.x = 0.12 * walkAmt
      body.current.scale.set(1, 1 + breathe, 1)
    }
    if (head.current) {
      head.current.rotation.x = mood.hungry ? 0.32 : reducedMotion ? 0 : Math.sin(t * 0.9) * 0.04
      head.current.rotation.z = reducedMotion ? 0 : Math.sin(t * 0.6) * 0.05
    }
    // blink
    if (eyes.current) {
      if (now > s.blinkAt + 4000 + (seed % 3) * 700) s.blinkAt = now
      const b = now - s.blinkAt
      eyes.current.scale.y = b < 120 ? 0.15 : 1
    }
    // coin burst / sparkle
    const bk = (now - s.burstAt) / 1000
    coins.current.forEach((m, i) => {
      if (!m) return
      const on = mood.traded && bk >= 0 && bk < 1
      m.visible = on
      if (on) {
        const a = (i / 5) * Math.PI * 2 + seed
        m.position.set(Math.cos(a) * 0.35 * bk, 1.1 + bk * 0.9 - bk * bk * 0.6, Math.sin(a) * 0.35 * bk)
        m.rotation.y = bk * 12
      }
    })
    if (sparkle.current) {
      const on = mood.profit && !mood.traded && bk >= 0 && bk < 1.2
      sparkle.current.visible = on
      if (on) { sparkle.current.position.y = 1.25 + bk * 0.4; sparkle.current.scale.setScalar(0.12 * (1 - Math.abs(bk - 0.5))); sparkle.current.rotation.z = bk * 4 }
    }
  })

  const coinMat = toon(C.coin, { emissive: C.coin, emissiveIntensity: 0.4 })
  const sparkleMat = flat(C.lampGlow)

  return (
    <group
      ref={root}
      onClick={e => { e.stopPropagation(); onSelect(name) }}
      onPointerOver={e => { e.stopPropagation(); onHover(name); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { onHover(null); document.body.style.cursor = '' }}
    >
      <group scale={VILLAGER_SCALE}>
      <mesh geometry={shadowGeo()} material={flat('#4a3a2a', 0.18)} position={[0, 0.01, 0]} />
      <group ref={body} scale={selected ? 1.12 : 1}>
        <Body look={look} armL={armL} armR={armR} legL={legL} legR={legR} />
        <group ref={head} position={[0, 0.6, 0]}>
          <Head look={look} eyes={eyes} />
        </group>
      </group>
      {[0, 1, 2, 3, 4].map(i => (
        <mesh key={i} ref={el => { coins.current[i] = el }} geometry={cyl()} material={coinMat} scale={[0.14, 0.03, 0.14]} rotation={[Math.PI / 2, 0, 0]} visible={false} />
      ))}
      <mesh ref={sparkle} geometry={geo('v-star', () => new THREE.OctahedronGeometry(1, 0))} material={sparkleMat} visible={false} />
      </group>
    </group>
  )
}
export const Villager = memo(VillagerImpl)

// ---------------------------------------------------------------------------

function Body({ look, armL, armR, legL, legR }: {
  look: Look
  armL: React.RefObject<THREE.Group | null>; armR: React.RefObject<THREE.Group | null>
  legL: React.RefObject<THREE.Group | null>; legR: React.RefObject<THREE.Group | null>
}) {
  const pants = look.outfit === 'overalls' ? look.lower : look.outfit === 'dress' ? look.fur : look.lower
  return (
    <StaticBatch deps={[look]} outlineWidth={0.016} raycastMerged>
      {/* legs pivot at the hip */}
      {([[-0.085, legL], [0.085, legR]] as const).map(([x, ref]) => (
        <group key={x} ref={ref} position={[x, 0.22, 0]} userData={{ dynamic: true }}>
          <B g={capsule} color={pants} p={[0, -0.1, 0]} s={[0.15, 0.1, 0.15]} />
          <B g={sphere} color={look.accent === '#ffffff' ? look.fur : C.woodDark} p={[0, -0.2, 0.03]} s={[0.15, 0.09, 0.2]} />
        </group>
      ))}
      {/* torso */}
      <B g={capsule} color={look.shirt} p={[0, 0.38, 0]} s={[0.34, 0.14, 0.3]} outline />
      {look.outfit === 'overalls' && (
        <>
          <B g={cyl} color={look.lower} p={[0, 0.3, 0]} s={[0.36, 0.17, 0.32]} />
          <B g={() => geo('v-bib', () => new THREE.BoxGeometry(1, 1, 1))} color={look.lower} p={[0, 0.43, 0.14]} s={[0.17, 0.14, 0.04]} />
          {[-0.08, 0.08].map(x => <B key={x} g={() => geo('v-bib', () => new THREE.BoxGeometry(1, 1, 1))} color={look.lower} p={[x, 0.5, 0.12]} s={[0.035, 0.12, 0.03]} />)}
        </>
      )}
      {look.outfit === 'apron' && <B g={() => geo('v-bib', () => new THREE.BoxGeometry(1, 1, 1))} color={look.lower} p={[0, 0.33, 0.15]} s={[0.24, 0.26, 0.03]} />}
      {look.outfit === 'dress' && <B g={dressGeo} color={look.lower} p={[0, 0.3, 0]} />}
      {look.outfit === 'vest' && [-0.09, 0.09].map(x => (
        <B key={x} g={() => geo('v-bib', () => new THREE.BoxGeometry(1, 1, 1))} color={look.lower} p={[x, 0.4, 0.13]} s={[0.1, 0.26, 0.05]} />
      ))}
      {look.scarf && <B g={() => geo('v-torus', () => new THREE.TorusGeometry(0.13, 0.045, 8, 18))} color={look.scarf} p={[0, 0.55, 0]} r={[Math.PI / 2, 0, 0]} />}
      {/* arms pivot at the shoulder */}
      {([[-0.2, armL, 0.25], [0.2, armR, -0.25]] as const).map(([x, ref, rz]) => (
        <group key={x} ref={ref} position={[x, 0.5, 0]} userData={{ dynamic: true }}>
          <group rotation={[0, 0, rz]}>
            <B g={capsule} color={look.shirt} p={[0, -0.09, 0]} s={[0.1, 0.1, 0.1]} />
            <B g={sphere} color={look.species === 'frog' || look.species === 'duck' ? look.fur : look.fur} p={[0, -0.19, 0]} s={0.11} />
          </group>
        </group>
      ))}
    </StaticBatch>
  )
}

function Head({ look, eyes }: { look: Look; eyes: React.RefObject<THREE.Group | null> }) {
  const sp = look.species
  const eyeY = sp === 'frog' ? 0.47 : 0.29
  const eyeZ = sp === 'frog' ? 0.12 : 0.272
  const eyeX = sp === 'frog' ? 0.15 : 0.11
  return (
    <group>
      <StaticBatch deps={[look]} outlineWidth={0.016} raycastMerged>
      {/* skull */}
      <B g={sphere} color={look.fur} p={[0, 0.26, 0]} s={[0.66, 0.58, 0.6]} outline />
      <Species look={look} />
      {/* muzzle / beak */}
      {sp === 'duck' ? (
        <B g={sphere} color={look.accent} p={[0, 0.2, 0.29]} s={[0.24, 0.08, 0.2]} />
      ) : sp !== 'frog' && (
        <B g={sphere} color={look.muzzle} p={[0, 0.19, 0.22]} s={sp === 'pug' ? [0.3, 0.22, 0.2] : [0.28, 0.2, 0.2]} />
      )}
      {sp !== 'duck' && sp !== 'frog' && <B g={sphere} color={sp === 'pug' ? '#2a1d16' : EYE} p={[0, 0.23, 0.32]} s={[0.08, 0.06, 0.06]} />}
      {sp === 'frog' && <B g={sphere} color="#e8624a" p={[0, 0.17, 0.27]} s={[0.18, 0.025, 0.05]} />}
      {/* blush */}
      {[-0.19, 0.19].map(x => <mesh key={x} geometry={sphere()} material={flat('#f39a8f', 0.75)} position={[x, 0.19, 0.238]} scale={[0.08, 0.045, 0.03]} />)}
      <HatPart look={look} />
      </StaticBatch>
      {/* eyes (blink) */}
      <group ref={eyes} position={[0, eyeY, eyeZ]} userData={{ dynamic: true }}>
        {[-eyeX, eyeX].map(x => (
          <group key={x} position={[x, 0, 0]}>
            <mesh geometry={sphere()} material={flat(EYE)} scale={[0.075, 0.1, 0.05]} />
            <mesh geometry={sphere()} material={flat('#ffffff')} position={[0.012, 0.022, 0.022]} scale={0.026} />
          </group>
        ))}
      </group>
    </group>
  )
}

function Species({ look }: { look: Look }) {
  const { fur, accent } = look
  switch (look.species) {
    case 'dog':
      return <>{[-1, 1].map(s => <B key={s} g={sphere} color={accent} p={[s * 0.3, 0.27, 0]} r={[0, 0, s * 0.35]} s={[0.12, 0.3, 0.2]} outline />)}</>
    case 'pug':
      return <>{[-1, 1].map(s => <B key={s} g={sphere} color={accent} p={[s * 0.28, 0.44, 0.02]} r={[0, 0, s * 0.6]} s={[0.12, 0.16, 0.12]} />)}</>
    case 'bear': case 'raccoon': case 'panda':
      return (
        <>
          {[-1, 1].map(s => <B key={s} g={sphere} color={look.species === 'bear' ? fur : accent} p={[s * 0.22, 0.5, -0.02]} s={0.16} outline />)}
          {look.species === 'raccoon' && <B g={sphere} color={accent} p={[0, 0.29, 0.19]} s={[0.5, 0.11, 0.22]} />}
          {look.species === 'panda' && [-1, 1].map(s => <B key={`p${s}`} g={sphere} color={accent} p={[s * 0.11, 0.29, 0.2]} s={[0.14, 0.17, 0.12]} r={[0, 0, s * -0.4]} />)}
        </>
      )
    case 'koala':
      return <>{[-1, 1].map(s => <B key={s} g={sphere} color={fur} p={[s * 0.3, 0.42, -0.03]} s={[0.26, 0.26, 0.12]} outline />)}{[-1, 1].map(s => <B key={`i${s}`} g={sphere} color={accent} p={[s * 0.3, 0.42, 0.02]} s={[0.15, 0.15, 0.06]} />)}</>
    case 'mouse':
      return <>{[-1, 1].map(s => <B key={s} g={sphere} color={fur} p={[s * 0.25, 0.52, -0.03]} s={[0.24, 0.24, 0.07]} outline />)}{[-1, 1].map(s => <B key={`i${s}`} g={sphere} color={accent} p={[s * 0.25, 0.52, 0]} s={[0.15, 0.15, 0.04]} />)}</>
    case 'rabbit':
      return <>{[-1, 1].map(s => <B key={s} g={capsule} color={fur} p={[s * 0.1, 0.7, -0.04]} r={[0, 0, s * -0.12]} s={[0.1, 0.26, 0.07]} outline />)}{[-1, 1].map(s => <B key={`i${s}`} g={capsule} color={accent} p={[s * 0.1, 0.7, 0]} r={[0, 0, s * -0.12]} s={[0.05, 0.2, 0.03]} />)}</>
    case 'fox': case 'cat': case 'wolf':
      return (
        <>
          {[-1, 1].map(s => <B key={s} g={cone} color={fur} p={[s * 0.18, 0.56, 0]} r={[0, 0, s * -0.3]} s={[0.17, 0.2, 0.12]} outline />)}
          {[-1, 1].map(s => <B key={`i${s}`} g={cone} color={look.species === 'cat' ? '#f3b7ae' : accent} p={[s * 0.18, 0.55, 0.03]} r={[0, 0, s * -0.3]} s={[0.09, 0.12, 0.05]} />)}
          {look.species === 'cat' && <B g={sphere} color={accent} p={[0.14, 0.42, 0.12]} s={[0.22, 0.16, 0.16]} />}
        </>
      )
    case 'deer':
      return (
        <>
          {[-1, 1].map(s => <B key={s} g={sphere} color={fur} p={[s * 0.32, 0.4, 0]} r={[0, 0, s * 0.9]} s={[0.1, 0.2, 0.08]} />)}
          {[-1, 1].map(s => <B key={`a${s}`} g={capsule} color={accent} p={[s * 0.13, 0.6, -0.02]} r={[0, 0, s * -0.3]} s={[0.04, 0.1, 0.04]} />)}
        </>
      )
    case 'ferret':
      return (
        <>
          {[-1, 1].map(s => <B key={s} g={sphere} color={accent} p={[s * 0.24, 0.48, -0.02]} s={0.11} />)}
          <B g={sphere} color={accent} p={[0, 0.3, 0.18]} s={[0.48, 0.1, 0.2]} />
        </>
      )
    case 'sheep':
      return (
        <>
          {[[-0.16, 0.5, 0.06], [0.16, 0.5, 0.06], [0, 0.57, 0], [-0.25, 0.4, -0.04], [0.25, 0.4, -0.04], [0, 0.48, 0.15]].map((p, i) => <B key={i} g={sphere} color={fur} p={p as V3} s={0.2} outline={i < 3} />)}
          {[-1, 1].map(s => <B key={`e${s}`} g={sphere} color={accent} p={[s * 0.33, 0.26, 0]} r={[0, 0, s * 1.2]} s={[0.08, 0.16, 0.08]} />)}
        </>
      )
    case 'frog':
      return <>{[-1, 1].map(s => <B key={s} g={sphere} color={fur} p={[s * 0.15, 0.47, 0.06]} s={0.2} outline />)}</>
    case 'duck':
      return <B g={sphere} color={fur} p={[0, 0.58, -0.02]} s={[0.1, 0.14, 0.1]} />
  }
}

function HatPart({ look }: { look: Look }) {
  const c = look.hatColor
  switch (look.hat) {
    case 'straw':
      return <group position={[0, 0.54, 0]}><B g={cyl} color={c} s={[0.82, 0.03, 0.82]} outline /><B g={cyl} color={c} p={[0, 0.07, 0]} s={[0.42, 0.13, 0.42]} /><B g={cyl} color={C.roofCoral} p={[0, 0.03, 0]} s={[0.43, 0.04, 0.43]} /></group>
    case 'cap':
      return <group position={[0, 0.5, 0.02]}><B g={sphere} color={c} s={[0.6, 0.28, 0.56]} outline /><B g={cyl} color={c} p={[0, -0.04, 0.24]} s={[0.36, 0.03, 0.26]} /></group>
    case 'beanie':
      return <group position={[0, 0.49, 0]}><B g={sphere} color={c} s={[0.64, 0.34, 0.6]} outline /><B g={sphere} color={C.frame} p={[0, 0.17, 0]} s={0.1} /></group>
    case 'bandana':
      return <B g={sphere} color={c} p={[0, 0.44, -0.02]} s={[0.66, 0.34, 0.6]} outline />
    case 'beret':
      return <B g={sphere} color={c} p={[0.04, 0.55, 0]} r={[0, 0, -0.25]} s={[0.56, 0.14, 0.52]} outline />
    case 'flower':
      return <group position={[0.2, 0.47, 0.1]}>{[0, 1, 2, 3, 4].map(i => <B key={i} g={sphere} color={c} p={[Math.cos(i * 1.26) * 0.06, Math.sin(i * 1.26) * 0.06, 0]} s={0.07} />)}<B g={sphere} color={C.flowerYellow} s={0.05} /></group>
    case 'leaf':
      return <B g={sphere} color={c} p={[0, 0.58, 0]} r={[0.3, 0, 0.5]} s={[0.12, 0.04, 0.26]} />
    default:
      return null
  }
}
