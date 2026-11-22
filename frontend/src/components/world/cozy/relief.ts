import * as THREE from 'three'
import { TOWN_SIZE, type RoadPath, type XZ } from './layout'
import { C } from './palette'
import { rng, hashString } from './toon'

/**
 * The shape of the land, so places look like their names: Hill stands on a grassy rise,
 * Highpeak on a rocky plateau, and Valley sits in a bowl ringed by ridges.
 * Everything that stands on the ground (villagers, roads, trees, labels) asks height(x, z).
 */

/** A raised, flat-topped rise under a whole town (world units). */
export interface Mound { town: string; x: number; z: number; top: number; base: number; h: number; rocky: boolean }
/** A ring of high ground round a valley town: crest radius R, half-width w, lower on the camera side. */
export interface Rim { town: string; x: number; z: number; R: number; w: number; h: number }
/** A rounded bump of land: an ellipsoid partly sunk into the ground (world units). */
export interface Ridge { x: number; z: number; rx: number; rz: number; h: number; rot: number; color: string }

export interface Relief {
  mounds: Mound[]
  rims: Rim[]
  ridges: Ridge[]
  /** How high each town's plaza ground sits. */
  lift: (town: string) => number
  /** Ground height at a point (0 on the flat). */
  height: (x: number, z: number) => number
  /** Furthest any relief reaches from the map's towns, for sizing the base slab. */
  reach: number
}

/** How each terrain lifts its town: plateau height and how far the flat top and the foot reach. */
const RISE: Record<string, { h: number; top: number; base: number; rocky: boolean }> = {
  HILLS: { h: 1.9, top: 13.5, base: 19, rocky: false },
  MOUNTAINS: { h: 3.2, top: 14.5, base: 19.5, rocky: true },
}

const smooth = (t: number) => t * t * (3 - 2 * t)
/** Fraction of a ridge that stays above ground; the rest is sunk so it reads as land, not a ball. */
export const RIDGE_SINK = 0.4

export function moundHeight(m: Mound, x: number, z: number) {
  const d = Math.hypot(x - m.x, z - m.z)
  if (d <= m.top) return m.h
  if (d >= m.base) return 0
  return m.h * smooth(1 - (d - m.top) / (m.base - m.top))
}

const FRONT = Math.PI / 4 // +x/+z faces the camera
/** The rim keeps a fifth of its height on the side facing the camera, so the town stays in view. */
export function rimFactor(angle: number) {
  const d = angDiff(angle, FRONT) / Math.PI // 0 front .. 1 back
  return 0.2 + 0.8 * smooth(Math.min(1, d * 1.6))
}
export function rimHeight(m: Rim, x: number, z: number) {
  const dx = x - m.x, dz = z - m.z
  const t = Math.abs(Math.hypot(dx, dz) - m.R) / m.w
  if (t >= 1) return 0
  return m.h * rimFactor(Math.atan2(dz, dx)) * smooth(1 - t)
}

function ridgeHeight(r: Ridge, x: number, z: number) {
  const dx = x - r.x, dz = z - r.z
  const c = Math.cos(r.rot), s = Math.sin(r.rot)
  const u = (dx * c - dz * s) / r.rx, v = (dx * s + dz * c) / r.rz
  const q = 1 - u * u - v * v
  return q > 0 ? Math.max(0, r.h * (Math.sqrt(q) - RIDGE_SINK)) : 0
}

const angDiff = (a: number, b: number) => { const d = Math.abs(a - b) % (Math.PI * 2); return d > Math.PI ? Math.PI * 2 - d : d }

/**
 * Ridgelines in a ring around a town. Every open stretch between two roads (and away from the
 * camera-facing side) gets one long ridge, so the roads read as passes through the hills.
 */
function ringOfRidges(name: string, at: XZ, layout: Record<string, XZ>, roads: RoadPath[], radius: number, depth: number, height: number, colors: string[], skipFront: number): Ridge[] {
  const r = rng(hashString(name) + 11)
  const roadAngles = roads.filter(p => p.a === name || p.b === name).map(p => {
    const o = layout[p.a === name ? p.b : p.a]
    return Math.atan2(o[1] - at[1], o[0] - at[0])
  })
  const clear = 0.3
  const open = (a: number) => !roadAngles.some(ra => angDiff(a, ra) < clear) && angDiff(a, FRONT) >= skipFront
  // find contiguous open arcs, starting from a closed angle so no arc wraps round
  const N = 72
  const startAt = Array.from({ length: N }, (_, i) => -Math.PI + (i / N) * Math.PI * 2).find(a => !open(a)) ?? -Math.PI
  const runs: [number, number][] = []
  let runStart: number | null = null
  for (let i = 0; i <= N; i++) {
    const a = startAt + (i / N) * Math.PI * 2
    if (i < N && open(a)) { if (runStart === null) runStart = a }
    else if (runStart !== null) { runs.push([runStart, a]); runStart = null }
  }
  const out: Ridge[] = []
  for (const [a0, a1] of runs) {
    const span = a1 - a0
    if (span < 0.22) continue
    const pieces = Math.ceil(span / 0.9)
    for (let k = 0; k < pieces; k++) {
      const a = a0 + ((k + 0.5) / pieces) * span
      const half = ((span / pieces) * radius) / 2
      const rad = radius + (r() - 0.5) * 1.5
      out.push({
        x: at[0] + Math.cos(a) * rad, z: at[1] + Math.sin(a) * rad,
        rx: half + 1.2, rz: depth * (0.9 + r() * 0.25), h: height * (0.85 + r() * 0.3),
        rot: -a + Math.PI / 2, // long side runs along the ring
        color: colors[out.length % colors.length],
      })
    }
  }
  return out
}

