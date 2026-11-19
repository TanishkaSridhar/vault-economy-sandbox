// Saltmarsh — marsh: shallow water, reed beds, wooden boardwalk, mist, dragonflies
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { TownSceneBase, WaterPlane, ParticleSystem, MarketStall } from './TownSceneBase'
import { useSettings } from '../../../hooks/useSettings'
import type { AgentState } from '../../../hooks/useSimData'

interface SaltmarshSceneProps { price?: number; stock?: number agentStates?: AgentState[] }
export function SaltmarshScene({ price, stock, agentStates = [] }: SaltmarshSceneProps) {
  const { lowGraphics } = useSettings()
  return (
    <TownSceneBase fogColor="#c8e0d8" fogNear={12} fogFar={40} sunColor="#d8ffe8" sunPosition={[6,14,4]} ambientIntensity={0.55}agentStates={agentStates}>
      <OrbitControls enablePan={false} minDistance={6} maxDistance={18} target={[0, 0.5, 0]} />
      {/* Marsh water */}
      <mesh position={[0, 0.02, 0.5]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[9, 6]} />
        <meshStandardMaterial color="#4DB6AC" transparent opacity={0.6} roughness={0.2} />
      </mesh>
      {/* Reeds clusters */}
      {[[-1.5,0,0.8],[1.2,0,0.3],[0.3,0,1.6],[-0.5,0,1.9],[2.0,0,1.2],[-2.2,0,1.0]].map(([x,y,z],i) => (
        <mesh key={i} position={[x as number, 0.45, z as number]} castShadow>
          <cylinderGeometry args={[0.025+i*0.005, 0.03, 0.9, 4]} />
          <meshStandardMaterial color={i%2===0 ? '#558B2F' : '#33691E'} />
        </mesh>
      ))}
      {/* Reed tops (fluffy) */}
      {[[-1.5,0,0.8],[1.2,0,0.3],[0.3,0,1.6]].map(([x,y,z],i) => (
        <mesh key={i} position={[x as number, 0.95, z as number]}>
          <cylinderGeometry args={[0.05, 0.02, 0.18, 6]} />
          <meshStandardMaterial color="#A1887F" />
        </mesh>
      ))}
      {/* Boardwalk */}
      {[-0.15, 0, 0.15].map((x, i) => (
        <mesh key={i} position={[x, 0.1, 0]} castShadow>
          <boxGeometry args={[0.16, 0.06, 4.0]} />
          <meshStandardMaterial color="#8D6E63" />
        </mesh>
      ))}
      {/* Boardwalk supports */}
      {[-1.5, -0.5, 0.5, 1.5].map((z, i) => (
        <mesh key={i} position={[0, 0.05, z]} castShadow>
          <boxGeometry args={[0.6, 0.06, 0.1]} />
          <meshStandardMaterial color="#6D4C41" />
        </mesh>
      ))}
      {/* Small hut */}
      <mesh position={[-2.0, 0.3, -1.2]} castShadow>
        <boxGeometry args={[0.9, 0.6, 0.8]} />
        <meshStandardMaterial color="#6D9C7F" />
      </mesh>
      <mesh position={[-2.0, 0.72, -1.2]} castShadow>
        <coneGeometry args={[0.68, 0.4, 5]} />
        <meshStandardMaterial color="#4CAF50" />
      </mesh>
      {/* Dragonflies */}
      {!lowGraphics && <ParticleSystem count={10} color="#76FF03" size={0.05} spread={2} speed={1.5} emissive />}
      {/* Mist */}
      {!lowGraphics && <ParticleSystem count={20} color="#B2DFDB" size={0.3} spread={3} speed={0.1} />}
      {/* Muted teal point light */}
      <pointLight position={[0, 4, 0]} intensity={0.4} color="#80CBC4" />
      <MarketStall price={price} stock={stock} position={[2.0, 0, -1.2]} />
    </TownSceneBase>
  )
}
