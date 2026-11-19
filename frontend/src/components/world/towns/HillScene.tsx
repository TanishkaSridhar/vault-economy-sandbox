// Hill — hills terrain: rolling hills, windmill with turning blades, stone walls, sheep
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { TownSceneBase, MarketStall } from './TownSceneBase'
import { useSettings } from '../../../hooks/useSettings'
import type { AgentState } from '../../../hooks/useSimData'

function WindmillBlades({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.z += delta * 0.6 })
  return (
    <group ref={ref} position={position}>
      {[0, Math.PI/2, Math.PI, Math.PI*3/2].map((angle, i) => (
        <mesh key={i} rotation={[0, 0, angle]} position={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[0.08, 0.7, 0.04]} />
          <meshStandardMaterial color="#ECEFF1" />
        </mesh>
      ))}
    </group>
  )
}

function WanderingSheep({ startPos }: { startPos: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null)
  const offset = Math.random() * Math.PI * 2
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime * 0.3 + offset
    ref.current.position.x = startPos[0] + Math.sin(t) * 0.8
    ref.current.position.z = startPos[2] + Math.cos(t * 0.7) * 0.6
    ref.current.rotation.y = Math.atan2(Math.cos(t), Math.sin(t * 0.7))
  })
  return (
    <group ref={ref} position={startPos}>
      <mesh position={[0, 0.14, 0]} castShadow>
        <sphereGeometry args={[0.16, 8, 8]} />
        <meshStandardMaterial color="#FAFAFA" />
      </mesh>
      <mesh position={[0.14, 0.2, 0]} castShadow>
        <sphereGeometry args={[0.1, 7, 7]} />
        <meshStandardMaterial color="#FAFAFA" />
      </mesh>
      {/* Legs */}
      {[[-0.08,0,-0.07],[0.08,0,-0.07],[-0.08,0,0.07],[0.08,0,0.07]].map(([x,y,z],i)=>(
        <mesh key={i} position={[x,0.03,z]}>
          <boxGeometry args={[0.04,0.1,0.04]} />
          <meshStandardMaterial color="#212121" />
        </mesh>
      ))}
    </group>
  )
}

interface HillSceneProps { price?: number; stock?: number agentStates?: AgentState[] }
export function HillScene({ price, stock, agentStates = [] }: HillSceneProps) {
  const { lowGraphics } = useSettings()
  return (
    <TownSceneBase fogColor="#d8f0d0" sunColor="#ffee80" ambientIntensity={0.75}agentStates={agentStates}>
      <OrbitControls enablePan={false} minDistance={6} maxDistance={18} target={[0, 1, 0]} />
      {/* Rolling hill hemispheres */}
      <mesh position={[-2.5, -0.1, -1]} castShadow>
        <sphereGeometry args={[1.8, 12, 12, 0, Math.PI*2, 0, Math.PI/2]} />
        <meshStandardMaterial color="#66BB6A" />
      </mesh>
      <mesh position={[2.0, -0.2, 0.5]} castShadow>
        <sphereGeometry args={[1.5, 12, 12, 0, Math.PI*2, 0, Math.PI/2]} />
        <meshStandardMaterial color="#81C784" />
      </mesh>
      <mesh position={[0, -0.3, 2.5]} castShadow>
        <sphereGeometry args={[2.0, 12, 12, 0, Math.PI*2, 0, Math.PI/2]} />
        <meshStandardMaterial color="#A5D6A7" />
      </mesh>
      {/* Windmill tower */}
      <mesh position={[-0.5, 0.8, -1.5]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1.6, 7]} />
        <meshStandardMaterial color="#ECEFF1" />
      </mesh>
      <WindmillBlades position={[-0.5, 1.65, -1.42]} />
      {/* Stone walls */}
      {[[-1.5,0.1,-0.4],[1.2,0.1,0.3]].map(([x,y,z],i) => (
        <mesh key={i} position={[x as number, y as number, z as number]} castShadow rotation={[0, i*Math.PI/4, 0]}>
          <boxGeometry args={[2.0, 0.22, 0.14]} />
          <meshStandardMaterial color="#9E9E9E" roughness={0.9} />
        </mesh>
      ))}
      {/* Grazing sheep */}
      {!lowGraphics && [[-1.0,0,0.8],[0.8,0,-0.3],[1.5,0,1.5]].map((pos, i) => (
        <WanderingSheep key={i} startPos={pos as [number,number,number]} />
      ))}
      {/* Winding path */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI/2, 0, 0.3]}>
        <planeGeometry args={[0.6, 5]} />
        <meshStandardMaterial color="#D7CCC8" />
      </mesh>
      <MarketStall price={price} stock={stock} position={[1.5, 0, -1.5]} />
    </TownSceneBase>
  )
}
