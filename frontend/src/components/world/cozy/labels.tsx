import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import type { AnchorMap } from './anchors'

/** Imperative style write (labels are positioned outside React on purpose). */
function setStyle(el: HTMLElement, key: 'visibility' | 'transform' | 'zIndex', value: string) { el.style[key] = value }

const v = new THREE.Vector3()
const last = new WeakMap<HTMLElement, { t: string; s: string; vis: string; z: string }>()

interface Placed { el: HTMLElement; x: number; y: number; w: number; h: number; scale: string; z: string }

/**
 * Projects every registered label onto the screen once per frame and writes the transform
 * straight to the DOM (no React re-render). Labels scale with zoom and stack by depth.
 * Villager name tags are decluttered: a tag that would overlap one already placed is
 * lifted above it, so a crowded town shows a neat stack of names instead of a pile.
 */
export function LabelProjector({ anchorsRef, elsRef, baseZoomRef }: {
  anchorsRef: React.RefObject<AnchorMap>
  elsRef: React.RefObject<Map<string, HTMLElement>>
  baseZoomRef: React.RefObject<number>
}) {
  useFrame(({ camera, size }) => {
    const zoom = (camera as THREE.OrthographicCamera).zoom
    // Labels grow more slowly than the world so a close-up isn't buried in pills, and shrink
    // when zoomed out to the whole map, where they also drop the role word (see .cz-far).
    const rel = zoom / (baseZoomRef.current || zoom)
    const s = Math.max(0.7, Math.min(1.15, 0.8 * Math.sqrt(rel)))
    const host = elsRef.current.values().next().value?.parentElement
    const far = rel < 1.35
    if (host && host.classList.contains('cz-far') !== far) host.classList.toggle('cz-far', far)
    const tags: Placed[] = []
    const others: Placed[] = []
    for (const [id, el] of elsRef.current) {
      const a = anchorsRef.current.get(id)
      if (!a) { setStyle(el, 'visibility', 'hidden'); continue }
      v.set(a.pos.x, a.pos.y + a.h, a.pos.z).project(camera)
      let x = (v.x * 0.5 + 0.5) * size.width
      let y = (-v.y * 0.5 + 0.5) * size.height
      const inner = el.firstElementChild as HTMLElement | null
      const fixed = el.dataset.fixed === '1'
      if (fixed) {
        // decision cards: keep the whole card inside the map
        const w = inner?.offsetWidth ?? 0, h = inner?.offsetHeight ?? 0
        x = Math.max(w / 2 + 8, Math.min(size.width - w / 2 - 8, x))
        y = Math.max(h + 8, Math.min(size.height - 8, y))
      }
      const off = x < -80 || x > size.width + 80 || y < -40 || y > size.height + 120
      const prev = last.get(el) ?? { t: '', s: '', vis: '', z: '' }
      const vis = off ? 'hidden' : 'visible'
      if (vis !== prev.vis) setStyle(el, 'visibility', vis)
      if (off) { last.set(el, { ...prev, vis }); continue }
      const scale = fixed ? 1 : s
      const z = el.dataset.z ? prev.z : String(Math.round(y / 4))
      const item = { el, x, y, w: (inner?.offsetWidth ?? 0) * scale, h: (inner?.offsetHeight ?? 0) * scale, scale: scale.toFixed(2), z }
      if (el.dataset.agent) tags.push(item)
      else others.push(item)
    }

    // declutter name tags: nearest the camera first (they keep their spot), the rest move up out of the way
    tags.sort((p, q) => q.y - p.y)
    const placed: Placed[] = []
    for (const t of tags) {
      let y = t.y
      for (let guard = 0; guard < 24; guard++) {
        const hit = placed.find(p => Math.abs(p.x - t.x) < (p.w + t.w) / 2 + 2 && y > p.y - p.h - 1 && y - t.h < p.y + 1)
        if (!hit) break
        y = hit.y - hit.h - 2
      }
      t.y = y
      placed.push(t)
    }

    // a town's name always sits clear above the villagers' name tags around it
    for (const o of others) {
      if (!o.el.dataset.town) continue
      for (let guard = 0; guard < 24; guard++) {
        const hit = placed.find(p => Math.abs(p.x - o.x) < (p.w + o.w) / 2 + 2 && o.y > p.y - p.h - 1 && o.y - o.h < p.y + 1)
        if (!hit) break
        o.y = hit.y - hit.h - 3
      }
    }

    for (const p of [...others, ...tags]) {
      const prev = last.get(p.el) ?? { t: '', s: '', vis: 'visible', z: '' }
      const t = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`
      if (t !== prev.t) setStyle(p.el, 'transform', t)
      const inner = p.el.firstElementChild as HTMLElement | null
      const sc = `translate(-50%, -100%) scale(${p.scale})`
      if (inner && sc !== prev.s) setStyle(inner, 'transform', sc)
      if (!p.el.dataset.z && p.z !== prev.z) setStyle(p.el, 'zIndex', p.z)
      last.set(p.el, { t, s: sc, vis: 'visible', z: p.z })
    }
  })
  return null
}
