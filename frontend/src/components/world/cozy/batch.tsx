import { useLayoutEffect, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { outlineMaterial } from './toon'

type AnyObj = THREE.Object3D & { isInstancedMesh?: boolean; isLine2?: boolean; isLineSegments2?: boolean }

/** position + normal only, non-indexed, so any two geometries can be merged. */
function normalise(g: THREE.BufferGeometry, m: THREE.Matrix4) {
  const out = (g.index ? g.toNonIndexed() : g.clone())
  for (const name of Object.keys(out.attributes)) if (name !== 'position' && name !== 'normal') out.deleteAttribute(name)
  if (!out.getAttribute('normal')) out.computeVertexNormals()
  out.applyMatrix4(m)
  return out
}

/**
 * Merges every static mesh below it into one mesh per material (plus one outline mesh),
 * cutting hundreds of draw calls to a handful. Anything inside a group with
 * userData.dynamic (spinning, bobbing, data-driven) is left untouched, as are instanced
 * meshes and lines. Originals stay in the scene (hidden) so pointer events still hit them.
 */
export function StaticBatch({ children, deps, outlineWidth = 0.035, castShadow = true, raycastMerged = false }: {
  children: ReactNode; deps: unknown[]; outlineWidth?: number; castShadow?: boolean
  /** Moving content (villagers): hit-test the merged meshes and fully freeze the hidden originals. */
  raycastMerged?: boolean
}) {
  const src = useRef<THREE.Group>(null)
  const dst = useRef<THREE.Group>(null)

  useLayoutEffect(() => {
    const root = src.current, target = dst.current
    if (!root || !target) return
    root.updateWorldMatrix(true, true)
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert()
    const buckets = new Map<string, { mat: THREE.Material; cast: boolean; receive: boolean; geos: THREE.BufferGeometry[] }>()
    const outlines: THREE.BufferGeometry[] = []
    const hidden: THREE.Mesh[] = []

    const visit = (o: AnyObj) => {
      if (o.userData?.dynamic) return
      const mesh = o as THREE.Mesh
      if (mesh.isMesh && !o.isInstancedMesh && !o.isLine2 && !o.isLineSegments2 && mesh.visible && !Array.isArray(mesh.material)) {
        const mat = mesh.material as THREE.Material
        const m = new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld)
        const g = normalise(mesh.geometry, m)
        const key = `${mat.uuid}|${mesh.castShadow}|${mesh.receiveShadow}`
        const b = buckets.get(key) ?? { mat, cast: mesh.castShadow, receive: mesh.receiveShadow, geos: [] }
        b.geos.push(g)
        buckets.set(key, b)
        if (mesh.userData?.outline) outlines.push(g)
        hidden.push(mesh)
      }
      for (const c of o.children) visit(c as AnyObj)
    }
    for (const c of root.children) visit(c as AnyObj)

    const made: THREE.Mesh[] = []
    for (const b of buckets.values()) {
      const merged = mergeGeometries(b.geos, false)
      if (!merged) continue
      const mesh = new THREE.Mesh(merged, b.mat)
      mesh.castShadow = b.cast && castShadow
      mesh.receiveShadow = b.receive
      if (!raycastMerged) mesh.raycast = () => {} // pointer events go to the hidden originals
      mesh.matrixAutoUpdate = false
      made.push(mesh)
    }
    if (outlines.length) {
      const merged = mergeGeometries(outlines, false)
      if (merged) {
        const mesh = new THREE.Mesh(merged, outlineMaterial(outlineWidth))
        mesh.raycast = () => {}
        mesh.matrixAutoUpdate = false
        made.push(mesh)
      }
    }
    for (const b of buckets.values()) for (const g of b.geos) if (!outlines.includes(g)) g.dispose()
    for (const g of outlines) g.dispose()
    made.forEach(m => target.add(m))
    hidden.forEach(h => {
      h.visible = false
      if (raycastMerged) { h.matrixWorldAutoUpdate = false; h.raycast = () => {} }
    })
    // Static content never changes its local transform: stop three.js recomposing it every frame.
    const frozen: THREE.Object3D[] = []
    const freeze = (o: THREE.Object3D) => {
      if (o.userData?.dynamic) return
      o.updateMatrix(); o.matrixAutoUpdate = false; frozen.push(o)
      for (const c of o.children) freeze(c)
    }
    for (const c of root.children) freeze(c)

    return () => {
      made.forEach(m => { target.remove(m); m.geometry.dispose() })
      hidden.forEach(h => {
        h.visible = true
        if (raycastMerged) { h.matrixWorldAutoUpdate = true; delete (h as Partial<THREE.Mesh>).raycast }
      })
      frozen.forEach(o => { o.matrixAutoUpdate = true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return (
    <>
      <group ref={src}>{children}</group>
      <group ref={dst} />
    </>
  )
}
