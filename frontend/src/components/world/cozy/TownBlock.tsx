import { useMemo } from 'react'
import { Instances, Instance } from '@react-three/drei'
import * as THREE from 'three'
import { C, TERRAIN_ACCENT, TERRAIN_GROUND } from './palette'
import { PLAZA, PLAZA_H, TOWN_SCALE, type Spot, type XZ } from './layout'
import { blobGeometry, ribbonGeometry } from './shapes'
import { toon, hashString, rng } from './toon'
import {
  Part, House, type HouseProps, MarketStall, Lamp, PowerPole, Wires, Bench, Planter, Fence,
  Spinner, Bob, Beacon, Smoke, type V3,
} from './props'
import { G } from './geometries'
import { useCozy } from './ctx'
import { StaticBatch } from './batch'

export interface TownBlockProps {
  name: string
  terrain: string
  center: XZ
  spots: Spot[]
  stock?: number
  hovered: boolean
  onHover: (name: string | null) => void
  onClick: (name: string) => void
}

type Theme = { a: Partial<HouseProps>; b: Partial<HouseProps> }
const THEMES: Record<string, Theme> = {
  RIVER: { a: { wall: C.wallPeach, roof: C.roofTeal, awning: C.roofCoral }, b: { wall: C.wallCream, roof: C.roofCoral, chimney: true } },
  FOREST: { a: { wall: C.wood, roof: C.roofBrown, logs: true, chimney: true }, b: { wall: C.wallSage, roof: C.roofBrown } },
  HILLS: { a: { wall: C.wallCream, roof: C.roofTeal }, b: { wall: C.wallPeach, roof: C.roofCoral, awning: C.roofTeal } },
  MOUNTAINS: { a: { wall: C.wallCream, roof: C.roofSnow, chimney: true }, b: { wall: C.wallTan, roof: C.roofSnow, logs: true } },
  PLAINS: { a: { wall: C.wallPeach, roof: C.roofRed }, b: { wall: C.wallCream, roof: C.roofTan, awning: C.treeOrange } },
  COAST: { a: { wall: C.wallCream, roof: C.roofTeal, awning: C.roofTeal }, b: { wall: C.wallSage, roof: C.roofCoral } },
  MARSH: { a: { wall: C.wallSage, roof: C.roofTan, roofType: 'shed' }, b: { wall: C.wallTan, roof: C.roofBrown } },
  DESERT: { a: { wall: C.wallAdobe, roof: C.wallTan, roofType: 'flat', awning: C.roofCoral }, b: { wall: C.wallCream, roof: C.wallAdobe, roofType: 'flat', awning: C.treeYellow } },
}

