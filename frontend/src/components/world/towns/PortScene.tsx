// Port — coast: wooden docks, lighthouse with flashing light, moored boats rocking, crates, seagulls
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { TownSceneBase, MarketStall, ParticleSystem } from './TownSceneBase'
import { useSettings } from '../../../hooks/useSettings'
import type { AgentState } from '../../../hooks/useSimData'

function RockingBoat({ position, phase = 0 }: { position: [number, number, number]; phase?: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.rotation.z = Math.sin(t * 0.8 + phase) * 0.08
    ref.current.position.y = position[1] + Math.sin(t * 1.1 + phase) * 0.04
  })
  return (
    <group ref={ref} position={position}>
      {/* Hull */}
      <mesh castShadow>
        <boxGeometry args={[0.9, 0.22, 0.4]} />
        <meshStandardMaterial color="#6D4C41" />
      </mesh>
      {/* Mast */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.03, 1.0, 5]} />
        <meshStandardMaterial color="#8D6E63" />
      </mesh>
      {/* Sail */}
      <mesh position={[0, 0.65, 0.1]}>
        <planeGeometry args={[0.5, 0.6]} />
        <meshStandardMaterial color="#ECEFF1" side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function LighthouseBeam({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.PointLight>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.intensity = (Math.sin(clock.elapsedTime * 3) + 1) * 0.8
  })
  return <pointLight ref={ref} position={position} intensity={0.8} color="#FF6B2C" distance={12} />
}

interface PortSceneProps { price?: number; stock?: number agentStates?: AgentState[] }
export function PortScene({ price, stock, agentStates = [] }: PortSceneProps) {
  const { lowGraphics } = useSettings()
  return (
    <TownSceneBase fogColor="#c8dfff" sunColor="#e8f4ff" sunPosition={[8,16,6]} ambientIntensity={0.6}agentStates={agentStates}>
      <OrbitControls enablePan={false} minDistance={6} maxDistance={18} target={[0, 1, 0]} />
      {/* Ocean */}
      <mesh position={[0, -0.05, 1.5]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[12, 7]} />
        <meshStandardMaterial color="#1565C0" transparent opacity={0.75} roughness={0.05} metalness={0.15} />
      </mesh>
      {/* Dock planks */}
      {[-0.2, 0, 0.2].map((x, i) => (
        <mesh key={i} position={[x, 0.07, 1.2]} castShadow>
          <boxGeometry args={[0.18, 0.06, 2.5]} />
          <meshStandardMaterial color="#8D6E63" />
        </mesh>
      ))}
      {/* Dock posts */}
      {[-0.3, 0.3].map((x, i) => [0.4, 1.4, 2.2].map((z, j) => (
        <mesh key={`${i}-${j}`} position={[x, 0.4, z]} castShadow>
          <cylinderGeometry args={[0.04, 0.05, 0.9, 5]} />
          <meshStandardMaterial color="#6D4C41" />
        </mesh>
      )))}
      {/* Lighthouse */}
      <mesh position={[-2.0, 1.0, -1.0]} castShadow>
        <cylinderGeometry args={[0.22, 0.28, 2.0, 9]} />
        <meshStandardMaterial color="#ECEFF1" />
      </mesh>
      <mesh position={[-2.0, 2.15, -1.0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.3, 9]} />
        <meshStandardMaterial color="#FF6B2C" emissive="#FF6B2C" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[-2.0, 2.4, -1.0]}>
        <coneGeometry args={[0.28, 0.3, 9]} />
        <meshStandardMaterial color="#607D8B" />
      </mesh>
      <LighthouseBeam position={[-2.0, 2.3, -1.0]} />
      {/* Boats */}
      <RockingBoat position={[-0.8, 0.1, 2.5]} phase={0} />
      <RockingBoat position={[0.8, 0.1, 2.8]} phase={1.5} />
      {/* Crates & barrels */}
      {[[1.5,0.15,-0.5],[1.8,0.15,-0.2],[1.5,0.4,-0.5]].map(([x,y,z],i)=>(
        <mesh key={i} position={[x as number,y as number,z as number]} castShadow>
          <boxGeometry args={[0.3,0.3,0.3]} />
          <meshStandardMaterial color="#8D6E63" />
        </mesh>
      ))}
      {/* Seagulls */}
      {!lowGraphics && <ParticleSystem count={8} color="#ECEFF1" size={0.07} spread={4} speed={1.2} />}
      <MarketStall price={price} stock={stock} position={[2.0, 0, -1.0]} />
    </TownSceneBase>
  )
}
