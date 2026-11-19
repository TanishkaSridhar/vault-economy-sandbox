import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import '@fontsource/itim/400.css'
import './cozy.css'
import { assignLooks } from './looks'
import { CozyCtx } from './ctx'
import { Villager, type Motion, type Mood } from './Villager'
import { roleStyle } from './palette'

// Rendered portraits, cached for the whole session (name -> PNG data URL).
const cache = new Map<string, string>()
const listeners = new Set<() => void>()
let version = 0
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
const snapshot = () => version

const CELL = 160
const COLS = 4
const ZOOM = 64 // px per world unit inside a cell

const NO_MOOD: Mood = { hungry: false, traded: false, profit: false, key: 'portrait' }

/**
 * Renders every missing villager once into a short-lived offscreen canvas, slices it into
 * one image per agent, then unmounts (freeing the WebGL context).
 */
export function PortraitRenderer({ names }: { names: string[] }) {
  const v = useSyncExternalStore(subscribe, snapshot)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const missing = useMemo(() => names.filter(n => !cache.has(n)), [names, v])
  if (missing.length === 0) return null // unmounts the canvas (and frees its WebGL context) once done
  const rows = Math.ceil(missing.length / COLS)
  return (
    <div aria-hidden style={{ position: 'fixed', left: -10000, top: 0, width: CELL * COLS, height: CELL * rows, pointerEvents: 'none' }}>
      <Canvas
        orthographic
        dpr={1}
        gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }}
        camera={{ zoom: ZOOM, near: 0.1, far: 200 }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <CozyCtx.Provider value={{ low: false, reducedMotion: true }}>
          <PortraitScene names={missing} rows={rows} />
        </CozyCtx.Provider>
      </Canvas>
    </div>
  )
}

const DIR = new THREE.Vector3(1, 0.42, 1).normalize()

function PortraitScene({ names, rows }: { names: string[]; rows: number }) {
  const { camera, gl, size } = useThree()
  const looks = useMemo(() => assignLooks(names), [names])

  // Camera looks at the origin from the same 3/4 angle villagers face when idle
  const basis = useMemo(() => {
    const f = DIR.clone().negate()
    const right = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize()
    const up = new THREE.Vector3().crossVectors(right, f).normalize()
    return { right, up }
  }, [])
  useEffect(() => {
    camera.position.copy(DIR).multiplyScalar(40)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [camera])

  // One villager per cell; feet placed near the bottom of the cell
  const motions = useMemo(() => names.map((n, i) => {
    const col = i % COLS, row = Math.floor(i / COLS)
    const sx = (col + 0.5) * CELL - (CELL * COLS) / 2
    const sy = (rows * CELL) / 2 - (row + 0.88) * CELL
    const p = new THREE.Vector3().addScaledVector(basis.right, sx / ZOOM).addScaledVector(basis.up, sy / ZOOM)
    return { id: `portrait:${n}`, home: p, snap: true } as Motion
  }), [names, rows, basis])

  useEffect(() => {
    // let villagers settle (they turn to face the camera), then capture
    const t = setTimeout(() => {
      const src = gl.domElement
      const cut = document.createElement('canvas')
      cut.width = CELL; cut.height = CELL
      const ctx = cut.getContext('2d')!
      names.forEach((n, i) => {
        const col = i % COLS, row = Math.floor(i / COLS)
        ctx.clearRect(0, 0, CELL, CELL)
        ctx.drawImage(src, col * CELL, row * CELL, CELL, CELL, 0, 0, CELL, CELL)
        cache.set(n, cut.toDataURL('image/png'))
      })
      version++
      listeners.forEach(fn => fn())
    }, 1400)
    return () => clearTimeout(t)
  }, [gl, names, size])

  return (
    <>
      <hemisphereLight args={['#fff6e6', '#b8d3a6', 1.3]} />
      <directionalLight position={[10, 20, 14]} intensity={1.9} color="#fff0d8" />
      {names.map((n, i) => (
        <Villager
          key={n}
          name={n}
          look={looks.get(n)!}
          motion={motions[i]}
          mood={NO_MOOD}
          selected={false}
          onSelect={() => {}}
          onHover={() => {}}
        />
      ))}
    </>
  )
}

/** A villager's portrait in a soft round frame (falls back to an initial while rendering). */
export function Portrait({ name, role, size = 56 }: { name: string; role: string; size?: number }) {
  useSyncExternalStore(subscribe, snapshot)
  const src = cache.get(name)
  const rs = roleStyle(role)
  return (
    <div
      className="cz-portrait"
      style={{ width: size, height: size, background: rs.color, borderColor: '#fffaf0' }}
      title={name}
    >
      {src
        ? <img src={src} alt={`${name} the ${role.toLowerCase()}`} width={size} height={size} />
        : <span style={{ color: rs.ink, fontSize: size * 0.4 }}>{name.charAt(0)}</span>}
    </div>
  )
}
