import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { C, TERRAIN_ACCENT } from './palette'
import type { RoadPath } from './layout'
import { moundGeometry, rimGeometry, RIDGE_SINK, type Relief } from './relief'
import { ribbonGeometry, slabGeometry } from './shapes'
import { toon, flat, geo, rng } from './toon'
import { useCozy } from './ctx'
import { StaticBatch } from './batch'

/** The diorama base: grass top with soil sides. */
export function Slab({ bounds }: { bounds: [number, number, number, number] }) {
  const g = useMemo(() => slabGeometry(bounds[0], bounds[1], bounds[2], bounds[3], 2.6, 4), [bounds])
  const mats = useMemo(() => [toon(C.grass), toon(C.soil)], [])
  return <mesh geometry={g} material={mats} receiveShadow />
}

/** Paved paths between towns, edged in the road's terrain colour. */
export function Roads({ roads }: { roads: RoadPath[] }) {
  const geos = useMemo(() => roads.map(r => ({
    key: r.key,
    edge: ribbonGeometry(r.points, 1.75, 0.035),
    top: ribbonGeometry(r.points, 1.25, 0.05),
    accent: TERRAIN_ACCENT[r.terrain] ?? C.pathEdge,
    stones: r.points.filter((_, i) => i % 3 === 1),
  })), [roads])
  useEffect(() => () => geos.forEach(g => { g.edge.dispose(); g.top.dispose() }), [geos])
  const pebble = geo('pebble', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 7))
  return (
    <StaticBatch deps={[geos]} castShadow={false}>
      {geos.map(g => (
        <group key={g.key}>
          <mesh geometry={g.edge} material={toon(g.accent)} receiveShadow />
          <mesh geometry={g.top} material={toon(C.path)} receiveShadow />
          {g.stones.map((p, i) => (
            <mesh key={i} geometry={pebble} material={toon(C.pathEdge)} position={[p.x, p.y + 0.07, p.z]} scale={[0.32, 0.03, 0.22]} rotation={[0, i, 0]} />
          ))}
        </group>
      ))}
    </StaticBatch>
  )
}

/** The lie of the land: rises under hill and mountain towns, and ridges round valleys. */
export function Land({ relief }: { relief: Relief }) {
  const mounds = useMemo(() => relief.mounds.map(m => ({ m, g: moundGeometry(m) })), [relief])
  const rims = useMemo(() => relief.rims.map(m => ({ m, g: rimGeometry(m) })), [relief])
  useEffect(() => () => { mounds.forEach(x => x.g.dispose()); rims.forEach(x => x.g.dispose()) }, [mounds, rims])
  const sphere = geo('ridge', () => new THREE.SphereGeometry(1, 28, 16))
  return (
    <StaticBatch deps={[relief]}>
      {mounds.map(({ m, g }) => (
        <group key={m.town} position={[m.x, 0, m.z]}>
          <mesh geometry={g} material={toon(m.rocky ? C.rock : C.grass)} receiveShadow castShadow />
          {/* a grassy cap on the rocky plateau, so the town doesn't sit on bare stone */}
          {m.rocky && <mesh geometry={geo(`cap${m.top}`, () => new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2))} material={toon(C.grassDark)} position={[0, m.h + 0.01, 0]} scale={m.top * 0.97} receiveShadow />}
        </group>
      ))}
      {rims.map(({ m, g }) => <mesh key={m.town} geometry={g} material={toon(C.grassDark)} position={[m.x, 0, m.z]} receiveShadow castShadow />)}
      {relief.ridges.map((r, i) => (
        <mesh key={i} geometry={sphere} material={toon(r.color)} position={[r.x, -RIDGE_SINK * r.h, r.z]} rotation={[0, r.rot, 0]} scale={[r.rx, r.h, r.rz]} receiveShadow castShadow />
      ))}
    </StaticBatch>
  )
}

/** Soft clouds drifting around the diorama like the reference's background. */
export function Clouds({ bounds }: { bounds: [number, number, number, number] }) {
  const { low, reducedMotion } = useCozy()
  const group = useRef<THREE.Group>(null)
  const clouds = useMemo(() => {
    const r = rng(99)
    const [minX, minZ, maxX, maxZ] = bounds
    const spots: [number, number, number][] = [
      [minX - 6, -4, minZ + 4], [maxX + 4, -3, minZ - 2], [minX + 6, -5, maxZ + 6],
      [maxX + 7, -6, maxZ - 2], [(minX + maxX) / 2, -7, maxZ + 9], [minX - 9, -6, (minZ + maxZ) / 2],
    ]
    return spots.map(([x, y, z]) => ({
      x, y, z,
      puffs: Array.from({ length: 4 }, (_, i) => [(i - 1.5) * 2.2 + r(), r() * 0.8, r() * 1.4, 2 + r() * 1.6] as [number, number, number, number]),
    }))
  }, [bounds])
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    group.current.children.forEach((c, i) => { c.position.x = clouds[i].x + Math.sin(clock.elapsedTime * 0.05 + i) * 2.5 })
  })
  if (low) return null
  const mat = flat(C.cloud, 0.92)
  const sphere = geo('cloud', () => new THREE.SphereGeometry(1, 14, 10))
  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]}>
          {c.puffs.map(([x, y, z, s], j) => <mesh key={j} geometry={sphere} material={mat} position={[x, y, z]} scale={[s, s * 0.6, s * 0.8]} />)}
        </group>
      ))}
    </group>
  )
}
