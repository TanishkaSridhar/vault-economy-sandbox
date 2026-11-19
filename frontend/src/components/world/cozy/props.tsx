import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Instances, Instance, Line } from '@react-three/drei'
import * as THREE from 'three'
import { C } from './palette'
import { toon, flat, geo } from './toon'
import { G } from './geometries'
import { StaticBatch } from './batch'

export type V3 = [number, number, number]

import { useCozy } from './ctx'

// ---------- shared geometries ----------

/** A toon-shaded mesh with an optional hand-drawn outline. */
export function Part({
  shape = 'box', color, position, rotation, scale, outline = false, shadow = true, receive = false, opacity, emissive, geometry, children,
}: {
  shape?: keyof typeof G; color: string; position?: V3; rotation?: V3; scale?: V3 | number
  outline?: boolean; shadow?: boolean; receive?: boolean; opacity?: number; emissive?: string
  geometry?: THREE.BufferGeometry; children?: ReactNode
}) {
  const { low } = useCozy()
  return (
    <mesh
      geometry={geometry ?? G[shape]()}
      material={toon(color, { opacity, emissive, emissiveIntensity: emissive ? 0.9 : 0 })}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow={shadow && !low}
      receiveShadow={receive && !low}
      userData={{ outline: outline && !low }}
    >
      {children}
    </mesh>
  )
}

// ---------- buildings ----------
function gableGeometry(w: number, rise: number, d: number) {
  return geo(`gable|${w}|${rise}|${d}`, () => {
    const s = new THREE.Shape()
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, rise); s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false })
    g.translate(0, 0, -d / 2)
    g.computeVertexNormals()
    return g
  })
}

export interface HouseProps {
  position: V3
  rotationY?: number
  w?: number; d?: number; h?: number
  wall?: string; roof?: string
  roofType?: 'gable' | 'flat' | 'shed'
  awning?: string
  chimney?: boolean
  flowers?: boolean
  logs?: boolean
}

/** A small house. Doors and windows face +z and +x (the faces the camera sees). */
export function House({
  position, rotationY = 0, w = 2.4, d = 2.2, h = 1.6, wall = C.wallPeach, roof = C.roofCoral,
  roofType = 'gable', awning, chimney = false, flowers = true, logs = false,
}: HouseProps) {
  const rise = w * 0.42
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* foundation + walls */}
      <Part color={C.curb} position={[0, 0.06, 0]} scale={[w + 0.2, 0.12, d + 0.2]} receive />
      <Part color={wall} position={[0, 0.12 + h / 2, 0]} scale={[w, h, d]} outline receive />
      {logs && [0.3, 0.7, 1.1, 1.5].filter(y => y < h).map(y => (
        <Part key={y} shape="cyl" color={C.woodDark} position={[0, 0.12 + y, d / 2 + 0.01]} rotation={[0, 0, Math.PI / 2]} scale={[0.07, w + 0.05, 0.07]} shadow={false} />
      ))}
      {/* roof */}
      {roofType === 'gable' && (
        <group position={[0, 0.12 + h, 0]} rotation={[0, Math.PI / 2, 0]}>
          <Part color={roof} geometry={gableGeometry(d + 0.5, rise, w + 0.35)} outline />
        </group>
      )}
      {roofType === 'flat' && <Part color={roof} position={[0, 0.12 + h + 0.08, 0]} scale={[w + 0.3, 0.16, d + 0.3]} outline />}
      {roofType === 'shed' && <Part color={roof} position={[0, 0.12 + h + 0.25, 0]} rotation={[0.28, 0, 0]} scale={[w + 0.35, 0.12, d + 0.5]} outline />}
      {chimney && <Part color={C.rockDark} position={[w * 0.25, 0.12 + h + rise * 0.6, -d * 0.15]} scale={[0.3, 0.7, 0.3]} outline />}
      {/* door (+z) */}
      <Part color={C.frame} position={[-w * 0.22, 0.12 + 0.42, d / 2 + 0.02]} scale={[0.56, 0.86, 0.04]} shadow={false} />
      <Part color={C.door} position={[-w * 0.22, 0.12 + 0.4, d / 2 + 0.05]} scale={[0.44, 0.78, 0.04]} shadow={false} />
      {/* windows: front and side */}
      <Window position={[w * 0.2, 0.12 + h * 0.58, d / 2 + 0.03]} />
      <Window position={[w / 2 + 0.03, 0.12 + h * 0.58, 0]} rotationY={Math.PI / 2} />
      {awning && <Awning position={[w * 0.2, 0.12 + h * 0.58 + 0.42, d / 2 + 0.25]} color={awning} width={0.9} />}
      {flowers && <FlowerBox position={[w * 0.2, 0.12 + h * 0.58 - 0.33, d / 2 + 0.12]} />}
    </group>
  )
}

