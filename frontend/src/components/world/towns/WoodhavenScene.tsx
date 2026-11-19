// Woodhaven — forest: pine/oak trees, log cabin, chimney smoke, falling leaves, fireflies
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { TownSceneBase, PineTree, ParticleSystem, MarketStall } from './TownSceneBase'
import { useSettings } from '../../../hooks/useSettings'
import type { AgentState } from '../../../hooks/useSimData'

function ChimneySmoke({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Points>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.5) * 0.2
    const pos = ref.current.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < 8; i++) {
      pos[i*3+1] += 0.01
      if (pos[i*3+1] > 2.5) pos[i*3+1] = 0
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })
  const positions = new Float32Array(8*3).map((_, i) => i%3===1 ? Math.random()*2 : (Math.random()-0.5)*0.3)
  return (
    <points ref={ref} position={position}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={8} />
      </bufferGeometry>
      <pointsMaterial color="#B0BEC5" size={0.12} transparent opacity={0.5} sizeAttenuation />
    </points>
  )
}

interface WoodhavenSceneProps { price?: number; stock?: number; agentStates?: AgentState[] }
export function WoodhavenScene({ price, stock, agentStates = [] }: WoodhavenSceneProps) {
  const { lowGraphics } = useSettings()
  return (
    <TownSceneBase fogColor="#c8dfc8" sunColor="#ffe0a0" ambientIntensity={0.55} agentStates={agentStates}>
      <OrbitControls enablePan={false} minDistance={6} maxDistance={18} target={[0, 1, 0]} />
      {/* Dense trees */}
      <PineTree position={[-2.5, 0, -1]} scale={1.1} />
      <PineTree position={[2.2, 0, -1.5]} scale={0.9} />
      <PineTree position={[-1.8, 0, 2.0]} scale={1.0} />
      <PineTree position={[2.8, 0, 1.8]} scale={1.3} />
      <PineTree position={[-2.0, 0, -2.8]} scale={1.2} />
      <PineTree position={[0.5, 0, -2.5]} scale={0.85} />
      {/* Oak (round top) */}
      {[[1.5,0,0.5],[-0.8,0,-1.5]].map(([x,y,z],i)=>(
        <group key={i} position={[x,y,z]}>
          <mesh position={[0,0.4,0]} castShadow><cylinderGeometry args={[0.09,0.12,0.8,5]}/><meshStandardMaterial color="#5D4037"/></mesh>
          <mesh position={[0,1.1,0]} castShadow><sphereGeometry args={[0.5,10,10]}/><meshStandardMaterial color="#2E7D32"/></mesh>
        </group>
      ))}
      {/* Log cabin */}
      <mesh position={[0, 0.4, 0.5]} castShadow>
        <boxGeometry args={[1.4, 0.8, 1.0]} />
        <meshStandardMaterial color="#8D6E63" />
      </mesh>
      <mesh position={[0, 0.92, 0.5]} castShadow>
        <coneGeometry args={[1.0, 0.6, 4]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.26, 1.01]}>
        <boxGeometry args={[0.24, 0.52, 0.02]} />
        <meshStandardMaterial color="#4E342E" />
      </mesh>
      {/* Chimney & smoke */}
      <mesh position={[0.4, 1.1, 0.5]} castShadow>
        <boxGeometry args={[0.18, 0.5, 0.18]} />
        <meshStandardMaterial color="#8D6E63" />
      </mesh>
      {!lowGraphics && <ChimneySmoke position={[0.4, 1.4, 0.5]} />}
      {/* Falling leaves */}
      {!lowGraphics && <ParticleSystem count={25} color="#FF8F00" size={0.055} spread={3} speed={0.5} />}
      {/* Fireflies (emissive) */}
      {!lowGraphics && <ParticleSystem count={12} color="#FFEE58" size={0.045} spread={3} speed={0.2} emissive />}
      <MarketStall price={price} stock={stock} position={[-2.2, 0, 0.8]} />
    </TownSceneBase>
  )
}