export function buildRelief(towns: { name: string; terrain: string; at: XZ }[], layout: Record<string, XZ>, roads: RoadPath[]): Relief {
  const mounds: Mound[] = []
  const rims: Rim[] = []
  const ridges: Ridge[] = []
  for (const t of towns) {
    const rise = RISE[t.terrain]
    if (rise) mounds.push({ town: t.name, x: t.at[0], z: t.at[1], ...rise })
    if (t.terrain === 'PLAINS') {
      // a valley: the town sits in a bowl of high ground; roads climb over the rim
      rims.push({ town: t.name, x: t.at[0], z: t.at[1], R: TOWN_SIZE * 1.5, w: 6.5, h: 4.2 })
    } else if (t.terrain === 'HILLS') {
      // rolling hills behind the rise
      ridges.push(...ringOfRidges(t.name, t.at, layout, roads, TOWN_SIZE * 1.75, 3.6, 6, [C.grass, C.grassDark], 1.6))
    }
  }
  const liftOf = new Map(mounds.map(m => [m.town, m.h]))
  const height = (x: number, z: number) => {
    let h = 0
    for (const m of mounds) h = Math.max(h, moundHeight(m, x, z))
    for (const m of rims) h = Math.max(h, rimHeight(m, x, z))
    for (const r of ridges) h = Math.max(h, ridgeHeight(r, x, z))
    return h
  }
  let reach = 0
  for (const m of mounds) reach = Math.max(reach, m.base)
  for (const m of rims) reach = Math.max(reach, m.R + m.w)
  for (const t of towns) for (const r of ridges) {
    const d = Math.hypot(r.x - t.at[0], r.z - t.at[1])
    if (d < TOWN_SIZE * 2.5) reach = Math.max(reach, d + r.rx)
  }
  return { mounds, rims, ridges, lift: n => liftOf.get(n) ?? 0, height, reach }
}

/** Lathe profile of a mound: flat top, smooth (or stepped, if rocky) slope down to the foot. */
export function moundGeometry(m: Mound) {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, m.h)]
  const steps = m.rocky ? 5 : 12
  for (let i = 0; i <= steps; i++) {
    const d = m.top + ((m.base - m.top) * i) / steps
    pts.push(new THREE.Vector2(d, m.h * smooth(1 - i / steps)))
  }
  pts.push(new THREE.Vector2(m.base + 0.01, -0.02))
  // rocky plateaus get chunky facets; grassy hills stay round
  const g = new THREE.LatheGeometry(pts, m.rocky ? 11 : 56)
  if (m.rocky) {
    const r = rng(hashString(m.town))
    const pos = g.getAttribute('position') as THREE.BufferAttribute
    const jitter = new Map<string, number>()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
      const d = Math.hypot(x, z)
      if (d < m.top - 0.1 || y < 0.05) continue // keep the top flat and the foot on the ground
      const key = `${Math.round(Math.atan2(z, x) * 100)}`
      if (!jitter.has(key)) jitter.set(key, 0.88 + r() * 0.24)
      const k = jitter.get(key)!
      pos.setXYZ(i, x * k, y, z * k)
    }
    g.computeVertexNormals()
  }
  return g
}

/** The valley rim as a polar grid whose height follows rimHeight exactly. */
export function rimGeometry(m: Rim) {
  const A = 96, Rr = 14
  const pos: number[] = [], idx: number[] = []
  for (let i = 0; i <= A; i++) {
    const a = (i / A) * Math.PI * 2
    for (let j = 0; j <= Rr; j++) {
      const d = m.R - m.w + (2 * m.w * j) / Rr
      const x = Math.cos(a) * d, z = Math.sin(a) * d
      pos.push(x, rimHeight({ ...m, x: 0, z: 0 }, x, z) - 0.02, z)
      if (i > 0 && j > 0) {
        const k = i * (Rr + 1) + j, up = k - (Rr + 1)
        idx.push(up - 1, k - 1, k, up - 1, k, up)
      }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** Trees along a valley rim's crest, skipping where roads cross. */
export function rimTrees(m: Rim, roads: RoadPath[]) {
  const r = rng(hashString(m.town) + 5)
  const out: { x: number; z: number }[] = []
  for (let a = -Math.PI; a < Math.PI; a += 0.13) {
    if (rimFactor(a) < 0.55 || r() < 0.25) continue
    const d = m.R + (r() - 0.5) * m.w * 0.9
    const x = m.x + Math.cos(a) * d, z = m.z + Math.sin(a) * d
    if (roads.some(p => p.points.some(v => Math.hypot(v.x - x, v.z - z) < 2.2))) continue
    out.push({ x, z })
  }
  return out
}
