import * as THREE from 'three'
import { rng } from './toon'

/** Flat strip following a polyline (roads, rivers). Lies in the XZ plane at height y. */
export function ribbonGeometry(points: THREE.Vector3[], width: number, y = 0) {
  const pos: number[] = []
  const idx: number[] = []
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)]
    const dir = new THREE.Vector3().subVectors(b, a).setY(0).normalize()
    const n = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(width / 2)
    pos.push(p.x + n.x, y, p.z + n.z, p.x - n.x, y, p.z - n.z)
    if (i > 0) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1) }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  // make sure normals point up whatever the winding
  const nrm = g.getAttribute('normal') as THREE.BufferAttribute
  for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0)
  return g
}

/** Irregular flat disc (terrain patches, ponds) — slightly wobbly edge, deterministic. */
export function blobGeometry(radius: number, seed: number, wobble = 0.18, segments = 28) {
  const r = rng(seed)
  const phases = [r() * 6, r() * 6, r() * 6]
  const shape = new THREE.Shape()
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2
    const k = 1 + wobble * (0.5 * Math.sin(a * 3 + phases[0]) + 0.3 * Math.sin(a * 5 + phases[1]) + 0.2 * Math.sin(a * 2 + phases[2]))
    const x = Math.cos(a) * radius * k, z = Math.sin(a) * radius * k
    if (i === 0) shape.moveTo(x, -z); else shape.lineTo(x, -z)
  }
  const g = new THREE.ShapeGeometry(shape, 1)
  g.rotateX(-Math.PI / 2)
  return g
}

/** Rounded-rectangle slab: grass top (group 0) and soil sides (group 1). Top sits at y = 0. */
export function slabGeometry(minX: number, minZ: number, maxX: number, maxZ: number, depth: number, corner: number) {
  const s = new THREE.Shape()
  const r = corner
  // Shape is drawn in XY with y = -z so that after rotateX(-90°) it lands on XZ.
  const x0 = minX, x1 = maxX, y0 = -maxZ, y1 = -minZ
  s.moveTo(x0 + r, y0)
  s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r)
  s.lineTo(x1, y1 - r); s.quadraticCurveTo(x1, y1, x1 - r, y1)
  s.lineTo(x0 + r, y1); s.quadraticCurveTo(x0, y1, x0, y1 - r)
  s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0)
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.35, bevelSegments: 2, curveSegments: 8 })
  g.rotateX(-Math.PI / 2)
  // the bevel adds bevelThickness above the extrusion depth; sink it so the top sits at y = 0
  g.translate(0, -depth - 0.35, 0)
  return g
}

/** Distance from a point to a polyline in XZ. */
export function distToPolyline(x: number, z: number, pts: THREE.Vector3[]) {
  let best = Infinity
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1]
    const abx = b.x - a.x, abz = b.z - a.z
    const t = Math.max(0, Math.min(1, ((x - a.x) * abx + (z - a.z) * abz) / (abx * abx + abz * abz || 1)))
    best = Math.min(best, Math.hypot(x - (a.x + abx * t), z - (a.z + abz * t)))
  }
  return best
}