function Window({ position, rotationY = 0 }: { position: V3; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Part color={C.frame} scale={[0.62, 0.56, 0.05]} shadow={false} />
      <Part color={C.window} position={[0, 0, 0.03]} scale={[0.48, 0.42, 0.03]} shadow={false} />
      <Part color={C.frame} position={[0, 0, 0.05]} scale={[0.05, 0.42, 0.02]} shadow={false} />
    </group>
  )
}

export function Awning({ position, color, width = 1 }: { position: V3; color: string; width?: number }) {
  const stripes = 5
  return (
    <group position={position} rotation={[0.45, 0, 0]}>
      {Array.from({ length: stripes }, (_, i) => (
        <Part key={i} color={i % 2 ? C.frame : color} position={[(i - (stripes - 1) / 2) * (width / stripes), 0, 0]} scale={[width / stripes, 0.05, 0.5]} />
      ))}
    </group>
  )
}

function FlowerBox({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <Part color={C.wood} scale={[0.66, 0.12, 0.16]} shadow={false} />
      {[-0.2, 0, 0.2].map((x, i) => (
        <Part key={x} shape="sphere" color={[C.flowerRed, C.flowerPink, C.flowerYellow][i]} position={[x, 0.1, 0]} scale={0.13} shadow={false} />
      ))}
    </group>
  )
}

// ---------- street furniture ----------
export function Lamp({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <Part shape="cyl" color={C.woodDark} position={[0, 0.75, 0]} scale={[0.07, 1.5, 0.07]} />
      <Part shape="cyl6" color={C.woodDark} position={[0, 1.55, 0]} scale={[0.26, 0.08, 0.26]} />
      <Part shape="sphere" color={C.lampGlow} emissive={C.lampGlow} position={[0, 1.42, 0]} scale={0.2} shadow={false} />
    </group>
  )
}

export function PowerPole({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <Part shape="cyl" color={C.pole} position={[0, 1.4, 0]} scale={[0.1, 2.8, 0.1]} outline />
      <Part color={C.pole} position={[0, 2.55, 0]} scale={[0.9, 0.08, 0.08]} />
      <Part color={C.pole} position={[0, 2.3, 0]} scale={[0.7, 0.07, 0.07]} />
      {[-0.38, 0.38].map(x => <Part key={x} shape="cyl" color={C.metal} position={[x, 2.66, 0]} scale={[0.05, 0.12, 0.05]} shadow={false} />)}
    </group>
  )
}

/** Sagging wires between consecutive pole tops. */
export function Wires({ poles }: { poles: V3[] }) {
  const lines = useMemo(() => {
    const out: THREE.Vector3[][] = []
    for (let i = 0; i < poles.length - 1; i++) for (const dx of [-0.38, 0.38]) {
      const a = new THREE.Vector3(poles[i][0] + dx, poles[i][1] + 2.68, poles[i][2])
      const b = new THREE.Vector3(poles[i + 1][0] + dx, poles[i + 1][1] + 2.68, poles[i + 1][2])
      const pts: THREE.Vector3[] = []
      for (let t = 0; t <= 1.0001; t += 0.1) {
        const p = a.clone().lerp(b, t)
        p.y -= Math.sin(t * Math.PI) * 0.35
        pts.push(p)
      }
      out.push(pts)
    }
    return out
  }, [poles])
  return <>{lines.map((pts, i) => <Line key={i} points={pts} color={C.wire} lineWidth={1.2} />)}</>
}

export function Bench({ position, rotationY = 0 }: { position: V3; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Part color={C.wood} position={[0, 0.32, 0]} scale={[1.1, 0.08, 0.36]} outline />
      <Part color={C.wood} position={[0, 0.58, -0.16]} scale={[1.1, 0.3, 0.06]} />
      {[-0.45, 0.45].map(x => <Part key={x} color={C.woodDark} position={[x, 0.16, 0]} scale={[0.08, 0.32, 0.3]} />)}
    </group>
  )
}

export function Planter({ position, color = C.bush }: { position: V3; color?: string }) {
  return (
    <group position={position}>
      <Part color={C.wood} position={[0, 0.18, 0]} scale={[0.6, 0.36, 0.6]} outline />
      <Part shape="sphere" color={color} position={[0, 0.5, 0]} scale={[0.62, 0.5, 0.62]} />
      <Part shape="sphere" color={C.flowerRed} position={[0.15, 0.7, 0.12]} scale={0.12} shadow={false} />
      <Part shape="sphere" color={C.flowerYellow} position={[-0.12, 0.66, 0.18]} scale={0.1} shadow={false} />
    </group>
  )
}

