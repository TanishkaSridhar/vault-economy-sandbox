import { Suspense, useState, useMemo } from 'react'
import { OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { TownIsland } from './TownIsland'
import { Road } from './Road'
import { Agent3D } from './Agent3D'
import { TOWN_POSITIONS, ROAD_DATA, ROLE_COLOURS } from './worldData'
import { useSettings } from '../../hooks/useSettings'
import type { AgentState } from '../../hooks/useSimData'

interface WorldMapSceneProps {
  onTownClick: (name: string) => void
  agentStates?: AgentState[]
  prevAgentStates?: AgentState[]
  townStates?: Array<{ town: string; price: number; stock: number }>
  townMeta?: Array<{ name: string; terrain: string }>
  decisions?: Array<{ agent: string; action: string; reason: string; money_before: number; money_after: number }>
  relationships?: Array<{ from_agent: string; to_agent: string; trust: number; familiarity: number }>
  turn?: number
}

/** Compute interpolated position on the road curve given progress 0-1 */
function getRoadPosition(
  fromPos: [number, number, number],
  toPos: [number, number, number],
  progress: number
): [number, number, number] {
  const mid: [number, number, number] = [
    (fromPos[0] + toPos[0]) / 2,
    0.8,
    (fromPos[2] + toPos[2]) / 2,
  ]
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(...fromPos).setY(0.3),
    new THREE.Vector3(...mid),
    new THREE.Vector3(...toPos).setY(0.3),
  ])
  const pt = curve.getPoint(Math.max(0.05, Math.min(0.95, progress)))
  return [pt.x, pt.y, pt.z]
}

export function WorldMapScene({
  onTownClick,
  agentStates = [],
  prevAgentStates = [],
  townStates = [],
  townMeta = [],
  decisions = [],
  relationships = [],
  turn = 0,
}: WorldMapSceneProps) {
  const { lowGraphics } = useSettings()
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  const townTerrains = Object.fromEntries(townMeta.map(t => [t.name, t.terrain]))
  const townPrices   = Object.fromEntries(townStates.map(t => [t.town, t.price]))
  const townStocks   = Object.fromEntries(townStates.map(t => [t.town, t.stock]))

  // Build prev-states lookup for profit detection
  const prevByAgent = useMemo(
    () => Object.fromEntries(prevAgentStates.map(s => [s.agent, s])),
    [prevAgentStates]
  )

  // Build decision lookup for this turn
  const decisionByAgent = useMemo(
    () => Object.fromEntries(decisions.map(d => [d.agent, d])),
    [decisions]
  )

  // Build relationship lookup by from_agent
  const relsByAgent = useMemo(() => {
    const map: Record<string, typeof relationships> = {}
    for (const r of relationships) {
      if (!map[r.from_agent]) map[r.from_agent] = []
      map[r.from_agent].push(r)
    }
    return map
  }, [relationships])

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.65} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow={!lowGraphics}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <directionalLight position={[-8, 12, -6]} intensity={0.4} color="#c8d8ff" />

      {/* Environment & fog */}
      {!lowGraphics && <Environment preset="dawn" />}
      {!lowGraphics && <fog attach="fog" args={['#f0f4ff', 40, 90]} />}

      {/* Camera controls */}
      <OrbitControls
        autoRotate={!lowGraphics && selectedAgent === null}
        autoRotateSpeed={0.3}
        enablePan={false}
        minDistance={12}
        maxDistance={32}
        target={[0, 0, 1.5]}
        maxPolarAngle={Math.PI / 2.2}
      />

      {/* Roads */}
      {ROAD_DATA.map((road, i) => {
        const fromPos = TOWN_POSITIONS[road.from]
        const toPos   = TOWN_POSITIONS[road.to]
        if (!fromPos || !toPos) return null
        return (
          <Road
            key={i}
            from={fromPos}
            to={toPos}
            terrain={road.terrain}
            lowGraphics={lowGraphics}
          />
        )
      })}

      {/* Town islands */}
      {Object.entries(TOWN_POSITIONS).map(([name, pos]) => (
        <TownIsland
          key={name}
          name={name}
          terrain={townTerrains[name] ?? 'PLAINS'}
          position={pos}
          currentPrice={townPrices[name]}
          currentStock={townStocks[name]}
          onClick={onTownClick}
        />
      ))}

      {/* Agents — full Agent3D with animation */}
      <Suspense fallback={null}>
        {agentStates.map(agentState => {
          const isTravelling = !!(agentState.destination && agentState.destination !== agentState.town)
          const prevState = prevByAgent[agentState.agent]
          const madeProfit = prevState ? agentState.money > prevState.money : false
          const isHungry   = agentState.food <= 1
          const dec = decisionByAgent[agentState.agent]
          const didTrade = !!(dec && (dec.action === 'BUY' || dec.action === 'SELL'))

          // Compute position
          let pos: [number, number, number]
          if (isTravelling) {
            const fromPos = TOWN_POSITIONS[agentState.town]
            const toPos   = agentState.destination ? TOWN_POSITIONS[agentState.destination] : null
            if (fromPos && toPos) {
              pos = getRoadPosition(fromPos, toPos, 0.5)
            } else {
              pos = TOWN_POSITIONS[agentState.town] ?? [0, 0, 0]
            }
          } else {
            const base = TOWN_POSITIONS[agentState.town] ?? [0, 0, 0]
            // Scatter agents slightly around the town
            const seed = agentState.agent.charCodeAt(0) + agentState.agent.charCodeAt(1)
            const angle = (seed * 137.508) % (Math.PI * 2)
            const r = 0.6 + (seed % 5) * 0.1
            pos = [base[0] + Math.cos(angle) * r, base[1], base[2] + Math.sin(angle) * r]
          }

          // Build extra data for the popover
          const rels = relsByAgent[agentState.agent]?.map(r => ({
            to: r.to_agent,
            trust: r.trust,
            familiarity: r.familiarity,
          })) ?? []

          const extraData = {
            lastDecision: dec?.action,
            lastReason: dec?.reason,
            relationships: rels,
          }

          return (
            <Agent3D
              key={agentState.agent}
              agentState={agentState}
              position={pos}
              isTravelling={isTravelling}
              isHungry={isHungry}
              madeProfit={madeProfit}
              didTrade={didTrade}
              scale={lowGraphics ? 0.8 : 1}
              onSelect={name => setSelectedAgent(name === selectedAgent ? null : name)}
              isSelected={selectedAgent === agentState.agent}
              extraData={extraData}
            />
          )
        })}
      </Suspense>

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#e8f4e8" transparent opacity={0.3} />
      </mesh>
    </>
  )
}
