import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TERRAIN_COLOURS, TERRAIN_EMISSIVE } from './worldData'

interface RoadProps {
  from: [number, number, number]
  to: [number, number, number]
  terrain: string
  lowGraphics?: boolean
}

export function Road({ from, to, terrain, lowGraphics }: RoadProps) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null)

  const color = TERRAIN_COLOURS[terrain] ?? '#aaa'
  const emissive = TERRAIN_EMISSIVE[terrain] ?? '#444'

  // Create a slight arc mid-point for visual interest
  const mid: [number, number, number] = [
    (from[0] + to[0]) / 2,
    0.4,  // arc height
    (from[2] + to[2]) / 2,
  ]

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(...from).setY(0.15),
    new THREE.Vector3(...mid),
    new THREE.Vector3(...to).setY(0.15),
  ])

  const tubeSegments = lowGraphics ? 6 : 20

  useFrame(({ clock }) => {
    if (!matRef.current || lowGraphics) return
    matRef.current.emissiveIntensity = 0.2 + Math.sin(clock.elapsedTime * 1.5) * 0.15
  })

  if (lowGraphics) {
    // Simple line for low graphics
    const points = curve.getPoints(10)
    const positions = new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return (
      <line geometry={geo}>
        <lineBasicMaterial color={color} linewidth={2} />
      </line>
    )
  }

  return (
    <mesh>
      <tubeGeometry args={[curve, tubeSegments, 0.07, 6, false]} />
      <meshStandardMaterial
        ref={matRef}
        color={color}
        emissive={emissive}
        emissiveIntensity={0.2}
        roughness={0.6}
        metalness={0.1}
      />
    </mesh>
  )
}
