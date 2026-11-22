import * as THREE from 'three'
import { hashString, rng } from './toon'

export type XZ = [number, number]

/** Side length of a town plaza in the town's own (unscaled) model units. */
export const PLAZA = 7
export const PLAZA_H = 0.18
/** Every town model is drawn this much bigger, so many villagers fit without clumping. */
export const TOWN_SCALE = 1.8
/** Plaza side length and top height in world units. */
export const TOWN_SIZE = PLAZA * TOWN_SCALE
export const PLAZA_TOP = PLAZA_H * TOWN_SCALE
/** How much the hand-made map is spread out compared with its original spacing. */
const SPREAD = 2.3
/** Minimum distance between town centres. */
export const MIN_TOWN_GAP = 14 * SPREAD

// Hand-made layout for the default scenario: every road is short and none cross.
const BASE_LAYOUT: Record<string, XZ> = {
  Woodhaven: [0, -15],
  Riverton: [-15, -7],
  Hill: [15, -7],
  Valley: [0, 0],
  Highpeak: [28, 2],
  Port: [-15, 9],
  Saltmarsh: [0, 18],
  Sandreach: [16, 16],
}
const DEFAULT_LAYOUT: Record<string, XZ> = Object.fromEntries(
  Object.entries(BASE_LAYOUT).map(([k, [x, z]]) => [k, [x * SPREAD, z * SPREAD] as XZ]),
)

export interface RoadIn { town_a: string; town_b: string; terrain: string; distance?: number; coins?: number; food?: number }

/** Town centres. Uses the hand-made layout when every town is known, else a force-directed one. */
export function computeLayout(townNames: string[], roads: RoadIn[]): Record<string, XZ> {
  if (townNames.length > 0 && townNames.every(n => DEFAULT_LAYOUT[n])) {
    return Object.fromEntries(townNames.map(n => [n, DEFAULT_LAYOUT[n]]))
  }
  return forceLayout(townNames, roads)
}

/** Deterministic Fruchterman–Reingold layout, scaled so towns never overlap. */
export function forceLayout(names: string[], roads: RoadIn[]): Record<string, XZ> {
  const n = names.length
  if (n === 0) return {}
  if (n === 1) return { [names[0]]: [0, 0] }
  const sorted = [...names].sort((a, b) => hashString(a) - hashString(b))
  const pos = new Map<string, { x: number; z: number }>()
  const R = Math.max(MIN_TOWN_GAP, (n * MIN_TOWN_GAP) / (2 * Math.PI))
  sorted.forEach((name, i) => {
    const a = (i / n) * Math.PI * 2
    pos.set(name, { x: Math.cos(a) * R, z: Math.sin(a) * R })
  })
  const edges = roads.filter(r => pos.has(r.town_a) && pos.has(r.town_b) && r.town_a !== r.town_b)
  const k = MIN_TOWN_GAP * 1.2
  let temp = R / 2
  for (let iter = 0; iter < 400; iter++) {
    const disp = new Map(names.map(nm => [nm, { x: 0, z: 0 }]))
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = pos.get(names[i])!, b = pos.get(names[j])!
      let dx = a.x - b.x, dz = a.z - b.z
      let d = Math.hypot(dx, dz)
      if (d < 0.01) { dx = 0.01 * (i + 1); dz = 0.01 * (j + 1); d = Math.hypot(dx, dz) }
      const f = (k * k) / d
      const da = disp.get(names[i])!, db = disp.get(names[j])!
      da.x += (dx / d) * f; da.z += (dz / d) * f
      db.x -= (dx / d) * f; db.z -= (dz / d) * f
    }
    for (const e of edges) {
      const a = pos.get(e.town_a)!, b = pos.get(e.town_b)!
      const dx = a.x - b.x, dz = a.z - b.z
      const d = Math.max(0.01, Math.hypot(dx, dz))
      const f = (d * d) / k
      const da = disp.get(e.town_a)!, db = disp.get(e.town_b)!
      da.x -= (dx / d) * f; da.z -= (dz / d) * f
      db.x += (dx / d) * f; db.z += (dz / d) * f
    }
    for (const nm of names) {
      const p = pos.get(nm)!, d = disp.get(nm)!
      const len = Math.max(0.01, Math.hypot(d.x, d.z))
      p.x += (d.x / len) * Math.min(len, temp)
      p.z += (d.z / len) * Math.min(len, temp)
    }
    temp = Math.max(0.05, temp * 0.985)
  }
  // Scale so the closest pair is MIN_TOWN_GAP apart
  let minD = Infinity
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = pos.get(names[i])!, b = pos.get(names[j])!
    minD = Math.min(minD, Math.hypot(a.x - b.x, a.z - b.z))
  }
  const s = MIN_TOWN_GAP / Math.max(minD, 0.01)
  return Object.fromEntries(names.map(nm => { const p = pos.get(nm)!; return [nm, [p.x * s, p.z * s] as XZ] }))
}