export function TownBlock(p: TownBlockProps) {
  const { name, terrain, center, spots, stock, hovered, onHover, onClick } = p
  const { low } = useCozy()
  const t = THEMES[terrain] ? terrain : 'PLAINS' // safe default for unknown terrains
  const theme = THEMES[t]
  const accent = TERRAIN_ACCENT[t]
  const apron = useMemo(() => blobGeometry(PLAZA * 0.95, hashString(name)), [name])
  const H = PLAZA_H

  return (
    <group position={[center[0], 0, center[1]]} scale={TOWN_SCALE}>
      <StaticBatch deps={[name, t, spots, low]}>
      {/* terrain tint around the plaza */}
      <mesh geometry={apron} material={toon(TERRAIN_GROUND[t])} position={[0, 0.015, 0]} receiveShadow />

      {/* plaza (hover/click target) */}
      <group
        onPointerOver={e => { e.stopPropagation(); onHover(name); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { onHover(null); document.body.style.cursor = '' }}
        onClick={e => { e.stopPropagation(); onClick(name) }}
      >
        <Part color={C.curb} position={[0, 0.05, 0]} scale={[PLAZA + 0.35, 0.1, PLAZA + 0.35]} receive />
        <Part color={C.sidewalk} position={[0, H / 2 + 0.04, 0]} scale={[PLAZA, H, PLAZA]} receive outline />
        {/* lawn corners like little front gardens */}
        <Part color={C.grass} position={[-2.75, H + 0.07, 2.75]} scale={[1.3, 0.14, 1.3]} receive />
        <Part color={C.grass} position={[2.75, H + 0.07, -0.1]} scale={[1.3, 0.14, 1.6]} receive />
      </group>

      <group position={[0, H, 0]}>
        <House position={[-1.75, 0, -2.0]} w={2.6} d={2.2} h={1.7} {...theme.a} />
        <House position={[1.85, 0, -2.15]} w={2.3} d={1.9} h={1.45} {...theme.b} />
        {theme.a.chimney && !theme.a.logs && <Smoke position={[-1.1, 3.1, -2.3]} />}
        {theme.a.logs && <Smoke position={[-1.1, 3.0, -2.3]} />}
        <MarketStall position={[0.1, 0, -0.15]} accent={accent} stock={stock} />
        <Lamp position={[3.3, 0, 3.3]} />
        <Lamp position={[-3.15, 0, -0.6]} />
        <Bench position={[2.75, 0.14, 0.2]} rotationY={-Math.PI / 2} />
        <Planter position={[3.1, 0, -3.1]} color={C.treeGreen} />
        <Fence from={[-3.4, 0.14, 3.4]} to={[-2.1, 0.14, 3.4]} />
        <PowerPole position={[-3.25, 0, 3.25]} />
      </group>
      <PowerPole position={[-5.6, 0, 1.4]} />
      <Wires poles={[[-3.25, H, 3.25], [-5.6, 0, 1.4]]} />

      {spots.length > 0 && <Landmarks terrain={t} spots={spots} seed={hashString(name)} />}
      </StaticBatch>
      {/* hover ring (kept out of the batch so it can toggle) */}
      {hovered && <Part color={accent} position={[0, 0.03, 0]} scale={[PLAZA + 0.7, 0.06, PLAZA + 0.7]} shadow={false} />}

    </group>
  )
}

// ---------------------------------------------------------------------------
// Terrain landmarks (local coords; spots come from layout.landmarkSpots)

function Landmarks({ terrain, spots, seed }: { terrain: string; spots: Spot[]; seed: number }) {
  const s0 = spots[0], s1 = spots[1], s2 = spots[2]
  switch (terrain) {
    case 'RIVER': return <River spot={s0} />
    case 'FOREST': return <Cabin at={s0} />
    case 'HILLS': return <>{s0 && <Windmill at={s0} />}{s1 && <Pasture at={s1} seed={seed} />}</>
    case 'MOUNTAINS': return <>{spots.map((s, i) => <Peak key={i} at={s} big={i === 0} />)}</>
    case 'PLAINS': return <>{s0 && <Barn at={s0} />}{s1 && <Wheat at={s1} seed={seed} />}{s2 && <Wheat at={s2} seed={seed + 1} scarecrow />}</>
    case 'COAST': return <>{s0 && <Harbour at={s0} />}{s1 && <Lighthouse at={s1} />}</>
    case 'MARSH': return <>{s0 && <Pond at={s0} seed={seed} boardwalk />}{s1 && <StiltHut at={s1} />}{s2 && <Pond at={s2} seed={seed + 7} />}</>
    case 'DESERT': return <>{s0 && <Dunes at={s0} seed={seed} />}{s1 && <Cacti at={s1} seed={seed + 3} />}</>
    default: return null
  }
}

const P = (s: Spot, y = 0): V3 => [s.x, y, s.z]

function River({ spot }: { spot: Spot }) {
  const pts = useMemo(() => {
    const out: THREE.Vector3[] = []
    for (let i = 0; i <= 24; i++) {
      const a = spot.angle - 0.75 + (i / 24) * 1.5
      const r = 6.3 + Math.sin(i * 0.6) * 0.35
      out.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r))
    }
    return out
  }, [spot])
  const bank = useMemo(() => ribbonGeometry(pts, 2.5, 0.03), [pts])
  const water = useMemo(() => ribbonGeometry(pts, 1.7, 0.06), [pts])
  const mid = pts[12]
  const inward = new THREE.Vector3(-mid.x, 0, -mid.z).normalize()
  const mill = mid.clone().addScaledVector(inward, 2.1)
  return (
    <group>
      <mesh geometry={bank} material={toon(C.sandDark)} receiveShadow />
      <mesh geometry={water} material={toon(C.water)} />
      <House position={[mill.x, 0, mill.z]} w={1.8} d={1.6} h={1.3} wall={C.wallCream} roof={C.roofBrown} flowers={false} />
      <Spinner position={[mill.x - inward.x * 1.05, 0.9, mill.z - inward.z * 1.05]} rotation={[0, Math.atan2(inward.x, inward.z), 0]} speed={0.9}>
        <Part shape="cyl" color={C.wood} rotation={[Math.PI / 2, 0, 0]} scale={[1.5, 0.18, 1.5]} outline />
        {[0, 1, 2, 3].map(i => <Part key={i} color={C.woodDark} rotation={[0, 0, (i * Math.PI) / 4]} scale={[1.7, 0.12, 0.22]} />)}
      </Spinner>
      {[4, 9, 16, 20].map(i => (
        <group key={i} position={[pts[i].x, 0, pts[i].z]}>
          {[-0.12, 0, 0.12].map(o => <Part key={o} shape="cyl" color={C.reed} position={[o + 0.95, 0.35, o]} scale={[0.04, 0.7 + o, 0.04]} shadow={false} />)}
        </group>
      ))}
      {[7, 14].map(i => (
        <Bob key={i} position={[pts[i].x, 0.12, pts[i].z]} amp={0.03}>
          <Part shape="sphere" color="#ffffff" scale={[0.3, 0.22, 0.4]} />
          <Part shape="sphere" color="#ffffff" position={[0, 0.17, 0.14]} scale={0.18} />
          <Part shape="sphere" color={C.treeOrange} position={[0, 0.15, 0.26]} scale={[0.07, 0.04, 0.1]} shadow={false} />
        </Bob>
      ))}
    </group>
  )
}

