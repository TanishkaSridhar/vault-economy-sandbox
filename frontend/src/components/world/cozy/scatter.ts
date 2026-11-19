import type * as THREE from 'three'
import { C } from './palette'
import { PLAZA, type XZ, type Spot } from './layout'
import type { TreeSpec } from './props'
import { distToPolyline } from './shapes'
import { hashString, rng } from './toon'

const TREE_RULES: Record<string, { n: number; kinds: TreeSpec['kind'][]; colors: string[] }> = {
  FOREST: { n: 30, kinds: ['pine', 'pine', 'round'], colors: [C.pine, C.treeDeep, C.treeGreen] },
  RIVER: { n: 14, kinds: ['round', 'round', 'bush'], colors: [C.treeOrange, C.treeYellow, C.treeGreen] },
  HILLS: { n: 10, kinds: ['round', 'bush'], colors: [C.treeGreen, C.treeYellow, C.bush] },
  MOUNTAINS: { n: 16, kinds: ['pine'], colors: [C.pine, C.treeDeep] },
  PLAINS: { n: 7, kinds: ['round', 'bush'], colors: [C.treeOrange, C.treeYellow] },
  COAST: { n: 6, kinds: ['round', 'bush'], colors: [C.treeGreen, C.bush] },
  MARSH: { n: 10, kinds: ['bush', 'round'], colors: [C.treeDeep, C.bush, C.treeGreen] },
  DESERT: { n: 0, kinds: ['bush'], colors: [C.cactus] },
}

function free(x: number, z: number, roads: THREE.Vector3[][], blocked: [number, number, number][], clear = 1.7) {
  for (const [bx, bz, br] of blocked) if (Math.hypot(x - bx, z - bz) < br) return false
  for (const pts of roads) if (distToPolyline(x, z, pts) < clear) return false
  return true
}

/** Trees around every town (terrain-specific) plus a sprinkle over open ground. */
export function scatterTrees(
  towns: { name: string; terrain: string; at: XZ; spots: Spot[] }[],
  roads: THREE.Vector3[][],
  bounds: [number, number, number, number],
  density = 1,
): TreeSpec[] {
  const trees: TreeSpec[] = []
  const plazaBlocks: [number, number, number][] = towns.map(t => [t.at[0], t.at[1], PLAZA * 0.72])
  for (const t of towns) {
    const rule = TREE_RULES[t.terrain] ?? TREE_RULES.PLAINS
    const zones = t.spots.map(sp => [t.at[0] + sp.x, t.at[1] + sp.z, sp.r + 0.6] as [number, number, number])
    const r = rng(hashString(t.name))
    let placed = 0, tries = 0
    const want = Math.round(rule.n * density)
    while (placed < want && tries < want * 30) {
      tries++
      const a = r() * Math.PI * 2
      const d = PLAZA * 0.62 + r() * 3.4
      const x = t.at[0] + Math.cos(a) * d, z = t.at[1] + Math.sin(a) * d
      if (!free(x, z, roads, [...plazaBlocks, ...zones])) continue
      // keep the camera-facing side (+x/+z) a bit clearer so the plaza stays visible
      if (Math.cos(a) > 0.5 && Math.sin(a) > 0.5 && r() < 0.7) continue
      if (trees.some(o => Math.hypot(o.x - x, o.z - z) < 1.15)) continue
      trees.push({ x, z, kind: rule.kinds[Math.floor(r() * rule.kinds.length)], s: 0.75 + r() * 0.45, color: rule.colors[Math.floor(r() * rule.colors.length)] })
      placed++
    }
  }
  // open-ground sprinkle away from towns
  const r = rng(12345)
  const townBlocks: [number, number, number][] = towns.map(t => [t.at[0], t.at[1], PLAZA * 1.25])
  const [minX, minZ, maxX, maxZ] = bounds
  const want = Math.round(((maxX - minX) * (maxZ - minZ) / 55) * density)
  for (let i = 0, tries = 0; i < want && tries < want * 20; tries++) {
    const x = minX + 1.5 + r() * (maxX - minX - 3), z = minZ + 1.5 + r() * (maxZ - minZ - 3)
    if (!free(x, z, roads, townBlocks, 1.5)) continue
    if (trees.some(o => Math.hypot(o.x - x, o.z - z) < 1.4)) continue
    const palette = [C.treeOrange, C.treeYellow, C.treeGreen, C.treeDeep, C.bush]
    trees.push({ x, z, kind: r() < 0.25 ? 'bush' : r() < 0.15 ? 'pine' : 'round', s: 0.7 + r() * 0.5, color: palette[Math.floor(r() * palette.length)] })
    i++
  }
  return trees
}
