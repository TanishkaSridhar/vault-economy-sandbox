// Sandreach — desert: dunes, cacti, sandstone market, heat shimmer, camel, warm orange light
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { TownSceneBase, MarketStall, ParticleSystem } from './TownSceneBase'
import { useSettings } from '../../../hooks/useSettings'
import type { AgentState } from '../../../hooks/useSimData'

function ChewingCamel({ position }: { position: [number, number, number] }) {
  const headRef = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!headRef.current) return
    headRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.8) * 0.15
  })
  return (
    <group position={position}>
      {/* Body */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.9, 0.5, 0.4]} />
        <meshStandardMaterial color="#D4A054" />
      </mesh>
      {/* Hump */}
      <mesh position={[0.1, 0.72, 0]} castShadow>
        <sphereGeometry args={[0.22, 8, 8, 0, Math.PI*2, 0, Math.PI/1.5]} />
        <meshStandardMaterial color="#C4903F" />
      </mesh>
      {/* Head */}
      <mesh ref={headRef} position={[0.55, 0.52, 0]} castShadow>
        <boxGeometry args={[0.26, 0.26, 0.22]} />
        <meshStandardMaterial color="#D4A054" />
      </mesh>
      {/* Neck */}
      <mesh position={[0.42, 0.44, 0]} rotation={[0, 0, -0.4]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.35, 5]} />
        <meshStandardMaterial color="#C4903F" />
      </mesh>
      {/* Legs */}
      {[[-0.3,0.12,-0.15],[0.3,0.12,-0.15],[-0.3,0.12,0.15],[0.3,0.12,0.15]].map(([x,y,z],i)=>(
        <mesh key={i} position={[x,y,z]} castShadow>
          <boxGeometry args={[0.08,0.3,0.08]} />
          <meshStandardMaterial color="#C4903F" />
        </mesh>
      ))}
    </group>
  )
}

interface SandreachSceneProps { price?: number; stock?: number agentStates?: AgentState[] }
export function SandreachScene({ price, stock, agentStates = [] }: SandreachSceneProps) {
  const { lowGraphics } = useSettings()
  return (
    <TownSceneBase fogColor="#ffe8c0" fogNear={18} fogFar={55} sunColor="#ffe090" sunPosition={[12, 18, 2]} ambientIntensity={0.85}agentStates={agentStates}>
      <OrbitControls enablePan={false} minDistance={6} maxDistance={18} target={[0, 0.8, 0]} />
      {/* Sand dunes */}
      <mesh position={[-2.5, -0.2, 0.5]} castShadow>
        <sphereGeometry args={[2.0, 12, 12, 0, Math.PI*2, 0, Math.PI/2]} />
        <meshStandardMaterial color="#FFE0B2" />
      </mesh>
      <mesh position={[2.5, -0.3, 1.0]} castShadow>
        <sphereGeometry args={[1.6, 12, 12, 0, Math.PI*2, 0, Math.PI/2]} />
        <meshStandardMaterial color="#FFCC80" />
      </mesh>
      <mesh position={[0, -0.4, 2.8]} castShadow>
        <sphereGeometry args={[2.2, 12, 12, 0, Math.PI*2, 0, Math.PI/2]} />
        <meshStandardMaterial color="#FFECB3" />
      </mesh>
      {/* Cacti */}
      {[[-1.8,0,0.5],[2.0,0,-1.0],[-0.5,0,-2.0]].map(([x,y,z],i)=>(
        <group key={i} position={[x as number,y as number,z as number]}>
          <mesh position={[0,0.4,0]} castShadow>
            <cylinderGeometry args={[0.08,0.1,0.8,7]} />
            <meshStandardMaterial color="#4CAF50" />
          </mesh>
          {i===0 && <>
            <mesh position={[0.2,0.5,0]} rotation={[0,0,-0.6]} castShadow>
              <cylinderGeometry args={[0.055,0.07,0.4,6]} />
              <meshStandardMaterial color="#43A047" />
            </mesh>
          </>}
        </group>
      ))}
      {/* Market stalls with awnings */}
      {[[-0.5,0,-0.5],[0.6,0,0.2]].map(([x,y,z],i)=>(
        <group key={i} position={[x as number,y as number,z as number]}>
          <mesh position={[0,0.25,0]} castShadow>
            <boxGeometry args={[0.6,0.5,0.5]} />
            <meshStandardMaterial color="#FFCC80" />
          </mesh>
          <mesh position={[0,0.56,0]}>
            <boxGeometry args={[0.7,0.05,0.65]} />
            <meshStandardMaterial color={i===0?'#FF6B2C':'#E91E63'} />
          </mesh>
        </group>
      ))}
      {/* Minaret */}
      <mesh position={[1.8, 0.8, -1.5]} castShadow>
        <cylinderGeometry args={[0.14, 0.2, 1.6, 9]} />
        <meshStandardMaterial color="#FFE0B2" />
      </mesh>
      <mesh position={[1.8, 1.65, -1.5]} castShadow>
        <coneGeometry args={[0.18, 0.4, 9]} />
        <meshStandardMaterial color="#FF8F00" />
      </mesh>
      {/* Camel */}
      <ChewingCamel position={[-2.5, 0, -1.5]} />
      {/* Heat shimmer particles (sand drift) */}
      {!lowGraphics && <ParticleSystem count={15} color="#FFE082" size={0.1} spread={3} speed={0.2} />}
      {/* Warm sunlight */}
      <pointLight position={[0, 8, 0]} intensity={0.6} color="#ffe090" />
      <MarketStall price={price} stock={stock} position={[2.2, 0, 1.0]} />
    </TownSceneBase>
  )
}