function Cabin({ at }: { at?: Spot }) {
  if (!at) return null
  return (
    <group position={P(at)}>
      <House position={[0, 0, 0]} w={2} d={1.8} h={1.3} wall={C.wood} roof={C.woodDark} logs chimney flowers={false} />
      <Smoke position={[0.5, 2.6, -0.3]} />
      <Part shape="cyl" color={C.woodDark} position={[1.4, 0.2, 0.9]} rotation={[0, 0, Math.PI / 2]} scale={[0.35, 0.8, 0.35]} />
    </group>
  )
}

function Windmill({ at }: { at: Spot }) {
  return (
    <group position={P(at)}>
      <mesh geometry={G.cyl()} material={toon(C.wallCream)} position={[0, 1.3, 0]} scale={[1.2, 2.6, 1.2]} castShadow />
      <Part shape="cone" color={C.roofCoral} position={[0, 3.0, 0]} scale={[1.5, 0.9, 1.5]} outline />
      <Part color={C.door} position={[0, 0.4, 0.61]} scale={[0.4, 0.7, 0.04]} shadow={false} />
      <Spinner position={[0.35, 2.4, 0.62]} rotation={[0, Math.PI / 4, 0]} speed={0.7}>
        {[0, 1, 2, 3].map(i => (
          <group key={i} rotation={[0, 0, (i * Math.PI) / 2]}>
            <Part color={C.wood} position={[0, 0.85, 0]} scale={[0.08, 1.7, 0.05]} />
            <Part color={C.frame} position={[0.18, 1.0, 0]} scale={[0.32, 1.25, 0.03]} outline />
          </group>
        ))}
        <Part shape="sphere" color={C.woodDark} scale={0.22} />
      </Spinner>
    </group>
  )
}

function Pasture({ at, seed }: { at: Spot; seed: number }) {
  const r = rng(seed)
  return (
    <group position={P(at)}>
      <Part shape="sphere" color={C.grassDark} position={[-0.6, -0.3, -0.5]} scale={[3.2, 1.6, 2.6]} receive />
      <Part shape="sphere" color={C.grass} position={[0.9, -0.35, 0.4]} scale={[2.4, 1.2, 2]} receive />
      {[0, 1, 2].map(i => {
        const x = (r() - 0.5) * 2.2, z = (r() - 0.5) * 1.6
        return (
          <group key={i} position={[x, 0.35, z]} rotation={[0, r() * 6, 0]}>
            <Part shape="sphere" color="#ffffff" scale={[0.55, 0.42, 0.42]} />
            <Part shape="sphere" color={C.outline} position={[0.3, 0.06, 0]} scale={[0.22, 0.22, 0.2]} />
            {[-0.15, 0.15].map(lx => <Part key={lx} color={C.outline} position={[lx, -0.24, 0.1]} scale={[0.06, 0.18, 0.06]} shadow={false} />)}
          </group>
        )
      })}
      <Fence from={[-1.8, 0, 1.4]} to={[1.6, 0, 1.6]} color={C.rock} />
    </group>
  )
}

function Peak({ at, big }: { at: Spot; big?: boolean }) {
  const s = big ? 1.25 : 0.95
  return (
    <group position={P(at)}>
      <Part shape="cone" color={C.rock} position={[0, 1.9 * s, 0]} scale={[3.6 * s, 3.8 * s, 3.6 * s]} outline />
      <Part shape="cone" color={C.snow} position={[0, 3.15 * s, 0]} scale={[1.55 * s, 1.35 * s, 1.55 * s]} />
      <Part shape="blob" color={C.rockDark} position={[1.4 * s, 0.25, 1.0 * s]} scale={0.7} />
      <Part shape="blob" color={C.snow} position={[-1.2 * s, 0.15, 1.3 * s]} scale={[0.8, 0.3, 0.6]} />
    </group>
  )
}

