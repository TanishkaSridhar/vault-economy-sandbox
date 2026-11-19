import * as THREE from 'three'

// Three-band cel shading ramp shared by every toon material.
let ramp: THREE.DataTexture | null = null
function toonRamp() {
  if (!ramp) {
    const bands = [170, 222, 255]
    const data = new Uint8Array(bands.flatMap(v => [v, v, v, 255]))
    ramp = new THREE.DataTexture(data, bands.length, 1, THREE.RGBAFormat)
    ramp.minFilter = THREE.NearestFilter
    ramp.magFilter = THREE.NearestFilter
    ramp.generateMipmaps = false
    ramp.needsUpdate = true
  }
  return ramp
}

// Materials are cached by colour/options for the lifetime of the app, so dozens of props
// share a handful of materials (fewer shader switches, nothing to dispose per component).
const cache = new Map<string, THREE.Material>()

export function toon(color: string, opts: { opacity?: number; emissive?: string; emissiveIntensity?: number; side?: THREE.Side } = {}) {
  const key = `${color}|${opts.opacity ?? 1}|${opts.emissive ?? ''}|${opts.emissiveIntensity ?? 0}|${opts.side ?? 0}`
  let m = cache.get(key) as THREE.MeshToonMaterial | undefined
  if (!m) {
    m = new THREE.MeshToonMaterial({
      color,
      gradientMap: toonRamp(),
      transparent: (opts.opacity ?? 1) < 1,
      opacity: opts.opacity ?? 1,
      emissive: opts.emissive ?? '#000000',
      emissiveIntensity: opts.emissiveIntensity ?? 0,
      side: opts.side ?? THREE.FrontSide,
    })
    cache.set(key, m)
  }
  return m
}

/** Unlit flat colour (eyes, highlights, glows). */
export function flat(color: string, opacity = 1) {
  const key = `flat|${color}|${opacity}`
  let m = cache.get(key) as THREE.MeshBasicMaterial | undefined
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 })
    cache.set(key, m)
  }
  return m
}

// Shared geometries for small repeated parts (never disposed: app lifetime, tiny).
const geoCache = new Map<string, THREE.BufferGeometry>()
export function geo<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = geoCache.get(key) as T | undefined
  if (!g) { g = make(); geoCache.set(key, g) }
  return g
}

/** Deterministic PRNG (mulberry32) so layouts and scatter are stable between renders. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

// Inverted-hull outline (hand-drawn brown edge) for merged static geometry.
const outlineCache = new Map<number, THREE.ShaderMaterial>()
export function outlineMaterial(width: number) {
  let m = outlineCache.get(width)
  if (!m) {
    m = new THREE.ShaderMaterial({
      uniforms: { width: { value: width }, color: { value: new THREE.Color('#5c3d2e') } },
      vertexShader: `uniform float width;
        void main() {
          vec3 p = position + normalize(normal) * width;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `uniform vec3 color;
        void main() { gl_FragColor = vec4(color, 1.0); }`,
      side: THREE.BackSide,
    })
    outlineCache.set(width, m)
  }
  return m
}
