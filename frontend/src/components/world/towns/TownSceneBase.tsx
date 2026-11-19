// Shared base scene component for all 8 town dioramas.
// Each town scene imports and uses this for common setup.
import { useRef, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { ContactShadows, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { useSettings } from '../../../hooks/useSettings'
import { Agent3D } from '../Agent3D'
import type { AgentState } from '../../../hooks/useSimData'

interface TownSceneBaseProps {
  children: React.ReactNode
  fogColor?: string
  fogNear?: number
  fogFar?: number
  ambientIntensity?: number
  sunColor?: string
  sunPosition?: [number, number, number]
  /** Agents currently present in this town */
  agentStates?: AgentState[]
}

export function TownSceneBase({
  children,
  fogColor = '#e8f0ff',
  fogNear = 20,
  fogFar = 60,
  ambientIntensity = 0.7,
  sunColor = '#fff8e8',
  sunPosition = [8, 16, 8],
  agentStates = [],
}: TownSceneBaseProps) {
  const { lowGraphics } = useSettings()

  return (
    <>
      <ambientLight intensity={ambientIntensity} />
      <directionalLight
        position={sunPosition}
        intensity={1.4}
        color={sunColor}
        castShadow={!lowGraphics}
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-6, 8, -4]} intensity={0.3} color="#c8d8ff" />
      {!lowGraphics && <fog attach="fog" args={[fogColor, fogNear, fogFar]} />}
      {!lowGraphics && <Environment preset="dawn" />}
      {!lowGraphics && <ContactShadows position={[0, -0.01, 0]} opacity={0.3} scale={16} blur={2} />}
      {/* Ground platform */}
      <mesh receiveShadow position={[0, -0.05, 0]}>
        <cylinderGeometry args={[7, 7.5, 0.1, 24]} />
        <meshStandardMaterial color="#7CB342" />
      </mesh>
      {children}
      {/* Agents present in this town */}
      <Suspense fallback={null}>
        {agentStates.map((state, i) => {
          const angle = (i / Math.max(agentStates.length, 1)) * Math.PI * 2
          const r = 2.5 + (i % 3) * 0.6
          const pos: [number, number, number] = [
            Math.cos(angle) * r,
            0.1,
            Math.sin(angle) * r,
          ]
          return (
            <Agent3D
              key={state.agent}
              agentState={state}
              position={pos}
              isHungry={state.food <= 1}
              scale={0.75}
            />
          )
        })}
      </Suspense>
    </>
  )
}

// Reusable animated particles (leaves, snow, fireflies)
interface ParticleSystemProps {
  count?: number
  color?: string
  size?: number
  spread?: number
  speed?: number
  emissive?: boolean
}
export function ParticleSystem({ count = 30, color = '#a5d6a7', size = 0.06, spread = 5, speed = 0.4, emissive = false }: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const positions = useRef<Float32Array>(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * spread * 2
      arr[i * 3 + 1] = Math.random() * 4
      arr[i * 3 + 2] = (Math.random() - 0.5) * spread * 2
    }
    return arr
  })
  const offsets = useRef<Float32Array>(new Float32Array(count).map(() => Math.random() * Math.PI * 2))

  useFrame(({ clock }) => {
    if (!pointsRef.current) return
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array
    const t = clock.elapsedTime
    for (let i = 0; i < count; i++) {
      const base = positions.current[i * 3 + 1]
      pos[i * 3 + 1] = ((base - speed * t * 0.3) % 4 + 4) % 4
      pos[i * 3]     = positions.current[i * 3]     + Math.sin(t * speed + offsets.current[i]) * 0.3
      pos[i * 3 + 2] = positions.current[i * 3 + 2] + Math.cos(t * speed + offsets.current[i]) * 0.3
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(count * 3), 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={size}
        transparent
        opacity={emissive ? 0.9 : 0.7}
        emissive={emissive ? color : undefined}
        emissiveIntensity={emissive ? 1 : 0}
        sizeAttenuation
      />
    </points>
  )
}

// Reusable animated water plane
export function WaterPlane({ color = '#4FC3F7', opacity = 0.75, size = 3 }: { color?: string; opacity?: number; size?: number }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    if (!matRef.current) return
    matRef.current.opacity = opacity + Math.sin(clock.elapsedTime * 1.2) * 0.05
  })
  return (
    <mesh position={[0, 0.02, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size, 8, 8]} />
      <meshStandardMaterial ref={matRef} color={color} transparent opacity={opacity} roughness={0.1} metalness={0.1} />
    </mesh>
  )
}

// Reusable pine tree
export function PineTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.5, 5]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
      <mesh position={[0, 0.9, 0]} castShadow>
        <coneGeometry args={[0.45, 0.8, 7]} />
        <meshStandardMaterial color="#1B5E20" />
      </mesh>
      <mesh position={[0, 1.4, 0]} castShadow>
        <coneGeometry args={[0.3, 0.6, 7]} />
        <meshStandardMaterial color="#2E7D32" />
      </mesh>
    </group>
  )
}

// Market stall with live price/stock
interface MarketStallProps {
  price?: number
  stock?: number
  position?: [number, number, number]
}
export function MarketStall({ price, stock, position = [0, 0, 0] }: MarketStallProps) {
  return (
    <group position={position}>
      {/* Table */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[1.2, 0.08, 0.6]} />
        <meshStandardMaterial color="#8D6E63" />
      </mesh>
      {/* Legs */}
      {[[-0.5, 0.15, -0.25], [0.5, 0.15, -0.25], [-0.5, 0.15, 0.25], [0.5, 0.15, 0.25]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <boxGeometry args={[0.05, 0.3, 0.05]} />
          <meshStandardMaterial color="#6D4C41" />
        </mesh>
      ))}
      {/* Striped awning */}
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[1.3, 0.04, 0.7]} />
        <meshStandardMaterial color="#FF6B2C" />
      </mesh>
      {/* Price tag (HTML overlay) */}
      {/* We'll skip HTML here to keep it pure 3D — price shown in a small floating sign */}
    </group>
  )
}
