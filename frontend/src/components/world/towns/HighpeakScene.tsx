// Highpeak — mountains: snowy peaks, drifting snow, pine trees, cold blue-white light
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { TownSceneBase, PineTree, ParticleSystem, MarketStall } from './TownSceneBase'
import { useSettings } from '../../../hooks/useSettings'
import type { AgentState } from '../../../hooks/useSimData'

interface HighpeakSceneProps { price?: number; stock?: number agentStates?: AgentState[] }
export function HighpeakScene({ price, stock, agentStates = [] }: HighpeakSceneProps) {
  const { lowGraphics } = useSettings()
  return (
    <TownSceneBase
      fogColor="#d0e0ff"
      fogNear={15}
      fogFar={50}
      sunColor="#d0e8ff"
      sunPosition={[6, 20, 4]}
      ambientIntensity={0.6}
    >
      <OrbitControls enablePan={false} minDistance={6} maxDistance={18} target={[0, 1.5, 0]} />
      {/* Main peak */}
      <mesh position={[0, 1.5, -1.5]} castShadow>
        <coneGeometry args={[2.2, 3.5, 7]} />
        <meshStandardMaterial color="#90A4AE" />
      </mesh>
      {/* Snow cap */}
      <mesh position={[0, 3.1, -1.5]} castShadow>
        <coneGeometry args={[0.9, 1.4, 7]} />
        <meshStandardMaterial color="#ECEFF1" />
      </mesh>
      {/* Secondary peak */}
      <mesh position={[2.5, 0.8, -0.5]} castShadow>
        <coneGeometry args={[1.3, 2.2, 6]} />
        <meshStandardMaterial color="#78909C" />
      </mesh>
      <mesh position={[2.5, 2.0, -0.5]}>
        <coneGeometry args={[0.5, 0.8, 6]} />
        <meshStandardMaterial color="#ECEFF1" />
      </mesh>
      {/* Snow on ground */}
      <mesh position={[0, 0.03, 1.5]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[8, 5]} />
        <meshStandardMaterial color="#E8EAF6" />
      </mesh>
      {/* Pine trees */}
      <PineTree position={[-1.8, 0, 0.5]} scale={0.85} />
      <PineTree position={[1.2, 0, 0.8]} scale={0.7} />
      <PineTree position={[-3.0, 0, -0.5]} scale={1.0} />
      {/* Mountain cabin */}
      <mesh position={[1.0, 0.3, 1.5]} castShadow>
        <boxGeometry args={[0.9, 0.6, 0.8]} />
        <meshStandardMaterial color="#8D6E63" />
      </mesh>
      <mesh position={[1.0, 0.72, 1.5]} castShadow>
        <coneGeometry args={[0.65, 0.4, 4]} />
        <meshStandardMaterial color="#607D8B" />
      </mesh>
      {/* Drifting snow particles */}
      {!lowGraphics && <ParticleSystem count={40} color="#FFFFFF" size={0.04} spread={4} speed={0.6} />}
      {/* Cold blue rim light */}
      <pointLight position={[-5, 8, -5]} intensity={0.6} color="#c0d8ff" />
      <MarketStall price={price} stock={stock} position={[-1.5, 0, 2.0]} />
    </TownSceneBase>
  )
}