export function Fence({ from, to, color = C.frame }: { from: V3; to: V3; color?: string }) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to)
  const len = a.distanceTo(b)
  const mid = a.clone().lerp(b, 0.5)
  const angle = Math.atan2(b.x - a.x, b.z - a.z)
  const posts = Math.max(2, Math.round(len / 0.6) + 1)
  return (
    <group position={[mid.x, mid.y, mid.z]} rotation={[0, angle, 0]}>
      {[0.22, 0.42].map(y => <Part key={y} color={color} position={[0, y, 0]} scale={[0.05, 0.06, len]} shadow={false} />)}
      {Array.from({ length: posts }, (_, i) => (
        <Part key={i} color={color} position={[0, 0.27, -len / 2 + (i * len) / (posts - 1)]} scale={[0.09, 0.54, 0.09]} />
      ))}
    </group>
  )
}

export function Crate({ position, color = C.wood }: { position: V3; color?: string }) {
  return <Part color={color} position={position} scale={[0.42, 0.34, 0.42]} outline />
}

/** Market stall; the produce pile grows/shrinks with the town's stock. */
export function MarketStall({ position, accent, stock = 10, rotationY = 0 }: { position: V3; accent: string; stock?: number; rotationY?: number }) {
  const count = Math.max(1, Math.min(12, Math.round(stock / 3)))
  const produce = useMemo(() => Array.from({ length: count }, (_, i) => {
    const layer = i < 6 ? 0 : i < 10 ? 1 : 2
    const idx = layer === 0 ? i : layer === 1 ? i - 6 : i - 10
    const perRow = layer === 0 ? 6 : layer === 1 ? 4 : 2
    const x = (idx - (perRow - 1) / 2) * 0.22
    return { x, y: 0.82 + layer * 0.16, z: layer * 0.04, c: i % 3 === 2 ? C.produceGreen : C.produce }
  }), [count])
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Part color={C.wood} position={[0, 0.66, 0]} scale={[1.7, 0.12, 0.8]} outline />
      <Part color={C.woodDark} position={[0, 0.33, 0]} scale={[1.5, 0.58, 0.6]} />
      {[[-0.78, -0.33], [0.78, -0.33], [-0.78, 0.33], [0.78, 0.33]].map(([x, z]) => (
        <Part key={`${x}${z}`} color={C.woodDark} position={[x, 1.05, z]} scale={[0.08, 1.4, 0.08]} />
      ))}
      <group position={[0, 1.78, 0.05]} rotation={[0.18, 0, 0]}>
        {Array.from({ length: 6 }, (_, i) => (
          <Part key={i} color={i % 2 ? C.frame : accent} position={[(i - 2.5) * 0.33, 0, 0]} scale={[0.33, 0.07, 1.15]} outline={i === 0} />
        ))}
      </group>
      <group userData={{ dynamic: true }}>
        {produce.map((p, i) => <Part key={i} shape="sphere" color={p.c} position={[p.x, p.y, p.z]} scale={0.2} shadow={false} />)}
      </group>
      <Crate position={[1.15, 0.17, 0.25]} />
      <Crate position={[-1.15, 0.17, 0.3]} color={C.wallTan} />
    </group>
  )
}

// ---------- vegetation (instanced) ----------
export interface TreeSpec { x: number; z: number; y?: number; kind: 'round' | 'pine' | 'bush'; s: number; color: string }