export interface RoadPath {
  key: string
  a: string
  b: string
  terrain: string
  distance: number
  /** Points from the edge of plaza a to the edge of plaza b (y = 0). */
  points: THREE.Vector3[]
}

export const roadKey = (a: string, b: string) => [a, b].sort().join('|')

/** Where a road leaves a plaza: the point on the plaza border facing the other town. */
function plazaExit(c: XZ, toward: XZ): THREE.Vector3 {
  const dx = toward[0] - c[0], dz = toward[1] - c[1]
  const half = TOWN_SIZE / 2 + 0.25
  const s = half / Math.max(Math.abs(dx), Math.abs(dz))
  return new THREE.Vector3(c[0] + dx * s, 0, c[1] + dz * s)
}

/** Smooth, gently curved paths between plazas, one per road in the data. */
export function buildRoads(roads: RoadIn[], layout: Record<string, XZ>): RoadPath[] {
  const seen = new Set<string>()
  const out: RoadPath[] = []
  for (const r of roads) {
    const A = layout[r.town_a], B = layout[r.town_b]
    if (!A || !B) continue
    const key = roadKey(r.town_a, r.town_b)
    if (seen.has(key)) continue
    seen.add(key)
    const start = plazaExit(A, B), end = plazaExit(B, A)
    const dir = end.clone().sub(start)
    const len = dir.length()
    const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize()
    const bend = (hashString(key) % 2 ? 1 : -1) * Math.min(2.2, len * 0.12)
    const curve = new THREE.CatmullRomCurve3([
      start,
      start.clone().lerp(end, 0.33).addScaledVector(perp, bend),
      start.clone().lerp(end, 0.66).addScaledVector(perp, bend * 0.6),
      end,
    ], false, 'centripetal')
    const pts = curve.getSpacedPoints(Math.max(16, Math.round(len * 2)))
    out.push({ key, a: r.town_a, b: r.town_b, terrain: r.terrain, distance: r.distance ?? len, points: pts })
  }
  return out
}

/** Points of the road between two adjacent towns, ordered from `from` to `to` (or null). */
export function roadPoints(roads: RoadPath[], from: string, to: string): THREE.Vector3[] | null {
  const r = roads.find(x => x.key === roadKey(from, to))
  if (!r) return null
  return r.a === from ? r.points : [...r.points].reverse()
}

/** Shortest hop route between towns over the road graph (BFS), inclusive. */
export function route(roads: RoadPath[], from: string, to: string): string[] | null {
  if (from === to) return [from]
  const adj = new Map<string, string[]>()
  for (const r of roads) {
    adj.set(r.a, [...(adj.get(r.a) ?? []), r.b])
    adj.set(r.b, [...(adj.get(r.b) ?? []), r.a])
  }
  const prev = new Map<string, string>([[from, '']])
  const q = [from]
  while (q.length) {
    const cur = q.shift()!
    if (cur === to) break
    for (const nb of adj.get(cur) ?? []) if (!prev.has(nb)) { prev.set(nb, cur); q.push(nb) }
  }
  if (!prev.has(to)) return null
  const path = [to]
  while (path[0] !== from) path.unshift(prev.get(path[0])!)
  return path
}

/** Bounds of all plazas plus margin, as [minX, minZ, maxX, maxZ]. */
export function worldBounds(layout: Record<string, XZ>, margin = 9): [number, number, number, number] {
  const pts = Object.values(layout)
  if (pts.length === 0) return [-10, -10, 10, 10]
  return [
    Math.min(...pts.map(p => p[0])) - margin,
    Math.min(...pts.map(p => p[1])) - margin,
    Math.max(...pts.map(p => p[0])) + margin,
    Math.max(...pts.map(p => p[1])) + margin,
  ]
}

// ---------- landmark placement ----------
/** How many landmark spots each terrain wants and how much room each needs. */
export const LANDMARKS: Record<string, { n: number; r: number; dist: number }> = {
  RIVER: { n: 1, r: 3.0, dist: 5.6 },
  FOREST: { n: 1, r: 1.6, dist: 5.4 },
  HILLS: { n: 2, r: 2.3, dist: 5.6 },
  MOUNTAINS: { n: 3, r: 2.6, dist: 6.0 },
  PLAINS: { n: 3, r: 2.3, dist: 5.8 },
  COAST: { n: 2, r: 3.0, dist: 6.6 },
  MARSH: { n: 3, r: 1.9, dist: 5.4 },
  DESERT: { n: 2, r: 2.0, dist: 5.4 },
}

export interface Spot { x: number; z: number; angle: number; r: number }

const angDiff = (a: number, b: number) => { const d = Math.abs(a - b) % (Math.PI * 2); return d > Math.PI ? Math.PI * 2 - d : d }

