// Valley — plains: wheat fields swaying in wind, red barn, scarecrow, warm sunlight
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { TownSceneBase, MarketStall, ParticleSystem } from './TownSceneBase'
import { useSettings } from '../../../hooks/useSettings'
import type { AgentState } from '../../../hooks/useSimData'

function WheatField({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const COUNT = 36
  const dummy = new THREE.Object3D()

  // Set initial transforms
  if (ref.current) {
    for (let i = 0; i < COUNT; i++) {
      const row = Math.floor(i / 6)
      const col = i % 6
      dummy.position.set(position[0] + col * 0.3 - 0.75, position[1] + 0.2, position[2] + row * 0.3 - 0.75)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  }

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    for (let i = 0; i < COUNT; i++) {
      const row = Math.floor(i / 6)
      const col = i % 6
      dummy.position.set(position[0] + col * 0.3 - 0.75, position[1] + 0.2, position[2] + row * 0.3 - 0.75)
      dummy.rotation.z = Math.sin(t * 1.2 + col * 0.5 + row * 0.3) * 0.12
      dummy.updateMatrix()
      ref.current!.setMatrixAt(i, dummy.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]}>
      <cylinderGeometry args={[0.025, 0.03, 0.5, 4]} />
      <meshStandardMaterial color="#FDD835" />
    </instancedMesh>
  )
}

interface ValleySceneProps { price?: number; stock?: number; agentStates?: AgentState[] }
export function ValleyScene({ price, stock, agentStates = [] }: ValleySceneProps) {
  const { lowGraphics } = useSettings()
  return (
    <TownSceneBase fogColor="#fff8e0" sunColor="#fffde0" sunPosition={[12, 18, 8]} ambientIntensity={0.8} agentStates={agentStates}>
      <OrbitControls enablePan={false} minDistance={6} maxDistance={18} target={[0, 0.8, 0]} />
      {/* Wheat fields */}
      <WheatField position={[-1.5, 0, -1.5]} />
      <WheatField position={[1.0, 0, -1.5]} />
      {/* Red barn */}
      <mesh position={[-0.2, 0.5, 1.2]} castShadow>
        <boxGeometry args={[1.6, 1.0, 1.0]} />
        <meshStandardMaterial color="#C62828" />
      </mesh>
      <mesh position={[-0.2, 1.1, 1.2]} castShadow>
        <coneGeometry args={[1.2, 0.6, 4]} />
        <meshStandardMaterial color="#B71C1C" />
      </mesh>
      {/* Barn door */}
      <mesh position={[-0.2, 0.36, 1.71]}>
        <boxGeometry args={[0.5, 0.72, 0.02]} />
        <meshStandardMaterial color="#6D4C41" />
      </mesh>
      {/* Silo */}
      <mesh position={[1.1, 0.6, 1.2]} castShadow>
        <cylinderGeometry args={[0.22, 0.25, 1.2, 10]} />
        <meshStandardMaterial color="#A5D6A7" />
      </mesh>
      {/* Scarecrow */}
      <mesh position={[2.0, 0.5, -0.5]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 1.0, 5]} />
        <meshStandardMaterial color="#8D6E63" />
      </mesh>
      <mesh position={[2.0, 0.6, -0.5]} castShadow>
        <boxGeometry args={[0.6, 0.06, 0.06]} />
        <meshStandardMaterial color="#8D6E63" />
      </mesh>
      <mesh position={[2.0, 0.95, -0.5]} castShadow>
        <sphereGeometry args={[0.13, 7, 7]} />
        <meshStandardMaterial color="#FDD835" />
      </mesh>
      {/* Warm sunlight glow */}
      <pointLight position={[0, 6, 0]} intensity={0.5} color="#fffde0" />
      {/* Bird scatter (particle) */}
      {!lowGraphics && <ParticleSystem count={8} color="#37474F" size={0.06} spread={3} speed={0.9} />}
      <MarketStall price={price} stock={stock} position={[2.2, 0, 1.8]} />
    </TownSceneBase>
  )
}
