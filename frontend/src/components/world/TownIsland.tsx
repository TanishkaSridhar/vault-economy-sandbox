import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

interface TownIslandProps {
  name: string
  terrain: string
  position: [number, number, number]
  currentPrice?: number
  currentStock?: number
  onClick: (name: string) => void
}

// Terrain-specific landmark colours
const TERRAIN_PALETTES: Record<string, { island: string; landmark: string; accent: string }> = {
  RIVER:     { island: '#5a8c5a', landmark: '#4FC3F7', accent: '#2196F3' },
  PLAINS:    { island: '#7ab558', landmark: '#FFC107', accent: '#ff8c00' },
  COAST:     { island: '#6b9a6b', landmark: '#CFD8DC', accent: '#78909C' },
  FOREST:    { island: '#3d6b3d', landmark: '#4CAF50', accent: '#2E7D32' },
  MARSH:     { island: '#5a7a6b', landmark: '#80CBC4', accent: '#00897B' },
  HILLS:     { island: '#7a9a5a', landmark: '#A5D6A7', accent: '#43A047' },
  DESERT:    { island: '#c8a850', landmark: '#FFB74D', accent: '#FF8F00' },
  MOUNTAINS: { island: '#8a9a9a', landmark: '#ECEFF1', accent: '#78909C' },
}