/** Landmark spots around a town (local coords), placed away from its roads and from the camera-facing side. */
export function landmarkSpots(name: string, terrain: string, layout: Record<string, XZ>, roads: RoadPath[]): Spot[] {
  const c = layout[name]
  if (!c) return []
  const spec = LANDMARKS[terrain] ?? LANDMARKS.PLAINS
  const roadAngles = roads.filter(r => r.a === name || r.b === name).map(r => {
    const o = layout[r.a === name ? r.b : r.a]
    return Math.atan2(o[1] - c[1], o[0] - c[0])
  })
  const FRONT = Math.PI / 4 // +x/+z quadrant faces the camera
  const candidates = Array.from({ length: 24 }, (_, i) => (i / 24) * Math.PI * 2 - Math.PI)
  const scored = candidates.map(a => {
    const roadGap = roadAngles.length ? Math.min(...roadAngles.map(ra => angDiff(a, ra))) : Math.PI
    const back = angDiff(a, FRONT) / Math.PI // 0 = in front of the camera, 1 = behind the town
    return { a, score: Math.min(roadGap, 1.2) * 1.0 + back * 0.9, roadGap }
  }).filter(s => s.roadGap > 0.6).sort((x, y) => y.score - x.score)
  const picked: Spot[] = []
  for (const s of scored) {
    if (picked.length >= spec.n) break
    if (picked.some(p => angDiff(p.angle, s.a) < 0.95)) continue
    picked.push({ x: Math.cos(s.a) * spec.dist, z: Math.sin(s.a) * spec.dist, angle: s.a, r: spec.r })
  }
  return picked
}

// ---------- where villagers stand ----------
// World-unit offsets from the town centre; +z faces the camera, the back of the plaza holds buildings.
// A roomy grid on the front half of the plaza, then a ring on the grass around it, so even a crowded
// town keeps every villager (and its name tag) apart.
// a villager's head is about 1.25 units wide, so leave a clear gap between neighbours
// Rows are further apart than columns because the camera's angle squashes depth, and every other
// row is shifted half a step (like a honeycomb) so nobody stands right behind someone else.
const SPACING_X = 2.5
const SPACING_Z = 2.5

function buildSlots(): XZ[] {
  const half = TOWN_SIZE / 2
  const out: XZ[] = []
  for (let z = 0.75, row = 0; z <= half - 0.4; z += SPACING_Z, row++) {
    for (let x = -half + 0.85 + (row % 2) * (SPACING_X / 2); x <= half - 0.85; x += SPACING_X) {
      // keep clear of the lawn corner (front-left) and the bench (right side, near the middle)
      if (x < -half + 2.1 && z > half - 2.1) continue
      if (x > half - 1.6 && z < 1.3) continue
      out.push([+x.toFixed(2), +z.toFixed(2)])
    }
  }
  // closest to the market stall first
  out.sort((a, b) => Math.hypot(a[0], a[1] - 1.2) - Math.hypot(b[0], b[1] - 1.2))
  // overflow: a ring on the grass in front of and beside the plaza
  const ring: XZ[] = []
  for (const [r, count] of [[half + 1.8, 12], [half + 4.2, 15]] as const) {
    for (let i = 0; i < count; i++) {
      const a = -0.35 + (i / (count - 1)) * (Math.PI + 0.7) // from the right side, round the front, to the left side
      ring.push([+(Math.cos(a) * r).toFixed(2), +(Math.sin(a) * r).toFixed(2)])
    }
  }
  ring.sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]) || Math.abs(a[0]) - Math.abs(b[0]))
  return [...out, ...ring]
}
const SLOTS = buildSlots()
const ROLE_ORDER: Record<string, number> = { Trader: 0, Farmer: 1, Diplomat: 2 }

/** Stable standing spot for each agent currently in a town: traders nearest the stall. */
export function townSlots(agentsHere: { name: string; role: string }[], center: XZ, lift = 0): Map<string, THREE.Vector3> {
  const sorted = [...agentsHere].sort((a, b) =>
    (ROLE_ORDER[a.role] ?? 3) - (ROLE_ORDER[b.role] ?? 3) || a.name.localeCompare(b.name))
  const out = new Map<string, THREE.Vector3>()
  sorted.forEach((a, i) => {
    let local: XZ
    if (i < SLOTS.length) local = SLOTS[i]
    else { const r = rng(hashString(a.name)); const ang = r() * Math.PI * 2; local = [Math.cos(ang) * (TOWN_SIZE / 2 + 6.6), Math.sin(ang) * (TOWN_SIZE / 2 + 6.6)] }
    const onPlaza = Math.abs(local[0]) <= TOWN_SIZE / 2 && Math.abs(local[1]) <= TOWN_SIZE / 2
    out.set(a.name, new THREE.Vector3(center[0] + local[0], lift + (onPlaza ? PLAZA_TOP : 0.02), center[1] + local[1]))
  })
  return out
}