function Barn({ at }: { at: Spot }) {
  return (
    <group position={P(at)}>
      <House position={[0, 0, 0]} w={2.4} d={2.4} h={1.6} wall={C.roofRed} roof={C.roofBrown} flowers={false} />
      <Part color={C.frame} position={[0.4, 0.75, 1.23]} scale={[0.9, 1.1, 0.04]} shadow={false} />
      <Part color={C.roofRed} position={[0.4, 0.75, 1.25]} rotation={[0, 0, 0.88]} scale={[1.3, 0.08, 0.03]} shadow={false} />
      <Part color={C.roofRed} position={[0.4, 0.75, 1.25]} rotation={[0, 0, -0.88]} scale={[1.3, 0.08, 0.03]} shadow={false} />
      <Part shape="cyl" color={C.wheat} position={[1.7, 0.3, 1.2]} rotation={[Math.PI / 2, 0, 0]} scale={[0.6, 0.5, 0.6]} outline />
    </group>
  )
}

function Wheat({ at, seed, scarecrow }: { at: Spot; seed: number; scarecrow?: boolean }) {
  const { low } = useCozy()
  const stalks = useMemo(() => {
    const r = rng(seed)
    const out: V3[] = []
    for (let i = -3; i <= 3; i++) for (let j = -2; j <= 2; j++) out.push([i * 0.42 + (r() - 0.5) * 0.1, 0.32, j * 0.48 + (r() - 0.5) * 0.1])
    return out
  }, [seed])
  return (
    <group position={P(at)}>
      <Part color={C.soil} position={[0, 0.04, 0]} scale={[3.3, 0.08, 2.6]} receive />
      <Instances geometry={G.box()} material={toon(C.wheat)} limit={stalks.length} castShadow={!low}>
        {stalks.map((s, i) => <Instance key={i} position={s} scale={[0.14, 0.6, 0.14]} />)}
      </Instances>
      {scarecrow && (
        <group position={[0.2, 0, 0.1]}>
          <Part color={C.wood} position={[0, 0.8, 0]} scale={[0.08, 1.6, 0.08]} />
          <Part color={C.wood} position={[0, 1.15, 0]} scale={[0.9, 0.07, 0.07]} />
          <Part color={C.roofTeal} position={[0, 1.05, 0]} scale={[0.4, 0.45, 0.22]} outline />
          <Part shape="sphere" color={C.wallTan} position={[0, 1.5, 0]} scale={0.32} />
          <Part shape="cone" color={C.wheat} position={[0, 1.72, 0]} scale={[0.6, 0.25, 0.6]} />
        </group>
      )}
    </group>
  )
}

function Harbour({ at }: { at: Spot }) {
  const sea = useMemo(() => blobGeometry(3.4, 77, 0.2), [])
  const foam = useMemo(() => blobGeometry(3.75, 77, 0.2), [])
  const inward = new THREE.Vector3(-at.x, 0, -at.z).normalize()
  const ang = Math.atan2(inward.x, inward.z)
  return (
    <group position={P(at)}>
      <mesh geometry={foam} material={toon(C.foam)} position={[0, 0.025, 0]} />
      <mesh geometry={sea} material={toon(C.water)} position={[0, 0.04, 0]} />
      <group rotation={[0, ang, 0]}>
        {/* dock from shore into the water */}
        {Array.from({ length: 6 }, (_, i) => <Part key={i} color={C.wood} position={[0, 0.16, 2.6 - i * 0.42]} scale={[1.0, 0.07, 0.36]} />)}
        {[0.5, -0.5].map(x => [2.4, 1.2, 0].map(z => <Part key={`${x}${z}`} shape="cyl" color={C.woodDark} position={[x, 0.1, z]} scale={[0.1, 0.5, 0.1]} />))}
        <Bob position={[1.3, 0.12, 0.6]} amp={0.06}>
          <Part shape="sphere" color={C.roofCoral} scale={[0.75, 0.38, 1.5]} outline />
          <Part color={C.frame} position={[0, 0.2, 0]} scale={[0.5, 0.06, 1.0]} />
          <Part color={C.wood} position={[0, 0.75, 0]} scale={[0.05, 1.1, 0.05]} />
          <Part color={C.frame} position={[0, 0.85, 0.22]} rotation={[0, Math.PI / 2, 0]} scale={[0.5, 0.7, 0.03]} />
        </Bob>
      </group>
    </group>
  )
}

