// Riverton — river terrain: animated river, watermill, bridge, reeds, ducks
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { TownSceneBase, ParticleSystem, MarketStall } from './TownSceneBase'
import { useSettings } from '../../../hooks/useSettings'
import type { AgentState } from '../../../hooks/useSimData'

function RotatingWheel({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.z -= delta * 0.8 })
  return (
    <mesh ref={ref} position={position} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.35, 0.05, 6, 10]} />
      <meshStandardMaterial color="#6D4C41" />
    </mesh>
  )
}

function DuckBob({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null)
  const offset = Math.random() * Math.PI * 2
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 1.5 + offset) * 0.04
  })
  return (
    <group ref={ref} position={position}>
      <mesh><sphereGeometry args={[0.08, 6, 6]} /><meshStandardMaterial color="#FDD835" /></mesh>
      <mesh position={[0.08, 0.04, 0]}><sphereGeometry args={[0.055, 6, 6]} /><meshStandardMaterial color="#FDD835" /></mesh>
    </group>
  )
}

interface RivertonSceneProps { price?: number; stock?: number; agentCount?: number; agentStates?: AgentState[] }
export function RivertonScene({ price, stock, agentStates = [] }: RivertonSceneProps) {
  const { lowGraphics } = useSettings()
  return (
    <TownSceneBase fogColor="#d0eeff" sunColor="#ffe8cc" ambientIntensity={0.65} agentStates={agentStates}>
      <OrbitControls enablePan={false} minDistance={6} maxDistance={18} target={[0, 1, 0]} />
      {/* River */}
      <mesh position={[0, 0.03, 0.5]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[2.5, 6, 8, 8]} />
        <meshStandardMaterial color="#4FC3F7" transparent opacity={0.75} roughness={0.1} />
      </mesh>
      {/* Bridge */}
      <mesh position={[0, 0.12, 0.5]} castShadow>
        <boxGeometry args={[2.8, 0.1, 0.5]} />
        <meshStandardMaterial color="#8D6E63" />
      </mesh>
      {/* Bridge railings */}
      {[-1.3, 1.3].map((x, i) => (
        <mesh key={i} position={[x, 0.26, 0.5]} castShadow>
          <boxGeometry args={[0.06, 0.28, 0.5]} />
          <meshStandardMaterial color="#6D4C41" />
        </mesh>
      ))}
      {/* Watermill */}
      <mesh position={[-1.8, 0.5, 0.2]} castShadow>
        <boxGeometry args={[0.6, 1.0, 0.5]} />
        <meshStandardMaterial color="#8D6E63" />
      </mesh>
      <mesh position={[-1.8, 1.08, 0.2]} castShadow>
        <coneGeometry args={[0.42, 0.5, 5]} />
        <meshStandardMaterial color="#B71C1C" />
      </mesh>
      <RotatingWheel position={[-1.42, 0.5, 0.2]} />
      {/* Reeds */}
      {[[0.8,0,1.5],[1.1,0,0.3],[-0.3,0,1.8],[0.3,0,1.6]].map(([x,,z],i) => (
        <mesh key={i} position={[x as number, 0.4+i*0.05, z as number]} castShadow>
          <cylinderGeometry args={[0.025,0.03,0.8,4]} />
          <meshStandardMaterial color="#558B2F" />
        </mesh>
      ))}
      {/* Ducks */}
      {!lowGraphics && [[0.3,0.08,0.8],[-0.2,0.08,1.1]].map(([x,y,z],i) => (
        <DuckBob key={i} position={[x as number, y as number, z as number]} />
      ))}
      {/* House */}
      <mesh position={[1.8, 0.4, -1.2]} castShadow>
        <boxGeometry args={[1.0, 0.8, 0.9]} />
        <meshStandardMaterial color="#EFEBE9" />
      </mesh>
      <mesh position={[1.8, 0.92, -1.2]} castShadow>
        <coneGeometry args={[0.75, 0.5, 4]} />
        <meshStandardMaterial color="#8D6E63" />
      </mesh>
      {!lowGraphics && <ParticleSystem count={12} color="#4FC3F7" size={0.04} spread={2} speed={0.3} />}
      <MarketStall price={price} stock={stock} position={[2.2, 0, 1.0]} />
    </TownSceneBase>
  )
}