function TownLandmark({ terrain, palette }: { terrain: string; palette: typeof TERRAIN_PALETTES['RIVER'] }) {
  switch (terrain) {
    case 'RIVER':
      return (
        <group>
          {/* Water patch */}
          <mesh position={[0, 0.1, 0.3]} receiveShadow>
            <boxGeometry args={[1.2, 0.08, 0.6]} />
            <meshStandardMaterial color={palette.landmark} transparent opacity={0.8} />
          </mesh>
          {/* Watermill body */}
          <mesh position={[0, 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.2, 0.7, 6]} />
            <meshStandardMaterial color="#8D6E63" />
          </mesh>
          {/* Wheel */}
          <mesh position={[0.22, 0.4, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <torusGeometry args={[0.22, 0.04, 6, 8]} />
            <meshStandardMaterial color="#6D4C41" />
          </mesh>
          {/* Roof */}
          <mesh position={[0, 0.85, 0]} castShadow>
            <coneGeometry args={[0.26, 0.4, 6]} />
            <meshStandardMaterial color="#D32F2F" />
          </mesh>
        </group>
      )
    case 'PLAINS':
      return (
        <group>
          {/* Barn */}
          <mesh position={[0, 0.3, 0]} castShadow>
            <boxGeometry args={[0.8, 0.6, 0.6]} />
            <meshStandardMaterial color="#C62828" />
          </mesh>
          <mesh position={[0, 0.72, 0]} castShadow>
            <coneGeometry args={[0.6, 0.35, 4]} />
            <meshStandardMaterial color="#B71C1C" />
          </mesh>
          {/* Silo */}
          <mesh position={[0.65, 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.17, 0.7, 8]} />
            <meshStandardMaterial color="#A5D6A7" />
          </mesh>
        </group>
      )
    case 'COAST':
      return (
        <group>
          {/* Lighthouse */}
          <mesh position={[0.3, 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.16, 1.2, 8]} />
            <meshStandardMaterial color="#ECEFF1" />
          </mesh>
          <mesh position={[0.3, 1.26, 0]}>
            <sphereGeometry args={[0.14, 8, 8]} />
            <meshStandardMaterial color="#FF6B2C" emissive="#FF6B2C" emissiveIntensity={0.8} />
          </mesh>
          {/* Dock */}
          <mesh position={[-0.3, 0.07, 0.3]} castShadow>
            <boxGeometry args={[0.8, 0.1, 0.25]} />
            <meshStandardMaterial color="#8D6E63" />
          </mesh>
        </group>
      )
    case 'FOREST':
      return (
        <group>
          {/* Trees */}
          {[[-0.5, 0, -0.3], [0.4, 0, 0.1], [-0.1, 0, 0.5]] .map(([x, y, z], i) => (
            <group key={i} position={[x as number, y as number, z as number]}>
              <mesh position={[0, 0.2, 0]} castShadow>
                <cylinderGeometry args={[0.07, 0.1, 0.4, 5]} />
                <meshStandardMaterial color="#5D4037" />
              </mesh>
              <mesh position={[0, 0.65, 0]} castShadow>
                <coneGeometry args={[0.28 + i * 0.04, 0.6 + i * 0.1, 7]} />
                <meshStandardMaterial color={i === 1 ? '#2E7D32' : '#1B5E20'} />
              </mesh>
            </group>
          ))}
          {/* Cabin */}
          <mesh position={[0.1, 0.18, 0.1]} castShadow>
            <boxGeometry args={[0.4, 0.36, 0.4]} />
            <meshStandardMaterial color="#8D6E63" />
          </mesh>
        </group>
      )
    case 'MARSH':
      return (
        <group>
          {/* Water */}
          <mesh position={[0, 0.05, 0]} receiveShadow>
            <cylinderGeometry args={[1.1, 1.1, 0.06, 12]} />
            <meshStandardMaterial color={palette.landmark} transparent opacity={0.6} />
          </mesh>
          {/* Reeds */}
          {[[-0.5, 0, 0.3], [0.4, 0, -0.2], [0.2, 0, 0.6], [-0.3, 0, -0.4]].map(([x, y, z], i) => (
            <mesh key={i} position={[x as number, 0.4, z as number]} castShadow>
              <cylinderGeometry args={[0.025, 0.03, 0.8, 4]} />
              <meshStandardMaterial color="#558B2F" />
            </mesh>
          ))}
          {/* Boardwalk */}
          <mesh position={[0, 0.1, 0]} castShadow>
            <boxGeometry args={[1.4, 0.06, 0.2]} />
            <meshStandardMaterial color="#8D6E63" />
          </mesh>
        </group>
      )
    case 'HILLS':
      return (
        <group>
          {/* Rolling hill bumps */}
          <mesh position={[-0.5, 0.15, 0]} castShadow>
            <sphereGeometry args={[0.45, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#66BB6A" />
          </mesh>
          <mesh position={[0.4, 0.2, 0.2]} castShadow>
            <sphereGeometry args={[0.38, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#81C784" />
          </mesh>
          {/* Windmill */}
          <mesh position={[0, 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 1.0, 6]} />
            <meshStandardMaterial color="#ECEFF1" />
          </mesh>
          <mesh position={[0, 1.1, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
            <boxGeometry args={[0.8, 0.06, 0.06]} />
            <meshStandardMaterial color="#90A4AE" />
          </mesh>
          <mesh position={[0, 1.1, 0]} castShadow>
            <boxGeometry args={[0.06, 0.8, 0.06]} />
            <meshStandardMaterial color="#90A4AE" />
          </mesh>
        </group>
      )
    case 'DESERT':
      return (
        <group>
          {/* Market stall boxes */}
          <mesh position={[-0.3, 0.2, 0]} castShadow>
            <boxGeometry args={[0.5, 0.4, 0.5]} />
            <meshStandardMaterial color="#FFCC80" />
          </mesh>
          <mesh position={[-0.3, 0.44, 0]}>
            <boxGeometry args={[0.6, 0.06, 0.6]} />
            <meshStandardMaterial color="#FF6B2C" />
          </mesh>
          {/* Minaret */}
          <mesh position={[0.5, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.14, 1.0, 8]} />
            <meshStandardMaterial color="#FFE0B2" />
          </mesh>
          <mesh position={[0.5, 1.08, 0]} castShadow>
            <coneGeometry args={[0.14, 0.3, 8]} />
            <meshStandardMaterial color="#FF8F00" />
          </mesh>
          {/* Cactus */}
          <mesh position={[-0.65, 0.3, 0.3]} castShadow>
            <cylinderGeometry args={[0.07, 0.09, 0.6, 7]} />
            <meshStandardMaterial color="#4CAF50" />
          </mesh>
        </group>
      )
    case 'MOUNTAINS':
    default:
      return (
        <group>
          {/* Snow peak */}
          <mesh position={[0, 0.7, 0]} castShadow>
            <coneGeometry args={[0.7, 1.2, 7]} />
            <meshStandardMaterial color="#90A4AE" />
          </mesh>
          <mesh position={[0, 1.3, 0]} castShadow>
            <coneGeometry args={[0.35, 0.6, 7]} />
            <meshStandardMaterial color="#ECEFF1" />
          </mesh>
          {/* Cabin */}
          <mesh position={[0.6, 0.18, 0.2]} castShadow>
            <boxGeometry args={[0.35, 0.36, 0.35]} />
            <meshStandardMaterial color="#8D6E63" />
          </mesh>
        </group>
      )
  }
}

export function TownIsland({ name, terrain, position, currentPrice, currentStock, onClick }: TownIslandProps) {
  const [hovered, setHovered] = useState(false)
  const groupRef = useRef<THREE.Group>(null)
  const targetY = useRef(position[1])

  const palette = TERRAIN_PALETTES[terrain] ?? TERRAIN_PALETTES['PLAINS']

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const dest = hovered ? position[1] + 0.5 : position[1]
    targetY.current += (dest - targetY.current) * Math.min(delta * 8, 1)
    groupRef.current.position.y = targetY.current
  })

  return (
    <group
      ref={groupRef}
      position={[position[0], position[1], position[2]]}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default' }}
      onClick={(e) => { e.stopPropagation(); onClick(name) }}
    >
      {/* Island base */}
      <mesh receiveShadow castShadow position={[0, -0.1, 0]}>
        <cylinderGeometry args={[1.8, 2.2, 0.7, 6]} />
        <meshStandardMaterial color={palette.island} />
      </mesh>
      {/* Grass top */}
      <mesh receiveShadow position={[0, 0.26, 0]}>
        <cylinderGeometry args={[1.75, 1.75, 0.08, 6]} />
        <meshStandardMaterial color="#7CB342" />
      </mesh>
      {/* Orange glow ring when hovered */}
      {hovered && (
        <mesh position={[0, -0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.0, 2.4, 24]} />
          <meshBasicMaterial color="#FF6B2C" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* Landmark */}
      <group position={[0, 0.3, 0]}>
        <TownLandmark terrain={terrain} palette={palette} />
      </group>
      {/* Label on hover */}
      {hovered && (
        <Html position={[0, 2.5, 0]} center distanceFactor={8}>
          <div style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.9)',
            borderRadius: 12,
            padding: '8px 14px',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            color: '#1A1A2E',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            pointerEvents: 'none',
          }}>
            <div>{name}</div>
            <div style={{ fontSize: 11, fontWeight: 400, color: '#6B7280', marginTop: 2 }}>
              {terrain.charAt(0) + terrain.slice(1).toLowerCase()}
              {currentPrice != null && <span style={{ marginLeft: 8, color: '#FF6B2C', fontWeight: 600 }}>
                {currentPrice.toFixed(1)} 🪙
              </span>}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}