/** All trees of a scene drawn with a few instanced meshes. */
export function Forest({ trees }: { trees: TreeSpec[] }) {
  const { low } = useCozy()
  const round = trees.filter(t => t.kind === 'round')
  const pines = trees.filter(t => t.kind === 'pine')
  const bushes = trees.filter(t => t.kind === 'bush')
  const white = toon('#ffffff')
  const trunkMat = toon(C.trunk)
  const shadow = !low
  // three blobs per round tree, offsets in tree-local units
  const blobs: [number, number, number, number][] = [[0, 1.55, 0, 1.15], [-0.38, 1.25, 0.25, 0.85], [0.36, 1.3, -0.2, 0.9]]
  return (
    <group>
      {round.length > 0 && (
        <>
          <Instances geometry={G.cyl()} material={trunkMat} limit={round.length} castShadow={shadow}>
            {round.map((t, i) => <Instance key={i} position={[t.x, (t.y ?? 0) + 0.45 * t.s, t.z]} scale={[0.22 * t.s, 0.9 * t.s, 0.22 * t.s]} />)}
          </Instances>
          <Instances geometry={G.sphere()} material={white} limit={round.length * 3} castShadow={shadow}>
            {round.flatMap((t, i) => blobs.map(([bx, by, bz, bs], j) => (
              <Instance key={`${i}-${j}`} color={t.color} position={[t.x + bx * t.s, (t.y ?? 0) + by * t.s, t.z + bz * t.s]} scale={bs * t.s} />
            )))}
          </Instances>
        </>
      )}
      {pines.length > 0 && (
        <>
          <Instances geometry={G.cyl()} material={trunkMat} limit={pines.length} castShadow={shadow}>
            {pines.map((t, i) => <Instance key={i} position={[t.x, (t.y ?? 0) + 0.3 * t.s, t.z]} scale={[0.18 * t.s, 0.6 * t.s, 0.18 * t.s]} />)}
          </Instances>
          <Instances geometry={G.cone()} material={white} limit={pines.length * 3} castShadow={shadow}>
            {pines.flatMap((t, i) => [0, 1, 2].map(j => (
              <Instance key={`${i}-${j}`} color={t.color} position={[t.x, (t.y ?? 0) + (0.85 + j * 0.5) * t.s, t.z]} scale={[(1.25 - j * 0.3) * t.s, 0.9 * t.s, (1.25 - j * 0.3) * t.s]} />
            )))}
          </Instances>
        </>
      )}
      {bushes.length > 0 && (
        <Instances geometry={G.sphere()} material={white} limit={bushes.length} castShadow={shadow}>
          {bushes.map((t, i) => <Instance key={i} color={t.color} position={[t.x, (t.y ?? 0) + 0.25 * t.s, t.z]} scale={[0.8 * t.s, 0.6 * t.s, 0.8 * t.s]} />)}
        </Instances>
      )}
    </group>
  )
}

// ---------- small animated things ----------
/** Gentle rotation for windmills / water wheels. */
export function Spinner({ position, rotation, speed = 0.8, children }: { position?: V3; rotation?: V3; speed?: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  const { reducedMotion, low } = useCozy()
  useFrame((_, dt) => { if (ref.current && !reducedMotion && !low) ref.current.rotation.z += dt * speed })
  return <group position={position} rotation={rotation} userData={{ dynamic: true }}><group ref={ref}><StaticBatch deps={[]}>{children}</StaticBatch></group></group>
}

/** Bobbing on water (boats, ducks). */
export function Bob({ position, amp = 0.05, speed = 1.6, children }: { position?: V3; amp?: number; speed?: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  const { reducedMotion, low } = useCozy()
  const seed = ((position?.[0] ?? 0) * 7.3 + (position?.[2] ?? 0) * 3.1) % 10
  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion || low) return
    const t = clock.elapsedTime * speed + seed
    ref.current.position.y = Math.sin(t) * amp
    ref.current.rotation.z = Math.sin(t * 0.8) * amp * 0.8
  })
  return <group position={position} userData={{ dynamic: true }}><group ref={ref}><StaticBatch deps={[]}>{children}</StaticBatch></group></group>
}

/** Flashing light (lighthouse). */
export function Beacon({ position }: { position: V3 }) {
  const ref = useRef<THREE.Mesh>(null)
  const { reducedMotion } = useCozy()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const on = reducedMotion ? 1 : (Math.sin(clock.elapsedTime * 2.2) > 0.2 ? 1 : 0.25)
    ;(ref.current.material as THREE.MeshBasicMaterial).opacity = on
  })
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: C.lampGlow, transparent: true }), [])
  useEffect(() => () => mat.dispose(), [mat])
  return <mesh ref={ref} geometry={G.sphere()} material={mat} position={position} scale={0.42} userData={{ dynamic: true }} />
}

/** Puffs of chimney smoke. */
export function Smoke({ position }: { position: V3 }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const { reducedMotion, low } = useCozy()
  const mat = flat('#ffffff', 0.7)
  useFrame(({ clock }) => {
    refs.current.forEach((m, i) => {
      if (!m) return
      const t = ((reducedMotion ? 0.4 : clock.elapsedTime * 0.35) + i / 3) % 1
      m.position.set(Math.sin(t * 4 + i) * 0.12, t * 1.4, 0)
      m.scale.setScalar(0.18 + t * 0.32)
    })
  })
  if (low) return null
  return <group position={position} userData={{ dynamic: true }}>{[0, 1, 2].map(i => <mesh key={i} ref={el => { refs.current[i] = el }} geometry={G.sphere()} material={mat} />)}</group>
}


