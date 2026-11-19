import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import type { AnchorMap } from './anchors'

/** Imperative style write (labels are positioned outside React on purpose). */
function setStyle(el: HTMLElement, key: 'visibility' | 'transform' | 'zIndex', value: string) { el.style[key] = value }

const v = new THREE.Vector3()
const last = new WeakMap<HTMLElement, { t: string; s: string; vis: string; z: string }>()

/**
 * Projects every registered label onto the screen once per frame and writes the transform
 * straight to the DOM (no React re-render). Labels scale with zoom and stack by depth.
 */
export function LabelProjector({ anchorsRef, elsRef, baseZoomRef }: {
  anchorsRef: React.RefObject<AnchorMap>
  elsRef: React.RefObject<Map<string, HTMLElement>>
  baseZoomRef: React.RefObject<number>
}) {
  useFrame(({ camera, size }) => {
    const zoom = (camera as THREE.OrthographicCamera).zoom
    // labels grow more slowly than the world so a close-up isn't buried in pills
    const s = Math.max(0.8, Math.min(1.2, Math.sqrt(zoom / (baseZoomRef.current || zoom))))
    for (const [id, el] of elsRef.current) {
      const a = anchorsRef.current.get(id)
      if (!a) { setStyle(el, 'visibility', 'hidden'); continue }
      v.set(a.pos.x, a.pos.y + a.h, a.pos.z).project(camera)
      let x = (v.x * 0.5 + 0.5) * size.width
      let y = (-v.y * 0.5 + 0.5) * size.height
      if (el.dataset.fixed === '1') {
        // decision cards: keep the whole card inside the map
        const inner = el.firstElementChild as HTMLElement | null
        const w = inner?.offsetWidth ?? 0, h = inner?.offsetHeight ?? 0
        x = Math.max(w / 2 + 8, Math.min(size.width - w / 2 - 8, x))
        y = Math.max(h + 8, Math.min(size.height - 8, y))
      }
      const off = x < -80 || x > size.width + 80 || y < -40 || y > size.height + 120
      const prev = last.get(el) ?? { t: '', s: '', vis: '', z: '' }
      const vis = off ? 'hidden' : 'visible'
      if (vis !== prev.vis) setStyle(el, 'visibility', vis)
      if (off) { last.set(el, { ...prev, vis }); continue }
      const t = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      if (t !== prev.t) setStyle(el, 'transform', t)
      const inner = el.firstElementChild as HTMLElement | null
      const sc = `translate(-50%, -100%) scale(${el.dataset.fixed === '1' ? 1 : s.toFixed(2)})`
      if (inner && sc !== prev.s) setStyle(inner, 'transform', sc)
      const z = el.dataset.z ? prev.z : String(Math.round(y / 4))
      if (!el.dataset.z && z !== prev.z) setStyle(el, 'zIndex', z)
      last.set(el, { t, s: sc, vis, z })
    }
  })
  return null
}