function Lighthouse({ at }: { at: Spot }) {
  return (
    <group position={P(at)}>
      <Part shape="blob" color={C.rock} position={[0, 0.15, 0]} scale={[2.0, 0.7, 1.8]} outline />
      {[0, 1, 2, 3].map(i => <Part key={i} shape="cyl" color={i % 2 ? C.roofRed : C.frame} position={[0, 0.7 + i * 0.6, 0]} scale={[0.9 - i * 0.08, 0.6, 0.9 - i * 0.08]} outline={i === 0} />)}
      <Part shape="cyl6" color={C.woodDark} position={[0, 3.25, 0]} scale={[0.85, 0.12, 0.85]} />
      <Beacon position={[0, 3.6, 0]} />
      <Part shape="cone" color={C.roofRed} position={[0, 4.1, 0]} scale={[0.85, 0.6, 0.85]} outline />
    </group>
  )
}

function Pond({ at, seed, boardwalk }: { at: Spot; seed: number; boardwalk?: boolean }) {
  const pond = useMemo(() => blobGeometry(1.7, seed, 0.25), [seed])
  const r = rng(seed)
  return (
    <group position={P(at)}>
      <mesh geometry={pond} material={toon(C.waterDeep)} position={[0, 0.04, 0]} />
      {[0, 1, 2].map(i => <Part key={i} shape="cyl" color={C.treeGreen} position={[(r() - 0.5) * 2, 0.07, (r() - 0.5) * 2]} scale={[0.42, 0.02, 0.42]} shadow={false} />)}
      <Part shape="sphere" color={C.flowerPink} position={[0.4, 0.12, -0.3]} scale={0.14} shadow={false} />
      {[0, 1, 2, 3, 4].map(i => {
        const a = r() * 6.28
        return <Part key={`r${i}`} shape="cyl" color={C.reed} position={[Math.cos(a) * 1.7, 0.4, Math.sin(a) * 1.7]} scale={[0.05, 0.8, 0.05]} shadow={false} />
      })}
      {boardwalk && Array.from({ length: 7 }, (_, i) => <Part key={`b${i}`} color={C.wood} position={[-1.5 + i * 0.5, 0.18, 0.2]} scale={[0.4, 0.07, 0.9]} />)}
    </group>
  )
}

function StiltHut({ at }: { at: Spot }) {
  return (
    <group position={P(at)}>
      {[[-0.6, -0.5], [0.6, -0.5], [-0.6, 0.5], [0.6, 0.5]].map(([x, z]) => <Part key={`${x}${z}`} shape="cyl" color={C.woodDark} position={[x, 0.3, z]} scale={[0.12, 0.6, 0.12]} />)}
      <House position={[0, 0.5, 0]} w={1.7} d={1.5} h={1.1} wall={C.wallTan} roof={C.roofTan} roofType="shed" flowers={false} />
    </group>
  )
}

function Dunes({ at, seed }: { at: Spot; seed: number }) {
  const r = rng(seed)
  return (
    <group position={P(at)}>
      <Part shape="sphere" color={C.sand} position={[0, -0.4, 0]} scale={[3.6, 1.6, 2.6]} receive />
      <Part shape="sphere" color={C.sandDark} position={[1.4, -0.45, 1.0]} scale={[2.2, 1.1, 1.8]} receive />
      <Cactus position={[(r() - 0.5) * 1.6, 0.25, 1.3]} />
    </group>
  )
}

function Cacti({ at, seed }: { at: Spot; seed: number }) {
  const r = rng(seed)
  return (
    <group position={P(at)}>
      {[0, 1, 2].map(i => <Cactus key={i} position={[(r() - 0.5) * 2.6, 0, (r() - 0.5) * 2.2]} scale={0.8 + r() * 0.5} />)}
      <Part shape="blob" color={C.rockDark} position={[0.9, 0.15, -0.6]} scale={[0.7, 0.45, 0.6]} />
    </group>
  )
}

function Cactus({ position, scale = 1 }: { position: V3; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <Part shape="cyl" color={C.cactus} position={[0, 0.65, 0]} scale={[0.36, 1.3, 0.36]} outline />
      <Part shape="sphere" color={C.cactus} position={[0, 1.3, 0]} scale={0.36} />
      <Part shape="cyl" color={C.cactus} position={[0.32, 0.75, 0]} rotation={[0, 0, -0.2]} scale={[0.2, 0.55, 0.2]} />
      <Part shape="sphere" color={C.flowerPink} position={[0, 1.5, 0]} scale={0.12} shadow={false} />
    </group>
  )
}
