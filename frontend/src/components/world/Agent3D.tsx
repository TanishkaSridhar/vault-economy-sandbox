/**
 * Agent3D — renders a single agent as an animated billboard sprite
 * in the 3D world (WorldMapScene or TownSceneBase).
 *
 * Features:
 * - Billboard sprite with fake-3D depth (two offset planes)
 * - Soft contact shadow beneath the agent
 * - Idle breathing bob animation
 * - Walk cycle when travelling (hop-bob, lean, squash/stretch)
 * - Buy/sell jump + coin sparkle on matching event
 * - Hungry droop + tint when food ≤ 1
 * - Profit coin-burst when money increased
 * - Role badge (Html overlay)
 * - Click → opens AgentCard popover, camera follows
 */
import { useRef, useState, useMemo, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, Billboard, ContactShadows, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { getCharacter, ROLE_COLORS, ROLE_ICONS } from './characterData'
import type { AgentState } from '../../hooks/useSimData'
import { AgentCard } from './AgentCard'

interface Agent3DProps {
  agentState: AgentState
  position: [number, number, number]
  /** True when this agent is mid-travel on a road */
  isTravelling?: boolean
  /** 0-1 progress along the road when travelling */
  travelProgress?: number
  /** Whether the agent is hungry (food ≤ 1) */
  isHungry?: boolean
  /** Whether the agent just made a profit this turn */
  madeProfit?: boolean
  /** Whether the agent just traded (bought/sold) this turn */
  didTrade?: boolean
  /** Scale the whole character (default 1) */
  scale?: number
  onSelect?: (agentName: string) => void
  isSelected?: boolean
  extraData?: {
    moneyHistory?: number[]
    lastDecision?: string
    lastReason?: string
    relationships?: Array<{ to: string; trust: number; familiarity: number }>
    role?: string
    destination?: string
  }
}

// Particle for coin sparkle
function CoinParticle({
  origin,
  active,
}: {
  origin: [number, number, number]
  active: boolean
}) {
  const ref = useRef<THREE.Points>(null)
  const t = useRef(0)

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const positions = new Float32Array(12 * 3) // 12 particles
    for (let i = 0; i < 12; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 0.6
      positions[i * 3 + 1] = Math.random() * 0.4
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.6
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [])

  useFrame((_, delta) => {
    if (!ref.current || !active) {
      t.current = 0
      return
    }
    t.current = Math.min(t.current + delta * 1.5, 1)
    const mat = ref.current.material as THREE.PointsMaterial
    mat.opacity = 1 - t.current
    const pos = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < 12; i++) {
      pos.array[i * 3 + 1] += delta * 0.5
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={ref} position={origin}>
      <primitive object={geo} />
      <pointsMaterial
        size={0.08}
        color="#FFD700"
        transparent
        opacity={1}
        depthWrite={false}
      />
    </points>
  )
}

export function Agent3D({
  agentState,
  position,
  isTravelling = false,
  travelProgress = 0.5,
  isHungry = false,
  madeProfit = false,
  didTrade = false,
  scale = 1,
  onSelect,
  isSelected = false,
  extraData,
}: Agent3DProps) {
  const char = getCharacter(agentState.agent)
  const roleColor = ROLE_COLORS[char.role]
  const roleIcon  = ROLE_ICONS[char.role]

  const [cardOpen, setCardOpen] = useState(false)
  const groupRef  = useRef<THREE.Group>(null)
  const meshRef   = useRef<THREE.Mesh>(null)
  const mesh2Ref  = useRef<THREE.Mesh>(null)
  const bobT      = useRef(Math.random() * Math.PI * 2) // stagger bob phase

  const { camera } = useThree()

  // Load sprite texture
  const spritePath = `/characters/${char.sprite}`
  let tex: THREE.Texture | null = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    tex = useTexture(spritePath)
    if (tex) {
      tex.colorSpace = THREE.SRGBColorSpace
    }
  } catch {
    tex = null
  }

  const handleClick = useCallback(
    (e: THREE.Event) => {
      e.stopPropagation?.()
      setCardOpen(v => !v)
      onSelect?.(agentState.agent)
    },
    [agentState.agent, onSelect]
  )

  // Animation frame
  useFrame((_, delta) => {
    if (!groupRef.current) return
    bobT.current += delta

    const baseY = position[1]

    if (isTravelling) {
      // Walking cycle: hop-bob at 2 Hz
      const hop = Math.abs(Math.sin(bobT.current * Math.PI * 2 * 2)) * 0.12
      // Squash/stretch
      const stretch = 1 + hop * 0.3
      const squash  = 1 - hop * 0.15
      groupRef.current.position.y = baseY + hop
      if (meshRef.current)  meshRef.current.scale.set(squash, stretch, squash)
      if (mesh2Ref.current) mesh2Ref.current.scale.set(squash, stretch, squash)
      // Lean direction of travel (slight tilt)
      groupRef.current.rotation.z = Math.sin(bobT.current * Math.PI * 2 * 2) * 0.08
    } else if (isHungry) {
      // Droopy idle
      const droop = Math.sin(bobT.current * 0.8) * 0.02 - 0.05
      groupRef.current.position.y = baseY + droop
      groupRef.current.rotation.z = Math.sin(bobT.current * 0.4) * 0.04 - 0.08
    } else if (didTrade) {
      // Trade jump — spring up and down
      const jump = Math.abs(Math.sin(bobT.current * Math.PI * 3)) * 0.3 * Math.exp(-bobT.current * 0.8)
      groupRef.current.position.y = baseY + jump
      groupRef.current.rotation.z = 0
    } else {
      // Idle breathing bob
      const bob = Math.sin(bobT.current * Math.PI * 2 * 1.0) * 0.03
      groupRef.current.position.y = baseY + bob
      groupRef.current.rotation.z = 0
    }

    // Camera follow when selected
    if (isSelected) {
      const target = new THREE.Vector3(...position)
      camera.position.lerp(
        new THREE.Vector3(target.x + 3, target.y + 4, target.z + 5),
        delta * 1.5
      )
      camera.lookAt(target)
    }
  })

  const spriteW = 0.9 * scale
  const spriteH = 1.1 * scale

  // Hunger tint
  const tintColor = isHungry ? '#99aaff' : 'white'

  return (
    <group ref={groupRef} position={position}>
      {/* Contact shadow */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.35}
        scale={1.2 * scale}
        blur={0.8}
        far={0.5}
        frames={1}
      />

      {/* Billboard sprite – two depth layers for fake 3D */}
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        {/* Back layer (slightly larger, offset back) */}
        <mesh
          ref={mesh2Ref}
          position={[0.03, 0, -0.04]}
          onClick={handleClick}
          onPointerOver={() => document.body.style.cursor = 'pointer'}
          onPointerOut={() => document.body.style.cursor = ''}
        >
          <planeGeometry args={[spriteW * 1.04, spriteH * 1.04]} />
          <meshBasicMaterial
            map={tex ?? undefined}
            transparent
            alphaTest={0.3}
            color={new THREE.Color(tintColor).multiplyScalar(0.85)}
            depthWrite={false}
          />
        </mesh>

        {/* Front layer */}
        <mesh
          ref={meshRef}
          position={[0, 0.02, 0]}
          onClick={handleClick}
          onPointerOver={() => document.body.style.cursor = 'pointer'}
          onPointerOut={() => document.body.style.cursor = ''}
        >
          <planeGeometry args={[spriteW, spriteH]} />
          <meshBasicMaterial
            map={tex ?? undefined}
            transparent
            alphaTest={0.3}
            color={tintColor}
            depthWrite={false}
          />
        </mesh>

        {/* Selection glow ring */}
        {isSelected && (
          <mesh position={[0, -spriteH / 2 + 0.1, -0.05]}>
            <ringGeometry args={[0.3 * scale, 0.42 * scale, 24]} />
            <meshBasicMaterial color={roleColor} transparent opacity={0.7} depthWrite={false} />
          </mesh>
        )}

        {/* Role badge above head */}
        <Html
          position={[0, spriteH / 2 + 0.2, 0]}
          center
          distanceFactor={8}
          zIndexRange={[10, 20]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              background: `${roleColor}22`,
              border: `1.5px solid ${roleColor}`,
              borderRadius: 20,
              padding: '2px 8px',
              fontSize: 11,
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              fontWeight: 600,
              color: roleColor,
              backdropFilter: 'blur(8px)',
              whiteSpace: 'nowrap',
              boxShadow: `0 2px 8px ${roleColor}33`,
            }}
          >
            {roleIcon} {char.role}
          </div>
        </Html>

        {/* Agent card popover on click */}
        {cardOpen && (
          <Html
            position={[1.2 * scale, 0.5, 0]}
            distanceFactor={6}
            zIndexRange={[100, 200]}
          >
            <AgentCard
              agentState={agentState}
              char={char}
              extraData={extraData}
              onClose={() => setCardOpen(false)}
            />
          </Html>
        )}
      </Billboard>

      {/* Coin sparkle on profit */}
      <CoinParticle
        origin={[0, spriteH / 2, 0]}
        active={madeProfit}
      />
    </group>
  )
}
