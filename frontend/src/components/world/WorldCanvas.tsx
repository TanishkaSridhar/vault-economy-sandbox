import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { WorldMapScene } from './WorldMapScene'
import type { AgentState, Decision, Relationship } from '../../hooks/useSimData'

interface WorldCanvasProps {
  onTownClick: (name: string) => void
  agentStates?: AgentState[]
  prevAgentStates?: AgentState[]
  townStates?: Array<{ town: string; price: number; stock: number }>
  townMeta?: Array<{ name: string; terrain: string }>
  decisions?: Decision[]
  relationships?: Relationship[]
  turn?: number
  style?: React.CSSProperties
}

function LoadingFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: 'rgba(255,255,255,0.4)',
        borderRadius: 20,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 14,
        color: '#6B7280',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ fontSize: 32 }}>🌍</div>
      <div>Loading 3D world…</div>
    </div>
  )
}

export function WorldCanvas({
  onTownClick,
  agentStates = [],
  prevAgentStates = [],
  townStates = [],
  townMeta = [],
  decisions = [],
  relationships = [],
  turn = 0,
  style,
}: WorldCanvasProps) {
  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 20, overflow: 'hidden', ...style }}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [2, 18, 16], fov: 42 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: 'linear-gradient(180deg, #ddeeff 0%, #eef5ff 60%, #f5f0ff 100%)' }}
      >
        <Suspense fallback={null}>
          <WorldMapScene
            onTownClick={onTownClick}
            agentStates={agentStates}
            prevAgentStates={prevAgentStates}
            townStates={townStates}
            townMeta={townMeta}
            decisions={decisions as any}
            relationships={relationships as any}
            turn={turn}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
